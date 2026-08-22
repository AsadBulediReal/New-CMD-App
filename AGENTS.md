# Agent Instructions & Project Standards

## Mandatory Project Rules for All AI Sessions

1. **300-Row Maximum File Length Rule**:
   - Every file in this project (`.ts`, `.tsx`, `.js`, `.css`, `.md`) must be kept under ~300 rows.
   - Decompose expanding features into sub-components, dedicated controllers, or utility modules.

2. **Modular Backend Routing**:
   - `server/index.js` must remain a lightweight entry point (<100 lines).
   - All endpoints belong in domain routers under `server/routes/` and helpers in `server/utils/`.
   - Error messages returned from APIs must remain short and concise (e.g. `"File already exists"`, `"Database unavailable"`).

3. **Serverless MongoDB Safety (Vercel Compatibility)**:
   - All database interactions must use `server/utils/db.js` (`connectDB` and `dbMiddleware`).
   - Preserve `global.mongoose` connection caching and IPv4 settings.

4. **Documentation & Changelog**:
   - Refer to and maintain `APP_DOCUMENTATION.md` and `docs/01` to `docs/06`.
   - Log all architectural refactors in `docs/06-changelog-and-ai-guidelines.md`.
