// server/server.js
const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = http.createServer(app);

// Serve static client files from ../client
app.use(express.static(path.join(__dirname, '..', 'client')));

// Create Socket.io server attached to HTTP server
const io = new Server(httpServer);

// Simple in-memory room/state 
io.on('connection', (socket) => {
  console.log('Client connected', socket.id);

  // Forward incoming "draw" events to all other clients
  socket.on('draw', (data) => {
    // data: { x, y, color, width, id, type }
    socket.broadcast.emit('draw', data);
  });

  // Cursor positions
  socket.on('cursor', (data) => {
    socket.broadcast.emit('cursor', { id: socket.id, ...data });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
    // notify others if needed
    socket.broadcast.emit('user-disconnect', { id: socket.id });
  });
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

