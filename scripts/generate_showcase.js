/**
 * CMD Finance Portal — Unified Feature Showcase & GIF Generator
 * 
 * Usage:
 *   node scripts/generate_showcase.js                 # Run full capture + HD GIF generation
 *   node scripts/generate_showcase.js --screenshots   # Only capture PNG screenshots
 *   node scripts/generate_showcase.js --gifs          # Only generate HD GIFs from existing PNGs
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const GIFEncoder = require('gif-encoder-2');
const { PNG } = require('pngjs');

const FEATURES_DIR = path.resolve(__dirname, '..', 'features');
if (!fs.existsSync(FEATURES_DIR)) {
  fs.mkdirSync(FEATURES_DIR, { recursive: true });
}

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

// High-quality anti-aliased downsampler (Area-averaging box filter)
function downsampleBoxFilter(srcPng, targetWidth, targetHeight) {
  const dstData = Buffer.alloc(targetWidth * targetHeight * 4);
  const scaleX = srcPng.width / targetWidth;
  const scaleY = srcPng.height / targetHeight;

  for (let ty = 0; ty < targetHeight; ty++) {
    const syStart = Math.floor(ty * scaleY);
    const syEnd = Math.min(srcPng.height, Math.ceil((ty + 1) * scaleY));

    for (let tx = 0; tx < targetWidth; tx++) {
      const sxStart = Math.floor(tx * scaleX);
      const sxEnd = Math.min(srcPng.width, Math.ceil((tx + 1) * scaleX));

      let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;
      for (let sy = syStart; sy < syEnd; sy++) {
        const rowOffset = sy * srcPng.width;
        for (let sx = sxStart; sx < sxEnd; sx++) {
          const idx = (rowOffset + sx) * 4;
          rSum += srcPng.data[idx];
          gSum += srcPng.data[idx + 1];
          bSum += srcPng.data[idx + 2];
          aSum += srcPng.data[idx + 3];
          count++;
        }
      }

      const dstIdx = (ty * targetWidth + tx) * 4;
      dstData[dstIdx] = Math.round(rSum / count);
      dstData[dstIdx + 1] = Math.round(gSum / count);
      dstData[dstIdx + 2] = Math.round(bSum / count);
      dstData[dstIdx + 3] = Math.round(aSum / count);
    }
  }
  return dstData;
}

// Capture all screenshots via Chrome / Edge Headless
async function captureAllScreenshots() {
  console.log('--- 1/2: Capturing Application Screenshots ---');
  console.log('Launching browser with:', CHROME_PATH);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Login
  console.log('Capturing: Login Page...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(FEATURES_DIR, '01_login_page.png') });

  await page.type('input[type="email"], input[name="email"]', 'bossajgamer@gmail.com');
  await page.type('input[type="password"], input[name="password"]', 'Password123!');
  await page.screenshot({ path: path.join(FEATURES_DIR, '01b_login_page_filled.png') });

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {}),
    page.click('button[type="submit"]')
  ]);
  await new Promise(r => setTimeout(r, 2000));

  // Features
  const pages = [
    { url: 'http://localhost:5173/', file: '02_dashboard_workspace.png', name: 'Dashboard' },
    { url: 'http://localhost:5173/saved-files', file: '03_saved_files_vault.png', name: 'Document Vault' },
    { url: 'http://localhost:5173/analytics', file: '04_financial_analytics.png', name: 'Analytics' },
    { url: 'http://localhost:5173/reconcile', file: '05_reconciliation_engine.png', name: 'Reconciliation' },
    { url: 'http://localhost:5173/audit', file: '06_audit_and_compliance.png', name: 'Audit Tool' },
    { url: 'http://localhost:5173/upload', file: '07_excel_csv_upload.png', name: 'Upload Center' },
    { url: 'http://localhost:5173/upload-txt', file: '08_txt_parser_ingestion.png', name: 'TXT Parser' },
    { url: 'http://localhost:5173/merge-json', file: '09_merge_json_consolidation.png', name: 'Merge JSON' },
    { url: 'http://localhost:5173/admin', file: '10_admin_dashboard.png', name: 'Admin Dashboard' },
    { url: 'http://localhost:5173/admin?tab=users', file: '10a_admin_user_approvals.png', name: 'Admin: Users' },
    { url: 'http://localhost:5173/admin?tab=deletions', file: '10c_admin_deletion_queue.png', name: 'Admin: Deletions' },
    { url: 'http://localhost:5173/admin?tab=audit', file: '10d_admin_audit_trail.png', name: 'Admin: Audit' },
    { url: 'http://localhost:5173/admin?tab=health', file: '10f_admin_system_health.png', name: 'Admin: System Health' },
    { url: 'http://localhost:5173/profile', file: '11_user_profile_settings.png', name: 'User Profile' }
  ];

  for (const item of pages) {
    console.log(`Capturing: ${item.name}...`);
    await page.goto(item.url, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(FEATURES_DIR, item.file) });
  }

  await browser.close();
  console.log('✔ All screenshots saved to features/ folder.\n');
}

// Generate an Ultra-HD Animated GIF
async function renderGIF({ name, imageFilenames, delayMs = 2500, width = 1280, height = 800 }) {
  console.log(`Rendering GIF: ${name} (${imageFilenames.length} frames)...`);
  const encoder = new GIFEncoder(width, height, 'neuquant', true);
  const outputPath = path.join(FEATURES_DIR, name);
  const writeStream = fs.createWriteStream(outputPath);

  encoder.createReadStream().pipe(writeStream);
  encoder.start();
  encoder.setRepeat(0);
  encoder.setDelay(delayMs);
  encoder.setQuality(1);
  encoder.setThreshold(50);

  for (const filename of imageFilenames) {
    const fullPath = path.join(FEATURES_DIR, filename);
    if (!fs.existsSync(fullPath)) continue;
    const fileBuf = fs.readFileSync(fullPath);
    const png = PNG.sync.read(fileBuf);
    const rgbaBuffer = downsampleBoxFilter(png, width, height);
    encoder.addFrame(rgbaBuffer);
  }

  encoder.finish();
  await new Promise((res, rej) => {
    writeStream.on('finish', res);
    writeStream.on('error', rej);
  });

  const stats = fs.statSync(outputPath);
  console.log(`  ✔ Created ${name} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
}

// Generate all GIFs
async function generateAllGIFs() {
  console.log('--- 2/2: Generating Ultra-HD GIFs ---');

  await renderGIF({
    name: 'cmd_app_full_overview.gif',
    imageFilenames: [
      '01_login_page.png', '02_dashboard_workspace.png', '03_saved_files_vault.png',
      '04_financial_analytics.png', '05_reconciliation_engine.png', '06_audit_and_compliance.png',
      '07_excel_csv_upload.png', '08_txt_parser_ingestion.png', '09_merge_json_consolidation.png',
      '10_admin_dashboard.png', '11_user_profile_settings.png'
    ],
    delayMs: 2500
  });

  await renderGIF({
    name: 'cmd_core_features.gif',
    imageFilenames: [
      '02_dashboard_workspace.png', '03_saved_files_vault.png',
      '04_financial_analytics.png', '05_reconciliation_engine.png', '06_audit_and_compliance.png'
    ],
    delayMs: 2600
  });

  await renderGIF({
    name: 'cmd_admin_governance.gif',
    imageFilenames: [
      '10a_admin_user_approvals.png', '10c_admin_deletion_queue.png',
      '10d_admin_audit_trail.png', '10f_admin_system_health.png'
    ],
    delayMs: 2600
  });

  await renderGIF({
    name: 'cmd_ingestion_tools.gif',
    imageFilenames: [
      '07_excel_csv_upload.png', '08_txt_parser_ingestion.png', '09_merge_json_consolidation.png'
    ],
    delayMs: 2400
  });

  console.log('\n✔ All Ultra-HD GIFs generated successfully!');
}

async function run() {
  const args = process.argv.slice(2);
  const screenshotsOnly = args.includes('--screenshots');
  const gifsOnly = args.includes('--gifs');

  if (screenshotsOnly) {
    await captureAllScreenshots();
  } else if (gifsOnly) {
    await generateAllGIFs();
  } else {
    await captureAllScreenshots();
    await generateAllGIFs();
  }
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
