/**
 * CMD Finance Portal — HTML Animation Templates & Step Definitions for Deployment Videos
 */

function getTerminalHtml({ title, subtitle, steps, currentStep, commands, statusBadge, appScreenshotBase64 }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "JetBrains Mono", monospace; }
    body { background: #0b0f19; color: #f3f4f6; width: 1200px; height: 750px; display: flex; flex-direction: column; padding: 28px 32px; overflow: hidden; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .header-left { display: flex; align-items: center; gap: 14px; }
    .badge-icon { width: 42px; height: 42px; border-radius: 10px; background: linear-gradient(135deg, #3b82f6, #6366f1); display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 14px rgba(59,130,246,0.35); }
    .title { font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; }
    .subtitle { font-size: 12px; color: #9ca3af; margin-top: 2px; }
    .status-badge { padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); display: flex; align-items: center; gap: 6px; }
    .status-dot { width: 7px; height: 7px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981; }
    .steps-row { display: flex; gap: 10px; margin-bottom: 18px; }
    .step-pill { flex: 1; padding: 8px 12px; border-radius: 8px; background: #1f293d; border: 1px solid #374151; font-size: 11px; color: #9ca3af; display: flex; align-items: center; gap: 8px; }
    .step-pill.active { background: #1e3a8a; border-color: #3b82f6; color: #93c5fd; font-weight: 600; box-shadow: 0 0 12px rgba(59,130,246,0.25); }
    .step-pill.completed { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); color: #34d399; }
    .step-num { width: 18px; height: 18px; border-radius: 50%; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; }
    .step-pill.active .step-num { background: #3b82f6; color: #fff; }
    .step-pill.completed .step-num { background: #10b981; color: #fff; }
    .content-area { flex: 1; display: grid; grid-template-columns: ${appScreenshotBase64 ? '1fr 1.05fr' : '1fr'}; gap: 18px; min-height: 0; }
    .terminal-window { background: #0f172a; border-radius: 10px; border: 1px solid #1e293b; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .term-titlebar { height: 34px; background: #1e293b; display: flex; align-items: center; padding: 0 12px; gap: 7px; border-bottom: 1px solid #334155; }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
    .dot.red { background: #ef4444; } .dot.yellow { background: #f59e0b; } .dot.green { background: #10b981; }
    .term-title { margin-left: auto; margin-right: auto; font-size: 11px; color: #94a3b8; font-weight: 500; }
    .term-body { flex: 1; padding: 14px 16px; font-family: "JetBrains Mono", monospace; font-size: 12px; line-height: 1.55; color: #e2e8f0; overflow: hidden; }
    .prompt-line { color: #38bdf8; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; font-weight: 600; }
    .prompt-symbol { color: #f43f5e; font-weight: 700; }
    .output-text { color: #94a3b8; margin-bottom: 10px; white-space: pre-wrap; font-size: 11.5px; }
    .success-text { color: #34d399; font-weight: 600; }
    .highlight-text { color: #fbbf24; }
    .env-box { background: #090d16; border: 1px solid #1e293b; border-radius: 6px; padding: 10px 12px; margin: 6px 0 10px 0; font-family: "JetBrains Mono", monospace; }
    .env-key { color: #60a5fa; font-weight: 600; }
    .env-val { color: #a7f3d0; }
    .env-comment { color: #64748b; font-style: italic; }
    .browser-preview { background: #1e293b; border-radius: 10px; border: 1px solid #334155; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .browser-bar { height: 34px; background: #0f172a; display: flex; align-items: center; padding: 0 12px; gap: 8px; border-bottom: 1px solid #334155; }
    .url-pill { flex: 1; background: #1e293b; border-radius: 5px; padding: 3px 10px; font-size: 10.5px; color: #60a5fa; text-align: center; border: 1px solid #334155; font-family: "JetBrains Mono", monospace; }
    .preview-img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="badge-icon">🚀</div>
      <div>
        <div class="title">${title}</div>
        <div class="subtitle">${subtitle}</div>
      </div>
    </div>
    <div class="status-badge"><div class="status-dot"></div> ${statusBadge || 'Active Pipeline'}</div>
  </div>

  <div class="steps-row">
    ${steps.map((st, i) => `
      <div class="step-pill ${i === currentStep ? 'active' : (i < currentStep ? 'completed' : '')}">
        <div class="step-num">${i < currentStep ? '✓' : (i + 1)}</div>
        <span>${st}</span>
      </div>
    `).join('')}
  </div>

  <div class="content-area">
    <div class="terminal-window">
      <div class="term-titlebar">
        <div class="dot red"></div>
        <div class="dot yellow"></div>
        <div class="dot green"></div>
        <div class="term-title">bash — cmd-deployment-worker</div>
      </div>
      <div class="term-body">
        ${commands}
      </div>
    </div>
    ${appScreenshotBase64 ? `
    <div class="browser-preview">
      <div class="browser-bar">
        <div class="dot red"></div>
        <div class="dot yellow"></div>
        <div class="dot green"></div>
        <div class="url-pill">http://localhost:5173 / http://localhost:80</div>
      </div>
      <img class="preview-img" src="data:image/png;base64,${appScreenshotBase64}" />
    </div>
    ` : ''}
  </div>
</body>
</html>`;
}

module.exports = { getTerminalHtml };
