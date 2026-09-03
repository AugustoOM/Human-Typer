document.addEventListener("DOMContentLoaded", () => {
  const translations = {
    en: {
      background: "Background",
      textToType: "Text to type",
      placeholder: "Paste or type the text to enter in the document...",
      typingSpeed: "Typing speed",
      veryFast: "Very Fast",
      fast: "Fast",
      normal: "Normal",
      slow: "Slow",
      verySlow: "Very Slow",
      ultraFastRange: "15 ms (Ultra Fast)",
      pausedRange: "800 ms (Paused)",
      humanVariation: "Human variation",
      punctuationPauses: "Punctuation pauses",
      typingMistakes: "Typing mistakes",
      completionSound: "Completion sound",
      ready: "Ready to start in this tab",
      startTyping: "Start Typing",
      pauseButton: "Pause",
      cancelButton: "Cancel",
      characters: "characters",
      ultraFast: "Ultra Fast",
      fastSpeed: "Fast",
      normalHuman: "Normal / Human",
      slowSpeed: "Slow",
      verySlowPaused: "Very Slow / Paused",
      noTab: "No active tab detected",
      started: "Typing started on the page",
      running: "Running",
      sent: "Sent to tab",
      invalidTab: "Error: make sure you are on a valid tab",
    },
    es: {
      background: "Segundo plano",
      textToType: "Texto para escribir",
      placeholder:
        "Pegá o escribí el texto que debe ingresarse en el documento...",
      typingSpeed: "Velocidad de escritura",
      veryFast: "Muy rápida",
      fast: "Rápida",
      normal: "Normal",
      slow: "Lenta",
      verySlow: "Muy lenta",
      ultraFastRange: "15 ms (Ultrarrápida)",
      pausedRange: "800 ms (Pausada)",
      humanVariation: "Variación humana",
      punctuationPauses: "Pausas de puntuación",
      typingMistakes: "Errores de tipeo",
      completionSound: "Sonido al finalizar",
      ready: "Listo para comenzar en esta pestaña",
      startTyping: "Comenzar a escribir",
      pauseButton: "Pausar",
      cancelButton: "Cancelar",
      characters: "caracteres",
      ultraFast: "Ultrarrápida",
      fastSpeed: "Rápida",
      normalHuman: "Normal / Humana",
      slowSpeed: "Lenta",
      verySlowPaused: "Muy lenta / Pausada",
      noTab: "No se detectó una pestaña activa",
      started: "Escritura iniciada en la página",
      running: "En curso",
      sent: "Enviado a la pestaña",
      invalidTab: "Error: asegurate de estar en una pestaña válida",
    },
  };
  let language = "en";
  const t = (key) => translations[language][key];
  const textInput = document.getElementById("text-input");
  const charCount = document.getElementById("char-count");
  const speedSlider = document.getElementById("speed-slider");
  const speedVal = document.getElementById("speed-val");
  const pausePunct = document.getElementById("pause-punct");
  const typingMistakes = document.getElementById("typing-mistakes");
  const notifySound = document.getElementById("notify-sound");
  const startBtn = document.getElementById("start-btn");
  const statusText = document.getElementById("status-text");
  const statusPercent = document.getElementById("status-percent");
  const progressBar = document.getElementById("progress-bar");
  const languageBtn = document.getElementById("language-btn");
  const languageLabel = document.getElementById("language-label");
  const startBtnLabel = document.getElementById("start-btn-label");

  const variationSlider = document.getElementById("variation-slider");
  const variationVal = document.getElementById("variation-val");
  const presetBtns = document.querySelectorAll(".preset-btn");
  const extensionStorage = globalThis.chrome?.storage?.local;

  function getStoredPreferences(keys, callback) {
    if (extensionStorage) {
      extensionStorage.get(keys, callback);
      return;
    }

    const values = Object.fromEntries(
      keys.map((key) => {
        const storedValue = localStorage.getItem(`human-typer:${key}`);
        return [
          key,
          storedValue === null ? undefined : JSON.parse(storedValue),
        ];
      }),
    );
    callback(values);
  }

  function savePreferences(patch) {
    if (extensionStorage) {
      extensionStorage.set(patch);
      return;
    }

    Object.entries(patch).forEach(([key, value]) => {
      localStorage.setItem(`human-typer:${key}`, JSON.stringify(value));
    });
  }

  // Load saved preferences
  getStoredPreferences(
    [
      "savedText",
      "speed",
      "variation",
      "pausePunct",
      "typingMistakes",
      "notifySound",
      "language",
    ],
    (res) => {
      language = res.language === "es" ? "es" : "en";
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
      if (res.typingMistakes !== undefined)
        typingMistakes.checked = res.typingMistakes;
      if (res.notifySound !== undefined) notifySound.checked = res.notifySound;
      applyLanguage();
    },
  );

  function applyLanguage() {
    document.documentElement.lang = language;
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      element.placeholder = t(element.dataset.i18nPlaceholder);
    });
    languageLabel.textContent = language === "en" ? "ES" : "EN";
    languageBtn.setAttribute(
      "aria-label",
      language === "en" ? "Cambiar a español" : "Switch to English",
    );
    updateCharCount();
    updateSpeedLabel(Number(speedSlider.value));
  }

  languageBtn.addEventListener("click", () => {
    language = language === "en" ? "es" : "en";
    savePreferences({ language });
    applyLanguage();
  });

  function updateCharCount() {
    const len = Array.from(textInput.value).length;
    charCount.innerText = `${len.toLocaleString(language)} ${t("characters")}`;
    startBtn.disabled = len === 0;
  }

  function getSpeedDescriptor(ms) {
    if (ms <= 45) return t("ultraFast");
    if (ms <= 85) return t("fastSpeed");
    if (ms <= 160) return t("normalHuman");
    if (ms <= 280) return t("slowSpeed");
    return t("verySlowPaused");
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
      savePreferences({ speed: spd });
    });
  });

  textInput.addEventListener("input", () => {
    updateCharCount();
    savePreferences({ savedText: textInput.value });
  });

  speedSlider.addEventListener("input", () => {
    const spd = Number(speedSlider.value);
    updateSpeedLabel(spd);
    savePreferences({ speed: spd });
  });

  if (variationSlider && variationVal) {
    variationSlider.addEventListener("input", () => {
      const v = Number(variationSlider.value);
      variationVal.innerText = `±${v} ms`;
      savePreferences({ variation: v });
    });
  }

  pausePunct.addEventListener("change", () => {
    savePreferences({ pausePunct: pausePunct.checked });
  });

  typingMistakes.addEventListener("change", () => {
    savePreferences({ typingMistakes: typingMistakes.checked });
  });

  notifySound.addEventListener("change", () => {
    savePreferences({ notifySound: notifySound.checked });
  });

  startBtn.addEventListener("click", async () => {
    const text = textInput.value;
    if (!text.trim()) return;

    const config = {
      text,
      baseDelayMs: Number(speedSlider.value),
      variationMs: variationSlider ? Number(variationSlider.value) : 35,
      punctuationPauses: pausePunct.checked,
      typingMistakes: typingMistakes.checked,
      notifySound: notifySound.checked,
      language,
    };

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab || !tab.id) {
      statusText.innerText = t("noTab");
      return;
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: injectTypingScript,
        args: [config],
      });

      statusText.innerText = t("started");
      statusPercent.innerText = t("running");
      progressBar.style.width = "100%";
      startBtnLabel.innerText = t("sent");
      setTimeout(() => {
        window.close(); // Close the popup to free up the screen
      }, 700);
    } catch (err) {
      statusText.innerText = t("invalidTab");
      console.error(err);
    }
  });

  updateCharCount();
});

// This function runs directly inside Google Docs / the web page
function injectTypingScript(config) {
  const labels =
    config.language === "es"
      ? {
          background: "Segundo plano",
          startingPage: "Iniciando escritura en esta página...",
          characters: "caracteres",
          pause: "Pausar",
          cancel: "Cancelar",
          starting: "Comenzando en",
          clickDocument: "Hacé clic en el documento",
          typing: "Escribiendo en segundo plano...",
          typingCancelled: "Escritura cancelada",
          paused: "En pausa (pulsá Reanudar)",
          completed: "¡Texto completado con éxito!",
          resume: "Reanudar",
        }
      : {
          background: "Background",
          startingPage: "Starting to type on this page...",
          characters: "characters",
          pause: "Pause",
          cancel: "Cancel",
          starting: "Starting in",
          clickDocument: "Click in the document",
          typing: "Typing in the background...",
          typingCancelled: "Typing cancelled",
          paused: "Paused (click Resume)",
          completed: "Text completed successfully!",
          resume: "Resume",
        };
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
    background: "#fffdf8",
    color: "#2d2a25",
    padding: "16px",
    border: "1px solid #d8d0c2",
    borderRadius: "14px",
    boxShadow: "0 18px 48px rgba(66, 57, 44, 0.18)",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: "13px",
    minWidth: "310px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    userSelect: "none",
  });

  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #d8d0c2; padding-bottom: 10px;">
      <span style="font-weight: 700; color: #2d2a25; display: flex; align-items: center; gap: 7px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 6a2 2 0 0 1 2 -2h16a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2z"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/></svg>
        Human Typer <span style="font-size: 10px; background: #f4e7c9; color: #6f572c; padding: 3px 7px; border-radius: 999px;">${labels.background}</span>
      </span>
      <button id="ht-close-btn" aria-label="Close" style="display:grid;place-items:center;background: none; border: none; color: #6f6a60; cursor: pointer; padding:4px;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M18 6l-12 12M6 6l12 12"/></svg></button>
    </div>
    <div id="ht-status-text" style="color: #2d2a25; font-weight: 600;">${labels.startingPage}</div>
    <div style="background: #d8d0c2; border-radius: 999px; height: 5px; overflow: hidden;">
      <div id="ht-progress-bar" style="width: 0%; height: 100%; background: #c99535; transition: width 0.1s linear;"></div>
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #6f6a60;">
      <span id="ht-count-text">0 / ${config.text.length} ${labels.characters}</span>
      <span id="ht-percent-text">0%</span>
    </div>
    <div style="display: flex; gap: 8px; margin-top: 4px;">
      <button id="ht-pause-btn" style="flex: 1; background: #2d2a25; color: #fffdf8; border: 1px solid #2d2a25; padding: 8px 12px; border-radius: 9px; font-weight: 600; cursor: pointer;">${labels.pause}</button>
      <button id="ht-cancel-btn" style="background: #f5e4de; color: #a65345; border: 1px solid #e5c9c1; padding: 8px 12px; border-radius: 9px; font-weight: 600; cursor: pointer;">${labels.cancel}</button>
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

  function deletePreviousChar(targetInfo) {
    if (!targetInfo) targetInfo = getTarget();
    const target = targetInfo.element || targetInfo;
    const doc = targetInfo.document || document;

    if (targetInfo.isDocs) {
      try {
        target.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Backspace",
            code: "Backspace",
            keyCode: 8,
            which: 8,
            bubbles: true,
          }),
        );
        doc.execCommand("delete", false, null);
        target.dispatchEvent(
          new KeyboardEvent("keyup", {
            key: "Backspace",
            code: "Backspace",
            keyCode: 8,
            which: 8,
            bubbles: true,
          }),
        );
        return;
      } catch {
        // Fall through to the generic deletion methods.
      }
    }

    if (
      target &&
      (target.tagName === "TEXTAREA" || target.tagName === "INPUT")
    ) {
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? target.value.length;
      if (start !== end) {
        target.value =
          target.value.substring(0, start) + target.value.substring(end);
        target.selectionStart = target.selectionEnd = start;
      } else if (start > 0) {
        target.value =
          target.value.substring(0, start - 1) + target.value.substring(end);
        target.selectionStart = target.selectionEnd = start - 1;
      }
      target.dispatchEvent(
        new InputEvent("input", {
          inputType: "deleteContentBackward",
          data: null,
          bubbles: true,
        }),
      );
      return;
    }

    try {
      if (doc.execCommand("delete", false, null)) return;
    } catch {
      // Some editors only react to keyboard/input events.
    }

    target.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Backspace",
        code: "Backspace",
        keyCode: 8,
        which: 8,
        bubbles: true,
      }),
    );
    target.dispatchEvent(
      new InputEvent("beforeinput", {
        inputType: "deleteContentBackward",
        data: null,
        bubbles: true,
      }),
    );
    target.dispatchEvent(
      new InputEvent("input", {
        inputType: "deleteContentBackward",
        data: null,
        bubbles: true,
      }),
    );
    target.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: "Backspace",
        code: "Backspace",
        keyCode: 8,
        which: 8,
        bubbles: true,
      }),
    );
  }

  const nearbyKeys = {
    a: "qwsz",
    b: "vghn",
    c: "xdfv",
    d: "serfvxc",
    e: "wsdr",
    f: "drtgvc",
    g: "ftyhbv",
    h: "gyujnb",
    i: "ujko",
    j: "huikmn",
    k: "jiolm",
    l: "kop",
    m: "njk",
    n: "bhjm",
    o: "iklp",
    p: "ol",
    q: "wa",
    r: "edft",
    s: "awedxz",
    t: "rfgy",
    u: "yhji",
    v: "cfgb",
    w: "qase",
    x: "zsdc",
    y: "tghu",
    z: "asx",
  };

  function nearbyTypo(char) {
    if (!config.typingMistakes || Math.random() >= 0.05) return null;
    const choices = nearbyKeys[char.toLowerCase()];
    if (!choices) return null;
    const typo = choices[Math.floor(Math.random() * choices.length)];
    return char === char.toUpperCase() ? typo.toUpperCase() : typo;
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

  function waitFor(ms) {
    return new Promise((resolve) => {
      worker.onmessage = () => resolve();
      worker.postMessage(ms);
    });
  }

  async function loop() {
    let target = getTarget();
    if (target && target.element) {
      target.element.focus();
    }

    // Three-second countdown
    for (let c = 3; c > 0; c--) {
      if (isCancelled) return;
      statusText.innerText = `${labels.starting} ${c}s... (${labels.clickDocument})`;
      await new Promise((r) => setTimeout(r, 1000));
    }

    target = getTarget();
    statusText.innerText = labels.typing;

    const chars = Array.from(config.text);
    const total = chars.length;

    while (currentIndex < total) {
      if (isCancelled) {
        statusText.innerText = labels.typingCancelled;
        return;
      }
      if (isPaused) {
        statusText.innerText = labels.paused;
        await new Promise((r) => setTimeout(r, 100));
        continue;
      }

      const char = chars[currentIndex];
      const typo = nearbyTypo(char);
      if (typo) {
        insertChar(typo, target);
        await waitFor(90 + Math.random() * 160);
        deletePreviousChar(target);
        await waitFor(45 + Math.random() * 75);
        if (isCancelled) return;
      }
      insertChar(char, target);
      currentIndex++;

      const pct = Math.round((currentIndex / total) * 100);
      progressBar.style.width = `${pct}%`;
      countText.innerText = `${currentIndex} / ${total} ${labels.characters}`;
      percentText.innerText = `${pct}%`;

      const delay = getDelay(char);
      await waitFor(delay);
    }

    statusText.innerHTML = `<strong>${labels.completed}</strong>`;
    progressBar.style.background = "#55765c";
    pauseBtn.style.display = "none";
    cancelBtn.style.display = "none";

    if (config.notifySound) {
      playChime();
    }
  }

  pauseBtn.onclick = () => {
    isPaused = !isPaused;
    pauseBtn.innerText = isPaused ? labels.resume : labels.pause;
    pauseBtn.style.background = isPaused ? "#c99535" : "#2d2a25";
  };

  cancelBtn.onclick = () => {
    isCancelled = true;
    panel.remove();
  };

  loop();
}
