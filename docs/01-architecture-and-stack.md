# 01 — System Architecture & Technology Stack

**System Code**: `CMD-APP-V1`  
**Institutional Scope**: Finance Wing · University of Sindh, Jamshoro  

---

## 1. System Overview & Architecture

The CMD Application coordinates real-time banking statement ingestion, automated reconciliation, and audit classification.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT (FRONTEND)                             │
│  React 19 (TypeScript) · Vite 7 · Tailwind CSS v4 · Radix UI Primitives │
│  Recharts · Lucide Icons · Sonner Toasts · SheetJS (XLSX) · JSZip     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON (REST API)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          SERVER (BACKEND)                              │
│  Node.js · Express 5 · Mongoose 9 · Nodemailer · officecrypto-tool     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Mongoose Connection
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          DATABASE & STORAGE                            │
│  MongoDB 7.0 (Chunked File Model: StoredFile + FileChunk)              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack & Dependencies

### Frontend (`/frontend`)
| Layer | Library / Package | Purpose |
| :--- | :--- | :--- |
| **Core Framework** | `React 19.2.0` + `TypeScript 5.9` | Component-driven UI architecture |
| **Tooling & Bundler**| `Vite 7.2.2` | Fast HMR and production bundle optimization |
| **Styling Engine** | `Tailwind CSS 4.1.17` + `tw-animate-css` | Atomic utility CSS with custom OKLCH color spaces |
| **Primitives** | `@radix-ui/*` (20+ components) | Accessible dialogs, dropdowns, popovers, tabs |
| **Icons & Visuals** | `lucide-react 0.477.0` | Clean institutional iconography |
| **Spreadsheet Engine**| `xlsx (0.18.5)` + `JSZip` | In-memory spreadsheet parsing, construction & zip exports |
| **Decryption Tool**| `officecrypto-tool 0.0.19` | Client/server decryption of encrypted Excel files |
| **Notifications** | `sonner 2.0.7` | High-visibility responsive feedback toast alerts |
| **Visual Charts** | `recharts 2.15.1` | Financial trend visualizations |
| **Routing** | `react-router-dom 7.10.1` | Client-side page navigation with state preservation |

### Backend (`/server`)
| Package | Version | Purpose |
| :--- | :--- | :--- |
| `express` | `5.2.1` | Modular REST API framework |
| `mongoose` | `9.4.1` | MongoDB Object Data Modeling (ODM) with chunked collections |
| `nodemailer` | `9.0.3` | Automated SMTP email delivery for user bug reports |
| `officecrypto-tool`| `0.0.19` | ECMA-376 standard Office Agile encryption/decryption |
| `xlsx` | `0.18.5` | Server-side spreadsheet processing |
| `cors` | `2.8.6` | Dynamic origin security validation supporting Vercel & localhost |
| `dotenv` | `17.4.1` | Environment configuration management |

---

## 3. Design System & Visual Aesthetics

The application adheres to an **Executive Financial Operations** aesthetic: clean, high-density, authoritative, and responsive.

### Color Tokens (OKLCH Color Space)
```css
/* Light Mode */
--background: oklch(0.985 0.003 247);
--foreground: oklch(0.18 0.035 260);
--card: oklch(1 0 0);
--primary: oklch(0.42 0.17 255);
--destructive: oklch(0.577 0.245 27.325);
--border: oklch(0.915 0.008 247);

/* Dark Mode */
--background: oklch(0.11 0.02 255);
--foreground: oklch(0.97 0.008 247);
--card: oklch(0.15 0.025 255);
--primary: oklch(0.58 0.19 255);
--border: oklch(0.22 0.025 255);
```

### Signature UI Animations
1. **Circular Wave Theme Switch**: 2.0s slow wave circular reveal using `View Transition API` with `clip-path: circle()`.
2. **Deterministic Progress Animation**: Smooth cubic-bezier progress indicator (`.animate-progress`) for import tracking.
3. **Pulsing Card Skeletons**: Interactive feedback states during vault data queries.
