import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, Checkbox } from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { PSectionHeading, PmgColors } from "../../component/PHeadingAccent/PHeadingAccent";
import PTable from "../../component/PTable/PTable";
import PSearch from "../../component/PSearch/PSearch";
import PButton from "../../component/PButton/PButton";
import PDialog from "../../component/PDialog/PDialog";
import { PostApi } from "../../utils/api/networking";
import { Admin_API } from "../../utils/api/apiUrl";
import { isSuccess, toast } from "../../utils/commonFunction/common";
import { Labels } from "../../utils/constants/labels";
import { CommonColors } from "../../utils/constants/colors";
import { labelRoutes } from "../../navigations/labelRoutes";
import { canAdmin } from "./adminMenu";

const MAX_PER_REQUEST = 200; // DeleteEnquiryAdmin.MaxPerRequest on the API

const KINDS = {
  enquiries: {
    menuKey: "deleteEnquiries", title: "Delete Enquiries", noun: "enquiry", nouns: "enquiries",
    list: Admin_API.DeletableEnquiries, remove: Admin_API.DeleteEnquiries,
    hint: "Active enquiries of every job type except E-Bidding.",
  },
  ebidding: {
    menuKey: "deleteEbidding", title: "Delete E-bidding", noun: "E-bidding", nouns: "E-biddings",
    list: Admin_API.DeletableEbiddings, remove: Admin_API.DeleteEbiddings,
    hint: "Active E-Bidding enquiries.",
  },
};

const formatDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

/**
 * Admin → Operations → Delete Enquiries / Delete E-bidding (legacy Admin/DeleteEnquiries.aspx, DeleteEbidding.aspx;
 * MasterAdmin and Admin). Deleting is the legacy soft delete: the enquiry is marked deleted ("Test Enquiry (Deleted)")
 * and leaves every list, but stays in the database.
 */
export default function AdminDeleteEnquiries({ kind = "enquiries" }) {
  const cfg = KINDS[kind];
  const user = useSelector((state) => state.userDetails.user);
  const allowed = canAdmin(user, cfg.menuKey);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [confirm, setConfirm] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!allowed) return undefined;
    let active = true;
    PostApi(cfg.list, { username: user?.userName }).then((res) => {
      if (!active) return;
      if (isSuccess(res)) setRows(res.data || []);
      else toast(Labels.status.failure, res?.data || res?.message || `${cfg.nouns} could not be loaded`);
      setLoading(false);
    });
    return () => { active = false; };
  }, [allowed, user?.userName, reloadKey, cfg.list, cfg.nouns]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? rows.filter((r) => [r.enquiryId, r.projectNo, r.projectDesc].some((v) => (v || "").toLowerCase().includes(term))) : rows;
  }, [rows, search]);

  if (!allowed) return <Navigate to={labelRoutes.adminDashboard} replace />;

  const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const selectedRows = rows.filter((r) => selected.includes(r.id));

  const handleDelete = async () => {
    setConfirm(false);
    const res = await PostApi(cfg.remove, { username: user?.userName, ids: selected });
    if (isSuccess(res)) {
      toast(Labels.status.success, `${res.data} ${res.data === 1 ? cfg.noun : cfg.nouns} deleted`);
      setSelected([]);
      setLoading(true);
      setReloadKey((k) => k + 1);
    } else {
      toast(Labels.status.failure, res?.data || res?.message || `The ${cfg.nouns} could not be deleted`);
    }
  };

  const columns = [
    {
      key: "pick", header: "", hideable: false,
      render: (r) => <Checkbox size="small" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} inputProps={{ "aria-label": `Select ${r.enquiryId}` }} />,
    },
    { field: "enquiryId", header: "Enquiry ID", hideable: false },
    { field: "projectNo", header: "Project number" },
    { field: "projectDesc", header: "Project description" },
    { key: "created", header: "Created", render: (r) => formatDate(r.created) },
  ];

  return (
    <Box sx={{ py: 4 }}>
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 2.5 }}>
        <Box>
          <PSectionHeading label={cfg.title} accent={PmgColors.orange} />
          <Box sx={{ fontSize: 13, color: "#6b7280", mt: 0.5 }}>
            {cfg.hint} A deleted {cfg.noun} is marked "Test Enquiry (Deleted)" and leaves every list; it stays in the database.
          </Box>
        </Box>
        <PButton label={selected.length ? `Delete ${selected.length} selected` : "Delete selected"} variant="contained"
          color={CommonColors.red?.dark || CommonColors.dark_blue} onClick={() => setConfirm(true)}
          disabled={selected.length === 0 || selected.length > MAX_PER_REQUEST} startIcon={<DeleteOutlineRoundedIcon />} width={230} autoLoading={false} />
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
        <PSearch value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} placeholder="Search enquiry ID, project number or description" width={360} />
        {selected.length > 0 && (
          <PButton label="Clear selection" variant="text" color={CommonColors.dark_blue} onClick={() => setSelected([])} width={160} autoLoading={false} />
        )}
        <Box sx={{ ml: "auto", fontSize: 13, color: "#6b7280", mt: "7px" }}>
          {loading ? "Loading…" : `${filtered.length} of ${rows.length} active ${cfg.nouns}${selected.length ? ` · ${selected.length} selected` : ""}`}
        </Box>
      </Box>
      {selected.length > MAX_PER_REQUEST && (
        <Box role="alert" sx={{ mb: 1.5, fontSize: 13, color: "#b91c1c" }}>Delete at most {MAX_PER_REQUEST} at a time.</Box>
      )}

      <PTable columns={columns} rows={filtered} loading={loading} storageKey={`admin.delete.${kind}`}
        emptyTitle={`No active ${cfg.nouns}`} emptyMessage={search ? `No ${cfg.noun} matches the search.` : `There is no active ${cfg.noun} to delete.`} />

      <PDialog open={confirm} onClose={() => setConfirm(false)} title={`Delete ${selected.length} ${selected.length === 1 ? cfg.noun : cfg.nouns}?`} maxWidth="sm"
        actions={
          <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end", width: "100%" }}>
            <PButton label="Cancel" variant="outlined" color={CommonColors.dark_blue} onClick={() => setConfirm(false)} width={130} />
            <PButton label="Delete" variant="contained" color={CommonColors.red?.dark || CommonColors.dark_blue} onClick={handleDelete} width={150} />
          </Box>
        }>
        <Box sx={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
          They will be marked <b>Test Enquiry (Deleted)</b> and disappear from every list. This cannot be undone here.
        </Box>
        <Box component="ul" sx={{ mt: 1.5, mb: 0, pl: 2.5, maxHeight: 220, overflowY: "auto", fontSize: 13.5, color: PmgColors.navy }}>
          {selectedRows.map((r) => <li key={r.id}><b>{r.enquiryId}</b>{r.projectNo ? ` · ${r.projectNo}` : ""}{r.projectDesc ? ` · ${r.projectDesc}` : ""}</li>)}
        </Box>
      </PDialog>
    </Box>
  );
}
