const Notification = require("../models/Notification");

/**
 * Creates an in-app notification in a non-blocking, fail-safe manner
 */
async function createNotification({
  recipientId = null,
  recipientRole = null,
  title,
  message,
  type = "info",
  link = null,
  relatedId = null,
  isCompleted = null,
}) {
  try {
    const naturallyCompleted = [
      "user_approved",
      "user_rejected",
      "deletion_approved",
      "deletion_rejected",
      "system",
      "info",
    ].includes(type);

    const completed = isCompleted !== null ? isCompleted : naturallyCompleted;

    const notif = await Notification.create({
      recipientId,
      recipientRole,
      title,
      message,
      type,
      link,
      relatedId,
      isCompleted: completed,
      completedAt: completed ? new Date() : null,
      read: false,
      readAt: null,
      createdAt: new Date(),
    });

    try {
      const { emitSocketEvent } = require("./socket");
      // Broadcast general notification event
      emitSocketEvent("notification:new", notif);
      if (recipientId) {
        emitSocketEvent("notification:new", notif, `user:${recipientId}`);
      }
      if (recipientRole) {
        emitSocketEvent("notification:new", notif, `role:${recipientRole}`);
      }
      // Also broadcast refresh data signal
      emitSocketEvent("data:refresh", { type, relatedId });
    } catch (e) {
      // ignore socket dispatch errors
    }

    return notif;
  } catch (error) {
    console.warn("Notification dispatch failed:", error.message);
    return null;
  }
}

module.exports = {
  createNotification,
};
