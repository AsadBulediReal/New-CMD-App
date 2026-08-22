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
   - Refer to and maintain `APP_DOCUMENTATION.md` and `docs/01` to `docs/07`.
   - Log all architectural refactors in `docs/06-changelog-and-ai-guidelines.md`.

5. **Auth, RBAC & Guarded Deletion Standards**:
   - Refer to `docs/07-auth-rbac-and-audit-specification.md` for user approval lifecycle, rejection reason emails, action audit logging, and pending deletion workflows.
   - Regular users must NEVER have direct permanent delete permissions. All deletions must go through the admin approval queue.

6. **Mobile-First & Responsive UI Standards**:
   - Every UI component and page MUST be fully responsive and optimized for mobile devices, tablets, and desktops (`sm:`, `md:`, `lg:`).
   - Use mobile drawer navigation, hamburger triggers, and touch-friendly interactive targets ($\ge 44\text{px}$).
   - Tables and complex data viewers MUST have `overflow-x-auto`, `min-w-0`, and adaptive spacing (`p-3 sm:p-6`) to prevent horizontal viewport clipping or overflow.
