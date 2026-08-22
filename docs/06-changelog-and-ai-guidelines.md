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

### Entry 05: Tool Processing & I/O Performance Optimizations
- **Bulk Chunk Insertion**: Replaced individual `new FileChunk().save()` promises with `FileChunk.insertMany(chunkDocs, { ordered: false })` in `files.js` and `fileChunks.js` (10-20x faster chunk storage).
- **Targeted Sheet Chunk Retrieval**: Enhanced `getFileWithChunks` to accept target sheet names, loading only relevant sheet chunks for Audit, Reconcile, and Analytics tools.
- **Compound Indexing**: Added `{ fileId: 1, sheetName: 1, chunkIndex: 1 }` in `FileChunk.js` for instant sheet-specific lookups.
- **Sampled Column Type Detection**: Replaced full-dataset scans in `server/utils/typeDetector.js` and `frontend/src/utils/typeDetector.ts` with smart sampling (max 100 non-empty rows) and fast-fail date matching.
### Entry 06: User Authentication, RBAC, Activity Audit Engine & Guarded Deletion
- **User Approval Lifecycle**: New user registrations require administrator approval. If rejected, an email containing the custom rejection reason is dispatched via `mailer.js`.
- **First Admin Auto-Bootstrap**: The initial user (or `ADMIN_EMAIL`) is automatically granted active Administrator status.
- **Activity Audit Trail**: Non-blocking `logUserActivity` tracks all sensitive operations (`LOGIN`, `UPLOAD_FILE`, `VIEW_FILE`, `RUN_RECONCILIATION`, `REQUEST_DELETE`, `APPROVE_USER`, etc.) to MongoDB.
- **Guarded Deletion System**: Standard users cannot permanently delete files directly; delete actions submit a `DeletionRequest` for admin review and badge files as `isPendingDeletion`.
- **Admin Management Hub**: Full frontend control center (`/admin`) for pending approvals, user statuses, deletion approval queue, and live audit logs.

### Entry 07: In-App Notification Center, Password Recovery & File Access Control
- **In-App Notification Center**: Added `Notification` schema, fail-safe `notify.js` dispatcher, modular `/api/notifications` endpoints, and interactive header Bell dropdown with unread badge counter.
- **Password Reset & Recovery**: Added crypto-token password recovery via email (`/forgot-password`, `/reset-password`) and user profile management (`/profile`).
- **File Ownership & Privacy**: Added `visibility: "team" | "private"` support to `StoredFile.js` with role-based aggregation matching and frontend scope tabs in the Document Vault.

### Entry 08: Admin Infrastructure Diagnostics, Disaster Recovery Snapshots & Audit Inspector
- **Infrastructure Diagnostics**: `GET /api/admin/system-health` providing real-time MongoDB cluster connectivity, ping latency, total document counts per collection, and Node memory usage.
- **Disaster Recovery Snapshot Export**: `GET /api/admin/database/backup` allowing administrators to download a full JSON dump of database collections.
- **Activity Log Inspector Modal**: `AuditLogDetailsModal` offering formatted JSON payload inspection, user-agent details, and clipboard copy directly from the live audit stream.

### Entry 10: Vercel Production API Routing & authFetch URL Resolution
- **Root Cause of `<doctype` SyntaxError**: In production on Vercel, requests made via `authFetch` did not resolve relative paths through `getApiUrl()`, hitting the frontend host instead of the configured API base.
- **Resolution**:
  1. Updated `authFetch` in `AuthContext.tsx` to automatically resolve paths using `getApiUrl()`.
  2. Fixed `api.ts` so `API_BASE_URL` properly resolves across dev and production environments.
  3. Added defensive Content-Type inspection (`safeJson` / `application/json` checks) across `AdminDashboard.tsx`, `PendingUsersTable.tsx`, `DeletionRequestsTable.tsx`, and `AuditLogsViewer.tsx`.
  4. Extracted `RejectUserModal.tsx` sub-component to ensure all admin components strictly adhere to the 300-row file limit.

### Entry 12: Admin Dashboard Default "All" Tab, Notification Deep-Linking & 24h Auto-Disappearance
- **Default "All" Selection**: `PendingUsersTable.tsx` and `DeletionRequestsTable.tsx` now default their filter views to `"all"` when visited directly, while supporting URL query deep links (e.g. `?tab=users&status=pending`).
- **Notification Deep-Linking**: Clicking a user registration notification routes directly to `/admin?tab=users&status=pending`, and clicking a deletion request routes to `/admin?tab=deletions&status=pending`.
- **Task Completion Lifecycle**: When user accounts or deletion requests are approved or rejected, related notifications are automatically marked `isCompleted: true` with a timestamp, rendering `"Task Completed"` with a green checkmark instead of `"View Details"`.
### Entry 13: Feature Showcase Automation & Ultra-HD GIF Generation Pipeline
- **Headless Screenshot Pipeline**: Automated multi-route capture using `puppeteer-core` with system-installed Chrome/Edge across all application modules (`/login`, `/`, `/saved-files`, `/analytics`, `/reconcile`, `/audit`, `/upload`, `/upload-txt`, `/merge-json`, `/admin`, `/profile`).
- **NeuQuant Ultra-HD GIF Encoding**: Integrated `gif-encoder-2` with NeuQuant neural network color quantization and anti-aliased area box filter downsampling, producing crisp UI GIFs for `README.md` without color banding or text blur.
- **Unified Pipeline Script**: Consolidated screenshot capture and GIF generation into `scripts/generate_showcase.js` with flags (`--screenshots`, `--gifs`) and full documentation in `docs/08-showcase-and-media-generation.md`.

### Entry 14: Deployment Method Walkthrough Video Suite
- **Interactive Multi-Method Walkthroughs**: Created `scripts/generate_deployment_videos.js` and `scripts/deployment_templates.js` rendering high-definition, animated step-by-step terminal and browser deployments for Docker (`01_docker_one_click_deployment.gif`), Cloud Vercel/MongoDB Atlas (`02_cloud_vercel_atlas_deployment.gif`), and Standard Node.js (`03_standard_nodejs_deployment.gif`).
- **Detailed ENV Configuration**: Illustrated `.env` secret key generation, MongoDB Atlas cluster URI setup, Vercel cloud environment variable mapping, and live browser previews.
- **README & NPM Integration**: Embedded animated walkthroughs under each method section in `README.md` and added `npm run deployments` script.

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

5. **Auth, RBAC & Guarded Deletion Standards**:
   - Standard users cannot permanently delete files; all deletes must pass through the `DeletionRequest` lifecycle and admin approval queue.
   - Refer to `docs/07-auth-rbac-and-audit-specification.md`.

6. **Mobile-First & Touch-Friendly UI Standards**:
   - All UI pages, modals, tables, and workbench tools MUST be completely responsive across mobile (<640px), tablet (640-1024px), and desktop (>1024px).
   - Ensure touch targets are at least 44x44px.
   - Prevent horizontal overflow by wrapping tables in scrollable containers (`overflow-x-auto min-w-0`).
   - Use mobile drawer sidebars with smooth backdrop dismissals.

7. **Mandatory Terminal Verification & IDE Problems Auto-Check**:
   - Before concluding any task, the AI assistant MUST execute terminal verification commands (e.g. `npm run build` or test runs) and inspect `@[current_problems]`.
   - Any unused imports, dead variables, linter warnings, or TypeScript errors MUST be resolved immediately before handing work back to the user.

---

*Last Updated: 2026-08-22 · Developed for Cash Management Division (CMD) · University of Sindh*
