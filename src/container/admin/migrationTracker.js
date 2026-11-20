/**
 * Admin Portal migration tracker: the legacy admin site (VANestle.Test/Admin/*.aspx, MasterAdmin.master) module by
 * module. This file is the one source of truth for the progress: the login page's maintenance panel, the admin
 * console's tracker card and the admin menu's built pages (adminMenu.js) all read it, so it ships with the code it
 * describes. Update it in the same change that finishes a stage.
 *
 * status: "completed" | "inProgress" | "pending"
 * stages: analysis / backend / frontend / integration / testing → "done" | "inProgress" | "pending" | "na"
 * menuKey: the admin menu item (WebAdminAccess.Menus on the API) the module opens, when it has one
 * legacy / pending: internal notes for admins only (never shown on the public login page)
 */
export const MIGRATION_MODULES = [
  {
    key: "adminFoundation", label: "Admin sign-in & dashboard", group: "Foundation", status: "completed", completedOn: "2026-11-18",
    legacy: "Admin/Login.aspx, Admin/Dashboard.aspx, MasterAdmin.master",
    stages: { analysis: "done", backend: "done", frontend: "done", integration: "done", testing: "done" },
    pending: [],
  },
  {
    key: "siteLogo", label: "Logos (site, email & print templates)", group: "Settings", status: "completed", completedOn: "2026-11-19",
    legacy: "New (legacy logos were hardcoded in pages and templates)",
    stages: { analysis: "done", backend: "done", frontend: "done", integration: "done", testing: "done" },
    pending: [],
  },
  {
    key: "products", menuKey: "products", label: "Products", group: "Catalogue", status: "completed", completedOn: "2026-11-18",
    legacy: "Admin/Products.aspx",
    stages: { analysis: "done", backend: "done", frontend: "done", integration: "done", testing: "done" },
    pending: [],
  },
  {
    key: "siteSettings", menuKey: "siteSettings", label: "Site Settings & maintenance mode", group: "Settings", status: "completed", completedOn: "2026-11-19",
    legacy: "Admin/ManageSite.aspx (web.config maintenanceMode), Maintenance.aspx, Account/Login|ForgotPassword|ResetPassword redirects",
    stages: { analysis: "done", backend: "done", frontend: "done", integration: "done", testing: "done" },
    pending: [],
  },
  {
    key: "countries", menuKey: "countries", label: "Countries", group: "Settings", status: "completed", completedOn: "2026-11-20",
    legacy: "New (no legacy page; tblCountry was maintained in the database). Other admin menus now offer active countries only",
    stages: { analysis: "done", backend: "done", frontend: "done", integration: "done", testing: "done" },
    pending: [],
  },
  {
    key: "dropdownLists", menuKey: "dropdownLists", label: "Drop-down Lists", group: "Settings", status: "inProgress",
    legacy: "New (Year, Type of Job, Project Attribute and Savings Type were hardcoded in VAController). tblDropdownValue; " +
      "the enquiry forms, Sub Item and Products now read it",
    stages: { analysis: "done", backend: "done", frontend: "done", integration: "inProgress", testing: "inProgress" },
    pending: [
      "NestleDB/Scripts/Create_tblDropdownValue.sql not yet run on dbvanestle (until then the built-in values are offered and the page is read-only)",
      "Saving not yet run against a real database (covered by unit tests)",
    ],
  },
  // Users
  {
    key: "pmgUsers", menuKey: "pmgUsers", label: "PMG VANestle Users", group: "Users", status: "completed", completedOn: "2026-11-20", legacy: "Admin/ManagePmgUsers.aspx (GetPmgUsers / AddOrUpdatePmgUser: tblAgencyUsers + tblUser)",
    stages: { analysis: "done", backend: "done", frontend: "done", integration: "done", testing: "done" },
    pending: [],
  },
  {
    key: "clientUsers", menuKey: "clientUsers", label: "PMG VANestle Client Users", group: "Users", status: "completed", completedOn: "2026-11-20", legacy: "Admin/ManageClientContact.aspx (GetClientUsers / AddOrUpdateClientContactsUser: tblClient + tblUser)",
    stages: { analysis: "done", backend: "done", frontend: "done", integration: "done", testing: "done" },
    pending: [],
  },
  {
    key: "suppliers", menuKey: "suppliers", label: "Suppliers & supplier users", group: "Users", status: "completed", completedOn: "2026-11-20", legacy: "Admin/ManageSuppliers.aspx, Admin/ManageSupplierUsers.aspx (AddOrUpdateSupplier, AddOrUpdateSupplierUser)",
    stages: { analysis: "done", backend: "done", frontend: "done", integration: "done", testing: "done" },
    pending: [],
  },
  // Catalogue
  {
    key: "clients", menuKey: "clients", label: "Clients & client hierarchy", group: "Catalogue", status: "completed", completedOn: "2026-11-20", legacy: "Admin/ManageClients.aspx, Admin/ClientHierarchy.aspx (AddOrUpdateClient, ClientHierarchy_CRUD)",
    stages: { analysis: "done", backend: "done", frontend: "done", integration: "done", testing: "done" },
    pending: [],
  },
  {
    key: "subItem", menuKey: "subItem", label: "Sub Item", group: "Catalogue", status: "completed", completedOn: "2026-11-20", legacy: "Admin/SubItem.aspx (tblSubCategory)",
    stages: { analysis: "done", backend: "done", frontend: "done", integration: "done", testing: "done" },
    pending: [],
  },
  {
    key: "typeOfItem", menuKey: "typeOfItem", label: "Type of Item", group: "Catalogue", status: "completed", completedOn: "2026-11-20", legacy: "Admin/TypeOfItem.aspx (tblTypeofItem)",
    stages: { analysis: "done", backend: "done", frontend: "done", integration: "done", testing: "done" },
    pending: [],
  },
  {
    key: "materialUsed", menuKey: "materialUsed", label: "Material Used", group: "Catalogue", status: "completed", completedOn: "2026-11-20", legacy: "Admin/Materialused.aspx (tblMaterialused)",
    stages: { analysis: "done", backend: "done", frontend: "done", integration: "done", testing: "done" },
    pending: [],
  },
  {
    key: "promoOssOrderWindows", menuKey: "promoOssOrderWindows", label: "Promo OSS Order Windows", group: "Catalogue", status: "completed", completedOn: "2026-11-20", legacy: "Admin/PromoOSSOrderWindows.aspx (tblPromoOSSOrderWindows)",
    stages: { analysis: "done", backend: "done", frontend: "done", integration: "done", testing: "done" },
    pending: [],
  },
  // Operations
  {
    key: "sla", menuKey: "sla", label: "SLA", group: "Operations", status: "completed", completedOn: "2026-11-20", legacy: "Admin/ManageSLA.aspx (AddOrUpdateSLATemplate / UpdateSLATemplateStatus: tblSLA)",
    stages: { analysis: "done", backend: "done", frontend: "done", integration: "done", testing: "done" },
    pending: [],
  },
  {
    key: "deleteEnquiries", menuKey: "deleteEnquiries", label: "Delete Enquiries", group: "Operations", status: "completed", completedOn: "2026-11-20", legacy: "Admin/DeleteEnquiries.aspx (VAService GetEnquiries / DeleteEnquiries)",
    stages: { analysis: "done", backend: "done", frontend: "done", integration: "done", testing: "done" },
    pending: [],
  },
  {
    key: "deleteEbidding", menuKey: "deleteEbidding", label: "Delete E-bidding", group: "Operations", status: "completed", completedOn: "2026-11-20", legacy: "Admin/DeleteEbidding.aspx (VAService EB_GetEbidingRecords / EB_DeleteBid)",
    stages: { analysis: "done", backend: "done", frontend: "done", integration: "done", testing: "done" },
    pending: [],
  },
  // Reports
  {
    key: "downloadData", menuKey: "downloadData", label: "Download Data", group: "Reports", status: "completed", completedOn: "2026-11-20", legacy: "Admin/DownloadData.aspx (suppliers / PMG users / clients workbook)",
    stages: { analysis: "done", backend: "done", frontend: "done", integration: "done", testing: "done" },
    pending: [],
  },
  {
    key: "catalogueUsage", menuKey: "catalogueUsage", label: "Catalogue Usage", group: "Reports", status: "completed", completedOn: "2026-11-20", legacy: "Admin/CatalogueUsage.aspx (tblCatalogueUsage)",
    stages: { analysis: "done", backend: "done", frontend: "done", integration: "done", testing: "done" },
    pending: [],
  },
  {
    key: "environmentImpacts", menuKey: "environmentImpacts", label: "Environment Impacts", group: "Reports", status: "completed", completedOn: "2026-11-20", legacy: "Admin/EnvironmentImpacts.aspx (tblenvironmentalimpact)",
    stages: { analysis: "done", backend: "done", frontend: "done", integration: "done", testing: "done" },
    pending: [],
  },
  {
    key: "environmentComparison", menuKey: "environmentComparison", label: "Environment Comparison", group: "Reports", status: "completed", completedOn: "2026-11-20", legacy: "Admin/EnvironmentalComparison.aspx (tblenvironmentcomparison)",
    stages: { analysis: "done", backend: "done", frontend: "done", integration: "done", testing: "done" },
    pending: [],
  },
];

export const STAGES = [
  { key: "analysis", label: "Legacy analysis" },
  { key: "backend", label: "Backend API" },
  { key: "frontend", label: "Frontend UI" },
  { key: "integration", label: "Integration" },
  { key: "testing", label: "Testing" },
];

/** The tracker status of an admin menu item's module ("pending" when it has none). */
export const menuStatus = (menuKey) => MIGRATION_MODULES.find((m) => m.menuKey === menuKey)?.status || "pending";

/** True when the admin menu item's page is built (completed module). */
export const isMenuReady = (menuKey) => MIGRATION_MODULES.some((m) => m.menuKey === menuKey && m.status === "completed");

/**
 * Public summary for the login page: counts, percentage and module names only. A module in progress counts as half
 * done, so the bar moves with real work, not just with finished modules.
 */
export const migrationSummary = () => {
  const total = MIGRATION_MODULES.length;
  const completed = MIGRATION_MODULES.filter((m) => m.status === "completed");
  const inProgress = MIGRATION_MODULES.filter((m) => m.status === "inProgress");
  const pending = total - completed.length - inProgress.length;
  const percent = total ? Math.round(((completed.length + inProgress.length * 0.5) / total) * 100) : 0;
  const recent = [...completed]
    .sort((a, b) => (b.completedOn || "").localeCompare(a.completedOn || ""))
    .slice(0, 3)
    .map((m) => m.label);
  return { total, completed: completed.length, inProgress: inProgress.length, pending, percent, recent, current: inProgress.map((m) => m.label) };
};
