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
}) {
  try {
    return await Notification.create({
      recipientId,
      recipientRole,
      title,
      message,
      type,
      link,
      read: false,
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
