/**
 * Socket.io singleton client for the customer frontend.
 * Import `socket` and call socket.connect() after login.
 */

import { io } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const socket = io(BACKEND_URL, {
  autoConnect: false,      // Don't connect until user is logged in
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

/**
 * Connect and register the user so the server routes events to them.
 * Call this right after a successful login.
 * @param {string} userId
 */
export function connectSocket(userId) {
  if (!socket.connected) socket.connect();
  socket.emit("register:user", userId);
}

/**
 * Disconnect — call on logout.
 */
export function disconnectSocket() {
  socket.disconnect();
}

export default socket;
