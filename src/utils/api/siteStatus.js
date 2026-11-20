import { useEffect, useState } from "react";
import { Site_API } from "./apiUrl";
import { API_HEADERS } from "../commonFunction/common";

/**
 * Site maintenance mode (admin Site Settings), shared by the whole UI: checked when the app starts, every few minutes,
 * and set at once when any API call comes back 503 { maintenance: true } (see networking.jsx). The API enforces it for
 * every call; this only decides what the UI shows (regular users are sent to the login page's maintenance notice).
 * Plain fetch on purpose: networking.jsx imports this module.
 */
const REFRESH_MS = 3 * 60 * 1000;

let state = { loaded: false, maintenanceMode: false };
const listeners = new Set();
let inFlight = null;

const publish = (next) => {
  if (next.loaded === state.loaded && next.maintenanceMode === state.maintenanceMode) return;
  state = next;
  listeners.forEach((listener) => listener(state));
};

export const setMaintenanceMode = (on) => publish({ loaded: true, maintenanceMode: !!on });

export const getSiteStatus = () => state;

/** Reads Site/Status; an unreachable API keeps the last known state (the API still enforces maintenance). */
export const refreshSiteStatus = () => {
  if (!inFlight) {
    inFlight = fetch(Site_API.Status, { headers: { ...API_HEADERS }, cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.status) setMaintenanceMode(body.data?.maintenanceMode);
        else publish({ ...state, loaded: true });
      })
      .catch(() => publish({ ...state, loaded: true }))
      .finally(() => { inFlight = null; });
  }
  return inFlight;
};

/** { loaded, maintenanceMode }, kept up to date while the component is mounted. */
export const useSiteStatus = () => {
  const [current, setCurrent] = useState(state);
  useEffect(() => {
    listeners.add(setCurrent);
    // a change between the first render and now is not lost: refresh publishes to the listener just added
    refreshSiteStatus();
    const timer = setInterval(refreshSiteStatus, REFRESH_MS);
    return () => {
      listeners.delete(setCurrent);
      clearInterval(timer);
    };
  }, []);
  return current;
};
