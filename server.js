// server.js
// Simple WebSocket server with rooms and unique color assignment per-player
// Requires: npm install ws

const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('WebSocket server running\n');
});

const wss = new WebSocket.Server({ noServer: true });

// color palette (add or change as needed)
const COLORS = [
  '#FF6633','#FFB399','#FF33FF','#FFFF99','#00B3E6',
  '#E6B333','#3366E6','#999966','#99FF99','#B34D4D',
  '#80B300','#809900','#E6B3B3','#6680B3','#66991A',
  '#FF99E6','#CCFF1A','#FF1A66','#E6331A','#33FFCC'
];

// rooms structure: { roomId: { players: Map(clientId->playerData) } }
const rooms = new Map();

function pickColorForRoom(room) {
  const used = new Set();
  for (const p of room.players.values()) used.add(p.color);
  for (const c of COLORS) if (!used.has(c)) return c;
  // fallback: random hex if palette exhausted
  return '#' + Math.floor(Math.random()*0xFFFFFF).toString(16).padStart(6,'0');
}

function broadcast(roomId, data) {
  const room = rooms.get(roomId);
  if (!room) return;
  const raw = JSON.stringify(data);
  for (const [, p] of room.players.entries()) {
    if (p.ws && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(raw);
    }
  }
}

let nextClientId = 1;

wss.on('connection', (ws, req, clientInfo) => {
  // clientInfo can include ip, but we will wait for client "join" message to add to a room
  ws.clientId = 'c' + (nextClientId++);
  ws.on('message', (message) => {
    let msg;
    try { msg = JSON.parse(message); } catch(e){ return; }
    const type = msg.type;
    if (type === 'join') {
      // { type:'join', room: 'RoomName', name: 'playerName' }
      const roomId = String(msg.room || 'default').substring(0,50);
      let room = rooms.get(roomId);
      if (!room) {
        room = { players: new Map() };
        rooms.set(roomId, room);
      }
      if (room.players.size >= 4) {
        ws.send(JSON.stringify({ type:'error', reason:'room-full' }));
        return;
      }
      // assign color unique in this room
      const color = pickColorForRoom(room);
      const player = {
        id: ws.clientId,
        name: msg.name || '',
        color,
        x: msg.x || 0,
        y: msg.y || 0,
        ws
      };
      room.players.set(ws.clientId, player);
      ws.roomId = roomId;

      // notify the joining client with current room state and assigned color/id
      const playersSnapshot = Array.from(room.players.values()).map(p => ({
        id: p.id, name: p.name, color: p.color, x: p.x, y: p.y
      }));
      ws.send(JSON.stringify({ type:'joined', id:player.id, color:player.color, players:playersSnapshot }));

      // broadcast to other players that someone joined
      broadcast(roomId, { type:'player-joined', id:player.id, name:player.name, color:player.color });
      return;
    }

    if (!ws.roomId) {
      // reject messages until join
      ws.send(JSON.stringify({ type:'error', reason:'not-joined' }));
      return;
    }

    const room = rooms.get(ws.roomId);
    if (!room) return;

    if (type === 'move') {
      // { type:'move', id, x, y }
      const p = room.players.get(ws.clientId);
      if (!p) return;
      p.x = msg.x; p.y = msg.y;
      broadcast(ws.roomId, { type:'player-move', id: p.id, x: p.x, y: p.y });
      return;
    }

    if (type === 'chat') {
      // { type:'chat', text }
      broadcast(ws.roomId, { type:'chat', id: ws.clientId, text: msg.text });
      return;
    }

    // add other types as needed
  });

  ws.on('close', () => {
    const roomId = ws.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const removed = room.players.get(ws.clientId);
    room.players.delete(ws.clientId);
    // broadcast leave
    broadcast(roomId, { type:'player-left', id: ws.clientId });
    // delete room when empty
    if (room.players.size === 0) rooms.delete(roomId);
  });

  ws.on('error', () => {
    // ignore: logs show on Railway
  });
});

// handle HTTP upgrade to WebSocket
server.on('upgrade', (request, socket, head) => {
  // accept all origins; you can check request.headers.origin if needed
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

server.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
