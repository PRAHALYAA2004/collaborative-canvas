// client/main.js

// Connect to Socket.io server (same host)
const socket = io();

// Canvas setup
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  // Resize the canvas drawing buffer to match CSS size
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.scale(dpr, dpr);
  // Optional: redraw background if you maintain an offscreen buffer
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Drawing state
let drawing = false;
let lastPos = null;
const color = '#000000';
const lineWidth = 2;

// Get toolbar elements
const clearBtn = document.getElementById('clearBtn');
clearBtn.addEventListener('click', () => {
  // local clear (won't clear others yet)
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// Utility: get mouse/touch pos relative to viewport
function getPosFromEvent(e) {
  if (e.touches && e.touches[0]) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

// Draw a segment locally
function drawSegment(from, to, opts = {}) {
  ctx.beginPath();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = opts.color || color;
  ctx.lineWidth = opts.width || lineWidth;
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

// Mouse / touch handlers
canvas.addEventListener('mousedown', (e) => {
  drawing = true;
  lastPos = getPosFromEvent(e);
});

canvas.addEventListener('mouseup', (e) => {
  drawing = false;
  lastPos = null;
});

canvas.addEventListener('mousemove', (e) => {
  if (!drawing) return;
  const pos = getPosFromEvent(e);
  // Draw locally
  drawSegment(lastPos, pos);
  // Send the segment to server (live)
  socket.emit('draw', { from: lastPos, to: pos, color, width: lineWidth });
  lastPos = pos;
});

// Touch events (mobile)
canvas.addEventListener('touchstart', (e) => {
  drawing = true;
  lastPos = getPosFromEvent(e);
});

canvas.addEventListener('touchend', (e) => {
  drawing = false;
  lastPos = null;
});

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault(); // prevent page scroll
  if (!drawing) return;
  const pos = getPosFromEvent(e);
  drawSegment(lastPos, pos);
  socket.emit('draw', { from: lastPos, to: pos, color, width: lineWidth });
  lastPos = pos;
}, { passive: false });

// Receive draw events from others
socket.on('draw', (data) => {
  // data: { from: {x,y}, to: {x,y}, color, width }
  // Draw the incoming segment
  drawSegment(data.from, data.to, { color: data.color, width: data.width });
});
// Handle user disconnects if needed
socket.on('user-disconnect', (data) => {
  console.log('User disconnected:', data.id);
  // Optionally handle cleanup
});