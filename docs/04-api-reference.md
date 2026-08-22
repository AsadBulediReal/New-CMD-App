# 04 — Backend REST API Route Reference

**System Code**: `CMD-APP-V1`  
**Base URL**: `/api`  

---

## 1. File Management Endpoints (`server/routes/files.js`)

| Route | Method | Payload | Response | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/files` | `GET` | None | `Array<StoredFileMeta>` | Lists all stored file metadata (without row payloads) |
| `/files/:id` | `GET` | `:id` | `StoredFile` | Fetches complete workbook with all re-assembled chunks |
| `/files` | `POST` | `{ filename, headers, rows, sheets }` | `{ message, fileId }` | Single-payload file persistence |
| `/files/init` | `POST` | `{ filename, sheets }` | `{ fileId }` | Initiates chunked upload session |
| `/files/:id/chunk` | `POST` | `{ sheetName, chunkIndex, rows }` | `{ success: true }` | Ingests a 5,000-row slice |
| `/files/:id/finalize` | `POST` | `:id` | `{ message, fileId }` | Finalizes chunk upload & builds metadata |
| `/files/:id/rename` | `PATCH` | `{ newFilename: string }` | `{ message, file }` | Renames saved file |
| `/files/:id` | `DELETE` | `:id` | `{ message }` | Deletes file document & chunks |
| `/files/bulk-delete` | `POST` | `{ ids: string[] }` | `{ message }` | Deletes multiple files simultaneously |
| `/files/recompute-meta` | `POST` | `{ all: boolean }` | `{ message, updated }` | Re-indexes metadata for files |

---

## 2. Processing Engine Endpoints

### Financial Analytics (`server/routes/analytics.js`)
- **`POST /api/analyze-saved-file`**
  - **Payload**: `{ fileId, fieldMap, sheetName, dateFilter }`
  - **Output**: `{ filename, sheets: [Valid, Invalid, BalanceOrder, BulkPayments, Stats, Summary] }`

- **`POST /api/merge-files`**
  - **Payload**: `{ mappings: [{ outputSheetName, sources: [{ fileId, sheetName }] }] }`
  - **Output**: `{ filename, sheets: [MergedSheet1, ...] }`

### Bank Reconciliation (`server/routes/reconcile.js`)
- **`POST /api/reconcile-bs-mis`**
  - **Payload**: `{ bsFileId, misFileId, bsMapping, misMapping, bsDateFilter, misDateFilter }`
  - **Output**: `{ filename, sheets: [Verified MIS, Not Verified BS, Not Verified MIS, Summary] }`

### Audit Classification (`server/routes/audit.js`)
- **`POST /api/audit-saved-file`**
  - **Payload**: `{ fileId, sheetName, fieldMap, categories, validationMode, dateFilter }`
  - **Output**: `{ filename, sheets: [Summary, Cat1, Cat2, ..., nullData] }`

---

## 3. Utility & Security Endpoints

| Route | Method | Payload | Description |
| :--- | :--- | :--- | :--- |
| `/files/decrypt-excel` | `POST` | `{ fileBuffer, password }` | Decrypts single encrypted Excel buffer |
| `/files/decrypt-excel-chunk` | `POST` | `{ uploadId, chunkIndex, totalChunks, chunkData }` | Ingests decryption chunk |
| `/files/decrypt-excel-finish` | `POST` | `{ uploadId, password }` | Assembles and decrypts Excel stream |
| `/parse-txt` | `POST` | `{ textContent }` | Converts raw TXT bank statements to JSON |
| `/report-bug` | `POST` | `{ email, description, photo, metadata }` | Dispatches bug report via SMTP |
| `/health` | `GET` | None | System & MongoDB connection health check |
