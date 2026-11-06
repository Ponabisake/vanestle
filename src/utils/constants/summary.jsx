import { Labels } from "./labels";

export const getSummarySections = ({ menuId, clientInfo = [], enquiryDetails = [], lineItems = [], suppliers = [], getLabel, handleEdit }) => {
  const labels = {
    1: [getLabel("lbl21"), getLabel("lbl22")],
    2: ["Bid Details", "Bid Items"],
    3: ["Catalogue Details", "Catalogue Items"],
  };
  return [
    clientInfo.length > 0 && {
      step: 1,
      title: getLabel("lbl25"),
      items: clientInfo
    },

    enquiryDetails.length > 0 && {
      step: 2,
      title: labels[menuId][0],
      items: enquiryDetails
    },
    {
      step: 3,
      title: labels[menuId][1],
      items: lineItems
    },
    {
      step: 4,
      title: getLabel("lbl23"),
      items: suppliers
    }
  ].filter(Boolean);
};

export const getClientInfo = (fields = {}, formData = {}, formDataList = {}, getLabel, getOptionLabel, response = null, extraInfo = [], userType = "") => {
  const source = response || formData;

  return [
    ...extraInfo,
    ...(userType?.toLowerCase() === Labels.userType.agency
      ? [
        { label: getLabel("lbl27"), value: response ? source.divisionname : getOptionLabel(formDataList.division, source.division) },
        { label: getLabel("lbl28"), value: response ? source.client : fields.clientName },
        { label: getLabel("lbl09"), value: response ? source.country : fields.country },
        { label: getLabel("lbl29"), value: response ? source.entityname : fields.entityName },
        { label: getLabel("lbl30"), value: response ? source.bussinessUnit : fields.businessUnit },
        { label: getLabel("lbl91"), value: response ? source.globalBussinessUnit : getOptionLabel(formDataList.globalBUMapping, source.globalBUMapping) },
        { label: getLabel("lbl92"), value: response ? source.aboveorAtmarket : getOptionLabel(formDataList.aboveAtMarket, source.aboveAtMarket) },
        { label: getLabel("lbl33"), value: response ? source.brand : getOptionLabel(formDataList.brand, source.brand) },
        { label: getLabel("lbl35"), value: response ? source.clientContact : getOptionLabel(formDataList.clientContact, source.clientContact) },
        { label: getLabel("lbl34"), value: response ? source.deliveryCountryname : getOptionLabel(formDataList.deliveryCountry, source.deliveryCountry) },
        { label: getLabel("lbl36"), value: response ? source.pmgEntityname : getOptionLabel(formDataList.pmgEntity, source.pmgEntity) }
      ] : []
    )]
};
export const getEnquiryDetails = (formData = {}, dynamicData = {}, formDataList = {}, getLabel, getOptionLabel, response = null, showFlag = true, userType = "") => {
  return [
    { label: getLabel("lbl42"), value: `${response.projectNo || formData.projectNo || "-"}` },
    { label: getLabel("lbl43"), value: `${response.estdate || formData.estdeliveryDate || "-"}` },
    ...(userType?.toLowerCase() === Labels.userType.agency
      ? [
        { label: getLabel("lbl44"), value: `${response.briefdate || formData.briefReceivedDate || "-"}` }
      ] : []),
    { label: getLabel("lbl45"), value: `${response.projectDesc || formData.projectDescription || "-"}` },
    { label: getLabel("lbl46"), value: `${response.projectQuotetype || getOptionLabel(formDataList.quoteType, formData.projectQuoteType) || "-"}` },
    ...(userType?.toLowerCase() === Labels.userType.agency
      ? [
        { label: getLabel("lbl47"), value: `${response.year || getOptionLabel(formDataList.year, formData.year) || "-"}` },
        { label: getLabel("lbl93"), value: `${response.managementFeetype || getOptionLabel(formDataList.managementFeeType, formData.managementFeeType) || "-"}` },
        { label: getLabel("lbl94"), value: `${response.hybridModel || getOptionLabel(formDataList.hybird, formData.hybrid) || "-"}` },
        { label: getLabel("lbl49"), value: `${response?.slaTemplatename || getOptionLabel(formDataList.slaTemplate, formData.slaTemplate) || "-"}` },
      ] : []),
    ...(showFlag ? [
      { label: getLabel("lbl54"), value: `${response.quotestartdate || dynamicData?.quotestartdate || "-"} - ${response.quoteenddate || dynamicData?.quoteenddate || "-"}` },
      { label: getLabel("lbl55"), value: `${response.proofstartdate || dynamicData?.proofstartdate || "-"} - ${response.proofenddate || dynamicData?.proofenddate || "-"}` },
      { label: getLabel("lbl56"), value: `${response.productionstartdate || dynamicData?.productionstartdate || "-"} - ${response.productionenddate || dynamicData?.productionenddate || "-"}` },
      { label: getLabel("lbl57"), value: `${response.filecopiesstartdate || dynamicData?.filecopiesstartdate || "-"} - ${response.filecopiesenddate || dynamicData?.filecopiesenddate || "-"}` },
      { label: getLabel("lbl58"), value: `${response.invoicestartdate || dynamicData?.invoicestartdate || "-"} - ${response.invoiceenddate || dynamicData?.invoiceenddate || "-"}` }]
      : [])
  ];
};

export const getLineneItems = (formData = {}, formDataList = {}, getLabel, getOptionLabel, response = null, userType = "") => {
  const lineItemMapping = [
    ...(userType?.toLowerCase() === Labels.userType.agency
      ? [
        { key: "printornonprint", label: "lbl62" },
        { key: "tojabc", label: "lbl60" },
        { key: "localRateCard", label: "lbl65" },
        { key: "competbidmandate", label: "lbl96" },
        { key: "competbidcomplaint", label: "lbl97" },
        { key: "competbidexception", label: "lbl98" },
        { key: "exceptionreason", label: "lbl99" },
      ] : []),
    { key: "productcategory", label: "lbl61" },
    { key: "subCategory", label: "lbl100" },

    //    { key: "simplex", label: "lbl101" },
    ...(userType?.toLowerCase() === Labels.userType.agency
      ? [
        { key: "tcOapproval", label: "lbl102" },
        { key: "tcOapproved", label: "lbl103" },
        //{ key: "dictatedJob", label: "lbl63" },
        //{ key: "itemtype", label: "lbl64" },
        { key: "incoterm", label: "lbl152" },
      ] : []),
    { key: "itemName", label: "lbl66" },
    { key: "itemDescription", label: "lbl67" },
    ...(userType?.toLowerCase() === Labels.userType.agency ? [] : [{ key: "localRateCard", label: "lbl65" }]),
    ...(userType?.toLowerCase() === Labels.userType.agency
      ? [
        { key: "usingFSCMaterial", label: "lbl70" },
        { key: "oekotexCertification", label: "lbl151" },
        { key: "designedforrecycling", label: "lbl71" },
        { key: "wasthisitemdesignedtoreducedPlastic", label: "lbl75" },
        { key: "proposedwithsustainabilityoption", label: "lbl72" },
        { key: "containrecycledmaterial", label: "lbl73" },
        { key: "containrecycledplastic", label: "lbl76" },
        { key: "weightageofrecycledmaterial", label: "lbl79" },
        { key: "isthisitemdesignedtobereused", label: "lbl74" },

        { key: "rateCard", label: "lbl106" },
        { key: "eauction", label: "lbl110" },
        { key: "competetiveWinningSupplier", label: "lbl153" },
      ] : []),

    { key: "promoOSSOrderWindows", label: "lbl107" },
    ...(userType?.toLowerCase() === Labels.userType.agency ? [
      { key: "regionalname", label: "lbl108" },
      { key: "catalogueUsage", label: "lbl109" }
    ] : []),
    { key: "printingMethod", label: "lbl80" },
    ...(userType?.toLowerCase() === Labels.userType.agency ? [
      { key: "typeofitem", label: "lbl112" },
      { key: "noofmaterials", label: "lbl113" },
      { key: "digitalInnovation", label: "lbl114" },
      { key: "innovation", label: "lbl115" },
      { key: "sourcinglocation", label: "lbl116" },
      { key: "savingstype", label: "lbl117" },
      { key: "savingsreason", label: "lbl118" },
      { key: "oWlink", label: "lbl119" }
    ] : []),
    ...(userType?.toLowerCase() === Labels.userType.client ? [{ key: "printornonprint", label: "lbl62" }] : []),
    { key: "quoteType", label: "lbl89" },
    { key: "quoteQtyOrSize", label: "lbl87" },
    { label: "Attachment", value: "No Files" },
    { key: "version", label: "lbl85" },
    { key: "specNote", label: "lbl83" },
    { key: "sNote", label: "lbl86" }

  ];

  const items = formDataList?.lineItems?.length ? formDataList.lineItems : response;
  const validItems = (items || []).filter(
    item => item?.itemNumber !== undefined && item?.itemNumber !== null
  );
  const lineItems = (validItems || []).map((item, index) => ({
    itemTitle: `${getLabel("lbl310")} ${item.itemNumber} : ${item.itemName}`,
    itemColor: "warning",
    enquiryId: item.enqdetailsId,
    items: lineItemMapping
      .filter(field => field.key !== "incoterm" || item.printornonprint === "Promo")
      .filter(field => field.key !== "competetiveWinningSupplier" || item.eauction === "Yes")
      .map(field => ({
        label: field.label === "Attachment" ? field.label : getLabel(field.label),
        value: field.key ? item[field.key] ?? "-" : field.value
      }))
  }));
  return lineItems;
};


export const getSuppliers = (formData = [], response = null) => {
  const source = response || formData;
  return source.map(item => ({
    label: "",
    value: item.suppliername || "-"
  }));
};