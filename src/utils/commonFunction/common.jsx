import { labelRoutes } from "../../navigations/labelRoutes";
import { Labels } from "../constants/labels";
import * as XLSX from "xlsx";

export const validateName = (name) => {
  if (!name) return "Name is required";
  return "";
};

export const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};
export const isValidMobile = (mobile) => {
  return /^[6-9]\d{9}$/.test(mobile.trim());
};

export const validatePassword = (password) => {
  if (!password) return "Password is required";
  if (!/[a-z]/.test(password))
    return "Password must include a lowercase letter";
  if (!/[A-Z]/.test(password))
    return "Password must include an uppercase letter";
  if (!/\d/.test(password)) return "Password must include a digit";
  if (!/[!@#$%^&*]/.test(password))
    return "Password must include a special character";
  if (password.length < 8) return "Password must be at least 8 characters";
  return "";
};

export const allowOnlyNumbers = (value) => {
  const regex = new RegExp(`[^${0}-${9}]`, "g");
  return value.replace(regex, "").replace(/^0+/, "").slice(0, 10);
  //return value .replace(/[^0-9]/g, "").slice(0, 10);
};

export const allowDecimal = (value = "") => {
  return value.replace(/[^0-9.]/g, "").replace(/^0(\.|$)/, "").replace(/(\..*?)\..*/g, "$1").replace(/^(\d+)(\.\d{0,2}).*$/, "$1$2").slice(0, 10);
};

export function allowOnlyAlphabets(value = "") {
  return value.replace(/[^A-Za-z ]+/g, "").replace(/\s{2,}/g, " ").trim();
}

export const isSuccess = (a) => a?.status === Labels.flag.status;

export const formatDate = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
};
export const parseDate = (dateStr) => {
  const p = dateStr.split(/[\/-]/);
  return p[0].length === 4 ? new Date(p[0], p[1] - 1, p[2]) : new Date(p[2], p[1] - 1, p[0]);
};

export function isNotEmpty(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === "object" && Object.keys(value).length === 0)
    return false;
  return true;
}

export const getOptionLabel = (options = [], value) => {
  const map = Object.fromEntries(options.map(o => [o.value, o.label]));
  return map[value] || "";
};

export const getOptionValue = (options = [], label) => {
  const map = Object.fromEntries(options.map(o => [o.label, o.value]));
  return map[label] || "";
};

export const getEnquirySteps = (getLabel, menuId) => {
  const labels = {
    1: [getLabel("lbl21"), getLabel("lbl22")],
    2: [getLabel("lbl225") , getLabel("lbl288")],
    3: [getLabel("lbl289")  , getLabel("lbl290")],
  };
  return [
    { text: getLabel("lbl20"), url: labelRoutes.clientInfo },
    { text: labels[menuId][0], url: labelRoutes.enquiryDetails },
    { text: labels[menuId][1], url: labelRoutes.lineItems },
    { text: getLabel("lbl23"), url: labelRoutes.suppliers },
    { text: getLabel("lbl24"), url: labelRoutes.review },
  ];
};

export const API_HEADERS = {
  "PMG-Secret-KEY": "dslgjhfg087DFFh50821571gi",
  "PMG-Account": "Nestle",
  "PMG-API-KEY": "sdjfhgdf9847348dfdHJKD97888JDU99"
};

let handler;
export const setToast = (fn) => {
  handler = fn;
};
export const toast = (status, message) => {
  handler?.({ status, message });
};

/**
 * Export JSON data to Excel
 * @param {Array} data - Array of objects to export
 * @param {String} fileName - Name of the Excel file (without extension)
 */
export const exportToExcel = (data, fileName = Labels.reportName.report) => {
  if (!data || data.length === 0) return;

  // Convert JSON to worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto column widths
  const columnWidths = Object.keys(data[0]).map((key) => ({
    wch: Math.max(
      key.length,
      ...data.map((row) => (row[key] ? row[key].toString().length : 10))
    ),
  }));
  worksheet["!cols"] = columnWidths;

  XLSX.utils.sheet_add_json(worksheet, [], { skipHeader: true });
  worksheet["!autofilter"] = { ref: worksheet["!ref"] };

  // Create workbook and append worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  // Write Excel file
  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${fileName}_${today}.xlsx`);
};

export const disableBrowserActions = () => {
  const handleContextMenu = (event) => {
    event.preventDefault();
  };

  const handleKeyDown = (event) => {
    // F12
    if (event.key === "F12") {
      event.preventDefault();
      return;
    }

    // Ctrl + Shift + I
    if (
      event.ctrlKey &&
      event.shiftKey &&
      ["I", "i"].includes(event.key)
    ) {
      event.preventDefault();
      return;
    }

    // Ctrl + Shift + J
    if (
      event.ctrlKey &&
      event.shiftKey &&
      ["J", "j"].includes(event.key)
    ) {
      event.preventDefault();
      return;
    }

    // Ctrl + U
    if (
      event.ctrlKey &&
      ["U", "u"].includes(event.key)
    ) {
      event.preventDefault();
    }
  };

  document.addEventListener("contextmenu", handleContextMenu);
  document.addEventListener("keydown", handleKeyDown);

  // Cleanup
  return () => {
    document.removeEventListener("contextmenu", handleContextMenu);
    document.removeEventListener("keydown", handleKeyDown);
  };
};
