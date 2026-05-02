/**
 * Socket.io singleton manager for the backend.
 * Attach to server via `initSocket(httpServer)` at startup,
 * then emit events anywhere with `emitToUser()` / `emitToRestaurant()`.
 */

import { Server } from "socket.io";
import logger from "./logger.js";

let io = null;

// Map of userId → socket.id and restaurantId → socket.id
const userSockets = new Map();
const restaurantSockets = new Map();

/**
 * Initialise Socket.io — call once in server.js.
 * @param {import("http").Server} httpServer
 * @param {string[]} allowedOrigins
 */
export function initSocket(httpServer, allowedOrigins = []) {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins.length ? allowedOrigins : "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    logger.info(`[Socket] Client connected: ${socket.id}`);

    // Client registers itself with its userId
    socket.on("register:user", (userId) => {
      if (userId) {
        userSockets.set(String(userId), socket.id);
        socket.join(`user:${userId}`);
        logger.info(`[Socket] User ${userId} registered → ${socket.id}`);
      }
    });

    // Restaurant admin registers with restaurantId
    socket.on("register:restaurant", (restaurantId) => {
      if (restaurantId) {
        restaurantSockets.set(String(restaurantId), socket.id);
        socket.join(`restaurant:${restaurantId}`);
        logger.info(`[Socket] Restaurant ${restaurantId} registered → ${socket.id}`);
      }
    });

    socket.on("disconnect", () => {
      // Clean up maps
      for (const [k, v] of userSockets.entries()) {
        if (v === socket.id) { userSockets.delete(k); break; }
      }
      for (const [k, v] of restaurantSockets.entries()) {
        if (v === socket.id) { restaurantSockets.delete(k); break; }
      }
      logger.info(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  logger.info("[Socket] Socket.io initialised");
  return io;
}

/**
 * Emit an event to a specific customer.
 * @param {string} userId
 * @param {string} event
 * @param {*} data
 */
export function emitToUser(userId, event, data) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Emit an event to a restaurant admin panel.
 * @param {string} restaurantId
 * @param {string} event
 * @param {*} data
 */
export function emitToRestaurant(restaurantId, event, data) {
  if (!io) return;
  io.to(`restaurant:${restaurantId}`).emit(event, data);
}

/**
 * Broadcast to all connected clients.
 * @param {string} event
 * @param {*} data
 */
export function broadcast(event, data) {
  if (!io) return;
  io.emit(event, data);
}

export { io };
