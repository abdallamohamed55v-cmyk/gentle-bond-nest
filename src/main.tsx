import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "./styles/slides-typography.css";
import "./styles/megsy-build-redesign.css";
import { reportError } from "@/lib/errors";

// Prevent right-click context menu
// Prevent right-click context menu, except inside editable fields so users can copy/paste normally
document.addEventListener("contextmenu", (e) => {
  const t = e.target as HTMLElement | null;
  if (t && t.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return;
  e.preventDefault();
});

// Report any unhandled error or promise rejection to the admin (best-effort).
let __lastReport = 0;
const __reportThrottled = (err: unknown, source: string) => {
  const now = Date.now();
  if (now - __lastReport < 2000) return; // throttle bursts
  __lastReport = now;
  void reportError(err, { source });
};
window.addEventListener("error", (e) => __reportThrottled(e.error ?? e.message, "window.onerror"));
window.addEventListener("unhandledrejection", (e) => __reportThrottled(e.reason, "unhandledrejection"));

// Apply saved user bubble color
const savedBubble = localStorage.getItem("userBubbleColor");
if (savedBubble) document.documentElement.style.setProperty("--user-bubble", savedBubble);

// Keep `position: fixed` elements pinned to the visual viewport on mobile
// (iOS Safari shifts fixed elements when the URL bar / keyboard show or hide).
// Components can read `--kb-offset` to translate themselves above the keyboard.
(() => {
  const vv = window.visualViewport;
  if (!vv) return;
  const update = () => {
    const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    document.documentElement.style.setProperty("--kb-offset", `${offset}px`);
  };
  update();
  vv.addEventListener("resize", update);
  vv.addEventListener("scroll", update);
})();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
