import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box } from "@mui/material";
import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import { PSectionHeading, PmgColors } from "../../component/PHeadingAccent/PHeadingAccent";
import PButton from "../../component/PButton/PButton";
import { CommonColors } from "../../utils/constants/colors";
import { labelRoutes } from "../../navigations/labelRoutes";
import { canAdmin, findAdminItem } from "./adminMenu";

/** An admin menu whose page is not built yet (/admin/:menuKey). Unknown or not allowed → admin home. */
export default function AdminPlaceholder() {
  const { menuKey } = useParams();
  const navigate = useNavigate();
  const user = useSelector((state) => state.userDetails.user);
  const found = findAdminItem(menuKey);
  if (!found || !canAdmin(user, menuKey)) return <Navigate to={labelRoutes.adminDashboard} replace />;

  return (
    <Box sx={{ py: 4 }}>
      <PSectionHeading label={found.item.label} accent={found.group.color} />
      <Box sx={{ fontSize: 13, color: "#6b7280", mt: 0.5 }}>{found.group.label}</Box>
      <Box sx={{
        mt: 3, p: { xs: 3, md: 5 }, textAlign: "center", borderRadius: "12px",
        border: "1px dashed #d1d5db", bgcolor: "#fff"
      }}>
        <ConstructionOutlinedIcon sx={{ fontSize: 40, color: PmgColors.gold }} />
        <Box sx={{ fontSize: 16, fontWeight: 600, color: PmgColors.navy, mt: 1 }}>This page is coming soon</Box>
        <Box sx={{ fontSize: 13.5, color: "#6b7280", mt: 0.75, maxWidth: 480, mx: "auto" }}>
          Until then, use the {found.item.label} page of the current admin site.
        </Box>
        <Box sx={{ mt: 2.5, display: "flex", justifyContent: "center" }}>
          <PButton label="Back to Admin Console" variant="outlined" color={CommonColors.dark_blue} onClick={() => navigate(labelRoutes.adminDashboard)} width={230} />
        </Box>
      </Box>
    </Box>
  );
}
