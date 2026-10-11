import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "./api";

let socketInstance: Socket | null = null;

/**
 * Initializes or returns the singleton Socket.io client instance.
 * Automatically resolves the server WebSocket endpoint and connects.
 */
export function getSocket(): Socket {
  if (!socketInstance) {
    const socketUrl = API_BASE_URL || window.location.origin;
    socketInstance = io(socketUrl, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketInstance.on("connect", () => {
      // Re-register user ID or roles if saved in localStorage
      const savedUser = localStorage.getItem("cmd_user");
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          if (user?._id) socketInstance?.emit("join-user", user._id);
          if (user?.role) socketInstance?.emit("join-room", `role:${user.role}`);
        } catch {
          // ignore
        }
      }
    });

    // Pipe server data:refresh signals directly into custom DOM events
    // for seamless, instant live-updating across all listening components
    socketInstance.on("data:refresh", (data) => {
      window.dispatchEvent(new CustomEvent("cmd:refresh-data", { detail: data }));
    });

    socketInstance.on("files:changed", (data) => {
      window.dispatchEvent(new CustomEvent("cmd:files-changed", { detail: data }));
      window.dispatchEvent(new CustomEvent("cmd:refresh-data", { detail: data }));
    });

    socketInstance.on("notification:new", (data) => {
      window.dispatchEvent(new CustomEvent("cmd:notification-new", { detail: data }));
      window.dispatchEvent(new CustomEvent("cmd:refresh-data", { detail: data }));
    });
  }

  return socketInstance;
}

/**
 * Associates active socket session with authenticated user and roles
 */
export function registerSocketUser(userId: string, role?: string) {
  const socket = getSocket();
  if (socket.connected) {
    if (userId) socket.emit("join-user", userId);
    if (role) socket.emit("join-room", `role:${role}`);
  } else {
    socket.once("connect", () => {
      if (userId) socket.emit("join-user", userId);
      if (role) socket.emit("join-room", `role:${role}`);
    });
  }
}

/**
 * Disconnects socket on logout
 */
export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
