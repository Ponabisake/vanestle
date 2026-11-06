/**
 * Fit-to-screen scaling.
 *
 * The UI is designed for a 1920px-wide layout. On smaller screens – most commonly a 1920px monitor
 * with Windows display scaling at 125% (the browser sees only 1536px) – it looks oversized at 100%
 * browser zoom, and users had to zoom out to 80% for it to fit.
 *
 * This scales the app (#root, plus centred dialogs) with CSS `zoom` so it renders like the 1920px
 * design. The scale is derived from the *screen* width, not the window width, so Ctrl +/- browser
 * zoom keeps working as usual on top of it.
 *
 * Exposed CSS variables (set on <html>):
 *   --app-zoom    scale factor (1 = no scaling)
 *   --app-height  window height in the zoomed coordinate space – use instead of 100vh inside #root
 *   --app-width   window width in the zoomed coordinate space  – use instead of 100vw inside #root
 */

const DESIGN_WIDTH = 1920; // layout width the screens were designed for
const MIN_SCALE = 0.7; // never shrink below this (keeps text readable)
const MIN_SCREEN = 1200; // below this (tablets / phones) keep 1:1 and let responsive layouts work

const supportsZoom = () => typeof CSS !== "undefined" && CSS.supports?.("zoom", "1");

export const getFitScale = () => {
  if (typeof window === "undefined" || !supportsZoom()) return 1;
  const screenWidth = window.screen?.width || window.innerWidth;
  if (screenWidth < MIN_SCREEN || screenWidth >= DESIGN_WIDTH) return 1;
  return Math.max(MIN_SCALE, Math.round((screenWidth / DESIGN_WIDTH) * 100) / 100);
};

let initialised = false;

export const initFitToScreen = () => {
  if (initialised || typeof window === "undefined") return;
  initialised = true;

  const html = document.documentElement;
  const apply = () => {
    const scale = getFitScale();
    html.style.setProperty("--app-zoom", String(scale));
    html.style.setProperty("--app-height", `${window.innerHeight / scale}px`);
    html.style.setProperty("--app-width", `${html.clientWidth / scale}px`);
  };

  apply();
  window.addEventListener("resize", apply);
};
