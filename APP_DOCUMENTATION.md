# CMD Finance Application — Master Architecture & Reference Manual

**Institutional Platform**: Finance Wing · University of Sindh, Jamshoro  
**System Code**: `CMD-APP-V1`  
**Repository**: `AsadBulediReal/New-CMD-App`  

---

> [!IMPORTANT]
> **MANDATORY CODING & FILE ARCHITECTURE STANDARD (300-ROW MAXIMUM RULE)**:
> - **Every code file (`.ts`, `.tsx`, `.js`, `.css`) and documentation file (`.md`) MUST be restricted to approximately 300 rows/lines maximum.**
> - Monolithic files must be refactored into cohesive modular sub-components, dedicated Express routers, and utility helper files.
> - Backend routes are strictly divided under `server/routes/` with core logic in `server/utils/` to guarantee clean separation of concerns and maintainability.

---

## 📑 Modular Documentation Directory

This documentation suite is organized into focused, modular specifications (each strictly $\le 300$ rows):

1. 🏛️ **[System Architecture & Technology Stack](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/docs/01-architecture-and-stack.md)**  
   *Architecture topology, React 19 / Node / MongoDB stack, OKLCH design system, and custom animations.*

2. ⚙️ **[Application Modules & Functional Specs](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/docs/02-modules-specification.md)**  
   *Specifications for MOD-01 (TXT Ingestion), MOD-02 (Reconciliation), MOD-03 (Consolidation), MOD-04 (Analytics), MOD-05 (Audit), MOD-06 (Excel Workbench), and Document Vault.*

3. 💾 **[Database Schema & Storage Optimizations](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/docs/03-database-and-storage.md)**  
   *Mongoose models, array-row compression (>75% BSON space savings), and 5,000-row chunk sharding.*

4. 📡 **[Backend REST API Reference](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/docs/04-api-reference.md)**  
   *Complete REST endpoint table, request payloads, response schemas, and error handling protocols.*

5. 🛠️ **[Developer Guidelines & Extension Workflows](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/docs/05-developer-guidelines.md)**  
   *Step-by-step guides for adding audit categories, registering new processing engines, and Docker ops.*

6. 🤖 **[Refactor Changelog & AI Directives](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/docs/06-changelog-and-ai-guidelines.md)**  
   *Decomposition history of `server/index.js`, Vercel serverless DB reconnect solution, and rules for future AI pair-programmers.*

7. 🔐 **[Auth, RBAC, Audit & Guarded Deletion](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/docs/07-auth-rbac-and-audit-specification.md)**  
   *User registration approval lifecycle, rejection reason email dispatch, activity audit logging, and admin-guarded deletion workflows.*

8. 🎬 **[Showcase & Media Generation Guide](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/docs/08-showcase-and-media-generation.md)**  
   *Automated screenshot and Ultra-HD animated GIF generation pipeline for README and documentation.*

---

## 🤖 Instructions for AI Assistants & Next Developers

When assisting on this repository, future AI agents and developers must adhere to the following directives:
1. **Never create monolithic files**: Always decompose features when a file approaches ~300 rows.
2. **Modular Express routing**: Place new endpoints in `server/routes/<module>.js` and mount in `server/index.js`.
3. **Database connection safety**: Always rely on `server/utils/db.js` (`dbMiddleware` and `global.mongoose` caching) for serverless compatibility.
4. **Documentation sync**: Update the relevant `docs/0X-*.md` modules whenever modifying schemas or features.

---

## 🚀 Quick Start (Docker)

```bash
# Clone repository
git clone https://github.com/AsadBulediReal/New-CMD-App.git
cd New-CMD-App

# Start containerized stack
docker-compose up --build -d

# View live log streams
docker-compose logs -f
```

---

*Last Updated: 2026-08-22 · Developed for Cash Management Division (CMD) · University of Sindh*
