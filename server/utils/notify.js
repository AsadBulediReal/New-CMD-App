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

    return await Notification.create({
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
  } catch (error) {
    console.warn("Notification dispatch failed:", error.message);
    return null;
  }
}

module.exports = {
  createNotification,
};
