# 06 — Architecture Refactor Changelog & AI Directives

**System Code**: `CMD-APP-V1`  
**Purpose**: System Modification Log & Operational Instructions for AI Assistants & Developers  

---

## 1. Chronological Modification Logs

### Entry 01: Monolithic Backend Decomposition
- **Prior State**: Monolithic `server/index.js` (~1,429 lines) contained all Express configuration, database connections, helper functions, and 18+ endpoint handlers.
- **Refactored Architecture**:
  - `server/index.js` (56 lines): Clean entry point handling middleware, CORS, and mounting sub-routers.
  - `server/utils/db.js` (56 lines): Global connection pooling (`global.mongoose`), serverless connection options, and request-level connection assurance (`dbMiddleware`).
  - `server/utils/metaHelpers.js` (276 lines): Shared data formatting, date parsing, column typing, and chunk reassembly.
  - `server/routes/files.js` (291 lines): File CRUD, aggregation queries, renaming, and bulk deletion.
  - `server/routes/fileChunks.js` (140 lines): Chunked upload protocol (`init`, `chunk`, `finalize`).
  - `server/routes/analytics.js` (160 lines): Statement analysis and multi-file report merging.
  - `server/routes/reconcile.js` (105 lines): Bank Statement vs MIS dual-matching engine.
  - `server/routes/audit.js` (91 lines): University fee audit classification.
  - `server/routes/decrypt.js` (90 lines): Password-protected Excel decryption streaming.
  - `server/routes/misc.js` (93 lines): TXT statement parser, SMTP bug reporting, and health checks.

### Entry 02: Vercel Serverless DB Disconnect Fix
- **Root Cause**: Vercel freezes idle containers and drops TCP sockets. When requests resume, stale connections fail with socket timeouts or connection pool exhaustion.
- **Solution**:
  1. Implemented global connection caching (`global.mongoose = { conn, promise }`).
  2. Applied `family: 4`, `maxPoolSize: 10`, and `serverSelectionTimeoutMS: 5000`.
  3. Integrated `app.use(dbMiddleware)` ensuring every request verifies an active connection (`readyState === 1`) before executing.

### Entry 03: Chunked Upload Duplicate & Aborted Session Recovery
- **Root Cause**: `POST /api/files/init` threw 400 Bad Request if a file existed or if a previous upload was interrupted mid-transfer (leaving an unfinalized 0-record entry).
- **Solution**: Added auto-recovery in `fileChunks.js` and `files.js` to automatically purge stale chunks and reset session if `totalRecords === 0` or if `overwrite: true` is supplied.

### Entry 04: Error Message Standardization & Simplification
- Replaced all verbose backend error sentences with concise, user-friendly strings (e.g. `"File already exists"`, `"Database unavailable"`, `"Incorrect password"`, `"Session expired"`).

---

## 2. AI Assistant & Developer Directives

Any AI coding assistant or developer working on this codebase **MUST** follow these rules:

1. **Strict 300-Row File Limit**:
   - Never create or expand any code or markdown file beyond ~300 rows.
   - Decompose expanding features into sub-components, dedicated controllers, or utility modules.

2. **Route Organization Pattern**:
   - Do NOT add route handlers directly into `server/index.js`.
   - Place new endpoints in the appropriate `server/routes/<module>.js` file and mount them via `app.use("/api", router)` in `server/index.js`.

3. **Database Operations**:
   - Always route MongoDB connections through `server/utils/db.js`.
   - Do NOT instantiate raw `mongoose.connect()` calls in route files.

4. **Documentation Synchronization**:
   - When modifying modules, update both `APP_DOCUMENTATION.md` and the relevant `docs/0X-*.md` file.

---

*Last Updated: 2026-08-22 · Developed for Cash Management Division (CMD) · University of Sindh*
