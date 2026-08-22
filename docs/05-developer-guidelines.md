# 05 — Developer Guidelines & Standards

**System Code**: `CMD-APP-V1`  
**Standard**: Modular Clean Code Architecture  

---

## 1. Mandatory File Length Standard (Strict Rule)

> [!IMPORTANT]
> **MANDATORY 300-ROW MAXIMUM FILE LENGTH RULE**:
> To preserve high maintainability, code comprehensibility, modular testing isolation, and avoid bloated monoliths:
> - **Every single code file (`.ts`, `.tsx`, `.js`, `.css`) and documentation file (`.md`) MUST be restricted to approximately 300 rows/lines maximum.**
> - If any component, route handler, or utility expands beyond ~300 rows, it **MUST be immediately refactored** into cohesive sub-components, helper utilities, or dedicated route controllers.
> - Monolithic entry points (like `server/index.js`) must delegate domain logic to separate sub-routers in `server/routes/` and helpers in `server/utils/`.

---

## 2. Developer Extension Workflows

### Adding a New Audit Category
1. Open [auditHelper.js](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/server/utils/auditHelper.js).
2. Add the two-digit prefix code and category name to `auditCategories`:
   ```javascript
   const auditCategories = {
     // ...
     "75": "new_special_fee_category"
   };
   ```
3. Open [AuditTool.tsx](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/frontend/src/Pages/AuditTool.tsx) and add `"new_special_fee_category"` to the `AUDIT_CATEGORIES` list.

### Adding a New Data Processing Engine
1. Create page component under [frontend/src/Pages/](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/frontend/src/Pages/). Ensure it remains under 300 lines by delegating dialogs and view controls to sub-components.
2. Register the route in [frontend/src/App.tsx](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/frontend/src/App.tsx).
3. Add module descriptor to [Header.tsx](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/frontend/src/components/Header.tsx), [Sidebar.tsx](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/frontend/src/components/Sidebar.tsx), and [MainPage.tsx](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/frontend/src/Pages/MainPage.tsx).
4. Implement the backend processing helper in [server/utils/](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/server/utils/) and expose its endpoint in a dedicated router in [server/routes/](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/server/routes/).

---

## 3. Docker & Deployment Guide

```bash
# Clone the repository
git clone https://github.com/AsadBulediReal/New-CMD-App.git
cd New-CMD-App

# Start containerized stack
docker-compose up --build -d

# View live log streams
docker-compose logs -f

# Shut down containers
docker-compose down
```

---

*Last Updated: 2026-08-22 · Developed for Cash Management Division (CMD) · University of Sindh*
