/**
 * CMD Finance Portal — Deployment Methods Video Showcase Generator
 * Generates high-fidelity animated GIFs with 3.8s readability delay and comprehensive ENV setup.
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const GIFEncoder = require('gif-encoder-2');
const { PNG } = require('pngjs');
const { getTerminalHtml } = require('./deployment_templates');

const DEPLOYMENTS_DIR = path.resolve(__dirname, '..', 'features', 'deployments');
if (!fs.existsSync(DEPLOYMENTS_DIR)) {
  fs.mkdirSync(DEPLOYMENTS_DIR, { recursive: true });
}

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

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

async function renderFramesToGif(frames, outputPath, delayMs = 3800, width = 1200, height = 750) {
  const encoder = new GIFEncoder(width, height, 'neuquant', true);
  const writeStream = fs.createWriteStream(outputPath);

  encoder.createReadStream().pipe(writeStream);
  encoder.start();
  encoder.setRepeat(0);
  encoder.setDelay(delayMs);
  encoder.setQuality(1);
  encoder.setThreshold(40);

  for (const frameBuf of frames) {
    const png = PNG.sync.read(frameBuf);
    const rgbaBuffer = downsampleBoxFilter(png, width, height);
    encoder.addFrame(rgbaBuffer);
  }

  encoder.finish();
  await new Promise((res, rej) => {
    writeStream.on('finish', res);
    writeStream.on('error', rej);
  });

  const stats = fs.statSync(outputPath);
  console.log(`  ✔ Saved: ${path.basename(outputPath)} (${(stats.size / 1024 / 1024).toFixed(2)} MB, delay: ${delayMs}ms)`);
}

async function recordDockerFrames(page, appScreenshotBase64) {
  console.log('Rendering: 01_docker_one_click_deployment.gif (3.8s per frame)');
  const steps = ['Clone Repository', 'Generate Secrets & Configure .env', 'Build & Launch Containers', 'Live Verification'];
  const frames = [];

  await page.setContent(getTerminalHtml({
    title: 'Method 1: Docker One-Click Deployment',
    subtitle: 'Containerized deployment of Frontend, Node Backend & MongoDB with secure ENV setup',
    steps, currentStep: 0,
    commands: `
      <div class="prompt-line"><span class="prompt-symbol">➜</span> git clone https://github.com/AsadBulediReal/New-CMD-App.git</div>
      <div class="output-text">Cloning into 'New-CMD-App'... done.<br/>Resolving deltas: 100% (214/214), done.</div>
      <div class="prompt-line"><span class="prompt-symbol">➜</span> cd New-CMD-App && cp .env.example .env</div>
      <div class="output-text success-text">✔ Created local .env configuration file</div>
    `
  }));
  frames.push(await page.screenshot());

  await page.setContent(getTerminalHtml({
    title: 'Method 1: Docker One-Click Deployment',
    subtitle: 'Containerized deployment of Frontend, Node Backend & MongoDB with secure ENV setup',
    steps, currentStep: 1,
    commands: `
      <div class="prompt-line"><span class="prompt-symbol">➜</span> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"</div>
      <div class="output-text highlight-text">e7b4f2c90a1d835e9821af390d40c6a81289cf041b3... (256-bit Key)</div>
      <div class="prompt-line"><span class="prompt-symbol">➜</span> cat .env</div>
      <div class="env-box">
        <div class="env-comment"># 1. Database Connection (Internal Docker DNS 'db')</div>
        <div><span class="env-key">MONGODB_URI</span>=<span class="env-val">mongodb://db:27017/cmd_app</span></div>
        <div class="env-comment"># 2. Security Token & Super Administrator Email</div>
        <div><span class="env-key">JWT_SECRET</span>=<span class="env-val">e7b4f2c90a1d835e9821af390d40c6a8...</span></div>
        <div><span class="env-key">ADMIN_EMAIL</span>=<span class="env-val">admin@usindh.edu.pk</span></div>
        <div class="env-comment"># 3. Network Ports & Host URL</div>
        <div><span class="env-key">PORT</span>=<span class="env-val">5000</span> | <span class="env-key">FRONTEND_URL</span>=<span class="env-val">http://localhost</span></div>
      </div>
      <div class="output-text success-text">✔ .env variables validated and mapped into docker-compose.yml</div>
    `
  }));
  frames.push(await page.screenshot());

  await page.setContent(getTerminalHtml({
    title: 'Method 1: Docker One-Click Deployment',
    subtitle: 'Containerized deployment of Frontend, Node Backend & MongoDB with secure ENV setup',
    steps, currentStep: 2,
    commands: `
      <div class="prompt-line"><span class="prompt-symbol">➜</span> docker-compose up -d --build</div>
      <div class="output-text">
[+] Building 3/3
 <span class="highlight-text">✔ image mongo:latest</span> Pulled & Container mongodb_cmd started
 <span class="highlight-text">✔ image server_cmd</span> Built (Node.js 22 LTS with injected .env)
 <span class="highlight-text">✔ image frontend_cmd</span> Built (Vite + Nginx Production Bundle)
      </div>
      <div class="output-text success-text">
✔ Network: new-cmd-app_default (Bridge)
✔ MongoDB: Running on 27017 | Backend: 5000 | Frontend: 80
      </div>
    `
  }));
  frames.push(await page.screenshot());

  await page.setContent(getTerminalHtml({
    title: 'Method 1: Docker One-Click Deployment',
    subtitle: 'Containerized deployment of Frontend, Node Backend & MongoDB with secure ENV setup',
    steps, currentStep: 3, statusBadge: 'All Containers Live', appScreenshotBase64,
    commands: `
      <div class="prompt-line"><span class="prompt-symbol">➜</span> curl -I http://localhost:80</div>
      <div class="output-text">HTTP/1.1 200 OK | Server: nginx</div>
      <div class="prompt-line"><span class="prompt-symbol">➜</span> curl http://localhost:5000/api/health</div>
      <div class="output-text success-text">
{"status":"ok","database":"connected","admin":"admin@usindh.edu.pk"}
      </div>
      <div class="output-text success-text">✔ Portal URL: <span class="highlight-text">http://localhost:80</span></div>
    `
  }));
  frames.push(await page.screenshot());
  await renderFramesToGif(frames, path.join(DEPLOYMENTS_DIR, '01_docker_one_click_deployment.gif'), 3800);
}

async function recordCloudFrames(page, appScreenshotBase64) {
  console.log('Rendering: 02_cloud_vercel_atlas_deployment.gif (3.8s per frame)');
  const steps = ['Atlas Database Cluster', 'Cloud ENV Configuration', 'Vercel Edge Deployment', 'Live Production'];
  const frames = [];

  await page.setContent(getTerminalHtml({
    title: 'Method 2: Cloud Deployment (Vercel + MongoDB Atlas)',
    subtitle: 'Serverless production deployment with managed global MongoDB cluster & secure secrets',
    steps, currentStep: 0,
    commands: `
      <div class="prompt-line"><span class="prompt-symbol">➜</span> atlas clusters create CMD-Production --tier M0</div>
      <div class="output-text">
Creating free M0 Shared Cluster in AWS (Global)...
<span class="success-text">✔ Cluster 'CMD-Production' created.</span>
Network Access: <span class="success-text">IP 0.0.0.0/0 (Allowed for Serverless Vercel)</span>
Database User: <span class="highlight-text">cmd_admin (ReadWriteAnyDatabase)</span>
URI: <span class="highlight-text">mongodb+srv://cmd_admin:***@cluster0.mongodb.net/cmd_app</span>
      </div>
    `
  }));
  frames.push(await page.screenshot());

  await page.setContent(getTerminalHtml({
    title: 'Method 2: Cloud Deployment (Vercel + MongoDB Atlas)',
    subtitle: 'Serverless production deployment with managed global MongoDB cluster & secure secrets',
    steps, currentStep: 1,
    commands: `
      <div class="prompt-line"><span class="prompt-symbol">➜</span> Configuring Vercel Project Environment Variables</div>
      <div class="env-box">
        <div><span class="env-key">MONGODB_URI</span> = <span class="env-val">mongodb+srv://cmd_admin:...@cluster0.mongodb.net/cmd_app</span></div>
        <div><span class="env-key">JWT_SECRET</span>  = <span class="env-val">64-char-random-hex-string-for-token-signing</span></div>
        <div><span class="env-key">ADMIN_EMAIL</span> = <span class="env-val">admin@usindh.edu.pk (Auto-Approved Super Admin)</span></div>
        <div><span class="env-key">GOOGLE_CLIENT_ID</span> = <span class="env-val">98234...apps.googleusercontent.com (Optional)</span></div>
        <div><span class="env-key">SMTP_HOST</span> / <span class="env-key">SMTP_PASS</span> = <span class="env-val">smtp.gmail.com (Email Alerting)</span></div>
      </div>
      <div class="output-text success-text">✔ Injected 5 environment secrets into Production, Preview, & Development</div>
    `
  }));
  frames.push(await page.screenshot());

  await page.setContent(getTerminalHtml({
    title: 'Method 2: Cloud Deployment (Vercel + MongoDB Atlas)',
    subtitle: 'Serverless production deployment with managed global MongoDB cluster & secure secrets',
    steps, currentStep: 2,
    commands: `
      <div class="prompt-line"><span class="prompt-symbol">➜</span> vercel --prod</div>
      <div class="output-text">
Vercel CLI 34.0.0
🔍 Inspect: https://vercel.com/cmd-team/cmd-app [Ready]
✅ Production: <span class="highlight-text">https://cmd-portal-finance.vercel.app</span> [3s]
📝 Deployed serverless API functions: /api/auth, /api/files, /api/reconcile, /api/audit
⚡ Global Edge CDN static assets deployed
      </div>
      <div class="output-text success-text">✔ Build and Edge Distribution Complete!</div>
    `
  }));
  frames.push(await page.screenshot());

  await page.setContent(getTerminalHtml({
    title: 'Method 2: Cloud Deployment (Vercel + MongoDB Atlas)',
    subtitle: 'Serverless production deployment with managed global MongoDB cluster & secure secrets',
    steps, currentStep: 3, statusBadge: '100% Edge Live', appScreenshotBase64,
    commands: `
      <div class="prompt-line"><span class="prompt-symbol">➜</span> curl -I https://cmd-portal-finance.vercel.app</div>
      <div class="output-text">HTTP/2 200 | x-vercel-cache: HIT | SSL: TLS 1.3 Active</div>
      <div class="output-text success-text">
✔ Production Live: <span class="highlight-text">https://cmd-portal-finance.vercel.app</span>
✔ Serverless MongoDB: <span class="highlight-text">Connected (Atlas M0 Cluster)</span>
✔ Zero Server Maintenance Required!
      </div>
    `
  }));
  frames.push(await page.screenshot());
  await renderFramesToGif(frames, path.join(DEPLOYMENTS_DIR, '02_cloud_vercel_atlas_deployment.gif'), 3800);
}

async function recordNodeFrames(page, appScreenshotBase64) {
  console.log('Rendering: 03_standard_nodejs_deployment.gif (3.8s per frame)');
  const steps = ['Install Dependencies', 'Setup Local .env', 'Start Dual Servers', 'Local Dev Ready'];
  const frames = [];

  await page.setContent(getTerminalHtml({
    title: 'Method 3: Standard Node.js Local Setup',
    subtitle: 'Direct local execution with split terminal processes & local .env',
    steps, currentStep: 0,
    commands: `
      <div class="prompt-line"><span class="prompt-symbol">➜</span> npm install</div>
      <div class="output-text">added 142 packages in 3.4s</div>
      <div class="prompt-line"><span class="prompt-symbol">➜</span> cd frontend && npm install</div>
      <div class="output-text success-text">added 389 packages in 4.1s</div>
    `
  }));
  frames.push(await page.screenshot());

  await page.setContent(getTerminalHtml({
    title: 'Method 3: Standard Node.js Local Setup',
    subtitle: 'Direct local execution with split terminal processes & local .env',
    steps, currentStep: 1,
    commands: `
      <div class="prompt-line"><span class="prompt-symbol">➜</span> cp .env.example .env && cat .env</div>
      <div class="env-box">
        <div><span class="env-key">PORT</span>=<span class="env-val">5000</span></div>
        <div><span class="env-key">MONGODB_URI</span>=<span class="env-val">mongodb://localhost:27017/cmd_app</span></div>
        <div><span class="env-key">JWT_SECRET</span>=<span class="env-val">dev-secret-key-32-chars-long</span></div>
        <div><span class="env-key">ADMIN_EMAIL</span>=<span class="env-val">admin@usindh.edu.pk</span></div>
      </div>
      <div class="output-text success-text">✔ Local environment configured</div>
    `
  }));
  frames.push(await page.screenshot());

  await page.setContent(getTerminalHtml({
    title: 'Method 3: Standard Node.js Local Setup',
    subtitle: 'Direct local execution with split terminal processes & local .env',
    steps, currentStep: 2,
    commands: `
      <div class="prompt-line"><span class="prompt-symbol">Terminal 1 ➜</span> node server/index.js</div>
      <div class="output-text success-text">✔ Connected to MongoDB: mongodb://localhost:27017/cmd_app<br/>✔ Server listening on http://localhost:5000</div>
      <div class="prompt-line"><span class="prompt-symbol">Terminal 2 ➜</span> npm --prefix frontend run dev</div>
      <div class="output-text">
  <span class="highlight-text">VITE v7.3.6</span> ready in <span class="success-text">320 ms</span>
  ➜ <span class="success-text">Local: http://localhost:5173/</span>
      </div>
    `
  }));
  frames.push(await page.screenshot());

  await page.setContent(getTerminalHtml({
    title: 'Method 3: Standard Node.js Local Setup',
    subtitle: 'Direct local execution with split terminal processes & local .env',
    steps, currentStep: 3, statusBadge: 'Hot Reload Active', appScreenshotBase64,
    commands: `
      <div class="prompt-line"><span class="prompt-symbol">➜</span> Hot Module Replacement (HMR) Active</div>
      <div class="output-text success-text">
✔ Frontend: <span class="highlight-text">http://localhost:5173</span> | Backend: <span class="highlight-text">http://localhost:5000</span>
✔ Ready for code modification & live testing!
      </div>
    `
  }));
  frames.push(await page.screenshot());
  await renderFramesToGif(frames, path.join(DEPLOYMENTS_DIR, '03_standard_nodejs_deployment.gif'), 3800);
}

async function captureDeploymentVideos() {
  console.log('🚀 Starting Deployment Video Suite Generation (High Readability + 3.8s Frames)...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1200, height: 750, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const screenshotPath = path.resolve(__dirname, '..', 'features', '02_dashboard_workspace.png');
  const appScreenshotBase64 = fs.existsSync(screenshotPath) ? fs.readFileSync(screenshotPath).toString('base64') : '';

  await recordDockerFrames(page, appScreenshotBase64);
  await recordCloudFrames(page, appScreenshotBase64);
  await recordNodeFrames(page, appScreenshotBase64);

  await browser.close();
  console.log('\n✨ All deployment showcase videos created successfully in features/deployments/!\n');
}

captureDeploymentVideos().catch(err => {
  console.error('Error generating deployment videos:', err);
  process.exit(1);
});
