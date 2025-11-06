// Connect to Socket.io server
const socket = io();

// Canvas setup
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const userList = document.getElementById('userList');

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.scale(dpr, dpr);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Drawing state
let drawing = false;
let lastPos = null;
let myColor = '#000000';
let lineWidth = 2;

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

// Clear button
document.getElementById('clearBtn').addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

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
canvas.addEventListener('mousedown', (e) => {
  drawing = true;
  lastPos = getPosFromEvent(e);
});

canvas.addEventListener('mouseup', () => {
  drawing = false;
  lastPos = null;
});

canvas.addEventListener('mousemove', (e) => {
  if (!drawing) return;
  const pos = getPosFromEvent(e);
  drawSegment(lastPos, pos);
  socket.emit('draw', { from: lastPos, to: pos, color: myColor, width: lineWidth });
  lastPos = pos;
});

canvas.addEventListener('touchstart', (e) => {
  drawing = true;
  lastPos = getPosFromEvent(e);
});

canvas.addEventListener('touchend', () => {
  drawing = false;
  lastPos = null;
});

canvas.addEventListener('touchmove', (e) => {
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
// Cursor tracking