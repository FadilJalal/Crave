import { io } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const socket = io(BACKEND_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 5,
});

export function connectRestaurantSocket(restaurantId) {
  if (!socket.connected) socket.connect();
  socket.emit("register:restaurant", restaurantId);
}

export function disconnectSocket() { socket.disconnect(); }

export default socket;
