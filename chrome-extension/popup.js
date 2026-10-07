document.addEventListener("DOMContentLoaded", () => {
  const MAX_CHARACTERS = 250_000;
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
      tooLong: "Text cannot exceed 250,000 characters",
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
      tooLong: "El texto no puede superar los 250.000 caracteres",
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

  // Versions before 0.7.1 persisted the composed text. Remove that legacy
  // value so text remains memory-only as promised by the privacy policy.
  if (extensionStorage) {
    extensionStorage.remove("savedText");
  } else {
    localStorage.removeItem("human-typer:savedText");
  }

  // Load non-sensitive preferences only.
  getStoredPreferences(
    [
      "speed",
      "variation",
      "pausePunct",
      "typingMistakes",
      "notifySound",
      "language",
    ],
    (res) => {
      language = res.language === "es" ? "es" : "en";
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
    if (Array.from(text).length > MAX_CHARACTERS) {
      statusText.innerText = t("tooLong");
      return;
    }

    const config = {
      text,
      baseDelayMs: Number(speedSlider.value),
      variationMs: variationSlider ? Number(variationSlider.value) : 35,
      punctuationPauses: pausePunct.checked,
      typingMistakes: typingMistakes.checked,
      notifySound: notifySound.checked,
      notifyOnComplete: notifySound.checked,
      language,
      labels: globalThis.humanTyperLabels(language),
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
        func: globalThis.humanTyperRun,
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

  const bridgeStatus = document.getElementById("bridge-status");
  document
    .getElementById("bridge-connect")
    .addEventListener("click", async () => {
      const response = await chrome.runtime.sendMessage({
        type: "pair",
        code: document.getElementById("bridge-code").value.trim(),
      });
      bridgeStatus.textContent = response.ok
        ? language === "es"
          ? "Conectando…"
          : "Connecting…"
        : response.error;
    });
  const refreshConnection = () =>
    chrome.runtime
      .sendMessage({ type: "connectionState" })
      .then((result) => {
        bridgeStatus.textContent = result.connected
          ? language === "es"
            ? "Conectado"
            : "Connected"
          : language === "es"
            ? "Desconectado"
            : "Disconnected";
        if (result.connected) document.getElementById("bridge-code").value = "";
      })
      .catch(() => {
        bridgeStatus.textContent =
          language === "es" ? "Actualizá la extensión" : "Update the extension";
      });
  refreshConnection();
  setInterval(refreshConnection, 1000);
  updateCharCount();
});
