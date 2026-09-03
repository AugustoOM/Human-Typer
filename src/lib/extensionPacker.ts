const EXTENSION_DOWNLOAD_URL =
  "https://github.com/AugustoOM/Human-Typer/releases/latest/download/Human-Typer-Browser-Extension.zip";

export function downloadExtensionZip(): void {
  const link = document.createElement("a");
  link.href = EXTENSION_DOWNLOAD_URL;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.click();
}
