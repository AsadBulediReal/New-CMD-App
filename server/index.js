require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const StoredFile = require("./models/StoredFile");

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for potentially large excel JSON conversions

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/cmd_app")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// API Routes

// 1. Save uploaded file data with a custom filename
app.post("/api/files", async (req, res) => {
  try {
    const { filename, headers, rows } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: "Filename is required" });
    }

    const newFile = new StoredFile({
      filename,
      headers: headers || [],
      rows: rows || []
    });

    await newFile.save();
    res.status(201).json({ message: "File saved successfully", fileId: newFile._id });
  } catch (error) {
    console.error("Error saving file:", error);
    res.status(500).json({ error: "Failed to save file data" });
  }
});

// 2. Fetch all saved files metadata (No row data to keep response small)
app.get("/api/files", async (req, res) => {
  try {
    const files = await StoredFile.find({}, { filename: 1, uploadDate: 1, headers: 1 }).sort({ uploadDate: -1 });
    res.status(200).json(files);
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ error: "Failed to fetch files list" });
  }
});

// 3. Fetch a specific file by ID (includes row data)
app.get("/api/files/:id", async (req, res) => {
  try {
    const file = await StoredFile.findById(req.params.id);
    if (!file) return res.status(404).json({ error: "File not found" });
    
    res.status(200).json(file);
  } catch (error) {
    console.error("Error fetching file details:", error);
    res.status(500).json({ error: "Failed to fetch file details" });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
