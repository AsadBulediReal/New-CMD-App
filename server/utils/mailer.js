const nodemailer = require("nodemailer");

/**
 * Configure SMTP Transporter using environment variables.
 * If credentials are not provided, it falls back to a simulated console logger.
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: { user, pass },
    });
  }
  return null;
}

const transporter = createTransporter();
const FROM_EMAIL = process.env.SMTP_FROM || `"CMD Finance System" <no-reply@cmd.usindh.edu.pk>`;
const APP_NAME = "CMD Finance Portal · University of Sindh";

/**
 * Helper to dispatch email safely
 */
async function sendMailSafe({ to, subject, html, text }) {
  if (!transporter) {
    console.log(`\n📧 [EMAIL SIMULATION - SMTP not configured in .env]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content:\n${text || html}\n`);
    return { simulated: true, success: true };
  }

  try {
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject,
      text: text || "",
      html,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Email dispatch failed:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 1. Alert Admin when a new account is registered
 */
async function sendAdminNewUserAlert(adminEmail, newUser) {
  const subject = `[Action Required] New Account Registration Pending Approval: ${newUser.name}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0f172a; margin-top: 0;">New Account Registration</h2>
      <p style="color: #334155; font-size: 15px;">A new user has registered on the <strong>${APP_NAME}</strong> and is awaiting your review:</p>
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <p style="margin: 5px 0;"><strong>Name:</strong> ${newUser.name}</p>
        <p style="margin: 5px 0;"><strong>Email:</strong> ${newUser.email}</p>
        <p style="margin: 5px 0;"><strong>Registered At:</strong> ${new Date(newUser.registeredAt || Date.now()).toLocaleString()}</p>
      </div>
      <p style="color: #475569; font-size: 14px;">Please sign in to the Admin Dashboard to approve or reject this request.</p>
    </div>
  `;
  return sendMailSafe({ to: adminEmail, subject, html, text: `New user ${newUser.name} (${newUser.email}) is pending approval.` });
}

/**
 * 2. Notify User when their account is Approved
 */
async function sendAccountApprovedEmail(user) {
  const loginUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const subject = `Welcome! Your Account has been Approved — ${APP_NAME}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #10b981; border-radius: 8px;">
      <h2 style="color: #065f46; margin-top: 0;">🎉 Account Approved!</h2>
      <p style="color: #334155; font-size: 15px;">Hello <strong>${user.name}</strong>,</p>
      <p style="color: #334155; font-size: 15px;">Your account on the <strong>${APP_NAME}</strong> has been approved by the Administrator.</p>
      <p style="color: #334155; font-size: 15px;">You can now log in and access your workspace.</p>
      <div style="margin: 25px 0; text-align: center;">
        <a href="${loginUrl}" style="background-color: #0284c7; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Log In to CMD Portal</a>
      </div>
    </div>
  `;
  return sendMailSafe({ to: user.email, subject, html, text: `Hello ${user.name}, your account on ${APP_NAME} has been approved.` });
}

/**
 * 3. Notify User when their account is Rejected with Admin Reason
 */
async function sendAccountRejectedEmail(user, rejectionReason) {
  const reasonText = rejectionReason && rejectionReason.trim() ? rejectionReason.trim() : "No specific reason provided by the administrator.";
  const subject = `Account Registration Status Update — ${APP_NAME}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ef4444; border-radius: 8px;">
      <h2 style="color: #991b1b; margin-top: 0;">Account Request Status</h2>
      <p style="color: #334155; font-size: 15px;">Hello <strong>${user.name}</strong>,</p>
      <p style="color: #334155; font-size: 15px;">Thank you for your interest in the <strong>${APP_NAME}</strong>.</p>
      <p style="color: #334155; font-size: 15px;">We regret to inform you that your registration request could not be approved at this time.</p>
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 15px 0; border-radius: 4px;">
        <p style="margin: 0; color: #7f1d1d; font-weight: bold;">Reason for Rejection:</p>
        <p style="margin: 5px 0 0 0; color: #991b1b; font-size: 14px;">${reasonText}</p>
      </div>
      <p style="color: #64748b; font-size: 13px;">If you believe this is an error, please contact the Cash Management Division administrator.</p>
    </div>
  `;
  return sendMailSafe({ to: user.email, subject, html, text: `Hello ${user.name}, your registration request was rejected. Reason: ${reasonText}` });
}

/**
 * 4. Alert Admin when a user submits a Deletion Request
 */
async function sendAdminDeletionAlert(adminEmail, requestDetails) {
  const subject = `[Action Required] File Deletion Request: ${requestDetails.targetName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f59e0b; border-radius: 8px;">
      <h2 style="color: #92400e; margin-top: 0;">Pending Deletion Approval</h2>
      <p style="color: #334155; font-size: 15px;">A user has requested to delete a stored file from the system:</p>
      <div style="background-color: #fffbeb; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 5px 0;"><strong>File:</strong> ${requestDetails.targetName}</p>
        <p style="margin: 5px 0;"><strong>Requested By:</strong> ${requestDetails.requestedByName} (${requestDetails.requestedByEmail})</p>
        <p style="margin: 5px 0;"><strong>Reason:</strong> ${requestDetails.reason || "N/A"}</p>
      </div>
      <p style="color: #475569; font-size: 14px;">Please review this in the Admin Deletion Queue to permanently purge or reject the request.</p>
    </div>
  `;
  return sendMailSafe({ to: adminEmail, subject, html, text: `Deletion request for ${requestDetails.targetName} by ${requestDetails.requestedByName}.` });
}

/**
 * 5. Notify User when their Deletion Request is resolved (Approved/Rejected)
 */
async function sendDeletionStatusEmail(userEmail, targetName, isApproved, adminNote) {
  const statusColor = isApproved ? "#10b981" : "#ef4444";
  const statusTitle = isApproved ? "Deletion Approved" : "Deletion Request Rejected";
  const subject = `Deletion Request Update: ${targetName} — ${statusTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid ${statusColor}; border-radius: 8px;">
      <h2 style="color: ${statusColor}; margin-top: 0;">${statusTitle}</h2>
      <p style="color: #334155; font-size: 15px;">Your request to delete the file <strong>${targetName}</strong> has been reviewed by the Administrator.</p>
      <p style="color: #334155; font-size: 15px;"><strong>Status:</strong> ${isApproved ? "Approved (File Permanently Deleted)" : "Rejected (File Retained)"}</p>
      ${adminNote ? `<div style="background-color: #f8fafc; padding: 10px; border-radius: 4px; margin-top: 10px;"><p style="margin: 0; color: #475569; font-size: 13px;"><strong>Admin Note:</strong> ${adminNote}</p></div>` : ""}
    </div>
  `;
  return sendMailSafe({ to: userEmail, subject, html, text: `Your deletion request for ${targetName} was ${isApproved ? 'Approved' : 'Rejected'}.` });
}

/**
 * 6. Send Password Reset Link / OTP Email
 */
async function sendPasswordResetEmail(user, resetToken) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;
  const subject = `Password Reset Request — ${APP_NAME}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0f172a; margin-top: 0;">Password Reset Request</h2>
      <p style="color: #334155; font-size: 15px;">Hello <strong>${user.name}</strong>,</p>
      <p style="color: #334155; font-size: 15px;">We received a request to reset your password for your <strong>${APP_NAME}</strong> account.</p>
      <div style="margin: 25px 0; text-align: center;">
        <a href="${resetLink}" style="background-color: #0284c7; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: #64748b; font-size: 13px;">This link will expire in 1 hour. If you did not request this, you can safely ignore this message.</p>
    </div>
  `;
  return sendMailSafe({ to: user.email, subject, html, text: `Password reset link: ${resetLink}` });
}

/**
 * 7. Verify SMTP connection status
 */
async function verifySmtpConnection() {
  if (!transporter) {
    return {
      configured: false,
      connected: false,
      status: "Not Configured",
      mode: "Simulation Mode (Console Logs)",
      host: process.env.SMTP_HOST || "None",
      sender: FROM_EMAIL,
    };
  }

  try {
    const verifyPromise = transporter.verify();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Connection verification timeout (4s)")), 4000)
    );
    await Promise.race([verifyPromise, timeoutPromise]);

    return {
      configured: true,
      connected: true,
      status: "Connected & Verified",
      mode: "Live SMTP Delivery",
      host: process.env.SMTP_HOST || "Custom SMTP",
      port: process.env.SMTP_PORT || 587,
      sender: FROM_EMAIL,
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      status: "Offline / Error",
      mode: "Delivery Blocked",
      host: process.env.SMTP_HOST || "Custom SMTP",
      sender: FROM_EMAIL,
      error: error.message,
    };
  }
}

module.exports = {
  sendMailSafe,
  sendAdminNewUserAlert,
  sendAccountApprovedEmail,
  sendAccountRejectedEmail,
  sendAdminDeletionAlert,
  sendDeletionStatusEmail,
  sendPasswordResetEmail,
  verifySmtpConnection,
};
