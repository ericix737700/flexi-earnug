// Guarded service worker registration.
// Refuses to register in dev, Lovable preview, iframes, or when ?sw=off is set.

const SW_PATH = "/sw.js";

function isLovablePreviewHost(host: string): boolean {
  return (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev")
  );
}

async function unregisterMatching() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
          return url.endsWith(SW_PATH);
        })
        .map((r) => r.unregister())
    );
  } catch {
    /* noop */
  }
}

export async function registerPWA() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const inIframe = window.self !== window.top;
  const host = window.location.hostname;
  const killSwitch = new URLSearchParams(window.location.search).get("sw") === "off";
  const isProd = import.meta.env.PROD;

  if (!isProd || inIframe || isLovablePreviewHost(host) || killSwitch) {
    await unregisterMatching();
    return;
  }

  try {
    await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
  } catch {
    /* noop */
  }
}
