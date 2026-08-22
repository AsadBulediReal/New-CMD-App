const mongoose = require("mongoose");

const fileChunkSchema = new mongoose.Schema({
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "StoredFile",
    required: true,
    index: true
  },
  sheetName: {
    type: String,
    default: ""
  },
  chunkIndex: {
    type: Number,
    required: true
  },
  rows: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  }
});

// Index to speed up fragmented multi-chunk retrieval and sheet queries
fileChunkSchema.index({ fileId: 1, chunkIndex: 1 });
fileChunkSchema.index({ fileId: 1, sheetName: 1, chunkIndex: 1 });

module.exports = mongoose.model("FileChunk", fileChunkSchema);
