import { labelRoutes } from "../../navigations/labelRoutes";
import { API_HEADERS } from "../commonFunction/common";
import { Labels } from "../constants/labels";

const handleUnauthorized = (isDashboard) => {
  localStorage.setItem("unAuthorized", "true");
  if (!isDashboard) window.location.href = labelRoutes.dashboard;
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

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");

    if (contentType.includes("application/pdf") ||
      contentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") ||
      contentType.includes("application/vnd.ms-excel")
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
  const headers = { ...API_HEADERS };

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
  const response = await fetch(url, { method: "GET", credentials: "include", headers: { ...API_HEADERS } });
  if (response.status === 401) {
    handleUnauthorized(false);
    throw new Error("Unauthorized");
  }
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
        ...API_HEADERS,
        ...customHeaders,
      },
    },
    isDashboard
  );