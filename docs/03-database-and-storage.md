# 03 — Database Schema & Data Optimization

**System Code**: `CMD-APP-V1`  
**Database**: MongoDB 7.0 + Mongoose 9.4  

---

## 1. Data Models & Schemas

### `StoredFile` Schema (`server/models/StoredFile.js`)
Represents the primary file document with rich metadata:

```javascript
const storedFileSchema = new mongoose.Schema({
  filename:         { type: String, required: true, unique: true },
  uploadDate:       { type: Date, default: Date.now },
  hasChunks:        { type: Boolean, default: false },
  headers:          { type: [String], default: [] },
  rows:             { type: [mongoose.Schema.Types.Mixed], default: [] },
  sheets:           [{ name: String, headers: [String], rows: [mongoose.Schema.Types.Mixed] }],
  recordDateRange:  { start: { type: Date, default: null }, end: { type: Date, default: null } },
  totalRecords:     { type: Number, default: 0 },
  columnCount:      { type: Number, default: 0 },
  sheetCount:       { type: Number, default: 0 },
  sheetMeta:        [{ name: String, recordCount: Number, columnCount: Number, columnTypes: [String] }],
  financialSummary: {
    totalDebit: Number,
    totalCredit: Number,
    netFlow: Number,
    debitCount: Number,
    creditCount: Number,
    hasFinancialData: { type: Boolean, default: false }
  }
});
```

### `FileChunk` Schema (`server/models/FileChunk.js`)
Holds sharded row slices to bypass MongoDB's 16MB document size limit:

```javascript
const fileChunkSchema = new mongoose.Schema({
  fileId:     { type: mongoose.Schema.Types.ObjectId, ref: "StoredFile", required: true, index: true },
  sheetName:  { type: String, default: "" },
  chunkIndex: { type: Number, required: true },
  rows:       { type: [mongoose.Schema.Types.Mixed], default: [] }
});

fileChunkSchema.index({ fileId: 1, chunkIndex: 1 });
```

---

## 2. Storage Optimization Techniques

### Array-Row Compression
Converts JSON objects `{"Col": "Val"}` into positional arrays `["Val"]`, stripping empty trailing nulls:
- **Object Row Representation**: ~150 bytes per entry.
- **Array Row Representation**: ~35 bytes per entry.
- **Net Impact**: Over 75% BSON storage reduction.

### Sharded Chunking (`CHUNK_SIZE = 5000`)
- Workbooks are sliced into 5,000-row segments.
- Segments are retrieved in parallel and re-assembled in memory using `getFileWithChunks(id)`.

### Serverless Payload Workaround (Vercel 4.5MB limit)
For large uploads, clients use chunked endpoints:
1. `POST /api/files/init`
2. `POST /api/files/:id/chunk` (repeated per 5,000-row slice)
3. `POST /api/files/:id/finalize`
