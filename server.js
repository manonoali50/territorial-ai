const express = require("express");
const path = require("path");
const app = express();

const PORT = process.env.PORT || 8080;

// خدمة الملفات (HTML / CSS / JS)
app.use(express.static(path.join(__dirname)));

// إرسال index.html عند فتح الموقع
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// إنشاء السيرفر
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// WebSocket server
const { WebSocketServer } = require("ws");
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("WebSocket client connected");
  ws.send("CONNECTED to WebSocket server");
});
