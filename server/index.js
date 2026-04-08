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

const { parse_txt_content_to_json } = require("./utils/txtToJsonParser");

// 1. Save uploaded file data with a custom filename
app.post("/api/files", async (req, res) => {
  try {
    const { filename, headers, rows, sheets } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: "Filename is required" });
    }

    const existingFile = await StoredFile.findOne({ filename });
    if (existingFile) {
      return res.status(400).json({ error: "A file with this name already exists. Please choose a different name." });
    }

    let primaryHeaders = headers || [];
    let primaryRows = rows || [];
    
    // Backfill top-level properties so aggregations still work perfectly
    if (sheets && sheets.length > 0) {
      if (primaryHeaders.length === 0) {
        primaryHeaders = sheets[0].headers || [];
      }
      if (primaryRows.length === 0) {
        primaryRows = sheets[0].rows || [];
      }
    }

    const newFile = new StoredFile({
      filename,
      headers: primaryHeaders,
      rows: primaryRows,
      sheets: sheets || []
    });

    await newFile.save();
    res.status(201).json({ message: "File saved successfully", fileId: newFile._id });
  } catch (error) {
    console.error("Error saving file:", error);
    res.status(500).json({ error: "Failed to save file data" });
  }
});

// 1.5 Parse TXT content string to JSON format
app.post("/api/parse-txt", (req, res) => {
  try {
    const { textContent } = req.body;
    if (!textContent) {
      return res.status(400).json({ error: "Text content is required" });
    }
    
    const parsedData = parse_txt_content_to_json(textContent);
    res.status(200).json(parsedData);
  } catch (error) {
    console.error("Error parsing txt file:", error);
    res.status(500).json({ error: "Failed to parse TXT file" });
  }
});

// 2. Fetch all saved files metadata (No row data to keep response small)
app.get("/api/files", async (req, res) => {
  try {
    const files = await StoredFile.aggregate([
      {
        $project: {
          filename: 1,
          uploadDate: 1,
          headers: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ["$headers", []] } }, 0] },
              then: "$headers",
              else: {
                $let: {
                  vars: { firstSheet: { $arrayElemAt: ["$sheets", 0] } },
                  in: { $ifNull: ["$$firstSheet.headers", []] }
                }
              }
            }
          },
          totalRecords: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ["$rows", []] } }, 0] },
              then: { $size: { $ifNull: ["$rows", []] } },
              else: {
                $let: {
                  vars: { firstSheet: { $arrayElemAt: ["$sheets", 0] } },
                  in: { $size: { $ifNull: ["$$firstSheet.rows", []] } }
                }
              }
            }
          }
        }
      },
      { $sort: { uploadDate: -1 } }
    ]);
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

// 4. Delete a specific file by ID
app.delete("/api/files/:id", async (req, res) => {
  try {
    const file = await StoredFile.findByIdAndDelete(req.params.id);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }
    res.status(200).json({ message: "File successfully deleted" });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
