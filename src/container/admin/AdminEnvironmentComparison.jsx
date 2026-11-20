import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box } from "@mui/material";
import { PSectionHeading, PmgColors } from "../../component/PHeadingAccent/PHeadingAccent";
import PButton from "../../component/PButton/PButton";
import PTextField from "../../component/PTextField/PTextField";
import { PostApi } from "../../utils/api/networking";
import { Admin_API } from "../../utils/api/apiUrl";
import { isSuccess, toast } from "../../utils/commonFunction/common";
import { Labels } from "../../utils/constants/labels";
import { CommonColors } from "../../utils/constants/colors";
import { labelRoutes } from "../../navigations/labelRoutes";
import { canAdmin } from "./adminMenu";

const MENU_KEY = "environmentComparison";
const MAX_LENGTH = 50;
const REQUIRED = Labels.symbols?.required || "*";
const NUMBER = /^\d+(\.\d+)?([eE][-+]?\d+)?$/;
// what each constant turns a result into (VA GetEnvironmentImpactDetails / the environmental calculation)
const FIELDS = [
  { name: "embodiedCarbon", label: "Carbon per car", explains: "Cars = greenhouse gas ÷ this value", divisor: true },
  { name: "energyConsumption", label: "Energy per refrigerator", explains: "Refrigerators = energy × 1000 ÷ this value", divisor: true },
  { name: "waterUsage", label: "Water per swimming pool", explains: "Pools = water ÷ this value", divisor: true },
  { name: "woodUse", label: "Wood use per tree", explains: "Trees = wood ÷ this value; it also divides the wood factor when an item is calculated", divisor: true },
  { name: "woodDensity", label: "Wood density", explains: "Multiplies the wood use when an item is calculated", divisor: false },
];
const EMPTY = { embodiedCarbon: "", waterUsage: "", energyConsumption: "", woodUse: "", woodDensity: "" };

/**
 * Admin → Reports → Environment Comparison (legacy Admin/EnvironmentalComparison.aspx, MasterAdmin only): the constants
 * that express an enquiry's environmental impact as cars, refrigerators, pools and trees. One set for the whole site.
 */
export default function AdminEnvironmentComparison() {
  const user = useSelector((state) => state.userDetails.user);
  const allowed = canAdmin(user, MENU_KEY);
  const [saved, setSaved] = useState(EMPTY);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!allowed) return undefined;
    let active = true;
    PostApi(Admin_API.EnvironmentComparison, { username: user?.userName }).then((res) => {
      if (!active) return;
      if (isSuccess(res)) {
        const values = { ...EMPTY, ...res.data };
        setSaved(values);
        setForm(values);
      } else {
        toast(Labels.status.failure, res?.data || res?.message || "The comparison could not be loaded");
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [allowed, user?.userName]);

  if (!allowed) return <Navigate to={labelRoutes.adminDashboard} replace />;

  const changed = FIELDS.some(({ name }) => String(form[name] ?? "").trim() !== String(saved[name] ?? "").trim());

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value ?? "" }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSave = async () => {
    const next = {};
    FIELDS.forEach(({ name, divisor }) => {
      const v = String(form[name] ?? "").trim();
      if (!v) next[name] = Labels.commonLabel?.required || "Required";
      else if (!NUMBER.test(v)) next[name] = "A number (use . for decimals)";
      else if (divisor && Number(v) <= 0) next[name] = "Above 0";
    });
    setErrors(next);
    if (Object.keys(next).length) return;
    const res = await PostApi(Admin_API.SaveEnvironmentComparison, { username: user?.userName, ...form });
    if (isSuccess(res)) {
      const values = { ...EMPTY, ...res.data };
      setSaved(values);
      setForm(values);
      toast(Labels.status.success, "Comparison saved");
    } else {
      toast(Labels.status.failure, res?.data || res?.message || "The comparison could not be saved");
    }
  };

  return (
    <Box sx={{ py: 4, maxWidth: 820 }}>
      <PSectionHeading label="Environment Comparison" accent={PmgColors.berry} />
      <Box sx={{ fontSize: 13, color: "#6b7280", mt: 0.5, mb: 2.5 }}>
        Turns an enquiry's environmental impact into everyday comparisons. One set of values for the whole site.
      </Box>

      <Box sx={{ bgcolor: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", p: { xs: 2, md: 3 }, opacity: loading ? 0.6 : 1 }}>
        <Box sx={{ display: "grid", columnGap: 3, rowGap: 2.5, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
          {FIELDS.map(({ name, label, explains }) => (
            <Box key={name} sx={{ minWidth: 0 }}>
              <PTextField name={name} label={`${label} ${REQUIRED}`} value={form[name]} onChange={handleChange} helperText={errors[name]}
                inputProps={{ maxLength: MAX_LENGTH, inputMode: "decimal" }} />
              <Box sx={{ fontSize: 12.5, color: "#6b7280", lineHeight: 1.5, mt: 0.5 }}>{explains}</Box>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end", mt: 3 }}>
          <PButton label="Reset" variant="outlined" color={CommonColors.dark_blue} onClick={() => { setForm(saved); setErrors({}); }} width={130} disabled={!changed} autoLoading={false} />
          <PButton label="Save" variant="contained" color={CommonColors.dark_blue} onClick={handleSave} width={150} disabled={!changed || loading} />
        </Box>
      </Box>
      <Box sx={{ fontSize: 12.5, color: "#6b7280", mt: 1.5 }}>The comparisons shown for every enquiry use the new values straight away; the wood use already calculated for an item changes only when it is recalculated.</Box>
    </Box>
  );
}
