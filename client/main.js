// Connect to Socket.io server
const socket = io();

// Canvas setup
const board = document.getElementById('board');
const cursorCanvas = document.getElementById('cursorCanvas');
const ctx = board.getContext('2d');
const cursorCtx = cursorCanvas.getContext('2d');
const userList = document.getElementById('userList');

// Resize canvases to fit screen
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;

  [board, cursorCanvas].forEach((c) => {
    c.width = Math.floor(w * dpr);
    c.height = Math.floor(h * dpr);
    c.style.width = w + 'px';
    c.style.height = h + 'px';
    const context = c.getContext('2d');
    context.setTransform(1, 0, 0, 1, 0, 0); // reset transform before scaling
    context.scale(dpr, dpr);
  });
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Drawing state
let drawing = false;
let lastPos = null;
let myColor = '#000000';
let lineWidth = 2;
let history = []; // client copy of strokes

// Ask for user name
const name = prompt("Enter your name:") || "Anonymous";
socket.emit('set-name', name);

// Listen for assigned color
socket.on('user-info', (user) => {
  myColor = user.color;
  console.log(`🖌 Your color: ${myColor}`);
});

// Update user list
socket.on('user-list', (users) => {
  userList.innerHTML = users
    .map((u) => `<li style="color:${u.color}">${u.name}</li>`)
    .join('');
});

// Undo/Redo buttons
document.getElementById('undoBtn').addEventListener('click', () => socket.emit('undo'));
document.getElementById('redoBtn').addEventListener('click', () => socket.emit('redo'));

// Get position helper
function getPosFromEvent(e) {
  if (e.touches && e.touches[0]) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

// Draw segment
function drawSegment(from, to, opts = {}) {
  ctx.beginPath();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = opts.color || myColor;
  ctx.lineWidth = opts.width || lineWidth;
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

// Mouse/touch events
board.addEventListener('mousedown', (e) => {
  drawing = true;
  lastPos = getPosFromEvent(e);
});

board.addEventListener('mouseup', () => {
  drawing = false;
  lastPos = null;
});

board.addEventListener('mousemove', (e) => {
  const pos = getPosFromEvent(e);
  socket.emit('cursor', { x: pos.x, y: pos.y, username: name, color: myColor });

  if (!drawing) return;
  drawSegment(lastPos, pos);
  const data = { from: lastPos, to: pos, color: myColor, width: lineWidth };
  history.push(data);
  socket.emit('draw', data);
  lastPos = pos;
});

board.addEventListener('touchstart', (e) => {
  drawing = true;
  lastPos = getPosFromEvent(e);
});

board.addEventListener('touchend', () => {
  drawing = false;
  lastPos = null;
});

board.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (!drawing) return;
  const pos = getPosFromEvent(e);
  drawSegment(lastPos, pos);
  socket.emit('draw', { from: lastPos, to: pos, color: myColor, width: lineWidth });
  lastPos = pos;
}, { passive: false });

// Receive draw events
socket.on('draw', (data) => {
  drawSegment(data.from, data.to, { color: data.color, width: data.width });
});

// Redraw full history (used for undo/redo)
socket.on('sync-history', (serverHistory) => {
  history = serverHistory;
  ctx.clearRect(0, 0, board.width, board.height);
  history.forEach((stroke) => drawSegment(stroke.from, stroke.to, stroke));
});


// === Cursor tracking (Canvas overlay) ===
const cursors = {};

socket.on('cursor', (data) => {
  const { id, x, y, username, color } = data;
  cursors[id] = { x, y, username, color };
});

socket.on('user-disconnect', ({ id }) => {
  delete cursors[id];
});

board.addEventListener('mousemove', (e) => {
  const pos = getPosFromEvent(e);
  socket.emit('cursor', { x: pos.x, y: pos.y, username: name, color: myColor });
});

function renderCursors() {
  cursorCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);

  Object.entries(cursors).forEach(([id, c]) => {
    if (!c) return;
    cursorCtx.beginPath();
    cursorCtx.fillStyle = c.color;
    cursorCtx.arc(c.x, c.y, 5, 0, Math.PI * 2);
    cursorCtx.fill();
    cursorCtx.font = "12px sans-serif";
    cursorCtx.fillStyle = c.color;
    cursorCtx.fillText(c.username, c.x + 8, c.y + 4);
  });
}
function render() {
  // Only draw cursors over current canvas strokes
  ctx.save();
  renderCursors();
  ctx.restore();
  requestAnimationFrame(render);
}
render();
