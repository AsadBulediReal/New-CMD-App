# Workspace Coding & Architecture Standards

## 1. Mandatory 300-Row File Length Standard
- **Every code file (`.ts`, `.tsx`, `.js`, `.css`) and documentation file (`.md`) MUST NOT exceed approximately 300 rows/lines.**
- When a file grows near 300 lines, proactively decompose it into cohesive sub-components, dedicated controllers, or utility modules.

## 2. Server & Backend Routing Guidelines
- Do NOT add route handlers directly into `server/index.js`.
- Place all new endpoints in domain-specific routers under `server/routes/<module>.js` and mount them in `server/index.js`.
- Keep error messages simple, short, and user-friendly (e.g. `"File already exists"`, `"Database unavailable"`, `"File not found"`).

## 3. Database Connection & Serverless Safety
- Always route MongoDB connections through `server/utils/db.js` (`connectDB` / `dbMiddleware`).
- Preserve global connection caching (`global.mongoose = { conn, promise }`) and serverless options (`maxPoolSize: 10`, `family: 4`, `serverSelectionTimeoutMS: 5000`) for Vercel compatibility.

## 4. Documentation & Changelog Maintenance
- Maintain `APP_DOCUMENTATION.md` and the modular docs in `docs/` (`01` through `06`).
- Whenever making architecture or functional modifications, log the change in `docs/06-changelog-and-ai-guidelines.md`.
