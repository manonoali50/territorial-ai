Files:
- index.html  -> the web client (open in browser or host on GitHub Pages)
- server.js   -> Node.js WebSocket server (run with Node)
- README.txt  -> this file

Quick start:
1) On a machine with Node.js:
   npm install ws
   node server.js
   (server listens on port 3000)

2) Edit index.html and set SERVER_URL to ws://<your-server-ip>:3000 if not running locally.

3) Open index.html in browser (or host on static hosting). Use "اللعب أونلاين" to create/join rooms.

Notes:
- This is a test server, not production-ready. Use behind a reverse proxy / TLS for public hosting.
- If you want, I can deploy the server to a free host for you.
