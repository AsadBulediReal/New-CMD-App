const mongoose = require("mongoose");

const storedFileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
  },
  uploadDate: {
    type: Date,
    default: Date.now,
  },
  headers: {
    type: [String],
    default: [],
  },
  rows: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
});

module.exports = mongoose.model("StoredFile", storedFileSchema);
