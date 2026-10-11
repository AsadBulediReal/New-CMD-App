let ioInstance = null;

/**
 * Initializes the Socket.io WebSocket server instance
 * @param {import("http").Server} server - HTTP Server instance
 * @param {string[]} allowedOrigins - Array of allowed client origins
 * @returns {import("socket.io").Server}
 */
function initSocket(server, allowedOrigins = []) {
  const { Server } = require("socket.io");

  const io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    // Clients can join user-specific rooms or role-specific rooms (e.g. 'admin')
    socket.on("join-user", (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
      }
    });

    socket.on("join-room", (roomName) => {
      if (roomName) {
        socket.join(roomName);
      }
    });

    socket.on("leave-room", (roomName) => {
      if (roomName) {
        socket.leave(roomName);
      }
    });
  });

  ioInstance = io;
  return io;
}

/**
 * Gets the current Socket.io server instance
 * @returns {import("socket.io").Server | null}
 */
function getIO() {
  return ioInstance;
}

/**
 * Emits a real-time event to all connected clients or specific rooms
 * @param {string} event - Event name
 * @param {any} data - Event payload data
 * @param {string|null} room - Optional room name
 */
function emitSocketEvent(event, data = {}, room = null) {
  if (!ioInstance) return;
  try {
    if (room) {
      ioInstance.to(room).emit(event, data);
    } else {
      ioInstance.emit(event, data);
    }
  } catch (err) {
    console.warn(`WebSocket emit failed for "${event}":`, err.message);
  }
}

module.exports = {
  initSocket,
  getIO,
  emitSocketEvent,
};
