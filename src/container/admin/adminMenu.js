import { labelRoutes } from "../../navigations/labelRoutes";
import { Labels } from "../../utils/constants/labels";
import { PmgColors } from "../../component/PHeadingAccent/PHeadingAccent";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import ContactsOutlinedIcon from "@mui/icons-material/ContactsOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import StyleOutlinedIcon from "@mui/icons-material/StyleOutlined";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import EnergySavingsLeafOutlinedIcon from "@mui/icons-material/EnergySavingsLeafOutlined";
import CompareArrowsOutlinedIcon from "@mui/icons-material/CompareArrowsOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";

/**
 * Backend admin console menus. The API sends the keys the signed-on admin may open (user.adminMenus, from
 * WebAdminAccess on the server, refreshed by the admin layout on load); a group shows when any of its items is
 * allowed. Each item: key (the API menu key), label, route, icon and a one-line description (sidebar tooltips,
 * dashboard tiles and the quick search).
 */
export const ADMIN_MENU_GROUPS = [
  {
    key: "users", label: "Users", color: PmgColors.indigo, icon: GroupOutlinedIcon,
    items: [
      { key: "pmgUsers", label: "PMG VANestle Users", route: labelRoutes.adminPmgUsers, icon: BadgeOutlinedIcon, description: "Agency users, their roles, countries and clients" },
      { key: "clientUsers", label: "PMG VANestle Client Users", route: labelRoutes.adminClientUsers, icon: ContactsOutlinedIcon, description: "Client contacts and their sign-in" },
      { key: "suppliers", label: "Suppliers", route: labelRoutes.adminSuppliers, icon: LocalShippingOutlinedIcon, description: "Suppliers and their users" },
    ],
  },
  {
    key: "catalogue", label: "Catalogue", color: PmgColors.green, icon: CategoryOutlinedIcon,
    items: [
      { key: "clients", label: "Clients", route: labelRoutes.adminClients, icon: BusinessOutlinedIcon, description: "Clients, pricing defaults and hierarchy" },
      { key: "products", label: "Products", route: labelRoutes.adminProducts, icon: Inventory2OutlinedIcon, description: "Product categories and translations" },
      { key: "subItem", label: "Sub Item", route: labelRoutes.adminSubItems, icon: CategoryOutlinedIcon, description: "Sub items of the enquiry line items" },
      { key: "typeOfItem", label: "Type of Item", route: labelRoutes.adminTypesOfItem, icon: StyleOutlinedIcon, description: "Item types per job and sub item" },
      { key: "materialUsed", label: "Material Used", route: labelRoutes.adminMaterialsUsed, icon: LayersOutlinedIcon, description: "Materials and their environmental options" },
      { key: "promoOssOrderWindows", label: "Promo OSS Order Windows", route: labelRoutes.adminOrderWindows, icon: EventAvailableOutlinedIcon, description: "Order windows offered in line items" },
    ],
  },
  {
    key: "operations", label: "Operations", color: PmgColors.orange, icon: WorkOutlineOutlinedIcon,
    items: [
      { key: "sla", label: "SLA", route: labelRoutes.adminSla, icon: TimerOutlinedIcon, description: "SLA templates: days per stage" },
      { key: "deleteEnquiries", label: "Delete Enquiries", route: labelRoutes.adminDeleteEnquiries, icon: DeleteSweepOutlinedIcon, description: "Remove enquiries raised by mistake" },
      { key: "deleteEbidding", label: "Delete E-bidding", route: labelRoutes.adminDeleteEbidding, icon: GavelOutlinedIcon, description: "Remove e-bidding enquiries" },
    ],
  },
  {
    key: "reports", label: "Reports", color: PmgColors.berry, icon: InsightsOutlinedIcon,
    items: [
      { key: "downloadData", label: "Download Data", route: labelRoutes.adminDownloadData, icon: FileDownloadOutlinedIcon, description: "Excel of suppliers, PMG users or clients" },
      { key: "catalogueUsage", label: "Catalogue Usage", route: labelRoutes.adminCatalogueUsage, icon: MenuBookOutlinedIcon, description: "Local catalogue choices of the enquiry form" },
      { key: "environmentImpacts", label: "Environment Impacts", route: labelRoutes.adminEnvironmentImpacts, icon: EnergySavingsLeafOutlinedIcon, description: "Impact factors per material and type" },
      { key: "environmentComparison", label: "Environment Comparison", route: labelRoutes.adminEnvironmentComparison, icon: CompareArrowsOutlinedIcon, description: "Cars, pools, refrigerators and trees" },
    ],
  },
  {
    key: "settings", label: "Settings", color: PmgColors.purple, icon: SettingsOutlinedIcon,
    items: [
      { key: "siteSettings", label: "Site Settings", route: labelRoutes.adminSiteSettings, icon: TuneOutlinedIcon, description: "Maintenance mode" },
      { key: "countries", label: "Countries", route: labelRoutes.adminCountries, icon: PublicOutlinedIcon, description: "Currency, language, time zone and tax" },
      { key: "dropdownLists", label: "Drop-down Lists", route: labelRoutes.adminDropdownLists, icon: ListAltOutlinedIcon, description: "Year, type of job, project attribute and savings type" },
    ],
  },
];

/** Icon for an item added without one. */
export const DEFAULT_ITEM_ICON = ArticleOutlinedIcon;

export const ADMIN_MENU_KEYS = {
  siteLogo: "siteLogo",
};

export const isAdminUser = (user) => user?.userType?.toLowerCase() === Labels.userType.admin;

export const canAdmin = (user, key) => isAdminUser(user) && (user?.adminMenus || []).includes(key);

export const adminItemRoute = (item) => item.route || labelRoutes.adminMenu.replace(":menuKey", item.key);

/** The groups and items this admin may open (empty groups left out). */
export const adminMenuFor = (user) =>
  ADMIN_MENU_GROUPS
    .map((group) => ({ ...group, items: group.items.filter((item) => canAdmin(user, item.key)) }))
    .filter((group) => group.items.length > 0);

export const findAdminItem = (key) => {
  for (const group of ADMIN_MENU_GROUPS) {
    const item = group.items.find((i) => i.key === key);
    if (item) return { group, item };
  }
  return null;
};

/** The item whose route is the current path (null on the dashboard or an unknown page). */
export const findAdminItemByPath = (pathname) => {
  for (const group of ADMIN_MENU_GROUPS) {
    const item = group.items.find((i) => adminItemRoute(i) === pathname);
    if (item) return { group, item };
  }
  return null;
};
