
# Real-Time Collaborative Drawing Canvas

## Overview

This project is a real-time collaborative drawing web application built using **HTML**, **CSS**, **JavaScript**, and a **Node.js** backend with **Socket.io** for WebSocket communication. Multiple users can draw simultaneously on a shared canvas, with each user’s strokes, cursor positions, and undo/redo actions synchronized in real time.

The app supports essential drawing tools, global undo/redo functionality, live user tracking, and persistent canvas state across sessions. It is deployed on **Render** using a Node.js service.

---

## Setup Instructions

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/collaborative-canvas.git
   cd collaborative-canvas
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start the application:**

   ```bash
   npm start
   ```

4. **Access the app:**
   Open your browser and navigate to:

   ```
   http://localhost:3000
   ```

---

## Testing with Multiple Users

To simulate multiple users:

1. Open the app in several browser tabs or different browsers (e.g., Chrome, Firefox).
2. Each user will automatically be assigned a unique color and cursor.
3. Drawing actions, cursor movements, and undo/redo events will synchronize instantly across all connected clients.

For remote testing:

* Deploy the app on Render (or another Node.js hosting service).
* Share the deployment URL with others to collaborate in real time.

---

## Known Limitations / Bugs

* **Undo/Redo:** Works globally across all users. There is no user-specific undo history.
* **No Authentication:** Anyone accessing the URL can draw on the canvas.
* **Canvas Resizing:** Resizing the browser window may distort or reset the canvas scale.
* **Persistence:** Canvas data is stored locally on the server (`drawing.json`). It does not use a database.
* **Performance:** In very large sessions (10+ users drawing rapidly), minor latency can occur.

---

## Time Spent on the Project

| Phase                                     | Hours         |
| ----------------------------------------- | ------------- |
| Canvas drawing and tools implementation   | 5 hrs         |
| Real-time communication setup (Socket.io) | 3 hrs         |
| Synchronization and undo/redo logic       | 4 hrs         |
| UI design and user management             | 2 hrs         |
| Persistence and testing                   | 3 hrs         |
| Deployment and polish                     | 3 hrs         |
| **Total**                                 | **~20 hours** |

---
