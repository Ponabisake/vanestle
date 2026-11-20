import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, IconButton, Tooltip } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { PSectionHeading, PmgColors } from "../../component/PHeadingAccent/PHeadingAccent";
import PTable from "../../component/PTable/PTable";
import PSearch from "../../component/PSearch/PSearch";
import PButton from "../../component/PButton/PButton";
import PDialog from "../../component/PDialog/PDialog";
import PTextField from "../../component/PTextField/PTextField";
import { PostApi } from "../../utils/api/networking";
import { Admin_API } from "../../utils/api/apiUrl";
import { isSuccess, toast } from "../../utils/commonFunction/common";
import { Labels } from "../../utils/constants/labels";
import { CommonColors } from "../../utils/constants/colors";
import { labelRoutes } from "../../navigations/labelRoutes";
import { canAdmin } from "./adminMenu";

const MENU_KEY = "promoOssOrderWindows";
const MAX_LENGTH = 200; // OrderWindowAdmin.MaxTextLength on the API
const REQUIRED = Labels.symbols?.required || "*";

/**
 * Admin → Catalogue → Promo OSS Order Windows (legacy Admin/PromoOSSOrderWindows.aspx, MasterAdmin only): the order
 * windows offered in the enquiry line items. Add, rename and delete; enquiries keep the window text they stored, and the
 * default "N/A" cannot be deleted or renamed.
 */
export default function AdminOrderWindows() {
  const user = useSelector((state) => state.userDetails.user);
  const allowed = canAdmin(user, MENU_KEY);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(null); // { id, name } | null
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!allowed) return undefined;
    let active = true;
    PostApi(Admin_API.OrderWindows, { username: user?.userName }).then((res) => {
      if (!active) return;
      if (isSuccess(res)) setData(res.data || []);
      else toast(Labels.status.failure, res?.data || res?.message || "Order windows could not be loaded");
      setLoading(false);
    });
    return () => { active = false; };
  }, [allowed, user?.userName, reloadKey]);

  const reload = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? data.filter((r) => r.name.toLowerCase().includes(term)) : data;
  }, [data, search]);

  if (!allowed) return <Navigate to={labelRoutes.adminDashboard} replace />;

  const openForm = (row) => {
    setError("");
    setForm(row ? { id: row.id, name: row.name } : { id: 0, name: "" });
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) return setError(Labels.commonLabel?.required || "Required");
    if (name.length > MAX_LENGTH) return setError(`${MAX_LENGTH} characters or fewer`);
    const res = await PostApi(Admin_API.SaveOrderWindow, { username: user?.userName, id: form.id, name });
    if (isSuccess(res)) {
      toast(Labels.status.success, form.id ? `${res.data.name} updated` : `${res.data.name} added`);
      setForm(null);
      reload();
    } else {
      setError(res?.data || res?.message || "The order window could not be saved");
    }
  };

  const handleDelete = async () => {
    const row = toDelete;
    setToDelete(null);
    const res = await PostApi(Admin_API.DeleteOrderWindow, { username: user?.userName, id: row.id });
    if (isSuccess(res)) {
      toast(Labels.status.success, `${row.name} deleted`);
      reload();
    } else {
      toast(Labels.status.failure, res?.data || res?.message || "The order window could not be deleted");
    }
  };

  const columns = [
    {
      field: "name", header: "Order window", hideable: false,
      render: (r) => (
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
          {r.name}
          {r.isDefault && (
            <Box component="span" sx={{ px: 1, py: 0.1, borderRadius: "999px", fontSize: 11.5, fontWeight: 700, color: PmgColors.indigo, bgcolor: `${PmgColors.indigo}14` }}>
              Default
            </Box>
          )}
        </Box>
      )
    },
    { key: "usedBy", header: "Used by line items", align: "right", render: (r) => r.usedBy.toLocaleString() },
    {
      key: "actions", header: "", hideable: false, align: "right",
      render: (r) => (
        <Box sx={{ display: "inline-flex", gap: 0.5 }}>
          <Tooltip title={r.isDefault ? "The default choice cannot be renamed" : "Rename"} arrow>
            <span>
              <IconButton size="small" aria-label={`Rename ${r.name}`} onClick={() => openForm(r)} disabled={r.isDefault} sx={{ color: PmgColors.navy }}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={r.isDefault ? "The default choice cannot be deleted" : "Delete"} arrow>
            <span>
              <IconButton size="small" aria-label={`Delete ${r.name}`} onClick={() => setToDelete(r)} disabled={r.isDefault} sx={{ color: "#b91c1c" }}>
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      )
    },
  ];

  return (
    <Box sx={{ py: 4, maxWidth: 1100 }}>
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 2.5 }}>
        <Box>
          <PSectionHeading label="Promo OSS Order Windows" accent={PmgColors.green} />
          <Box sx={{ fontSize: 13, color: "#6b7280", mt: 0.5 }}>
            Offered in the enquiry line items ("N/A" is chosen by default). Enquiries keep the window name they saved.
          </Box>
        </Box>
        <PButton label="Add order window" variant="contained" color={CommonColors.dark_blue} onClick={() => openForm(null)}
          startIcon={<AddRoundedIcon />} width={220} autoLoading={false} />
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
        <PSearch value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} placeholder="Search order windows" width={300} />
        <Box sx={{ ml: "auto", fontSize: 13, color: "#6b7280", mt: "7px" }}>
          {loading ? "Loading…" : `${rows.length} of ${data.length} order windows`}
        </Box>
      </Box>

      <PTable columns={columns} rows={rows} loading={loading} storageKey="admin.orderWindows"
        emptyTitle="No order windows found" emptyMessage={search ? "No order window matches the search." : "Add the first order window."} />

      <PDialog
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? "Rename order window" : "Add order window"}
        maxWidth="sm"
        actions={
          <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end", width: "100%" }}>
            <PButton label="Cancel" variant="outlined" color={CommonColors.dark_blue} onClick={() => setForm(null)} width={130} />
            <PButton label="Save" variant="contained" color={CommonColors.dark_blue} onClick={handleSave} width={150} />
          </Box>
        }
      >
        {form && (
          <>
            <PTextField name="name" label={`Order window ${REQUIRED}`} value={form.name}
              onChange={(e) => { setForm((prev) => ({ ...prev, name: e.target.value })); setError(""); }}
              helperText={error} inputProps={{ maxLength: MAX_LENGTH }} />
            {form.id > 0 && (
              <Box sx={{ fontSize: 12.5, color: "#6b7280", mt: 1 }}>
                Enquiries that chose this window keep the old name; new line items get the new one.
              </Box>
            )}
          </>
        )}
      </PDialog>

      <PDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete order window?"
        maxWidth="sm"
        actions={
          <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end", width: "100%" }}>
            <PButton label="Cancel" variant="outlined" color={CommonColors.dark_blue} onClick={() => setToDelete(null)} width={130} />
            <PButton label="Delete" variant="contained" color={CommonColors.red?.dark || CommonColors.dark_blue} onClick={handleDelete} width={150} />
          </Box>
        }
      >
        {toDelete && (
          <Box sx={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
            <b>{toDelete.name}</b> will no longer be offered in the enquiry line items.
            {toDelete.usedBy > 0
              ? toDelete.usedBy === 1
                ? " The 1 line item that chose it keeps the name."
                : ` The ${toDelete.usedBy.toLocaleString()} line items that chose it keep the name.`
              : " No line item uses it."}
          </Box>
        )}
      </PDialog>
    </Box>
  );
}
