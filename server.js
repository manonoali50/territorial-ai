const http = require("http");
const WebSocket = require("ws");
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("WebSocket server is running.");
});

const wss = new WebSocket.Server({ server });

let rooms = {}; 

function getRandomColor(existingColors) {
  const colors = [
    "#ff4444", "#44ff44", "#4444ff", "#ffff44",
    "#ff44ff", "#44ffff", "#ff8844", "#88ff44"
  ];
  const available = colors.filter(c => !existingColors.includes(c));
  return available[Math.floor(Math.random() * available.length)];
}

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    const data = JSON.parse(message);

    if (data.type === "join") {
      const room = data.room || "Room";

      if (!rooms[room]) rooms[room] = { players: [] };

      if (rooms[room].players.length >= 4) {
        ws.send(JSON.stringify({ type: "full" }));
        return;
      }

      const existingColors = rooms[room].players.map(p => p.color);
      const playerColor = getRandomColor(existingColors);

      ws.room = room;
      ws.color = playerColor;

      rooms[room].players.push(ws);

      ws.send(JSON.stringify({ type: "joined", color: playerColor }));

      rooms[room].players.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: "count",
            players: rooms[room].players.length
          }));
        }
      });
    }

    if (data.type === "update") {
      const room = ws.room;

      rooms[room].players.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "update", x: data.x, y: data.y, color: ws.color }));
        }
      });
    }
  });

  ws.on("close", () => {
    const room = ws.room;
    if (!rooms[room]) return;

    rooms[room].players = rooms[room].players.filter(p => p !== ws);

    if (rooms[room].players.length === 0) {
      delete rooms[room];
    }
  });
});

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
