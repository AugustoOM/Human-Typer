/**
 * Generates a pleasant completion sound using the native Web Audio API
 * without requiring external audio files.
 */
export function playCompletionChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Soft three-note chord (C5 - E5 - G5)
    const freqs = [523.25, 659.25, 783.99];

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.1);

      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.1 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.95);
    });
  } catch {
    // If the browser blocks audio until user interaction, fail silently.
  }
}

/**
 * Requests permission and sends a system notification.
 */
export async function sendDesktopNotification(title: string, body: string) {
  if (!("Notification" in window)) return;

  try {
    if (Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/tauri.svg",
      });
    } else if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        new Notification(title, {
          body,
          icon: "/tauri.svg",
        });
      }
    }
  } catch {
    // Fail safely if notifications are blocked.
  }
}
