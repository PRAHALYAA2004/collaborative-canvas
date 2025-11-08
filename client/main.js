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

  // Save current drawings before resizing
  const imageData = ctx.getImageData(0, 0, board.width, board.height);

  [board, cursorCanvas].forEach((c) => {
    c.width = Math.floor(w * dpr);
    c.height = Math.floor(h * dpr);
    c.style.width = w + 'px';
    c.style.height = h + 'px';
    const context = c.getContext('2d');
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(dpr, dpr);
  });

  // Restore the previous drawing after resize
  ctx.putImageData(imageData, 0, 0);
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', resizeCanvas);
resizeCanvas();

// Drawing state
let drawing = false;
let lastPos = null;
let myColor = '#ffffff';
let lineWidth = 2;
let currentTool = 'brush';
let history = [];

// Ask for user name
const name = prompt("Enter your name:") || "Anonymous";
socket.emit('set-name', name);

// Listen for assigned color
socket.on('user-info', (user) => {
  console.log(`🖌 Your color: ${user.color}`);
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

// Tool bindings
const brushBtn = document.getElementById('brushBtn');
const eraserBtn = document.getElementById('eraserBtn');
const colorPicker = document.getElementById('colorPicker');
const strokeWidth = document.getElementById('strokeWidth');

brushBtn.onclick = () => {
  currentTool = 'brush';
  brushBtn.classList.add('active');
  eraserBtn.classList.remove('active');
};

eraserBtn.onclick = () => {
  currentTool = 'eraser';
  eraserBtn.classList.add('active');
  brushBtn.classList.remove('active');
};

colorPicker.oninput = (e) => (myColor = e.target.value);
strokeWidth.oninput = (e) => (lineWidth = e.target.value);

// Get canvas position from event
function getCanvasPosFromEvent(e) {
  const rect = board.getBoundingClientRect();
  if (e.touches && e.touches[0]) {
    const t = e.touches[0];
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

// Draw a line segment
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

// Handle local drawing
board.addEventListener('mousedown', (e) => {
  drawing = true;
  lastPos = getCanvasPosFromEvent(e);
});

board.addEventListener('mouseup', () => {
  drawing = false;
  lastPos = null;
});

board.addEventListener('mousemove', (e) => {
  const pos = getCanvasPosFromEvent(e);
  socket.emit('cursor', { x: pos.x, y: pos.y, username: name, color: myColor });

  if (!drawing) return;
  const color = currentTool === 'eraser' ? '#111' : myColor;
  drawSegment(lastPos, pos, { color, width: lineWidth });
  const data = { from: lastPos, to: pos, color, width: lineWidth };
  history.push(data);
  socket.emit('draw', data); // send stroke to server
  lastPos = pos;
});

board.addEventListener('touchstart', (e) => {
  drawing = true;
  lastPos = getCanvasPosFromEvent(e);
});

board.addEventListener('touchend', () => {
  drawing = false;
  lastPos = null;
});

board.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (!drawing) return;
  const pos = getCanvasPosFromEvent(e);
  const color = currentTool === 'eraser' ? '#111' : myColor;
  drawSegment(lastPos, pos, { color, width: lineWidth });
  socket.emit('draw', { from: lastPos, to: pos, color, width: lineWidth });
  lastPos = pos;
}, { passive: false });

// Real-time draw event from others
socket.on('draw', (data) => {
  // Draw immediately when any other user emits a stroke
  drawSegment(data.from, data.to, data);
});

//  Redraw full history when sync (undo/redo)
socket.on('sync-history', (serverHistory) => {
  history = serverHistory;
  ctx.clearRect(0, 0, board.width, board.height);
  history.forEach((stroke) => drawSegment(stroke.from, stroke.to, stroke));
});

// Cursor tracking
const cursors = {};
socket.on('cursor', (data) => {
  cursors[data.id] = data;
});
socket.on('user-disconnect', ({ id }) => delete cursors[id]);

function renderCursors() {
  cursorCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
  Object.values(cursors).forEach((c) => {
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
  renderCursors();
  requestAnimationFrame(render);
}
render();
