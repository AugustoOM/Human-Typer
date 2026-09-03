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
  language: "en" | "es";
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
    labels:
      options.language === "es"
        ? {
            empty: "Human Typer: Ingresá un texto primero.",
            background: "Segundo plano",
            ready: "Listo para escribir en este documento",
            characters: "caracteres",
            start3: "Comenzar (3s)",
            pause: "Pausar",
            cancel: "Cancelar",
            notification:
              "¡Escritura finalizada con éxito! Se escribieron todos los caracteres.",
            starting: "Comenzando en",
            clickTarget: "Hacé clic donde quieras escribir",
            typing: "Escribiendo en segundo plano...",
            cancelled: "Cancelado",
            paused: "En pausa",
            completed: "¡Completado con éxito!",
            typeAgain: "Escribir de nuevo",
            resume: "Reanudar",
            typingCancelled: "Escritura cancelada",
            start: "Comenzar",
          }
        : {
            empty: "Human Typer: Please enter some text first.",
            background: "Background",
            ready: "Ready to type in this document",
            characters: "characters",
            start3: "Start (3s)",
            pause: "Pause",
            cancel: "Cancel",
            notification:
              "Typing completed successfully! All characters were typed.",
            starting: "Starting in",
            clickTarget: "Click where you want to type",
            typing: "Typing in the background...",
            cancelled: "Cancelled",
            paused: "Paused",
            completed: "Completed successfully!",
            typeAgain: "Type again",
            resume: "Resume",
            typingCancelled: "Typing cancelled",
            start: "Start",
          },
  });

  return `(() => {
  const config = ${jsonConfig};
  
  if (!config.text) {
    alert(config.labels.empty);
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
    background: "#fffdf8",
    color: "#2d2a25",
    padding: "16px",
    border: "1px solid #d8d0c2",
    borderRadius: "14px",
    boxShadow: "0 18px 48px rgba(66, 57, 44, 0.18)",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: "13px",
    minWidth: "310px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    userSelect: "none"
  });

  panel.innerHTML = \`
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #d8d0c2; padding-bottom: 10px;">
      <span style="font-weight: 700; color: #2d2a25; display: flex; align-items: center; gap: 7px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 6a2 2 0 0 1 2 -2h16a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2z"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/></svg>
        Human Typer <span style="font-size: 10px; background: #f4e7c9; color: #6f572c; padding: 3px 7px; border-radius: 999px;">\${config.labels.background}</span>
      </span>
      <button id="ht-close-btn" aria-label="Close" style="display:grid;place-items:center;background:none;border:none;color:#6f6a60;cursor:pointer;padding:4px;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M18 6l-12 12M6 6l12 12"/></svg></button>
    </div>
    <div id="ht-status-text" style="color: #2d2a25; font-weight: 600;">\${config.labels.ready}</div>
    <div style="background: #d8d0c2; border-radius: 999px; height: 5px; overflow: hidden;">
      <div id="ht-progress-bar" style="width: 0%; height: 100%; background: #c99535; transition: width 0.1s linear;"></div>
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #6f6a60;">
      <span id="ht-count-text">0 / \${config.text.length} \${config.labels.characters}</span>
      <span id="ht-percent-text">0%</span>
    </div>
    <div style="display: flex; gap: 8px; margin-top: 4px;">
      <button id="ht-start-btn" style="flex: 1; background: #2d2a25; color: #fffdf8; border: 1px solid #2d2a25; padding: 8px 12px; border-radius: 9px; font-weight: 600; cursor: pointer;">\${config.labels.start3}</button>
      <button id="ht-pause-btn" style="display: none; flex: 1; background: #2d2a25; color: #fffdf8; border: 1px solid #2d2a25; padding: 8px 12px; border-radius: 9px; font-weight: 600; cursor: pointer;">\${config.labels.pause}</button>
      <button id="ht-cancel-btn" style="display: none; background: #f5e4de; color: #a65345; border: 1px solid #e5c9c1; padding: 8px 12px; border-radius: 9px; font-weight: 600; cursor: pointer;">\${config.labels.cancel}</button>
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
        body: config.labels.notification,
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
      statusText.innerText = \`\${config.labels.starting} \${c}... (\${config.labels.clickTarget})\`;
      await new Promise(r => setTimeout(r, 1000));
    }

    targetElement = getActiveOrDocsTarget();
    statusText.innerText = config.labels.typing;

    const chars = Array.from(config.text);
    const total = chars.length;

    while (currentIndex < total) {
      if (isCancelled) {
        statusText.innerText = config.labels.cancelled;
        return;
      }

      if (isPaused) {
        statusText.innerText = config.labels.paused;
        await new Promise(r => setTimeout(r, 100));
        continue;
      }

      const char = chars[currentIndex];
      insertChar(char, targetElement);
      currentIndex++;

      const pct = Math.round((currentIndex / total) * 100);
      progressBar.style.width = \`\${pct}%\`;
      countText.innerText = \`\${currentIndex} / \${total} \${config.labels.characters}\`;
      percentText.innerText = \`\${pct}%\`;

      const delay = calculateDelay(char);
      await new Promise(resolve => {
        worker.onmessage = () => resolve();
        worker.postMessage(delay);
      });
    }

    statusText.innerHTML = "<strong>" + config.labels.completed + "</strong>";
    progressBar.style.background = "#55765c";
    pauseBtn.style.display = "none";
    cancelBtn.style.display = "none";
    startBtn.style.display = "block";
    startBtn.innerText = config.labels.typeAgain;
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
    pauseBtn.innerText = isPaused ? config.labels.resume : config.labels.pause;
    pauseBtn.style.background = isPaused ? "#c99535" : "#2d2a25";
  };

  cancelBtn.onclick = () => {
    isCancelled = true;
    isRunning = false;
    statusText.innerText = config.labels.typingCancelled;
    pauseBtn.style.display = "none";
    cancelBtn.style.display = "none";
    startBtn.style.display = "block";
    startBtn.innerText = config.labels.start;
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
