# Automated Media & Showcase Generation Guide

This guide documents the automated pipeline used to capture high-definition application screenshots and compile ultra-crisp showcase animated GIFs for `README.md` and repository documentation.

---

## 🛠️ Required Dependencies

The showcase pipeline uses headless Chrome/Edge and pure JavaScript image processing tools:

```bash
npm install puppeteer-core gif-encoder-2 pngjs --save-dev
```

- **`puppeteer-core`**: Controls installed system browser (Chrome / Edge) to navigate pages and take Retina screenshots.
- **`gif-encoder-2`**: High-performance GIF encoder with **NeuQuant Neural Network Adaptive Quantization** for crisp text, smooth gradients, and UI elements.
- **`pngjs`**: Decodes raw PNG pixels for anti-aliased area box filtering.

---

## 🚀 Quick Execution Commands

Make sure both the backend and frontend dev servers are running:
```bash
# Terminal 1: Backend Server
node server/index.js

# Terminal 2: Frontend Client
npm --prefix frontend run dev
```

Run the showcase automation tool:

```bash
# 1. Full Pipeline (Capture all PNGs + Generate all Ultra-HD GIFs)
node scripts/generate_showcase.js

# 2. Screenshots Only (Captures all pages to features/*.png)
node scripts/generate_showcase.js --screenshots

# 3. Deployment Method Videos (Docker, Cloud Vercel/Atlas, and Node.js)
node scripts/generate_deployment_videos.js
# or
npm run deployments
```

---

## 📁 Output Artifacts Directory (`features/`)

All generated media is saved directly into the root `features/` directory:

| Filename | Purpose / Content | Type |
|---|---|---|
| `cmd_app_full_overview.gif` | Complete 11-step interactive product tour | HD GIF (1280x800) |
| `cmd_core_features.gif` | Dashboard, Document Vault, Analytics, Reconcile, Audit | HD GIF (1280x800) |
| `cmd_admin_governance.gif` | User Approvals, Deletions Queue, Audit Trail, System Health | HD GIF (1280x800) |
| `cmd_ingestion_tools.gif` | Excel/CSV Ingestion, Bank Statement TXT Parser, Merge JSON | HD GIF (1280x800) |
| `deployments/01_docker_one_click_deployment.gif` | Docker Desktop & Compose One-Click Deploy Walkthrough | HD GIF (1200x750) |
| `deployments/02_cloud_vercel_atlas_deployment.gif` | Cloud Deployment on Vercel with MongoDB Atlas Cluster | HD GIF (1200x750) |
| `deployments/03_standard_nodejs_deployment.gif` | Manual Local Node.js + MongoDB Development Flow | HD GIF (1200x750) |
| `01_login_page.png` ... `11_*.png` | High-resolution Retina viewport screenshots of every view | 2880x1800 PNG |

---

## ⚙️ Technical Details & Tuning

### 1. Antialiased Box Filtering (`downsampleBoxFilter`)
Retina captures (2880x1800) are downsampled to HD (1280x800) using area-box pixel averaging instead of nearest-neighbor decimation to ensure typography and table lines remain smooth and clear.

### 2. NeuQuant Color Quantization
`gif-encoder-2` runs NeuQuant neural network color training per frame (`quality = 1`, `threshold = 50`) to construct an optimal 256-color palette matching the dark/light UI palette and badges.

### 3. Adding New Features or Modifying Views
To add a new route or page to the app showcase:
1. Open `scripts/generate_showcase.js`.
2. Add the URL and filename to the `pages` array inside `captureAllScreenshots()`.
3. Re-run `node scripts/generate_showcase.js`.

### 4. Customizing Deployment Videos & Interactive Player
- **Scripts**: [`scripts/generate_deployment_videos.js`](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/scripts/generate_deployment_videos.js) and [`scripts/deployment_templates.js`](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/scripts/deployment_templates.js).
- **Interactive Player**: [`features/deployments/interactive_viewer.html`](file:///i:/Ideas%20and%20Projects/Final%20CMD%20App/features/deployments/interactive_viewer.html) (edit the `data` object to add or change steps/commands).
- **Frame Timing**: Adjust `delayMs` (currently set to 3800ms) in `renderFramesToGif()` to speed up or slow down frames.
- **Re-generate**: Run `npm run deployments` anytime.

