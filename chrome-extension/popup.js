document.addEventListener("DOMContentLoaded", () => {
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

  // Load saved preferences
  chrome.storage.local.get(
    ["savedText", "speed", "variation", "pausePunct", "notifySound"],
    (res) => {
      if (res.savedText) {
        textInput.value = res.savedText;
        updateCharCount();
      }
      if (res.speed) {
        speedSlider.value = res.speed;
        updateSpeedLabel(res.speed);
      }
      if (res.variation !== undefined && variationSlider && variationVal) {
        variationSlider.value = res.variation;
        variationVal.innerText = `±${res.variation} ms`;
      }
      if (res.pausePunct !== undefined) pausePunct.checked = res.pausePunct;
      if (res.notifySound !== undefined) notifySound.checked = res.notifySound;
    },
  );

  function updateCharCount() {
    const len = Array.from(textInput.value).length;
    charCount.innerText = `${len.toLocaleString("en")} characters`;
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
    speedVal.innerText = `${ms} ms (${getSpeedDescriptor(ms)})`;
    presetBtns.forEach((btn) => {
      btn.classList.toggle("active", Number(btn.dataset.speed) === Number(ms));
    });
  }

  presetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const spd = Number(btn.dataset.speed);
      speedSlider.value = spd;
      updateSpeedLabel(spd);
      chrome.storage.local.set({ speed: spd });
    });
  });

  textInput.addEventListener("input", () => {
    updateCharCount();
    chrome.storage.local.set({ savedText: textInput.value });
  });

  speedSlider.addEventListener("input", () => {
    const spd = Number(speedSlider.value);
    updateSpeedLabel(spd);
    chrome.storage.local.set({ speed: spd });
  });

  if (variationSlider && variationVal) {
    variationSlider.addEventListener("input", () => {
      const v = Number(variationSlider.value);
      variationVal.innerText = `±${v} ms`;
      chrome.storage.local.set({ variation: v });
    });
  }

  pausePunct.addEventListener("change", () => {
    chrome.storage.local.set({ pausePunct: pausePunct.checked });
  });

  notifySound.addEventListener("change", () => {
    chrome.storage.local.set({ notifySound: notifySound.checked });
  });

  startBtn.addEventListener("click", async () => {
    const text = textInput.value;
    if (!text.trim()) return;

    const config = {
      text,
      baseDelayMs: Number(speedSlider.value),
      variationMs: variationSlider ? Number(variationSlider.value) : 35,
      punctuationPauses: pausePunct.checked,
      notifySound: notifySound.checked,
    };

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab || !tab.id) {
      statusText.innerText = "No active tab detected";
      return;
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: injectTypingScript,
        args: [config],
      });

      statusText.innerText = "⚡ Typing started on the page";
      statusPercent.innerText = "Running";
      progressBar.style.width = "100%";
      startBtn.innerText = "✓ Sent to tab";
      setTimeout(() => {
        window.close(); // Close the popup to free up the screen
      }, 700);
    } catch (err) {
      statusText.innerText = "Error: make sure you are on a valid tab";
      console.error(err);
    }
  });

  updateCharCount();
});

// This function runs directly inside Google Docs / the web page
function injectTypingScript(config) {
  // Remove any previous instance
  const prev = document.getElementById("ht-floating-controller");
  if (prev) prev.remove();

  // Create the floating control panel
  const panel = document.createElement("div");
  panel.id = "ht-floating-controller";
  Object.assign(panel.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: "99999999",
    background: "#181a1f",
    color: "#f3f4f6",
    padding: "16px 20px",
    borderRadius: "12px",
    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.6), 0 0 0 2px #eab308",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: "13px",
    minWidth: "300px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    userSelect: "none",
  });

  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 8px;">
      <span style="font-weight: 800; color: #facc15; display: flex; align-items: center; gap: 6px;">
        ⚡ Human Typer <span style="font-size: 11px; background: rgba(234,179,8,0.2); color: #fef08a; padding: 2px 6px; border-radius: 4px;">Background</span>
      </span>
      <button id="ht-close-btn" style="background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 16px;">✕</button>
    </div>
    <div id="ht-status-text" style="color: #e5e7eb; font-weight: 600;">Starting to type on this page...</div>
    <div style="background: rgba(255,255,255,0.1); border-radius: 6px; height: 6px; overflow: hidden;">
      <div id="ht-progress-bar" style="width: 0%; height: 100%; background: #eab308; transition: width 0.1s linear;"></div>
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af;">
      <span id="ht-count-text">0 / ${config.text.length} characters</span>
      <span id="ht-percent-text">0%</span>
    </div>
    <div style="display: flex; gap: 8px; margin-top: 4px;">
      <button id="ht-pause-btn" style="flex: 1; background: #374151; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-weight: 600; cursor: pointer;">Pause</button>
      <button id="ht-cancel-btn" style="background: #dc2626; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-weight: 600; cursor: pointer;">Cancel</button>
    </div>
  `;

  document.body.appendChild(panel);

  const pauseBtn = panel.querySelector("#ht-pause-btn");
  const cancelBtn = panel.querySelector("#ht-cancel-btn");
  const closeBtn = panel.querySelector("#ht-close-btn");
  const statusText = panel.querySelector("#ht-status-text");
  const progressBar = panel.querySelector("#ht-progress-bar");
  const countText = panel.querySelector("#ht-count-text");
  const percentText = panel.querySelector("#ht-percent-text");

  let isPaused = false;
  let isCancelled = false;
  let currentIndex = 0;

  closeBtn.onclick = () => {
    isCancelled = true;
    panel.remove();
  };

  function playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = f;
        g.gain.setValueAtTime(0.15, now + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.85);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(now + i * 0.1);
        o.stop(now + i * 0.1 + 0.9);
      });
    } catch {
      // Audio may be blocked until the user interacts with the page.
    }
  }

  function getTarget() {
    // 1. Google Docs iframe
    try {
      const docsIframe = document.querySelector(".docs-texteventtarget-iframe");
      if (docsIframe && docsIframe.contentDocument) {
        const doc = docsIframe.contentDocument;
        const el = doc.activeElement || doc.body;
        if (el) return { element: el, document: doc, isDocs: true };
      }
    } catch {
      // Some editors isolate their iframe and prevent inspection.
    }

    // 2. Active element
    const active = document.activeElement;
    if (
      active &&
      active !== document.body &&
      active !== panel &&
      !panel.contains(active)
    ) {
      return { element: active, document: document, isDocs: false };
    }

    // 3. Editable fallback
    const el =
      document.querySelector(
        "[contenteditable='true'], textarea, input[type='text']",
      ) || document.body;
    return { element: el, document: document, isDocs: false };
  }

  function insertChar(char, targetInfo) {
    if (!targetInfo) targetInfo = getTarget();
    const target = targetInfo.element || targetInfo;
    const doc = targetInfo.document || document;

    // Special handling for Google Docs
    if (targetInfo.isDocs) {
      try {
        if (char === "\n") {
          target.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "Enter",
              code: "Enter",
              keyCode: 13,
              which: 13,
              bubbles: true,
            }),
          );
          target.dispatchEvent(
            new KeyboardEvent("keypress", {
              key: "Enter",
              code: "Enter",
              keyCode: 13,
              which: 13,
              bubbles: true,
            }),
          );
          if (!doc.execCommand("insertParagraph", false, null)) {
            doc.execCommand("insertLineBreak", false, null);
          }
          target.dispatchEvent(
            new KeyboardEvent("keyup", {
              key: "Enter",
              code: "Enter",
              keyCode: 13,
              which: 13,
              bubbles: true,
            }),
          );
          return;
        }

        const charCode = char.charCodeAt(0);
        target.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: char,
            charCode,
            keyCode: charCode,
            which: charCode,
            bubbles: true,
          }),
        );
        target.dispatchEvent(
          new KeyboardEvent("keypress", {
            key: char,
            charCode,
            keyCode: charCode,
            which: charCode,
            bubbles: true,
          }),
        );
        doc.execCommand("insertText", false, char);
        target.dispatchEvent(
          new KeyboardEvent("keyup", {
            key: char,
            charCode,
            keyCode: charCode,
            which: charCode,
            bubbles: true,
          }),
        );
        return;
      } catch {
        // If Google Docs rejects the events, try the generic methods.
      }
    }

    // Standard execCommand
    try {
      if (char === "\n") {
        target.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            bubbles: true,
          }),
        );
        if (!doc.execCommand("insertParagraph", false, null)) {
          doc.execCommand("insertLineBreak", false, null);
        }
        return;
      }
      if (doc.execCommand("insertText", false, char)) return;
    } catch {
      // Continue with direct insertion for fields and contenteditable elements.
    }

    // Textarea / Input
    if (
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLInputElement
    ) {
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? target.value.length;
      target.value =
        target.value.substring(0, start) + char + target.value.substring(end);
      target.selectionStart = target.selectionEnd = start + 1;
      target.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }

    // Contenteditable
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
        target.dispatchEvent(new Event("input", { bubbles: true }));
        return;
      }
    }

    // Generic events
    const code = char.charCodeAt(0);
    target.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: char,
        keyCode: code,
        which: code,
        bubbles: true,
      }),
    );
    target.dispatchEvent(
      new InputEvent("beforeinput", {
        inputType: "insertText",
        data: char,
        bubbles: true,
      }),
    );
    target.dispatchEvent(
      new InputEvent("input", {
        inputType: "insertText",
        data: char,
        bubbles: true,
      }),
    );
    target.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: char,
        keyCode: code,
        which: code,
        bubbles: true,
      }),
    );
  }

  function isPunct(c) {
    return [".", ",", ";", ":", "?", "!", "\n"].includes(c);
  }

  function getDelay(c) {
    const base = config.baseDelayMs || 65;
    const variation = config.variationMs || 25;
    const jitter = variation ? Math.random() * (variation * 2) - variation : 0;
    let pause = 0;
    if (config.punctuationPauses && isPunct(c)) {
      if ([".", "?", "!"].includes(c)) pause = 280 + Math.random() * 200;
      else if ([",", ";", ":"].includes(c)) pause = 140 + Math.random() * 120;
      else if (c === "\n") pause = 350 + Math.random() * 250;
    }
    return Math.max(10, Math.round(base + jitter + pause));
  }

  // Web Worker for reliable timing in inactive tabs
  const blob = new Blob(
    [
      `self.onmessage = function(e) {
        setTimeout(function() { self.postMessage('tick'); }, e.data);
      };`,
    ],
    { type: "application/javascript" },
  );
  const worker = new Worker(URL.createObjectURL(blob));

  async function loop() {
    let target = getTarget();
    if (target && target.element) {
      target.element.focus();
    }

    // Three-second countdown
    for (let c = 3; c > 0; c--) {
      if (isCancelled) return;
      statusText.innerText = `Starting in ${c}s... (Click in the document)`;
      await new Promise((r) => setTimeout(r, 1000));
    }

    target = getTarget();
    statusText.innerText = "⚡ Typing in the background...";

    const chars = Array.from(config.text);
    const total = chars.length;

    while (currentIndex < total) {
      if (isCancelled) {
        statusText.innerText = "Typing cancelled";
        return;
      }
      if (isPaused) {
        statusText.innerText = "Paused (click Resume)";
        await new Promise((r) => setTimeout(r, 100));
        continue;
      }

      const char = chars[currentIndex];
      insertChar(char, target);
      currentIndex++;

      const pct = Math.round((currentIndex / total) * 100);
      progressBar.style.width = `${pct}%`;
      countText.innerText = `${currentIndex} / ${total} characters`;
      percentText.innerText = `${pct}%`;

      const delay = getDelay(char);
      await new Promise((resolve) => {
        worker.onmessage = () => resolve();
        worker.postMessage(delay);
      });
    }

    statusText.innerHTML = "✅ <strong>Text completed successfully!</strong>";
    progressBar.style.background = "#10b981";
    pauseBtn.style.display = "none";
    cancelBtn.style.display = "none";

    if (config.notifySound) {
      playChime();
    }
  }

  pauseBtn.onclick = () => {
    isPaused = !isPaused;
    pauseBtn.innerText = isPaused ? "Resume" : "Pause";
    pauseBtn.style.background = isPaused ? "#2563eb" : "#374151";
  };

  cancelBtn.onclick = () => {
    isCancelled = true;
    panel.remove();
  };

  loop();
}
