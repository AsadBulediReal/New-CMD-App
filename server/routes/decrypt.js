const express = require("express");
const officeCrypto = require("officecrypto-tool");

const router = express.Router();

const decryptUploadSessions = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of decryptUploadSessions.entries()) {
    if (now - session.createdAt > 10 * 60 * 1000) {
      decryptUploadSessions.delete(id);
    }
  }
}, 5 * 60 * 1000);

// Endpoint to decrypt password-protected Excel files
router.post("/files/decrypt-excel", async (req, res) => {
  try {
    const { fileBuffer, password } = req.body;
    if (!fileBuffer || !password) {
      return res.status(400).json({ error: "Password required" });
    }

    const buffer = Buffer.from(fileBuffer, "base64");
    const decryptedBuffer = await officeCrypto.decrypt(buffer, { password });

    res.json({
      success: true,
      decryptedBuffer: decryptedBuffer.toString("base64")
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (errorMsg.toLowerCase().includes("password") || errorMsg.toLowerCase().includes("incorrect")) {
      return res.status(401).json({ error: "Incorrect password" });
    }
    return res.status(400).json({ error: "Decryption failed" });
  }
});

// Endpoint to receive a chunk of an encrypted Excel file
router.post("/files/decrypt-excel-chunk", (req, res) => {
  try {
    const { uploadId, chunkIndex, totalChunks, chunkData } = req.body;
    if (!uploadId || chunkIndex === undefined || !totalChunks || !chunkData) {
      return res.status(400).json({ error: "Missing chunk parameters" });
    }

    if (!decryptUploadSessions.has(uploadId)) {
      decryptUploadSessions.set(uploadId, {
        totalChunks,
        chunks: new Array(totalChunks),
        receivedCount: 0,
        createdAt: Date.now(),
      });
    }

    const session = decryptUploadSessions.get(uploadId);
    if (!session.chunks[chunkIndex]) {
      session.chunks[chunkIndex] = chunkData;
      session.receivedCount++;
    }

    res.json({ success: true, received: session.receivedCount, total: totalChunks });
  } catch (err) {
    console.error("Error in decrypt chunk:", err);
    res.status(500).json({ error: "Chunk processing failed" });
  }
});

// Endpoint to assemble chunks and decrypt password-protected Excel file
router.post("/files/decrypt-excel-finish", async (req, res) => {
  try {
    const { uploadId, password } = req.body;
    if (!uploadId || !password) {
      return res.status(400).json({ error: "Password required" });
    }

    const session = decryptUploadSessions.get(uploadId);
    if (!session) {
      return res.status(404).json({ error: "Session expired" });
    }

    if (session.receivedCount < session.totalChunks) {
      return res.status(400).json({ error: "Incomplete upload" });
    }

    const fullBase64 = session.chunks.join("");
    decryptUploadSessions.delete(uploadId);

    const buffer = Buffer.from(fullBase64, "base64");
    const decryptedBuffer = await officeCrypto.decrypt(buffer, { password });

    res.json({
      success: true,
      decryptedBuffer: decryptedBuffer.toString("base64")
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (errorMsg.toLowerCase().includes("password") || errorMsg.toLowerCase().includes("incorrect")) {
      return res.status(401).json({ error: "Incorrect password" });
    }
    return res.status(400).json({ error: "Decryption failed" });
  }
});

module.exports = router;
