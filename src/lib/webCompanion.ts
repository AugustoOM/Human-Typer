/**
 * Script / bookmarklet generator for Google Docs, Word Online, and any website.
 * Types character by character in the background even when the user switches tabs
 * or watches videos in another window.
 */

export interface WebCompanionOptions {
  text: string;
  baseDelayMs: number;
  variationMs: number;
  punctuationPauses: boolean;
  notifyOnComplete: boolean;
}

export function generateWebCompanionScript(
  options: WebCompanionOptions,
): string {
  const jsonConfig = JSON.stringify({
    text: options.text,
    baseDelayMs: options.baseDelayMs,
    variationMs: options.variationMs,
    punctuationPauses: options.punctuationPauses,
    notifyOnComplete: options.notifyOnComplete,
  });

  return `(() => {
  const config = ${jsonConfig};
  
  if (!config.text) {
    alert("Human Typer: Please enter some text first.");
    return;
  }

  // Remove any previous instance
  const prev = document.getElementById("human-typer-companion-panel");
  if (prev) prev.remove();

  // Create the floating control panel
  const panel = document.createElement("div");
  panel.id = "human-typer-companion-panel";
  Object.assign(panel.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: "9999999",
    background: "rgba(18, 20, 24, 0.95)",
    color: "#f3f4f6",
    padding: "16px 20px",
    borderRadius: "14px",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.15)",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: "13px",
    backdropFilter: "blur(12px)",
    minWidth: "280px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    userSelect: "none"
  });

  panel.innerHTML = \`
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
      <span style="font-weight: 700; color: #60a5fa; display: flex; align-items: center; gap: 6px;">
        ⚡ Human Typer <span style="font-size: 11px; background: rgba(96,165,250,0.2); padding: 2px 6px; border-radius: 6px;">Background</span>
      </span>
      <button id="ht-close-btn" style="background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 16px;">✕</button>
    </div>
    <div id="ht-status-text" style="color: #e5e7eb; font-weight: 500;">Ready to type in this document</div>
    <div style="background: rgba(255,255,255,0.1); border-radius: 6px; height: 6px; overflow: hidden;">
      <div id="ht-progress-bar" style="width: 0%; height: 100%; background: #3b82f6; transition: width 0.1s linear;"></div>
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af;">
      <span id="ht-count-text">0 / \${config.text.length} characters</span>
      <span id="ht-percent-text">0%</span>
    </div>
    <div style="display: flex; gap: 8px; margin-top: 4px;">
      <button id="ht-start-btn" style="flex: 1; background: #2563eb; color: white; border: none; padding: 8px 12px; border-radius: 8px; font-weight: 600; cursor: pointer;">Start (3s)</button>
      <button id="ht-pause-btn" style="display: none; flex: 1; background: #374151; color: white; border: none; padding: 8px 12px; border-radius: 8px; font-weight: 600; cursor: pointer;">Pause</button>
      <button id="ht-cancel-btn" style="display: none; background: #dc2626; color: white; border: none; padding: 8px 12px; border-radius: 8px; font-weight: 600; cursor: pointer;">Cancel</button>
    </div>
  \`;

  document.body.appendChild(panel);

  const startBtn = panel.querySelector("#ht-start-btn");
  const pauseBtn = panel.querySelector("#ht-pause-btn");
  const cancelBtn = panel.querySelector("#ht-cancel-btn");
  const closeBtn = panel.querySelector("#ht-close-btn");
  const statusText = panel.querySelector("#ht-status-text");
  const progressBar = panel.querySelector("#ht-progress-bar");
  const countText = panel.querySelector("#ht-count-text");
  const percentText = panel.querySelector("#ht-percent-text");

  let isRunning = false;
  let isPaused = false;
  let isCancelled = false;
  let currentIndex = 0;
  let targetElement = null;

  closeBtn.onclick = () => {
    isCancelled = true;
    panel.remove();
  };

  // Completion sound using the Web Audio API
  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = f;
        g.gain.setValueAtTime(0.12, now + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.8);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(now + i * 0.1);
        o.stop(now + i * 0.1 + 0.85);
      });
    } catch (e) {}
  }

  // System notification
  function sendNotify() {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Human Typer", {
        body: "Typing completed successfully! All characters were typed.",
        icon: "https://tauri.app/img/favicon.png"
      });
    }
  }
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }

  function getActiveOrDocsTarget() {
    // 1. Google Docs keyboard-event iframe
    try {
      const docsIframe = document.querySelector(".docs-texteventtarget-iframe");
      if (docsIframe && docsIframe.contentDocument) {
        const doc = docsIframe.contentDocument;
        if (doc) {
          const el = doc.activeElement || doc.body;
          if (el) return { element: el, document: doc, isDocs: true };
        }
      }
    } catch(e) {}

    // 2. Active element on the page
    const active = document.activeElement;
    if (active && active !== document.body && active !== panel && !panel.contains(active)) {
      return { element: active, document: document, isDocs: false };
    }

    // 3. First text field or editable element
    const fallback = document.querySelector("[contenteditable='true'], textarea, input[type='text']") || document.body;
    return { element: fallback, document: document, isDocs: false };
  }

  function insertChar(char, targetInfo) {
    if (!targetInfo) targetInfo = getActiveOrDocsTarget();
    const target = targetInfo.element || targetInfo;
    const doc = targetInfo.document || document;

    // Special handling for Google Docs
    if (targetInfo.isDocs) {
      try {
        if (char === '\\n') {
          target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
          target.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
          doc.execCommand('insertParagraph', false, null) || doc.execCommand('insertLineBreak', false, null);
          target.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
          return;
        }

        const charCode = char.charCodeAt(0);
        target.dispatchEvent(new KeyboardEvent('keydown', { key: char, charCode, keyCode: charCode, which: charCode, bubbles: true }));
        target.dispatchEvent(new KeyboardEvent('keypress', { key: char, charCode, keyCode: charCode, which: charCode, bubbles: true }));
        doc.execCommand('insertText', false, char);
        target.dispatchEvent(new KeyboardEvent('keyup', { key: char, charCode, keyCode: charCode, which: charCode, bubbles: true }));
        return;
      } catch(e) {}
    }

    // 1. Standard execCommand
    try {
      if (char === '\\n') {
        target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        doc.execCommand('insertParagraph', false, null) || doc.execCommand('insertLineBreak', false, null);
        return;
      }
      
      const success = doc.execCommand('insertText', false, char);
      if (success) return;
    } catch(e) {}

    // 2. Textarea or HTML input
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? target.value.length;
      target.value = target.value.substring(0, start) + char + target.value.substring(end);
      target.selectionStart = target.selectionEnd = start + 1;
      target.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    // 3. Direct contenteditable insertion
    if (target.isContentEditable) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const textNode = doc.createTextNode(char);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        sel.removeAllRanges();
        sel.addRange(range);
        target.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
    }

    // 4. Synthetic events
    const code = char.charCodeAt(0);
    target.dispatchEvent(new KeyboardEvent('keydown', { key: char, keyCode: code, which: code, bubbles: true }));
    target.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: char, bubbles: true }));
    target.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: char, bubbles: true }));
    target.dispatchEvent(new KeyboardEvent('keyup', { key: char, keyCode: code, which: code, bubbles: true }));
  }

  function isPunctuation(ch) {
    return ['.', ',', ';', ':', '?', '!', '\\n'].includes(ch);
  }

  function calculateDelay(char) {
    const base = config.baseDelayMs || 65;
    const variation = config.variationMs || 25;
    const jitter = variation ? (Math.random() * (variation * 2) - variation) : 0;
    let pause = 0;
    if (config.punctuationPauses && isPunctuation(char)) {
      if (['.', '?', '!'].includes(char)) pause = 280 + Math.random() * 200;
      else if ([',', ';', ':'].includes(char)) pause = 140 + Math.random() * 120;
      else if (char === '\\n') pause = 350 + Math.random() * 250;
    }
    return Math.max(10, Math.round(base + jitter + pause));
  }

  // In-memory Web Worker to avoid Chrome/Edge background-tab throttling
  const workerBlob = new Blob([\`
    self.onmessage = function(e) {
      setTimeout(() => { self.postMessage('tick'); }, e.data);
    };
  \`], { type: 'application/javascript' });
  const worker = new Worker(URL.createObjectURL(workerBlob));

  async function startTypingLoop() {
    isRunning = true;
    startBtn.style.display = "none";
    pauseBtn.style.display = "block";
    cancelBtn.style.display = "block";

    // Capture the target element
    targetElement = getActiveOrDocsTarget();
    if (targetElement && targetElement.element) {
      targetElement.element.focus();
    }

    // Three-second countdown
    for (let c = 3; c > 0; c--) {
      if (isCancelled) return;
      statusText.innerText = \`Starting in \${c}... (Click where you want to type)\`;
      await new Promise(r => setTimeout(r, 1000));
    }

    targetElement = getActiveOrDocsTarget();
    statusText.innerText = "⚡ Typing in the background...";

    const chars = Array.from(config.text);
    const total = chars.length;

    while (currentIndex < total) {
      if (isCancelled) {
        statusText.innerText = "Cancelled";
        return;
      }

      if (isPaused) {
        statusText.innerText = "Paused";
        await new Promise(r => setTimeout(r, 100));
        continue;
      }

      const char = chars[currentIndex];
      insertChar(char, targetElement);
      currentIndex++;

      const pct = Math.round((currentIndex / total) * 100);
      progressBar.style.width = \`\${pct}%\`;
      countText.innerText = \`\${currentIndex} / \${total} characters\`;
      percentText.innerText = \`\${pct}%\`;

      const delay = calculateDelay(char);
      await new Promise(resolve => {
        worker.onmessage = () => resolve();
        worker.postMessage(delay);
      });
    }

    statusText.innerHTML = "✅ <strong>Completed successfully!</strong>";
    progressBar.style.background = "#10b981";
    pauseBtn.style.display = "none";
    cancelBtn.style.display = "none";
    startBtn.style.display = "block";
    startBtn.innerText = "Type again";
    currentIndex = 0;
    isRunning = false;

    playBeep();
    sendNotify();
  }

  startBtn.onclick = () => {
    isCancelled = false;
    isPaused = false;
    startTypingLoop();
  };

  pauseBtn.onclick = () => {
    isPaused = !isPaused;
    pauseBtn.innerText = isPaused ? "Resume" : "Pause";
    pauseBtn.style.background = isPaused ? "#2563eb" : "#374151";
  };

  cancelBtn.onclick = () => {
    isCancelled = true;
    isRunning = false;
    statusText.innerText = "Typing cancelled";
    pauseBtn.style.display = "none";
    cancelBtn.style.display = "none";
    startBtn.style.display = "block";
    startBtn.innerText = "Start";
    currentIndex = 0;
  };

  // Start automatically
  startTypingLoop();
})();`;
}

/**
 * Returns the executable bookmarklet as a JavaScript URL.
 */
export function generateBookmarkletHref(options: WebCompanionOptions): string {
  const code = generateWebCompanionScript(options);
  return `javascript:${encodeURIComponent(code)}`;
}
