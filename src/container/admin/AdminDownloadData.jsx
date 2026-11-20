import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box } from "@mui/material";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { PSectionHeading, PmgColors } from "../../component/PHeadingAccent/PHeadingAccent";
import PButton from "../../component/PButton/PButton";
import PDropdown from "../../component/PDropdown/PDropdown";
import { PostApi } from "../../utils/api/networking";
import { Admin_API } from "../../utils/api/apiUrl";
import { isSuccess, toast } from "../../utils/commonFunction/common";
import { Labels } from "../../utils/constants/labels";
import { CommonColors } from "../../utils/constants/colors";
import { labelRoutes } from "../../navigations/labelRoutes";
import { canAdmin } from "./adminMenu";

const MENU_KEY = "downloadData";
const REQUIRED = Labels.symbols?.required || "*";
// the sheets of each workbook (DownloadDataAdmin on the API)
const SHEETS = {
  suppliers: ["Suppliers", "Supplier users", "Supplier details (active logins)"],
  pmgUsers: ["PMG users", "PMG user logins", "Active PMG users"],
  clients: ["Client logins", "Active clients"],
};

const saveBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Admin → Reports → Download Data (legacy Admin/DownloadData.aspx, MasterAdmin only): an Excel workbook of the
 * suppliers, the PMG users or the client contacts, for every country or one. Passwords are never exported.
 */
export default function AdminDownloadData() {
  const user = useSelector((state) => state.userDetails.user);
  const allowed = canAdmin(user, MENU_KEY);
  const [options, setOptions] = useState({ lists: [], countries: [] });
  const [list, setList] = useState("");
  const [country, setCountry] = useState("All");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!allowed) return undefined;
    let active = true;
    PostApi(Admin_API.DownloadDataOptions, { username: user?.userName }).then((res) => {
      if (!active) return;
      if (isSuccess(res)) setOptions(res.data);
      else toast(Labels.status.failure, res?.data || res?.message || "The lists could not be loaded");
    });
    return () => { active = false; };
  }, [allowed, user?.userName]);

  if (!allowed) return <Navigate to={labelRoutes.adminDashboard} replace />;

  const handleDownload = async () => {
    const next = {};
    if (!list) next.list = Labels.commonLabel?.required || "Required";
    if (!country) next.country = Labels.commonLabel?.required || "Required";
    setErrors(next);
    if (Object.keys(next).length) return;
    const res = await PostApi(Admin_API.DownloadData, { username: user?.userName, list, country });
    if (res instanceof Blob) {
      const label = options.lists.find((l) => l.value === list)?.label || "Data";
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
      saveBlob(res, `${label.replace(/ /g, "_")}_${country.replace(/ /g, "_")}_${stamp}.xlsx`);
      toast(Labels.status.success, "Downloaded");
    } else {
      toast(Labels.status.failure, res?.data || res?.message || "The file could not be downloaded");
    }
  };

  const listOptions = (options.lists || []).map((l) => ({ label: l.label, value: l.value }));
  const countryOptions = [{ label: "All countries", value: "All" }, ...(options.countries || []).map((c) => ({ label: c, value: c }))];

  return (
    <Box sx={{ py: 4, maxWidth: 820 }}>
      <PSectionHeading label="Download Data" accent={PmgColors.berry} />
      <Box sx={{ fontSize: 13, color: "#6b7280", mt: 0.5, mb: 2.5 }}>
        Excel workbook of suppliers, PMG users or client contacts. Suppliers are matched to a country by its currency. Passwords are never included.
      </Box>

      <Box sx={{ bgcolor: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
          <Box sx={{ minWidth: 0 }}>
            <PDropdown name="list" label={`List ${REQUIRED}`} value={list} onChange={(e) => { setList(e.target.value || ""); setErrors((p) => ({ ...p, list: "" })); }}
              helperText={errors.list} options={listOptions} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <PDropdown name="country" label={`Country ${REQUIRED}`} value={country} onChange={(e) => { setCountry(e.target.value || ""); setErrors((p) => ({ ...p, country: "" })); }}
              helperText={errors.country} options={countryOptions} />
          </Box>
        </Box>
        {list && SHEETS[list] && (
          <Box sx={{ mt: 2, fontSize: 13, color: "#374151" }}>
            Sheets: {SHEETS[list].join(" · ")}
          </Box>
        )}
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
          <PButton label="Download" variant="contained" color={CommonColors.dark_blue} onClick={handleDownload} startIcon={<FileDownloadOutlinedIcon />} width={180} />
        </Box>
      </Box>
    </Box>
  );
}
