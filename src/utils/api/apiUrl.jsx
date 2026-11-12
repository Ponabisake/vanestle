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
}


export const ClientInfo_API = {
  AddUpdateClientInfo: Base_Url + "/VA/EnqClientinfo",
  ClientInfoMaster: Base_Url + "/VA/EnqClientinfoDropdowns",
  AddUpdateClientContant: Base_Url + "/VA/AddnewClient",
  AddUpdateBrand: Base_Url + "/VA/AddnewBrands",
  CheckforUsername: Base_Url + "/VA/CheckforUsername",
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
