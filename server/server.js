const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);

// Serve static client files from ../client
app.use(express.static(path.join(__dirname, '..', 'client')));

// In-memory user store
const users = {};

// Utility to generate random bright color
function randomColor() {
  return `hsl(${Math.floor(Math.random() * 360)}, 90%, 60%)`;
}

io.on('connection', (socket) => {
  console.log('Client connected', socket.id);

  // Assign new user color and placeholder name
  const user = { id: socket.id, color: randomColor(), name: `User-${socket.id.slice(0, 4)}` };
  users[socket.id] = user;

  // Notify this user of their color
  socket.emit('user-info', user);

  // Broadcast updated user list to everyone
  io.emit('user-list', Object.values(users));

  // Receive and forward draw events
  socket.on('draw', (data) => {
    socket.broadcast.emit('draw', data);
  });

  // Receive cursor updates
  socket.on('cursor', (data) => {
    socket.broadcast.emit('cursor', { id: socket.id, ...data });
  });

  // Handle user renaming
  socket.on('set-name', (name) => {
    if (typeof name === 'string' && name.trim()) {
      users[socket.id].name = name.trim();
      io.emit('user-list', Object.values(users));
    }
  });

  // Handle disconnects
  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
    delete users[socket.id];
    io.emit('user-list', Object.values(users));
    socket.broadcast.emit('user-disconnect', { id: socket.id });
  });
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
