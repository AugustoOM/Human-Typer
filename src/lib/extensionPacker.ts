/**
 * Lightweight client-side ZIP generator with no heavy dependencies.
 * Downloads the Chrome / Edge / Firefox extension with one click.
 */

interface ZipFile {
  name: string;
  content: string;
}

export function downloadExtensionZip(): void {
  const manifest = JSON.stringify(
    {
      manifest_version: 3,
      name: "Human Typer - Background Mode",
      version: "0.5.1",
      description:
        "Automatically type at a human pace in Google Docs, Word Online, and any website in the background.",
      permissions: ["activeTab", "scripting", "storage", "notifications"],
      host_permissions: ["http://*/*", "https://*/*"],
      action: {
        default_popup: "popup.html",
        default_title: "Human Typer",
      },
      browser_specific_settings: {
        gecko: {
          id: "humantyper@desktop.app",
          strict_min_version: "109.0",
        },
      },
    },
    null,
    2,
  );

  const popupHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Human Typer</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="popup-container">
    <header class="header">
      <div class="brand">
        <span class="logo-badge">⚡</span>
        <div>
          <h2>Human <span>Typer</span></h2>
          <span class="badge">Background</span>
        </div>
      </div>
    </header>
    <main class="main">
      <div class="field-group">
        <label for="text-input">
          <span>Text to type</span>
          <span id="char-count" class="char-count">0 characters</span>
        </label>
        <textarea id="text-input" placeholder="Paste or type the text to enter in the document..." rows="5"></textarea>
      </div>
      <div class="settings-block">
        <div class="setting-row">
          <label>Typing speed</label>
          <strong id="speed-val">120 ms (Normal)</strong>
        </div>
        <div class="preset-buttons">
          <button type="button" class="preset-btn" data-speed="35">⚡ Very Fast</button>
          <button type="button" class="preset-btn" data-speed="65">🚀 Fast</button>
          <button type="button" class="preset-btn active" data-speed="120">✍️ Normal</button>
          <button type="button" class="preset-btn" data-speed="220">🐢 Slow</button>
          <button type="button" class="preset-btn" data-speed="380">🦥 Very Slow</button>
        </div>
        <input type="range" id="speed-slider" min="15" max="800" step="5" value="120" />
        <div class="speed-labels">
          <span>15 ms (Ultra Fast)</span>
          <span>800 ms (Paused)</span>
        </div>
      </div>
      <div class="settings-block compact">
        <div class="setting-row">
          <label>Human variation</label>
          <strong id="variation-val">±35 ms</strong>
        </div>
        <input type="range" id="variation-slider" min="0" max="150" step="5" value="35" />
      </div>
      <div class="options-grid">
        <label class="toggle-label">
          <input type="checkbox" id="pause-punct" checked />
          <span>Punctuation pauses</span>
        </label>
        <label class="toggle-label">
          <input type="checkbox" id="notify-sound" checked />
          <span>Completion sound</span>
        </label>
      </div>
      <div id="status-card" class="status-card">
        <div class="status-info">
          <span id="status-text">Ready to start in this tab</span>
          <span id="status-percent">0%</span>
        </div>
        <div class="progress-bg">
          <div id="progress-bar" class="progress-fill"></div>
        </div>
      </div>
      <div class="actions">
        <button type="button" id="start-btn" class="btn btn-primary">▶ Start Typing</button>
      </div>
    </main>
  </div>
  <script src="popup.js"></script>
</body>
</html>`;

  const stylesCss = `* { box-sizing: border-box; margin: 0; padding: 0; }
body { width: 360px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #181a1f; color: #f3f4f6; font-size: 13px; line-height: 1.4; user-select: none; }
.popup-container { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.header { border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 10px; }
.brand { display: flex; align-items: center; gap: 10px; }
.logo-badge { background: #eab308; color: #181a1f; font-size: 16px; font-weight: bold; padding: 6px 10px; border-radius: 8px; }
.brand h2 { font-size: 16px; font-weight: 800; color: #ffffff; }
.brand h2 span { color: #eab308; }
.badge { font-size: 10px; font-weight: 700; background: rgba(234, 179, 8, 0.18); color: #facc15; padding: 2px 6px; border-radius: 4px; }
.main { display: flex; flex-direction: column; gap: 12px; }
.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-group label { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; }
textarea { width: 100%; padding: 10px; background: #232730; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; color: #f3f4f6; font-family: inherit; font-size: 13px; resize: vertical; min-height: 90px; }
textarea:focus { outline: none; border-color: #eab308; box-shadow: 0 0 0 2px rgba(234, 179, 8, 0.2); }
.settings-block { background: #232730; padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08); display: flex; flex-direction: column; gap: 8px; }
.settings-block.compact { padding: 8px 12px; gap: 4px; }
.setting-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 600; }
.setting-row strong { color: #eab308; font-size: 11px; }
.preset-buttons { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 2px; }
.preset-btn { background: #181a1f; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 6px; color: #9ca3af; font-size: 10px; font-weight: 700; padding: 6px 4px; cursor: pointer; text-align: center; transition: all 0.15s ease; }
.preset-btn:hover { border-color: #eab308; color: #f3f4f6; }
.preset-btn.active { background: #eab308; color: #181a1f; border-color: #eab308; }
input[type="range"] { width: 100%; accent-color: #eab308; cursor: pointer; margin-top: 2px; }
.speed-labels { display: flex; justify-content: space-between; font-size: 10px; color: #6b7280; }
.options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.toggle-label { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #d1d5db; cursor: pointer; background: #232730; padding: 6px 8px; border-radius: 6px; }
.toggle-label input { accent-color: #eab308; }
.status-card { background: #111317; padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08); }
.status-info { display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; color: #9ca3af; margin-bottom: 6px; }
.progress-bg { background: rgba(255, 255, 255, 0.1); height: 6px; border-radius: 3px; overflow: hidden; }
.progress-fill { background: #eab308; height: 100%; width: 0%; transition: width 0.1s linear; }
.actions { display: flex; flex-direction: column; gap: 8px; }
.btn { width: 100%; padding: 10px 14px; font-size: 13px; font-weight: 700; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: background 0.15s ease, opacity 0.15s ease; }
.btn-primary { background: #eab308; color: #181a1f; }
.btn-primary:hover:not(:disabled) { background: #facc15; }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }`;

  const popupJs = `document.addEventListener("DOMContentLoaded", () => {
  const textInput = document.getElementById("text-input");
  const charCount = document.getElementById("char-count");
  const speedSlider = document.getElementById("speed-slider");
  const speedVal = document.getElementById("speed-val");
  const pausePunct = document.getElementById("pause-punct");
  const notifySound = document.getElementById("notify-sound");
  const startBtn = document.getElementById("start-btn");
  const statusText = document.getElementById("status-text");
  const statusPercent = document.getElementById("status-percent");
  const progressBar = document.getElementById("progress-bar");
  const variationSlider = document.getElementById("variation-slider");
  const variationVal = document.getElementById("variation-val");
  const presetBtns = document.querySelectorAll(".preset-btn");

  chrome.storage.local.get(["savedText", "speed", "variation", "pausePunct", "notifySound"], (res) => {
    if (res.savedText) { textInput.value = res.savedText; updateCharCount(); }
    if (res.speed) { speedSlider.value = res.speed; updateSpeedLabel(res.speed); }
    if (res.variation !== undefined && variationSlider && variationVal) { variationSlider.value = res.variation; variationVal.innerText = '±' + res.variation + ' ms'; }
    if (res.pausePunct !== undefined) pausePunct.checked = res.pausePunct;
    if (res.notifySound !== undefined) notifySound.checked = res.notifySound;
  });

  function updateCharCount() {
    const len = Array.from(textInput.value).length;
    charCount.innerText = len.toLocaleString("en") + " characters";
    startBtn.disabled = len === 0;
  }

  function getSpeedDescriptor(ms) {
    if (ms <= 45) return "Ultra Fast";
    if (ms <= 85) return "Fast";
    if (ms <= 160) return "Normal / Human";
    if (ms <= 280) return "Slow";
    return "Very Slow / Paused";
  }

  function updateSpeedLabel(ms) {
    speedVal.innerText = ms + " ms (" + getSpeedDescriptor(ms) + ")";
    presetBtns.forEach(btn => { btn.classList.toggle("active", Number(btn.dataset.speed) === Number(ms)); });
  }

  presetBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const spd = Number(btn.dataset.speed);
      speedSlider.value = spd;
      updateSpeedLabel(spd);
      chrome.storage.local.set({ speed: spd });
    });
  });

  textInput.addEventListener("input", () => { updateCharCount(); chrome.storage.local.set({ savedText: textInput.value }); });
  speedSlider.addEventListener("input", () => { const spd = Number(speedSlider.value); updateSpeedLabel(spd); chrome.storage.local.set({ speed: spd }); });
  if (variationSlider && variationVal) {
    variationSlider.addEventListener("input", () => { const v = Number(variationSlider.value); variationVal.innerText = '±' + v + ' ms'; chrome.storage.local.set({ variation: v }); });
  }
  pausePunct.addEventListener("change", () => { chrome.storage.local.set({ pausePunct: pausePunct.checked }); });
  notifySound.addEventListener("change", () => { chrome.storage.local.set({ notifySound: notifySound.checked }); });

  startBtn.addEventListener("click", async () => {
    const text = textInput.value;
    if (!text.trim()) return;
    const config = {
      text,
      baseDelayMs: Number(speedSlider.value),
      variationMs: variationSlider ? Number(variationSlider.value) : 35,
      punctuationPauses: pausePunct.checked,
      notifySound: notifySound.checked
    };
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: injectScript, args: [config] });
      statusText.innerText = "⚡ Typing started on the page";
      progressBar.style.width = "100%";
      setTimeout(() => window.close(), 700);
    } catch(e) { statusText.innerText = "Error: make sure you are on a valid tab"; }
  });
  updateCharCount();
});

function injectScript(config) {
  const prev = document.getElementById("ht-floating-controller");
  if (prev) prev.remove();
  const panel = document.createElement("div");
  panel.id = "ht-floating-controller";
  Object.assign(panel.style, {
    position: "fixed", bottom: "24px", right: "24px", zIndex: "99999999",
    background: "#181a1f", color: "#f3f4f6", padding: "16px 20px", borderRadius: "12px",
    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.6), 0 0 0 2px #eab308",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: "13px", minWidth: "300px", display: "flex", flexDirection: "column", gap: "10px", userSelect: "none"
  });
  panel.innerHTML = \`<div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 8px;">
    <span style="font-weight: 800; color: #facc15; display: flex; align-items: center; gap: 6px;">⚡ Human Typer <span style="font-size: 11px; background: rgba(234,179,8,0.2); color: #fef08a; padding: 2px 6px; border-radius: 4px;">Background</span></span>
    <button id="ht-close-btn" style="background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 16px;">✕</button>
  </div>
  <div id="ht-status-text" style="color: #e5e7eb; font-weight: 600;">Starting to type on this page...</div>
  <div style="background: rgba(255,255,255,0.1); border-radius: 6px; height: 6px; overflow: hidden;">
    <div id="ht-progress-bar" style="width: 0%; height: 100%; background: #eab308; transition: width 0.1s linear;"></div>
  </div>
  <div style="display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af;">
    <span id="ht-count-text">0 / \${config.text.length} characters</span>
    <span id="ht-percent-text">0%</span>
  </div>
  <div style="display: flex; gap: 8px; margin-top: 4px;">
    <button id="ht-pause-btn" style="flex: 1; background: #374151; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-weight: 600; cursor: pointer;">Pause</button>
    <button id="ht-cancel-btn" style="background: #dc2626; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-weight: 600; cursor: pointer;">Cancel</button>
  </div>\`;
  document.body.appendChild(panel);
  const pauseBtn = panel.querySelector("#ht-pause-btn");
  const cancelBtn = panel.querySelector("#ht-cancel-btn");
  const closeBtn = panel.querySelector("#ht-close-btn");
  const statusText = panel.querySelector("#ht-status-text");
  const progressBar = panel.querySelector("#ht-progress-bar");
  const countText = panel.querySelector("#ht-count-text");
  const percentText = panel.querySelector("#ht-percent-text");
  let isPaused = false, isCancelled = false, currentIndex = 0;
  closeBtn.onclick = () => { isCancelled = true; panel.remove(); };
  function playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((f, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.frequency.value = f; g.gain.setValueAtTime(0.15, now + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.85);
        o.connect(g); g.connect(ctx.destination); o.start(now + i * 0.1); o.stop(now + i * 0.1 + 0.9);
      });
    } catch(e) {}
  }
  function getTarget() {
    try {
      const docsIframe = document.querySelector(".docs-texteventtarget-iframe");
      if (docsIframe && docsIframe.contentDocument) {
        const doc = docsIframe.contentDocument; const el = doc.activeElement || doc.body;
        if (el) return { element: el, document: doc, isDocs: true };
      }
    } catch(e) {}
    const active = document.activeElement;
    if (active && active !== document.body && active !== panel && !panel.contains(active)) return { element: active, document: document, isDocs: false };
    const el = document.querySelector("[contenteditable='true'], textarea, input[type='text']") || document.body;
    return { element: el, document: document, isDocs: false };
  }
  function insertChar(char, targetInfo) {
    if (!targetInfo) targetInfo = getTarget();
    const target = targetInfo.element || targetInfo;
    const doc = targetInfo.document || document;
    if (targetInfo.isDocs) {
      try {
        if (char === "\\n") {
          target.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
          target.dispatchEvent(new KeyboardEvent("keypress", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
          doc.execCommand("insertParagraph", false, null) || doc.execCommand("insertLineBreak", false, null);
          target.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
          return;
        }
        const charCode = char.charCodeAt(0);
        target.dispatchEvent(new KeyboardEvent("keydown", { key: char, charCode, keyCode: charCode, which: charCode, bubbles: true }));
        target.dispatchEvent(new KeyboardEvent("keypress", { key: char, charCode, keyCode: charCode, which: charCode, bubbles: true }));
        doc.execCommand("insertText", false, char);
        target.dispatchEvent(new KeyboardEvent("keyup", { key: char, charCode, keyCode: charCode, which: charCode, bubbles: true }));
        return;
      } catch(e) {}
    }
    try {
      if (char === "\\n") {
        target.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true }));
        doc.execCommand("insertParagraph", false, null) || doc.execCommand("insertLineBreak", false, null);
        return;
      }
      if (doc.execCommand("insertText", false, char)) return;
    } catch(e) {}
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? target.value.length;
      target.value = target.value.substring(0, start) + char + target.value.substring(end);
      target.selectionStart = target.selectionEnd = start + 1;
      target.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    if (target.isContentEditable) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0); range.deleteContents();
        const textNode = doc.createTextNode(char); range.insertNode(textNode);
        range.setStartAfter(textNode); range.setEndAfter(textNode);
        sel.removeAllRanges(); sel.addRange(range);
        target.dispatchEvent(new Event("input", { bubbles: true }));
        return;
      }
    }
    const code = char.charCodeAt(0);
    target.dispatchEvent(new KeyboardEvent("keydown", { key: char, keyCode: code, which: code, bubbles: true }));
    target.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data: char, bubbles: true }));
    target.dispatchEvent(new InputEvent("input", { inputType: "insertText", data: char, bubbles: true }));
    target.dispatchEvent(new KeyboardEvent("keyup", { key: char, keyCode: code, which: code, bubbles: true }));
  }
  function isPunct(c) { return [".", ",", ";", ":", "?", "!", "\\n"].includes(c); }
  function getDelay(c) {
    const base = config.baseDelayMs || 120;
    const variation = config.variationMs || 35;
    const jitter = variation ? Math.random() * (variation * 2) - variation : 0;
    let pause = 0;
    if (config.punctuationPauses && isPunct(c)) {
      if ([".", "?", "!"].includes(c)) pause = 280 + Math.random() * 200;
      else if ([",", ";", ":"].includes(c)) pause = 140 + Math.random() * 120;
      else if (c === "\\n") pause = 350 + Math.random() * 250;
    }
    return Math.max(10, Math.round(base + jitter + pause));
  }
  const blob = new Blob([\`self.onmessage = function(e) { setTimeout(function() { self.postMessage('tick'); }, e.data); };\`], { type: "application/javascript" });
  const worker = new Worker(URL.createObjectURL(blob));
  async function loop() {
    let target = getTarget();
    if (target && target.element) target.element.focus();
    for (let c = 3; c > 0; c--) {
      if (isCancelled) return;
      statusText.innerText = 'Starting in ' + c + 's... (Click in the document)';
      await new Promise(r => setTimeout(r, 1000));
    }
    target = getTarget();
    statusText.innerText = "⚡ Typing in the background...";
    const chars = Array.from(config.text);
    const total = chars.length;
    while (currentIndex < total) {
      if (isCancelled) { statusText.innerText = "Typing cancelled"; return; }
      if (isPaused) { statusText.innerText = "Paused (click Resume)"; await new Promise(r => setTimeout(r, 100)); continue; }
      const char = chars[currentIndex];
      insertChar(char, target);
      currentIndex++;
      const pct = Math.round((currentIndex / total) * 100);
      progressBar.style.width = pct + "%";
      countText.innerText = currentIndex + " / " + total + " characters";
      percentText.innerText = pct + "%";
      const delay = getDelay(char);
      await new Promise(resolve => { worker.onmessage = () => resolve(); worker.postMessage(delay); });
    }
    statusText.innerHTML = "✅ <strong>Text completed successfully!</strong>";
    progressBar.style.background = "#10b981";
    pauseBtn.style.display = "none"; cancelBtn.style.display = "none";
    if (config.notifySound) playChime();
  }
  pauseBtn.onclick = () => { isPaused = !isPaused; pauseBtn.innerText = isPaused ? "Resume" : "Pause"; pauseBtn.style.background = isPaused ? "#2563eb" : "#374151"; };
  cancelBtn.onclick = () => { isCancelled = true; panel.remove(); };
  loop();
}`;

  const files: ZipFile[] = [
    { name: "manifest.json", content: manifest },
    { name: "popup.html", content: popupHtml },
    { name: "styles.css", content: stylesCss },
    { name: "popup.js", content: popupJs },
  ];

  const zipBlob = createSimpleZip(files);
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Human-Typer-Extension.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Creador nativo de estructura ZIP en cliente
function createSimpleZip(files: ZipFile[]): Blob {
  const fileEntries: { header: Uint8Array; body: Uint8Array }[] = [];
  const centralEntries: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const encoder = new TextEncoder();
    const body = encoder.encode(file.content);
    const nameBytes = encoder.encode(file.name);
    const crc = computeCrc32(body);

    // Local file header (30 bytes + name)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true); // Local header signature
    lv.setUint16(4, 20, true); // Version needed
    lv.setUint16(6, 0, true); // Flags
    lv.setUint16(8, 0, true); // Compression (0 = store)
    lv.setUint16(10, 0, true); // Mod time
    lv.setUint16(12, 0, true); // Mod date
    lv.setUint32(14, crc, true); // CRC32
    lv.setUint32(18, body.length, true); // Compressed size
    lv.setUint32(22, body.length, true); // Uncompressed size
    lv.setUint16(26, nameBytes.length, true); // Filename length
    lv.setUint16(28, 0, true); // Extra field length
    localHeader.set(nameBytes, 30);

    fileEntries.push({ header: localHeader, body });

    // Central directory header (46 bytes + name)
    const cdHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cdHeader.buffer);
    cv.setUint32(0, 0x02014b50, true); // Central header signature
    cv.setUint16(4, 20, true); // Version made by
    cv.setUint16(6, 20, true); // Version needed
    cv.setUint16(8, 0, true); // Flags
    cv.setUint16(10, 0, true); // Compression
    cv.setUint16(12, 0, true); // Mod time
    cv.setUint16(14, 0, true); // Mod date
    cv.setUint32(16, crc, true); // CRC32
    cv.setUint32(20, body.length, true); // Compressed size
    cv.setUint32(24, body.length, true); // Uncompressed size
    cv.setUint16(28, nameBytes.length, true); // Filename length
    cv.setUint16(30, 0, true); // Extra field length
    cv.setUint16(32, 0, true); // Comment length
    cv.setUint16(34, 0, true); // Disk number
    cv.setUint16(36, 0, true); // Internal attributes
    cv.setUint32(38, 0, true); // External attributes
    cv.setUint32(42, offset, true); // Offset of local header
    cdHeader.set(nameBytes, 46);

    centralEntries.push(cdHeader);
    offset += localHeader.length + body.length;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const c of centralEntries) cdSize += c.length;

  // End of central directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); // EOCD signature
  ev.setUint16(4, 0, true); // Disk number
  ev.setUint16(6, 0, true); // Disk with central dir
  ev.setUint16(8, files.length, true); // Total entries disk
  ev.setUint16(10, files.length, true); // Total entries
  ev.setUint32(12, cdSize, true); // Central dir size
  ev.setUint32(16, cdOffset, true); // Offset of central dir
  ev.setUint16(20, 0, true); // Comment length

  const allParts: Uint8Array[] = [];
  for (const f of fileEntries) {
    allParts.push(f.header);
    allParts.push(f.body);
  }
  for (const c of centralEntries) {
    allParts.push(c);
  }
  allParts.push(eocd);

  return new Blob(allParts as unknown as BlobPart[], {
    type: "application/zip",
  });
}

function computeCrc32(bytes: Uint8Array): number {
  let crc = 0 ^ -1;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c >>> 0;
}
