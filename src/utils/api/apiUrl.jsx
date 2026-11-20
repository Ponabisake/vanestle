const getBaseUrl = () => {
  const host = window.location.hostname;
  switch (host) {
    case "localhost":
      return "/api"; // Vite proxy

    case "ebiz.pmgasia.com":
      return "https://ebiz.pmgasia.com/iWeb/virtualagency/vagit/api"; // UAT

    case "web.pmgasia.com":
      return "https://web.pmgasia.com/iWeb/virtualagency/vagit/api"; // Production

    default:
      return "https://ebiz.pmgasia.com/iWeb/virtualagency/vagit/api";
  }
};


export const Base_Url = getBaseUrl();

// Public site state, read before sign-on (open during maintenance)
export const Site_API = {
  // GET → { maintenanceMode }
  Status: Base_Url + "/Site/Status",
};
export const Account_API = {
  Login: Base_Url + "/VA/Usersignon",
  ChangePassword : Base_Url + "/VA/ChangePassword",
  ForgotPassword : Base_Url + "/VA/ForgotPassword",
  Echo : "https://ebiz.pmgasia.com/iWeb/eCatalogueNestle/public/index.php/shop",
}

export const Language_API = {
  Language: Base_Url + "/VA/Language",
}

export const Dashboard_API = {
  Dashboard: Base_Url + "/VA/Viewdashboard",
  Master: Base_Url + "/VA/MasterDropdowns",
  GetDetails: Base_Url + "/VA/GetDetails",
  EnqReview: Base_Url + "/VA/EnqReview",
  // { enqId, reason, remarks, username } → soft delete of a draft enquiry (legacy VA_DeletBid)
  DeleteDraft: Base_Url + "/VA/DeleteDraft",
}


export const ClientInfo_API = {
  AddUpdateClientInfo: Base_Url + "/VA/EnqClientinfo",
  ClientInfoMaster: Base_Url + "/VA/EnqClientinfoDropdowns",
  AddUpdateClientContant: Base_Url + "/VA/AddnewClient",
  AddUpdateBrand: Base_Url + "/VA/AddnewBrands",
  CheckforUsername: Base_Url + "/VA/CheckforUsername",
  // → { status, data: ["nestle.com", ...] } the active domains (tblEmailDomain) a new client contact's email may use
  EmailDomains: Base_Url + "/VA/EmailDomains",
}

export const EnquiryDetails_API = {
  AddUpdateEnquiryDetails: Base_Url + "/VA/EnqProjectinfo",
  GetSlatemplateMaster: Base_Url + "/VA/GetSlatemplate",
}

export const LineItems_API = {
  AddUpdateLineItems: Base_Url + "/VA/EnqLineItemDetails",
  // multipart: "data" = the AddUpdateLineItems JSON, "files" = the item's quote files
  AddUpdateLineItemsWithFiles: Base_Url + "/VA/EnqLineItemDetailsWithFiles",
  // GET ?enqDetailsId=&fileName= : one of the item's files (listed in quoteFiles of GetDetails)
  GetLineItemFile: Base_Url + "/VA/LineItemFile",
  GetEnqLineItemsMaster: Base_Url + "/VA/EnqLineItemsDropdowns",
  GetEnqDuplicate: Base_Url + "/VA/EB_Duplicate",
  GetExistingspecification: Base_Url + "/VA/GetExistingspecification"
}
export const Suppliers_API = {
  GetEnqSupplierMaster: Base_Url + "/VA/GetSupplier",
  AddUpdateSuppliers: Base_Url + "/VA/EnqSupplierInfo",
  AddSuppliers : Base_Url + "/VA/AddSuppliers",
} 

export const ProjectEnquiry_API = {
  GetProjectDetails : Base_Url + "/VA/GetProjectDetails",
  PostSupplierQuotes : Base_Url + "/VA/PostSupplierQuotes",
  UpdateJobStatus : Base_Url + "/VA/UpdateJobStatus",
  // { enqId } → { state: NotRequired|Waiting|InProgress|Failed|Success, canProceed, message, sapProjectNo, error, queuedAt }
  SapStatus : Base_Url + "/VA/SapStatus",
  CalculateSavings: Base_Url + "/VA/CalculateSavings",
  PostRefPrice : Base_Url + "/VA/PostRefprice",
  CheckDeliveryAddress : Base_Url + "/VA/CheckDeliveryAddress",
  AddUpdateDeliveryAddress : Base_Url + "/VA/AddUpdateDeliveryAddress",
  UpdateSavingsReasons : Base_Url + "/VA/UpdateSavingsReasons",
  UpdateJobSummary : Base_Url + "/VA/UpdateJobSummary",
  UpdatePreviewQuotes : Base_Url + "/VA/UpdatePreviewQuotes",
  GetPreviewQuotes : Base_Url + "/VA/GetPreviewQuotes",
  UpdateSurvey : Base_Url + "/VA/UpdateSurvey",
  // Client Performance Survey submit: { enqId, username, responsive, accuracy, quality, overallExp, comments }
  SaveSurvey : Base_Url + "/VA/SaveSurvey",
  GetClientQuotes: Base_Url + "/VA/GetClientQuotes",
  GetSupplierQuotes: Base_Url + "/VA/GetSupplierQuotes",
  SaveSupplierQuotes: Base_Url + "/VA/SaveSupplierQuotes"
}

// Project Enquiry → Downloads (legacy "Quotations & Purchase orders"); the quotation itself is ProjectEnquiry_API.GetPreviewQuotes
export const Downloads_API = {
  // { enquiryId } → { quotationDate, purchaseOrders: [{ supplierId, supplierName, poDate }], deliveryOrders: [{ id, companyName }] }
  GetEnquiryDownloads: Base_Url + "/VA/GetEnquiryDownloads",
  // { enquiryId, supplierId } → Word document (.doc)
  GetPurchaseOrder: Base_Url + "/VA/GetPurchaseOrder",
  // { enquiryId, deliveryId } → Word document (.doc)
  GetDeliveryOrder: Base_Url + "/VA/GetDeliveryOrder",
  // { enquiryId, quotationDate: "DD/MM/YYYY" } → { quotationDate }
  UpdateQuotationDate: Base_Url + "/VA/UpdateQuotationDate",
  // { enquiryId, supplierId, poDate: "DD/MM/YYYY" } → { poDate }
  UpdatePoDate: Base_Url + "/VA/UpdatePoDate",
}

// Project Enquiry → Attachment (tblAttachments; files under Upload\{EnqId}\)
export const Attachment_API = {
  // { enqId, userId } → { files, totalBytes, maxTotalBytes, canUpload }
  GetAttachments: Base_Url + "/VA/GetAttachments",
  // multipart: enqId, userId, files
  UploadAttachments: Base_Url + "/VA/UploadAttachments",
  // { id, enqId, userId, name (no extension), type, note }
  UpdateAttachment: Base_Url + "/VA/UpdateAttachment",
  // { id, enqId, userId }
  RemoveAttachment: Base_Url + "/VA/RemoveAttachment",
  // GET ?id=&enqId=&userId=
  GetAttachmentFile: Base_Url + "/VA/AttachmentFile",
}

export const Spot_API = {
  GetSpotEnvironmentResult : Base_Url + "/VA/GetSpotEnvironmentResult",
  GetSpotEnvItems : Base_Url +  "/VA/SpotEnvItems",
  BindMaterial : Base_Url + "/VA/BindMaterial",
  GetEnvironmentalType : Base_Url + "/VA/GetEnvironmentalType",
  UpdateEnvironmental : Base_Url + "/VA/UpdateEnvironmental",
  UpdateComparativeEnvironmental : Base_Url + "/VA/UpdateComparativeEnvironmental",
  UpdateNoCompareReason : Base_Url + "/VA/UpdateNoCompareReason",
  GetEnvironmentImpactDetails : Base_Url + "/VA/GetEnvironmentImpactDetails",
  GetComparativeImpactDetails : Base_Url + "/VA/GetComparativeImpactDetails",
  GetTotalImpactDetails : Base_Url + "/VA/GetTotalImpactDetails"
}
 
export const Report_API = {
  GetReport : Base_Url + "/VA/GetReport"
}

// Backend admin console (tblWebAdmin logins, userType "Admin"); every request sends the admin's username
export const Admin_API = {
  // GET → the uploaded top-left logo (204 when none: keep the built-in logo); for every user
  SiteLogo: Base_Url + "/Admin/SiteLogo",
  // multipart: username, file (PNG / JPG / GIF / WEBP, max 2 MB) → { hasLogo, version }
  UploadSiteLogo: Base_Url + "/Admin/UploadSiteLogo",
  // { username } → back to the built-in logo
  RemoveSiteLogo: Base_Url + "/Admin/RemoveSiteLogo",
  // { username } → { rows: [{ id, subCategory, japanese, zsim, status, markedTypeOfItem, jobs }], jobs } (Catalogue → Sub Item)
  SubItems: Base_Url + "/Admin/SubItems",
  // { username, id (0 = new), subCategory, japanese, zsim, status, markedTypeOfItem, jobs } → the saved row
  SaveSubItem: Base_Url + "/Admin/SaveSubItem",
  // { username } → { rows: [{ id, typeOfItem, job, status, subItemId, subItem }], jobs, subItems } (Catalogue → Type of Item)
  TypesOfItem: Base_Url + "/Admin/TypesOfItem",
  // { username, id (0 = new), typeOfItem, job, status, subItemId } → the saved row
  SaveTypeOfItem: Base_Url + "/Admin/SaveTypeOfItem",
  // { username } → { rows: [{ id, materialUsed, job, status, environmentImpacts, comparisonImpacts }], jobs } (Catalogue → Material Used)
  MaterialsUsed: Base_Url + "/Admin/MaterialsUsed",
  // { username, id (0 = new), materialUsed, job, status, environmentImpacts, comparisonImpacts } → the saved row
  SaveMaterialUsed: Base_Url + "/Admin/SaveMaterialUsed",
  // { username } → [{ id, name, isDefault, usedBy }] (Catalogue → Promo OSS Order Windows)
  OrderWindows: Base_Url + "/Admin/OrderWindows",
  // { username, id (0 = new), name } → the saved row
  SaveOrderWindow: Base_Url + "/Admin/SaveOrderWindow",
  // { username, id } → the deleted id (the default N/A cannot be deleted)
  DeleteOrderWindow: Base_Url + "/Admin/DeleteOrderWindow",
  // { username } → { rows (no passwords), countries, clients, roles, positions, managesCredentials } (Users → PMG VANestle Users)
  PmgUsers: Base_Url + "/Admin/PmgUsers",
  // { username, id (0 = new), profile fields, logonId, newPassword (superadmin), clientIds } → the saved row
  SavePmgUser: Base_Url + "/Admin/SavePmgUser",
  // { username } → { rows (no passwords), positions, managesCredentials } (Users → PMG VANestle Client Users)
  ClientUsers: Base_Url + "/Admin/ClientUsers",
  // { username, id, profile fields, logonId, newPassword (superadmin) } → the saved row (edit only)
  SaveClientUser: Base_Url + "/Admin/SaveClientUser",
  // { username } → { rows, countries, languages, currencies, option lists, capabilities, managesCredentials } (Users → Suppliers)
  Suppliers: Base_Url + "/Admin/Suppliers",
  // { username, id (0 = new), supplier fields, capability, status } → the saved row (status cascades to its users)
  SaveSupplier: Base_Url + "/Admin/SaveSupplier",
  // { username, supplierId } → the supplier users (no passwords)
  SupplierUsers: Base_Url + "/Admin/SupplierUsers",
  // { username, id (0 = new), supplierId, profile fields, logonId, newPassword (superadmin) } → the saved user
  SaveSupplierUser: Base_Url + "/Admin/SaveSupplierUser",
  // { username } → active enquiries [{ id, enquiryId, projectNo, projectDesc, created }] (Operations → Delete Enquiries / E-bidding)
  DeletableEnquiries: Base_Url + "/Admin/DeletableEnquiries",
  DeletableEbiddings: Base_Url + "/Admin/DeletableEbiddings",
  // { username, ids } → the number soft-deleted (legacy: Status 0, "Test Enquiry (Deleted)")
  DeleteEnquiries: Base_Url + "/Admin/DeleteEnquiries",
  DeleteEbiddings: Base_Url + "/Admin/DeleteEbiddings",
  // { username } → { rows: SLA templates, countries } (Operations → SLA)
  SlaTemplates: Base_Url + "/Admin/SlaTemplates",
  // { username, id (0 = new), description, quote, proof, production, fileCopies, invoicing, country, status } → the saved row
  SaveSlaTemplate: Base_Url + "/Admin/SaveSlaTemplate",
  // { username, id, active } → the saved row
  SetSlaTemplateStatus: Base_Url + "/Admin/SetSlaTemplateStatus",
  // { username } → { rows, countries, languages, currencies, salesTypes } (Catalogue → Clients)
  Clients: Base_Url + "/Admin/Clients",
  // { username, id (0 = new), client fields, percentages, rate, status } → the saved row
  SaveClient: Base_Url + "/Admin/SaveClient",
  // { username, clientId } → the divisions with their contacts / enquiries counts
  ClientDivisions: Base_Url + "/Admin/ClientDivisions",
  // { username, id (0 = new), clientId, country, entityName, businessUnit, globalBuMapping } → the saved division
  SaveDivision: Base_Url + "/Admin/SaveDivision",
  // { username, clientId, id, active }
  SetDivisionStatus: Base_Url + "/Admin/SetDivisionStatus",
  // { username, clientId, id } → refused while contacts or enquiries use it
  DeleteDivision: Base_Url + "/Admin/DeleteDivision",
  // { username } → the admin menu keys the admin may open now (refreshed by the admin layout)
  Menus: Base_Url + "/Admin/Menus",
  // { username } → { rows: [country + usage counts + switches], hasFeatureColumns } (Settings → Countries)
  Countries: Base_Url + "/Admin/Countries",
  // { username, id (0 = new), country, code, currency, language, regionalSetting, timeOffset, taxPercentage, status } → the saved row
  SaveCountry: Base_Url + "/Admin/SaveCountry",
  // { username } → { lists: [{ key, title, description, canAdd, addBlocked, rows (value, label, order, system, status, usage), unlisted }], ready } (Settings → Drop-down Lists)
  DropdownLists: Base_Url + "/Admin/DropdownLists",
  // { username, listKey, id (0 = new), label, sortOrder, status } → the saved row
  SaveDropdownValue: Base_Url + "/Admin/SaveDropdownValue",
  // { username } → { lists: [{ value, label }], countries } (Reports → Download Data)
  DownloadDataOptions: Base_Url + "/Admin/DownloadDataOptions",
  // { username, list, country ("All" = every country) } → the .xlsx file (a Blob), or { status: false, data: message }
  DownloadData: Base_Url + "/Admin/DownloadData",
  // { username } → [{ id, name, status, isDefault, usedBy }] (Reports → Catalogue Usage)
  CatalogueUsages: Base_Url + "/Admin/CatalogueUsages",
  // { username, name } → the added row
  AddCatalogueUsage: Base_Url + "/Admin/AddCatalogueUsage",
  // { username, id, active }
  SetCatalogueUsageStatus: Base_Url + "/Admin/SetCatalogueUsageStatus",
  // { username, id } → line items keep the text
  DeleteCatalogueUsage: Base_Url + "/Admin/DeleteCatalogueUsage",
  // { username } → { rows, materials } (Reports → Environment Impacts)
  EnvironmentImpacts: Base_Url + "/Admin/EnvironmentImpacts",
  // { username, id (0 = new), material, type, embodiedCarbon, waterUsage, energyConsumption, woodUse, status } → the saved row
  SaveEnvironmentImpact: Base_Url + "/Admin/SaveEnvironmentImpact",
  // { username } → { embodiedCarbon, waterUsage, energyConsumption, woodUse, woodDensity } (Reports → Environment Comparison)
  EnvironmentComparison: Base_Url + "/Admin/EnvironmentComparison",
  // { username, embodiedCarbon, waterUsage, energyConsumption, woodUse, woodDensity } → the saved values
  SaveEnvironmentComparison: Base_Url + "/Admin/SaveEnvironmentComparison",
  // { username } → { maintenanceMode, updatedBy, updatedOn } (Settings → Site Settings, MasterAdmin)
  SiteSettings: Base_Url + "/Admin/SiteSettings",
  // { username, maintenanceMode } → the saved settings; applies to every request at once
  SaveSiteSettings: Base_Url + "/Admin/SaveSiteSettings",
  // Email / print template logos (used only in mails and downloads, never in the UI); kind = "email" | "print"
  // GET ?kind= → the logo in use (upload, else the fixed default)
  TemplateLogo: Base_Url + "/Admin/TemplateLogo",
  // { kind } → { kind, isCustom, hasLogo, version }
  TemplateLogoInfo: Base_Url + "/Admin/TemplateLogoInfo",
  // multipart: username, kind, file (PNG / JPG / GIF / WEBP, max 2 MB) → { kind, isCustom, hasLogo, version }
  UploadTemplateLogo: Base_Url + "/Admin/UploadTemplateLogo",
  // { username, kind } → back to the fixed default logo
  RemoveTemplateLogo: Base_Url + "/Admin/RemoveTemplateLogo",
  // { username } → { rows, categoryTypes, categoryJobs }
  Products: Base_Url + "/Admin/Products",
  // { username, id (0 = new), category, indonesia, chineseSimplified, chineseTraditional, japanese, korean, status, categoryType, categoryJob }
  SaveProduct: Base_Url + "/Admin/SaveProduct",
}
