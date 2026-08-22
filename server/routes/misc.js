const express = require("express");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const { parse_txt_content_to_json } = require("../utils/txtToJsonParser");
const { connectDB } = require("../utils/db");

const router = express.Router();

// 1.5 Parse TXT content string to JSON format
router.post("/parse-txt", (req, res) => {
  try {
    const { textContent } = req.body;
    if (!textContent) {
      return res.status(400).json({ error: "Text content required" });
    }

    const parsedData = parse_txt_content_to_json(textContent);
    res.status(200).json(parsedData);
  } catch (error) {
    console.error("Error parsing txt file:", error);
    res.status(500).json({ error: "TXT parse failed" });
  }
});

// 9. Report Bug / Feedback
router.post("/report-bug", async (req, res) => {
  try {
    const { email, description, photo, metadata } = req.body;

    if (!description) {
      return res.status(400).json({ error: "Description required" });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const attachments = [];
    if (photo && photo.startsWith("data:image")) {
      const base64Data = photo.split(",")[1];
      const extension = photo.split(";")[0].split("/")[1];
      attachments.push({
        filename: `screenshot.${extension}`,
        content: base64Data,
        encoding: "base64",
      });
    }

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: process.env.REPORT_RECIPIENT || "bulediasadjamil@gmail.com",
      subject: "New Bug Report - CMD System",
      text: `
User Email: ${email || "Not provided"}
Description: ${description}

Metadata:
${JSON.stringify(metadata, null, 2)}
      `,
      attachments: attachments,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Bug report sent successfully" });
  } catch (error) {
    console.error("Error sending bug report:", error);
    res.status(500).json({ error: "Bug report failed" });
  }
});

// 10. Health Check / Initialization (Proactively reconnects on Serverless cold starts)
router.get("/health", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDB().catch(() => {});
    }

    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? "connected" : dbState === 2 ? "connecting" : "disconnected";

    if (dbState !== 1) {
      return res.status(503).json({
        status: "connecting",
        database: dbStatus,
        message: dbState === 2 ? "Database connecting" : "Database disconnected",
        timestamp: new Date().toISOString(),
        version: "1.0.0"
      });
    }

    res.status(200).json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
      version: "1.0.0"
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

module.exports = router;
