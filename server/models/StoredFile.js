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
  hasChunks: {
    type: Boolean,
    default: false,
  },
  headers: {
    type: [String],
    default: [],
  },
  rows: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  sheets: {
    type: [{
      name: String,
      headers: [String],
      rows: [mongoose.Schema.Types.Mixed]
    }],
    default: [],
  },
  // ── Rich Metadata ──────────────────────────────────────────────────────────
  recordDateRange: {
    start: { type: Date, default: null },
    end: { type: Date, default: null }
  },
  // Total records stored across all sheets (persisted, no aggregate needed)
  totalRecords: { type: Number, default: 0 },
  // Column count in the primary sheet
  columnCount: { type: Number, default: 0 },
  // Sheet count
  sheetCount: { type: Number, default: 0 },
  // Per-sheet summary
  sheetMeta: {
    type: [{
      name: String,
      recordCount: Number,
      columnCount: Number,
      columnTypes: { type: [String], default: [] }
    }],
    default: [],
  },
  // Financial summary extracted from Debit / Credit columns (if they exist)
  financialSummary: {
    totalDebit:  { type: Number, default: null },
    totalCredit: { type: Number, default: null },
    netFlow:     { type: Number, default: null },
    debitCount:  { type: Number, default: null },
    creditCount: { type: Number, default: null },
    hasFinancialData: { type: Boolean, default: false },
  }
});

module.exports = mongoose.model("StoredFile", storedFileSchema);
