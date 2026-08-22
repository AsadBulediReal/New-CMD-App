const AuditLog = require("../models/AuditLog");

/**
 * Non-blocking activity logger helper
 * @param {Object} options
 * @param {Object} options.req - Express request object (optional)
 * @param {Object} options.user - User object override (optional)
 * @param {String} options.action - Action name (e.g. 'UPLOAD_FILE', 'VIEW_FILE', 'RECONCILE')
 * @param {String} options.resourceType - Resource type ('StoredFile', 'User', 'Session', etc.)
 * @param {String} options.resourceId - Target Resource ID or filename
 * @param {Object} options.details - Arbitrary details or parameters
 * @param {String} options.status - 'SUCCESS' | 'FAILED' | 'WARNING'
 */
async function logUserActivity({
  req = null,
  user = null,
  action,
  resourceType = "General",
  resourceId = null,
  details = {},
  status = "SUCCESS",
}) {
  try {
    const activeUser = user || (req && req.user ? req.user : null);
    const ipAddress = req
      ? req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip || null
      : null;
    const userAgent = req ? req.headers["user-agent"] || null : null;

    const logEntry = {
      userId: activeUser ? activeUser._id : null,
      userEmail: activeUser ? activeUser.email : (req?.body?.email || "Guest/Anonymous"),
      userName: activeUser ? activeUser.name : "Anonymous",
      userRole: activeUser ? activeUser.role : "guest",
      action,
      resourceType,
      resourceId: resourceId ? String(resourceId) : null,
      details,
      ipAddress,
      userAgent,
      status,
    };

    // Save asynchronously without blocking caller
    return await AuditLog.create(logEntry);
  } catch (error) {
    // Audit logging failure should not crash the core application flow
    console.warn("⚠️ Non-critical audit log error:", error.message);
    return null;
  }
}

module.exports = {
  logUserActivity,
};
