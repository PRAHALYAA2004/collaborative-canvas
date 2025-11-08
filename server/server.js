const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);

// Serve static client files
app.use(express.static(path.join(__dirname, '..', 'client')));

// In-memory user store
const users = {};
let history = []; // all drawn strokes
let undone = [];  // undone strokes

// Utility: random bright color
function randomColor() {
  return `hsl(${Math.floor(Math.random() * 360)}, 90%, 60%)`;
}

io.on('connection', (socket) => {
  console.log('Client connected', socket.id);

  const user = { id: socket.id, color: randomColor(), name: `User-${socket.id.slice(0, 4)}` };
  users[socket.id] = user;

  socket.emit('user-info', user);
  io.emit('user-list', Object.values(users));

  // Send current history to new user (to view the existing canvas)
  socket.emit('sync-history', history);

  // Drawing
  socket.on('draw', (data) => {
    history.push(data);
    undone = []; // clear redo stack when new stroke added
    socket.broadcast.emit('draw', data);
  });

  // Undo
  socket.on('undo', () => {
    if (history.length > 0) {
      const stroke = history.pop();
      undone.push(stroke);
      io.emit('sync-history', history);
    }
  });

  // Redo
  socket.on('redo', () => {
    if (undone.length > 0) {
      const stroke = undone.pop();
      history.push(stroke);
      io.emit('sync-history', history);
    }
  });

  // Cursor updates
  socket.on('cursor', (data) => {
    const payload = { id: socket.id, ...data };
    io.emit('cursor', payload);
  });

  socket.on('set-name', (name) => {
    if (typeof name === 'string' && name.trim()) {
      users[socket.id].name = name.trim();
      io.emit('user-list', Object.values(users));
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
    delete users[socket.id];
    io.emit('user-list', Object.values(users));
    socket.broadcast.emit('user-disconnect', { id: socket.id });
  });
});

// === Persistent Save/Load ===
const fs = require("fs");
const SAVE_FILE = "drawing.json";

// Load on server start
if (fs.existsSync(SAVE_FILE)) {
  try {
    history = JSON.parse(fs.readFileSync(SAVE_FILE, "utf8"));
    console.log("Loaded previous drawing history from file.");
  } catch (err) {
    console.error("Error loading saved drawing:", err);
  }
}

// Save automatically after every draw event
function saveDrawing() {
  try {
    fs.writeFileSync(SAVE_FILE, JSON.stringify(history));
  } catch (err) {
    console.error("Error saving drawing:", err);
  }
}

io.on("connection", (socket) => {
  console.log("Client connected", socket.id);

  const user = { id: socket.id, color: randomColor(), name: `User-${socket.id.slice(0, 4)}` };
  users[socket.id] = user;

  socket.emit("user-info", user);
  io.emit("user-list", Object.values(users));

  socket.emit("sync-history", history);

  socket.on("draw", (data) => {
    history.push(data);
    undone = [];
    io.emit("draw", data);
    saveDrawing();
  });

  socket.on("undo", () => {
    if (history.length > 0) {
      const stroke = history.pop();
      undone.push(stroke);
      io.emit("sync-history", history);
      saveDrawing();
    }
  });

  socket.on("redo", () => {
    if (undone.length > 0) {
      const stroke = undone.pop();
      history.push(stroke);
      io.emit("sync-history", history);
      saveDrawing();
    }
  });

  socket.on("cursor", (data) => {
    const payload = { id: socket.id, ...data };
    io.emit("cursor", payload);
  });

  socket.on("set-name", (name) => {
    if (typeof name === "string" && name.trim()) {
      users[socket.id].name = name.trim();
      io.emit("user-list", Object.values(users));
    }
  });

  socket.on("disconnect", () => {
    delete users[socket.id];
    io.emit("user-list", Object.values(users));
    io.emit("user-disconnect", { id: socket.id });
  });
});

// Manual Save/Load endpoints
app.get("/save", (req, res) => {
  saveDrawing();
  res.status(200).send("Drawing saved successfully");
});

app.get("/load", (req, res) => {
  if (fs.existsSync(SAVE_FILE)) {
    const data = JSON.parse(fs.readFileSync(SAVE_FILE, "utf8"));
    history = data;
    io.emit("sync-history", history);
    res.status(200).send("Drawing loaded successfully");
  } else {
    res.status(404).send("No saved drawing found");
  }
});

// === Latency check for metrics ===
io.on("connection", (socket) => {
  socket.on("pingCheck", () => socket.emit("pongCheck"));
});


io.on("connection", (socket) => {
  console.log("Client connected", socket.id);

  const user = { id: socket.id, color: randomColor(), name: `User-${socket.id.slice(0, 4)}` };
  users[socket.id] = user;

  socket.emit("user-info", user);
  io.emit("user-list", Object.values(users));

  socket.emit("sync-history", history);

  socket.on("draw", (data) => {
    history.push(data);
    undone = [];
    io.emit("draw", data);
    saveDrawing();
  });

  socket.on("undo", () => {
    if (history.length > 0) {
      const stroke = history.pop();
      undone.push(stroke);
      io.emit("sync-history", history);
      saveDrawing();
    }
  });

  socket.on("redo", () => {
    if (undone.length > 0) {
      const stroke = undone.pop();
      history.push(stroke);
      io.emit("sync-history", history);
      saveDrawing();
    }
  });

  socket.on("cursor", (data) => {
    const payload = { id: socket.id, ...data };
    io.emit("cursor", payload);
  });

  socket.on("set-name", (name) => {
    if (typeof name === "string" && name.trim()) {
      users[socket.id].name = name.trim();
      io.emit("user-list", Object.values(users));
    }
  });

  socket.on("disconnect", () => {
    delete users[socket.id];
    io.emit("user-list", Object.values(users));
    io.emit("user-disconnect", { id: socket.id });
  });
});

// Manual Save/Load endpoints
app.get("/save", (req, res) => {
  saveDrawing();
  res.status(200).send("Drawing saved successfully");
});

app.get("/load", (req, res) => {
  if (fs.existsSync(SAVE_FILE)) {
    const data = JSON.parse(fs.readFileSync(SAVE_FILE, "utf8"));
    history = data;
    io.emit("sync-history", history);
    res.status(200).send("Drawing loaded successfully");
  } else {
    res.status(404).send("No saved drawing found");
  }
});

// === Latency check for metrics ===
io.on("connection", (socket) => {
  socket.on("pingCheck", () => socket.emit("pongCheck"));
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});