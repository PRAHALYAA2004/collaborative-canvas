

# Collaborative Drawing App — Architecture Overview

## 1. Data Flow Diagram

```mermaid
flowchart LR
    A[User Draws on Canvas] --> B{Emit Drawing Event via Socket.io}
    B --> C[Node.js Server]
    C --> D{Broadcast Event to All Clients}
    D --> E[Other Clients Render Stroke]
    E --> F[Canvas Updated in Real Time]

    subgraph UndoRedo[Undo/Redo Strategy]
        U1[Operation History Stack] --> U2[Undo Removes Last Operation]
        U2 --> U3[Redo Reapplies Operation]
        U3 --> E
    end

    subgraph Performance[Performance Decisions]
        P1[requestAnimationFrame Rendering]
        P2[Event Batching for Smoother Updates]
        P3[Cursor Update Throttling]
        P4[Canvas Save/Load for Persistence]
    end

    subgraph Conflict[Conflict Resolution]
        C1[Each Stroke Tagged by userId]
        C2[Events Interleaved Fairly]
        C3[Canvas Rebuilt from History]
    end

    C --> UndoRedo
    E --> Performance
    Performance --> Conflict
    Conflict --> F
```

## 2. WebSocket Protocol

The app uses **Socket.io** for low-latency, bi-directional event communication.
Below is a summary of all events exchanged between client and server.

| Direction        | Event Name        | Payload                         | Description                                             |
| ---------------- | ----------------- | ------------------------------- | ------------------------------------------------------- |
| Client → Server  | `draw`            | `{ from, to, color, width }`    | Sent whenever a user draws a segment                    |
| Server → Clients | `draw`            | Same payload                    | Broadcast to all connected clients to render the stroke |
| Client → Server  | `cursor`          | `{ x, y, username, color }`     | Cursor movement data for live indicators                |
| Server → Clients | `cursor`          | `{ id, x, y, username, color }` | Distributed cursor info for all users                   |
| Client → Server  | `undo` / `redo`   | None                            | Triggers global undo/redo                               |
| Server → Clients | `sync-history`    | `[ ...strokes ]`                | Broadcasts updated stroke history                       |
| Client → Server  | `set-name`        | `{ name }`                      | Sets username for UI                                    |
| Server → Clients | `user-list`       | `[ { id, name, color } ]`       | Updates the online users list                           |
| Server → Clients | `user-disconnect` | `{ id }`                        | Removes user cursor and name on disconnect              |

## 3. Undo/Redo Strategy

Undo and redo operations are handled **globally**, ensuring that all connected users see the same canvas state.

* **History Stack:**
  Every stroke is stored in an array (`history`).

* **Undo:**
  Removes the most recent stroke from `history` and moves it into an `undone` stack.
  The server then emits `sync-history` to all clients.

* **Redo:**
  Pops a stroke from `undone` and pushes it back to `history`.
  The server emits `sync-history` again for synchronization.

This design guarantees that the canvas state is consistent across all connected clients, regardless of who initiated the undo/redo.

## 4. Performance Decisions

The following optimizations were implemented for smooth, real-time interaction:

* **requestAnimationFrame:**
  Cursor and performance metrics update at the browser’s refresh rate.

* **Event Throttling:**
  Cursor events are reduced in frequency to minimize network overhead.

* **Efficient Repainting:**
  Only incremental changes are drawn instead of redrawing the entire canvas.

* **Local ImageData Cache:**
  Canvas content is preserved on resize and during undo/redo operations.

* **Lightweight Persistence:**
  Save/Load feature serializes strokes to JSON and allows reloading without server storage.

## 5. Conflict Resolution

* Each drawing event is tagged with the user’s unique socket ID.
* There is **no locking mechanism** — users can freely draw simultaneously.
  Overlapping strokes are simply layered in the order they arrive.
* The authoritative state is always the server’s `history` array.
  Whenever a user reconnects, their canvas is rebuilt from this shared history.
* This approach ensures consistency while keeping latency extremely low.

---

