import { labelRoutes } from "../../navigations/labelRoutes";
import { API_HEADERS } from "../commonFunction/common";
import { Labels } from "../constants/labels";
import store from "../../redux/store/store";
import { clearUserDetails } from "../../redux/actionType/actionType";
import { setMaintenanceMode } from "./siteStatus";

const handleUnauthorized = (isDashboard) => {
  localStorage.setItem("unAuthorized", "true");
  if (!isDashboard) window.location.href = labelRoutes.dashboard;
};

// API key headers + the sign-on session token (PMG-Session), which the API checks while the site is in maintenance
const apiHeaders = () => {
  const token = store.getState()?.userDetails?.user?.sessionToken;
  return token ? { ...API_HEADERS, "PMG-Session": token } : { ...API_HEADERS };
};

/**
 * The API answered 503 { maintenance: true }: the site went into maintenance (or this session is not an admin one).
 * Signs a regular user out and goes back to the login page, which shows the maintenance notice.
 */
const handleMaintenance = () => {
  setMaintenanceMode(true);
  const user = store.getState()?.userDetails?.user;
  if (user?.userName && user?.userType?.toLowerCase() !== Labels.userType.admin) store.dispatch({ type: clearUserDetails });
  if (window.location.pathname !== labelRoutes.home) window.location.href = labelRoutes.home;
};

const maintenanceResponse = async (response) => {
  if (response.status !== 503) return null;
  const body = await response.clone().json().catch(() => null);
  if (!body?.maintenance) return null;
  handleMaintenance();
  return { status: false, maintenance: true, data: body.data };
};

const request = async (url, options, isDashboard) => {
  try {
    const response = await fetch(url, {
      credentials: "include",
      ...options,
    });

    if (response.status === 401) {
      handleUnauthorized(isDashboard);
      return;
    }

    const maintenance = await maintenanceResponse(response);
    if (maintenance) return maintenance;

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");

    if (contentType.includes("application/pdf") ||
      contentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") ||
      contentType.includes("application/vnd.ms-excel") ||
      contentType.includes("application/msword")
    ) {
      return await response.blob();
    }

    if (!contentType?.includes("application/json")) {
      return {
        status: Labels.status.failure,
        message: "Unexpected response format",
      };
    }

    return await response.json();
  } catch (error) {
    return {
      status: Labels.status.failure,
      message: error.message || "Network request failed",
    };
  }
};

export const PostApi = (url, data = "", isDashboard = false) => {
  const isFormData = data instanceof FormData;
  const headers = apiHeaders();

  if (isFormData) {
    delete headers["Content-Type"];
    delete headers["content-type"];
  } else {
    headers["Content-Type"] = "application/json";
  }

  return request(
    url,
    {
      method: "POST",
      headers,
      body: isFormData ? data : JSON.stringify(data || {}),
    },
    isDashboard
  );
};

/**
 * Downloads a file (any type) with the API headers and returns it as a Blob.
 * Throws when the server does not return the file (missing file, network error, ...).
 */
export const GetFileApi = async (url) => {
  const response = await fetch(url, { method: "GET", credentials: "include", headers: apiHeaders() });
  if (response.status === 401) {
    handleUnauthorized(false);
    throw new Error("Unauthorized");
  }
  if (await maintenanceResponse(response)) throw new Error("The site is under maintenance");
  if (!response.ok) throw new Error(response.status === 404 ? "File not found" : `HTTP error! Status: ${response.status}`);
  return await response.blob();
};

export const GetApi = (url, customHeaders = {}, isDashboard = false) =>
  request(
    url,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...apiHeaders(),
        ...customHeaders,
      },
    },
    isDashboard
  );