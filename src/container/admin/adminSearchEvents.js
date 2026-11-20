/**
 * Admin quick search (Ctrl / ⌘ + K) and the admin's recently opened pages.
 * Any component can open the search with openAdminQuickSearch(); AdminQuickSearch listens for the event.
 */
export const QUICK_SEARCH_EVENT = "pmg-admin-quick-search";

export const openAdminQuickSearch = () => window.dispatchEvent(new Event(QUICK_SEARCH_EVENT));

const RECENT_KEY = "pmg.admin.recent";
const RECENT_MAX = 6;

/** Menu keys of the pages opened last, newest first (per browser; empty when storage is unavailable). */
export const readRecentAdminPages = () => {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(list) ? list.filter((k) => typeof k === "string") : [];
  } catch {
    return [];
  }
};

export const rememberAdminPage = (key) => {
  if (!key) return;
  try {
    const list = [key, ...readRecentAdminPages().filter((k) => k !== key)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // storage blocked: recent pages are only a convenience
  }
};

/** "Ctrl K" or "⌘ K" for the hint labels. */
export const quickSearchShortcut = () =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "") ? "⌘ K" : "Ctrl K";
