if (typeof importScripts === "function") importScripts("runner.js");
let socket = null;
let pollTimer = null;
let currentJob = null;
let authenticated = false;
const send = (data) => {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data));
};
async function tabs() {
  const all = await chrome.tabs.query({
    url: [
      "https://docs.google.com/document/*",
      "https://docs.google.com/spreadsheets/*",
    ],
  });
  return all
    .filter((tab) => tab.id && tab.url)
    .map((tab) => ({ id: tab.id, title: tab.title || tab.url, url: tab.url }));
}
function status(state, message = null) {
  if (currentJob)
    send({ type: "status", id: currentJob.id, status: state, message });
}
async function command(command) {
  if (command.type === "prepare") {
    if (
      currentJob &&
      ["prepared", "typing", "paused", "countdown"].includes(currentJob.status)
    )
      return;
    currentJob = { ...command.job, status: "prepared" };
    try {
      const target = await chrome.tabs.get(currentJob.tabId);
      if (!target.url?.startsWith("https://docs.google.com/document/"))
        throw new Error(
          "Choose a Google Docs document. Sheets transcription will use the Sheets API in a later stage.",
        );
      await chrome.scripting.executeScript({
        target: { tabId: currentJob.tabId },
        func: globalThis.humanTyperRun,
        args: [{ ...currentJob.config, jobId: currentJob.id, prepared: true }],
      });
      status("prepared");
    } catch (error) {
      currentJob.status = "error";
      status("error", String(error.message || error));
    }
  }
  if (command.type === "control" && currentJob?.id === command.id) {
    try {
      await chrome.tabs.sendMessage(currentJob.tabId, {
        type: "jobControl",
        id: currentJob.id,
        action: command.action,
      });
    } catch {
      currentJob.status = "error";
      status(
        "error",
        "The document was closed or reloaded. Check it before retrying.",
      );
    }
  }
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (
    message.type === "jobStatus" &&
    currentJob?.id === message.id &&
    sender.tab?.id === currentJob.tabId
  ) {
    currentJob.status = message.status;
    send({ ...message, type: "status" });
    reply({ ok: true });
    return;
  }
  // Pairing is accepted only from an extension page, never a content script.
  if (sender.tab || sender.id !== chrome.runtime.id) return;
  if (message.type === "connectionState") {
    reply({
      connected: authenticated && socket?.readyState === WebSocket.OPEN,
    });
    return;
  }
  if (message.type === "pair") {
    const match = /^(\d{1,5}):([a-f0-9]{64})$/.exec(message.code || "");
    if (!match || Number(match[1]) < 1 || Number(match[1]) > 65535) {
      reply({ ok: false, error: "Invalid pairing code / Código inválido" });
      return;
    }
    if (
      currentJob &&
      ["prepared", "typing", "paused", "countdown"].includes(currentJob.status)
    ) {
      reply({
        ok: false,
        error:
          "Cancel the current job before pairing again / Cancelá el trabajo antes de volver a conectar",
      });
      return;
    }
    authenticated = false;
    if (socket) socket.close();
    clearInterval(pollTimer);
    const connection = new WebSocket(`ws://127.0.0.1:${match[1]}`);
    socket = connection;
    connection.onopen = () =>
      send({ type: "hello", version: 1, token: match[2] });
    connection.onmessage = async (event) => {
      const response = JSON.parse(event.data);
      if (response.type === "hello") {
        authenticated = true;
        const poll = async () => send({ type: "poll", tabs: await tabs() });
        await poll();
        pollTimer = setInterval(poll, 1000);
      }
      for (const item of response.commands || []) await command(item);
    };
    connection.onclose = () => {
      if (socket !== connection) return;
      clearInterval(pollTimer);
      socket = null;
      authenticated = false;
      if (
        currentJob &&
        ["prepared", "typing", "paused", "countdown"].includes(
          currentJob.status,
        )
      )
        chrome.tabs
          .sendMessage(currentJob.tabId, {
            type: "jobControl",
            id: currentJob.id,
            action: "cancel",
          })
          .catch(() => {});
      currentJob = null;
    };
    reply({ ok: true });
  }
});
chrome.tabs.onRemoved.addListener((id) => {
  if (currentJob?.tabId === id) {
    currentJob.status = "error";
    status("error", "The destination tab was closed.");
  }
});
