// Simple WebSocket server for Territorial game
// Usage:
//   npm install ws
//   node server.js
//
// This server supports basic rooms with unique colors, host management and broadcasting actions.

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3000 });
console.log('WebSocket server running on ws://0.0.0.0:3000');

const rooms = {}; // { roomId: { players: [ {id, name, color, ws, isHost} ] } }
const COLOR_POOL = ['#e53935','#8e24aa','#3949ab','#00897b','#f4511e','#fb8c00','#43a047','#1e88e5','#7b1fa2','#d32f2f'];

function pickUniqueColor(room){
  const used = new Set(room.players.map(p=>p.color).filter(Boolean));
  for(const c of COLOR_POOL){
    if(!used.has(c)) return c;
  }
  return COLOR_POOL[Math.floor(Math.random()*COLOR_POOL.length)];
}

wss.on('connection', function connection(ws){
  ws._meta = { id: null, room: null, name: null };
  ws.on('message', function incoming(data){
    let msg = null;
    try{ msg = JSON.parse(data.toString()); }catch(e){ ws.send(JSON.stringify({type:'error', message:'invalid json'})); return; }
    const type = msg.type;
    if(type === 'create_room'){
      const roomId = Math.random().toString(36).slice(2,8);
      rooms[roomId] = { players: [] };
      ws._meta.id = 'p_' + Date.now() + '_' + Math.floor(Math.random()*1000);
      ws._meta.room = roomId;
      ws._meta.name = msg.name || 'Guest';
      const color = pickUniqueColor(rooms[roomId]);
      const player = { id: ws._meta.id, name: ws._meta.name, color, ws: ws, isHost: true };
      rooms[roomId].players.push(player);
      ws.send(JSON.stringify({type:'joined', room:roomId, id:ws._meta.id, isHost:true}));
      broadcastRoom(roomId);
      console.log('room created:', roomId);
    } else if(type === 'join_room'){
      const roomId = msg.room;
      if(!rooms[roomId]){ ws.send(JSON.stringify({type:'error', message:'room not found'})); return; }
      ws._meta.id = 'p_' + Date.now() + '_' + Math.floor(Math.random()*1000);
      ws._meta.room = roomId;
      ws._meta.name = msg.name || 'Guest';
      const color = pickUniqueColor(rooms[roomId]);
      const isHost = rooms[roomId].players.length === 0;
      const player = { id: ws._meta.id, name: ws._meta.name, color, ws: ws, isHost };
      rooms[roomId].players.push(player);
      ws.send(JSON.stringify({type:'joined', room:roomId, id:ws._meta.id, isHost:isHost}));
      broadcastRoom(roomId);
      console.log('joined room:', roomId, 'id:', ws._meta.id);
    } else if(type === 'start_room'){
      const roomId = msg.room;
      const room = rooms[roomId];
      if(!room) return;
      const playersArr = room.players.map(p=>({id:p.id,name:p.name,color:p.color,isHost:p.isHost}));
      broadcastToRoom(roomId, {type:'start', players:playersArr});
      console.log('start room', roomId);
    } else if(type === 'action'){
      const roomId = msg.room;
      const payload = msg.payload;
      broadcastToRoom(roomId, {type:'action', payload:payload});
    }
  });

  ws.on('close', function(){
    const md = ws._meta;
    if(md && md.room && rooms[md.room]){
      const room = rooms[md.room];
      room.players = room.players.filter(p=>p.id !== md.id);
      if(room.players.length === 0){
        delete rooms[md.room];
        console.log('deleted empty room', md.room);
      } else {
        const hasHost = room.players.some(p=>p.isHost);
        if(!hasHost){
          room.players[0].isHost = true;
        }
        broadcastRoom(md.room);
      }
    }
  });

});

function broadcastRoom(roomId){
  const room = rooms[roomId];
  if(!room) return;
  const playersArr = room.players.map(p=>({id:p.id,name:p.name,color:p.color,isHost:p.isHost}));
  for(const p of room.players){
    try{ p.ws.send(JSON.stringify({type:'room_state', room:roomId, players:playersArr})); }catch(e){}
  }
}

function broadcastToRoom(roomId, msg){
  const room = rooms[roomId];
  if(!room) return;
  for(const p of room.players){
    try{ p.ws.send(JSON.stringify(msg)); }catch(e){}
  }
}
