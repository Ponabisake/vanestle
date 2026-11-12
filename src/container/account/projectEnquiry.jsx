import React, { useCallback, useEffect, useState } from "react";
import { Box, Divider, Tooltip, IconButton, Skeleton, Alert } from "@mui/material";
import PGrid from "../../component/PGrid/PGrid";
// import PCard from "../../component/PCard/PCard";
import PTypography from "../../component/PTypography/PTypography";
import { Labels } from "../../utils/constants/labels";
import { CommonColors } from "../../utils/constants/colors";
import { FontWeight } from "../../utils/constants/fonts";
import PButton from "../../component/PButton/PButton";
import { useLanguage } from "../../utils/constants/language";
import { useLocation } from "react-router-dom";
import PDropdown from "../../component/PDropdown/PDropdown";
import { getClientInfo, getEnquiryDetails, getLineneItems, getSummarySections } from "../../utils/constants/summary";
import { ClientInfo_API, Dashboard_API, EnquiryDetails_API, LineItems_API, Suppliers_API, ProjectEnquiry_API } from "../../utils/api/apiUrl";
import { formatDate, getOptionLabel, getOptionValue, isNotEmpty, isSuccess, parseDate, toast } from "../../utils/commonFunction/common";
import { PSummary } from "../../component/PSummary/PSummary";
import PTable from "../../component/PTable/PTable";
import { GetApi, PostApi } from "../../utils/api/networking";
import PTextField from "../../component/PTextField/PTextField";
import PDatepicker from "../../component/PDatepicker/PDatepicker";
import PDialog from "../../component/PDialog/PDialog";
import PSearch from "../../component/PSearch/PSearch";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import HandshakeIcon from "@mui/icons-material/Handshake";
import SavingsIcon from "@mui/icons-material/Savings";
import PriceChangeIcon from "@mui/icons-material/PriceChange";
import HistoryIcon from "@mui/icons-material/History";
import BoltIcon from "@mui/icons-material/Bolt";
import AttachmentIcon from "@mui/icons-material/Attachment";
import PEnquiryAttachments from "../../component/PEnquiryAttachments/PEnquiryAttachments";
import PProjectQuotation from "../../component/PProjectQuotation/PProjectQuotation";
import PSlaTemplate from "../../component/PSlaTemplate/PSlaTemplate";
import PSpotSection from "../../component/PSpotSection/PSpotSection";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PDeliveryOrder from "../../component/PDeliveryOrder/PDeliveryOrder";
import arrow from "../../utils/assets/images/arrow_white.svg";
import PostAddIcon from "@mui/icons-material/PostAdd";
import { PPillButton } from "../../component/PLineItem/PLineItem";
import { PSectionHeading as SectionHeading, PmgColors } from "../../component/PHeadingAccent/PHeadingAccent";
import { useSelector } from "react-redux";
import PCard from "../../component/PCard/PCard";
import CircularProgress from "@mui/material/CircularProgress";

// Inline input used inside the Project Savings table cells: soft rounded field,
// PMG-orange hover/focus ring, numeric values right-aligned.
const editableCellSx = (isNumeric) => ({
    mt: 0,
    "& .MuiOutlinedInput-root": {
        height: 38,
        minHeight: 38,
        borderRadius: "8px",
        backgroundColor: "#FFFBF7",
        transition: "box-shadow .2s ease, background-color .2s ease",
        "& fieldset": {
            borderColor: "rgba(207, 119, 41, 0.35)",
            borderWidth: "1px"
        },
        "&:hover": { backgroundColor: "#fff" },
        "&:hover fieldset": { borderColor: "#CF7729" },
        "&.Mui-focused": {
            backgroundColor: "#fff",
            boxShadow: "0 0 0 3px rgba(207, 119, 41, 0.18)"
        },
        "&.Mui-focused fieldset": {
            borderColor: "#CF7729",
            borderWidth: "1.5px"
        },
        "& .MuiInputAdornment-root": { mr: 0.5 }
    },
    "& .MuiOutlinedInput-input": {
        height: "auto",
        padding: "8px 12px",
        fontSize: 14,
        fontWeight: 500,
        color: "#16133F",
        textAlign: isNumeric ? "right" : "left",
        fontVariantNumeric: "tabular-nums",
        "&::placeholder": { color: "#B8A89A", opacity: 1 }
    },
    "& .MuiInputAdornment-positionStart + .MuiOutlinedInput-input": { paddingLeft: 0 }
});

const ProjectEnquiry = () => {

    const { getLabel } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [dynamicData, setDynamicData] = useState({});
    const { country, userID, fkID, currency, userType, menuId, symbol, enquiryId, userName, email, id } = useSelector((state) => state.userDetails.user);

    const actionFlag = isNotEmpty(id) && id !== 0 ? Labels.flag.Update : Labels.flag.Insert;
    const today = formatDate(new Date());

    //State & list states
    const [formData, setFormData] = useState({
        activeTab: "Job Summary",
        stageTab: "",
        status: "",
        quote: "",
        statusId: 0,
        sla: false,
        rfq: false,
        fee: false,
        job: false,
        suppliers: false,
        calculateFlag: false,
        validateFlag: false,
        marginFlag: false,
        project: false,
        inputPS: false,
        psFlag: false,
        isCalculate: true,

        rfqFlag: true,

        //dialog state
        preview: false,
        email: false,
        historyTool: false,
        historySearchTool: "",
        search: "",
        statusFlag: false,
        quoteFlag: false,

        //editable state
        clientContact: "",
        projectNo: "",
        estdeliveryDate: "",
        briefReceivedDate: "",
        projectDescription: "",
        managementFee: "",
        savingsType: "",
        savingsReason: "",
        sap: 2,
        sapVisible: false,
        poNo: "",
        raisedDate: "",
        invoicenumber: "",
        actualDeliveryDate: "",
        projectStatus: "",

        //spot flag
        isSpot: 0,
        isSpotCompleted: 0,
        isProject: 0,

        //supplier Quotes
        isSupplierCalculate: false,
        isQuote: true
    });
    const [formDataList, setFormDataList] = useState({
        clientInfo: [],
        lineItems: [],
        enquiryDetails: [],
        suppliers: [],
        clientContact: [],
        savingsType: [],
        savingsReason: [],
        data: [],
        columns: [{ field: "suppliername", header: "Supplier's Name" }, { field: "country", header: "Country" }, { field: "suppliercode", header: "Supplier Code" },],
        supplierMaster: [],
        selectedRows: [],
        newSelectedRows: [],
        selectedSupplierRows: [],
        selectedHistroyRows: [],
        //project status
        status: [],

        //calculations
        calculateRows: [{ field: "cost", header: `${getLabel("lbl340")} (${symbol})`, type: "rupee", align: "right" }, { field: "sell", header: `${getLabel("lbl341")} (${symbol})`, type: "rupee", align: "right" }, { field: "margin", header: `${getLabel("lbl342")} (${symbol})`, type: "rupee", align: "right" }, { field: "markupPercent", header: `${getLabel("lbl343")} ${Labels.symbols.percent}`, align: "right" }, { field: "marginPercent", header: `${getLabel("lbl342")} ${Labels.symbols.percent}`, align: "right" }],
        calculationDetails: [],

        //logs
        historyLogsCloumns: [{ field: "modifiedDate", header: `${getLabel("lbl361")}` }, { field: "userName", header: getLabel("lbl362") }, { field: "field", header: getLabel("lbl363") }
            , { field: "oldValue", header: getLabel("lbl364") }, { field: "newValue", header: getLabel("lbl365") }],
        historyLogs: [],
        lineItemLogsCloumns: [{ field: "modifiedDate", header: getLabel("lbl361") }, { field: "userName", header: getLabel("lbl362") }, { field: "field", header: getLabel("lbl363") }
            , { field: "oldValue", header: getLabel("lbl364") }, { field: "newValue", header: getLabel("lbl365") }, { field: "itemNumber", header: getLabel("lbl317"), align: "right", render: (row) => Number.parseInt(row.itemNumber, 10) }],
        lineItemLogs: [],
        calculateSupplierlogsRows: [{ field: "supplierName", header: getLabel("lbl344") }, { field: "itemName", header: getLabel("lbl66") }, { field: "supplierType", header: getLabel("lbl345") }, { field: "smetaAccredited", header: getLabel("lbl346") }
            , { field: "gmpAccredited", header: getLabel("lbl347") }, { field: "natureofsupplier", header: getLabel("lbl348") },
        ],
        calculationSupplierlogs: [],

        //project savings list
        projectSavings: [],
        savingsSummary: [],

        savingsSummaryColumns: [{ field: "savingDisplay", header: `${getLabel("lbl355")} ( ${getLabel("lbl354")} )`, align: "right" }, { field: "savingPercentDisplay", header: `${getLabel("lbl355")} ${Labels.symbols.percent} ( ${getLabel("lbl354")} )`, align: "right" },
        { field: "savingExclfeeDisplay", header: `${getLabel("lbl355")} ( ${getLabel("lbl353")} )`, align: "right" }, { field: "savingExclfeePercentDisplay", header: `${getLabel("lbl355")} ${Labels.symbols.percent} ( ${getLabel("lbl353")} )`, align: "right" }],
        savingsCalculation: [{ field: "label" }, { field: "value", align: "right" }],
        savingsResponseDto: { totalPreviousPrice: 0, totalSellPrice: 0, totalSaving: 0, totalSavingPercent: 0 },
        savingsReasons: [],
        yesOrNo: [{ label: "Yes", value: 1 }, { label: "No", value: 2, selected: true }],

        //History Tool
        historySearchesCloumns: [{ field: "enquriyID", header: "Action" }, { field: "qty", header: "Qty", align: "right" }, { field: "country", header: "Country" }, { field: "specifications", header: "Specifications" },
        { field: "referencePrice", header: "Reference Price", align: "right" }, { field: "materialUsed", header: "Material Used" }, { field: "poNumber", header: "PO Number" }, { field: "subCategory", header: "Sub Category" }, { field: "brand", header: "Brand" }],
        historySearches: [],

        //RevisedQuotes
        revisedQuotesCloumns: [{ field: "supplierName", header: getLabel("lbl333") }, { field: "supplierPrice", header: `${getLabel("lbl359")} (${symbol})`, type: "rupee", align: "right" },
        { field: "dateOfChange", header: getLabel("lbl360") }],
        revisedQuotes: [],

        //RequestQuotes
        requestQuotes: [],

        //Delivery Order
        deliveryOrder: [],

        //Perview Quotes Suppliers
        previewQuotes: [{ field: "supplierA", header: "Supplier A" }, { field: "supplierAInitAmount", header: "Supplier A Init. Amount", align: "right" },
        { field: "supplierANegAmount", header: "Supplier A Neg. Amount", align: "right" }, { field: "supplierB", header: "Supplier B" },
        { field: "supplierBInitAmount", header: "Supplier B Init. Amount", align: "right" }, { field: "supplierBNegAmount", header: "Supplier B Neg. Amount", align: "right" },
        { field: "supplierC", header: "Supplier C" }, { field: "supplierCInitAmount", header: "Supplier C Init. Amount", align: "right" },
        { field: "supplierCNegAmount", header: "Supplier C Neg. Amount", align: "right" }],
        previewSupplierQuotes: [],

        //Project Quotations (rendered by PProjectQuotation)
        projectClientQuotes: [],
        clientQuotes: [],

        //Supplier Quotations
        projectSupplierQuotes: [],
        materialUsed: []
    });

    const showProjectSaving = formData.isProject > 0; //formDataList.projectSavings?.length > 0;
    const deliveryFlag = formData.statusId >= 6;
    const createOrderFlag = formDataList.deliveryOrder?.length > 0;
    const flag = userType?.toLowerCase() === Labels.userType.agency
    const isSpot = formData.isSpot > 0;
    const tabs = [
        { label: "Job Summary", icon: <WorkOutlineIcon /> },
        { label: "Line Items", icon: <Inventory2Icon /> },
        ...(!flag ? [{
            label: userType?.toLowerCase() === Labels.userType.supplier ? "Your Quote Submissions"
                : "Project Quotation", icon: <SavingsIcon />
        }] : []),
        ...(flag && isSpot ? [{ label: "SPOT", icon: <BoltIcon /> }] : []),
        ...(deliveryFlag && flag ? [{ label: "Delivery Order", icon: <LocalShippingIcon /> }] : []),
        ...(flag ? [{ label: "RFQ", icon: <RequestQuoteIcon /> }] : []),
        ...(showProjectSaving && flag ? [{ label: "Project Savings", icon: <SavingsIcon /> }] : []),
        ...(flag ? [{ label: "SLA", icon: <HandshakeIcon /> }] : []),
        ...(flag ? [{ label: "Revised Quotes", icon: <PriceChangeIcon /> }] : []),
        ...(flag ? [{ label: "Logs", icon: <HistoryIcon /> }] : []),
        ...(flag || userType?.toLowerCase() === Labels.userType.supplier ? [{ label: "Attachment", icon: <AttachmentIcon /> }] : [])
    ]


    const iconStyle = {
        //border: createOrderFlag ? "1px solid #e2e8f0" : "1px solid #f90707",
        border: "1px solid #e2e8f0",
        color: "#64748b",
        "&:hover": { bgcolor: "#f8fafc" },
        width: 48,
        height: 48,
    };
    // Workflow stage -> the tab where the next pending action lives (mirrors the legacy
    // ProjectEnquiry stage logic). fetchData opens this tab on first load, and switches to it
    // automatically whenever a save moves the job into a new stage; otherwise the user stays
    // on whatever tab they picked.
    //   SPOT pending -> SPOT
    //   1 RFQ sent / 2 quotes received (not yet calculated) / 4 revise quote -> RFQ
    //   2 calculated / 3 quoted to client / 5 -> Project Savings (submit / approve / revise)
    //   6 awarded -> Delivery Order (address) -> Job Summary (PO + create order)
    //   7+ delivery & invoicing, 25 cancelled -> Job Summary
    const getStageTab = ({ statusId, spotNeeded, isSpotCompleted, isProject, rfqCalculated, hasDeliveryOrder }) => {
        if (!flag) return "Job Summary";
        const status = Number(statusId);
        const rfqOrSavings = isProject > 0 ? "Project Savings" : "RFQ";

        if (status < 6 && spotNeeded > 0 && Number(isSpotCompleted) === 0) return "SPOT";
        if (status === 1 || status === 4) return "RFQ";
        if (status === 2) return rfqCalculated ? rfqOrSavings : "RFQ";
        if (status === 3 || status === 5) return rfqOrSavings;
        if (status === 6) return hasDeliveryOrder ? "Job Summary" : "Delivery Order";
        return "Job Summary";
    };

    //Master function
    useEffect(() => {
        fetchData(true);
    }, []);

    const fetchData = async (isInitialLoad = false) => {
        try {
            setLoading(true);

            //loader
            handleLoading("rfq", true);
            handleLoading("savingReason", true);
            handleLoading("projectSavings", true);

            const response = await PostApi(Dashboard_API.GetDetails, {
                Enquiryid: id,
                Username: userName,
            });

            // workflow facts used to pick the stage tab (agency only)
            let rfqCalculated = false;
            let hasDeliveryOrder = false;

            if (userType?.toLowerCase() === Labels.userType.agency) {

                const enqResponse = await PostApi(LineItems_API.GetEnqLineItemsMaster, {
                    TypeOfJob: response.enqlineItems[0].printornonprint,
                });
                const projectResponse = await PostApi(ProjectEnquiry_API.GetProjectDetails, {
                    enquiryid: id,
                    Currency: currency,
                    Country: country
                });
                const supplierResponse = await PostApi(Suppliers_API.GetEnqSupplierMaster, {
                    currency: currency,
                    Country: country
                });

                const revisedQuotes = [...new Map(projectResponse.revisedQuotes.map(x => [x.itemNumber, x])).values()]
                    .map(x => ({
                        isSubTitle: true,
                        subTitle: x.itemName,
                        items: projectResponse.revisedQuotes.filter(y => y.itemNumber === x.itemNumber)
                    }));

                const requestQuotes = [...new Map(projectResponse.requestQuotes.map(x => [x.itemNumber, x])).values()]
                    .map(x => {
                        const items = projectResponse.requestQuotes.filter(y => y.itemNumber === x.itemNumber).filter(Boolean);
                        return {
                            isSubTitle: true,
                            subTitle: x.itemName,
                            supplierLink: items.length >= 2 && response.statusId >= 4,
                            items
                        };
                    });

                const projectSavings = [...new Map(projectResponse.savingsResponseDto.details.map(x => [x.itemNumber, x])).values()]
                    .map(x => ({
                        isSubTitle: true,
                        subTitle: x.itemName,
                        items: projectResponse.savingsResponseDto.details.filter(y => y.itemNumber === x.itemNumber)
                    }));

                const savingsSummary = [...new Map(projectResponse.savingsResponseDto.itemWiseSummary.map(x => [x.itemNumber, x])).values()]
                    .map(x => ({
                        isSubTitle: true,
                        subTitle: x.itemName,
                        items: projectResponse.savingsResponseDto.itemWiseSummary.filter(y => y.itemNumber === x.itemNumber)
                    }));

                const previewQuotes = [...new Map(projectResponse.previewQuotes.map(x => [x.itemNumber, x])).values()]
                    .map(x => ({
                        isSubTitle: true,
                        subTitle: x.itemName,
                        items: projectResponse.previewQuotes.filter(y => y.itemNumber === x.itemNumber)
                    }));

                rfqCalculated = projectResponse.calculationDetails?.length > 0;
                hasDeliveryOrder = projectResponse.deliveryOrder?.length > 0;

                setFormDataList(prev => ({
                    ...prev,
                    supplierMaster: supplierResponse,
                    savingsType: enqResponse.savingsType,
                    savingsReasons: projectResponse.savingReasons,
                    historyLogs: projectResponse.historyLogs,
                    lineItemLogs: projectResponse.lineItemLogs,
                    //historySearches: projectResponse.historySearches,
                    revisedQuotes: revisedQuotes,
                    requestQuotes: requestQuotes,
                    calculationDetails: projectResponse.calculationDetails,
                    calculationSupplierlogs: projectResponse.calculationSupplierlogs,
                    projectSavings: projectSavings,
                    savingsSummary: savingsSummary,
                    savingsResponseDto: projectResponse.savingsResponseDto,
                    deliveryOrder: projectResponse.deliveryOrder,
                    status: projectResponse.projectStatus,
                    previewSupplierQuotes: previewQuotes,
                    materialUsed: enqResponse.materialUsed,
                }));
                setFormData(prev => ({
                    ...prev,
                    calculateFlag: projectResponse.requestQuotes[0].initialQuote > 0,
                    rfqFlag: projectResponse.calculationDetails?.length === 0,
                    marginFlag: projectResponse.calculationDetails?.length > 0,
                    psFlag: !projectResponse.savingsResponseDto.details[0]?.previousPrice > 0,
                }));
                await clientInfoMaster(response.enqClientinfo.divisionid);
            }
            else if (userType?.toLowerCase() === Labels.userType.supplier) {
                const response = await PostApi(ProjectEnquiry_API.GetSupplierQuotes, {
                    enqId: id,
                    username: userName
                });
                setFormDataList(prev => ({
                    ...prev,
                    projectSupplierQuotes: response.data.items,
                }));
            }
            else {
                const clientQuotes = await GetApi(`${ProjectEnquiry_API.GetClientQuotes}?enqId=${id}`);
                setFormDataList(prev => ({
                    ...prev,
                    projectClientQuotes: clientQuotes.data.items,
                    clientQuotes: clientQuotes.data.totals
                }));
            }

            setFormDataList(prev => ({
                ...prev,
                lineItems: response.enqlineItems,
                clientInfo: response.enqClientinfo,
                enquiryDetails: response.enqProjectinfo,
                suppliers: response.supplierinfo,
            }));

            const stageTab = getStageTab({
                statusId: response.statusId,
                spotNeeded: response.spotNeeded,
                isSpotCompleted: response.isSpotcompleted,
                isProject: response.isprojectsavings,
                rfqCalculated,
                hasDeliveryOrder
            });

            setFormData(prev => ({
                ...prev,
                // first load, or the job moved to a new stage -> jump to that stage's tab
                stageTab,
                activeTab: isInitialLoad || prev.stageTab !== stageTab ? stageTab : prev.activeTab,
                quote: response.enqProjectinfo?.quoteBy,
                statusId: response.statusId,
                projectStatus: response.jobstatus,
                isSpotCompleted: response.isSpotcompleted,
                isSpot: response.spotNeeded,
                isProject: response.isprojectsavings,
                // SAP: shown only when the enquiry's country needs SAP; pre-filled from the saved value, else "No"
                sapVisible: response.countrySapNeeded === "Yes",
                sap: response.sapNeeded === "Yes" ? 1 : 2
            }));
        } catch (error) {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        } finally {
            setLoading(false);

            //loader
            handleLoading("rfq", false);
            handleLoading("savingReason", false);
            handleLoading("projectSavings", false);
        }
    };

    const statusInfo = [
        { label: getLabel("lbl162"), value: enquiryId },
        { label: getLabel("lbl163"), value: formData.projectNo }
    ]
    //Change Function
    const handleChange = async (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    //loader functionality
    const [tableLoading, setTableLoading] = useState({
        rfq: false,
        savingReason: false,
        projectSavings: false,
        approveQuotation: false,
        submitQuotation: false,
    });

    const handleLoading = (key, value) => {
        setTableLoading(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSaveReasonChange = async (e, row, field) => {
        const { name, label } = e.target;
        setFormDataList(prev => ({
            ...prev,
            savingsReasons: prev.savingsReasons.map(item =>
                item.id === row.id ? {
                    ...item,
                    [field]: label,
                    ...(field === Labels.lineItems.savingsType && {
                        savingsReason: "",
                        savingsReasonOptions: []
                    })
                } : item)
        }));

        if (name === Labels.lineItems.savingsType) {
            await SavingsReasonMaster(label, row.id);
        }
    };

    const SavingsReasonMaster = async (data, rowId) => {
        try {
            const response = await PostApi(LineItems_API.GetEnqLineItemsMaster, {
                TypeOfJob: formDataList.lineItems[0].printornonprint,
                Savingstype: data,
            });

            setFormDataList(prev => ({
                ...prev,
                savingsReasons: prev.savingsReasons.map(item => item.id === rowId ? {
                    ...item,
                    savingsReasonOptions: response.savingsReason
                } : item)
            }));

        } catch (error) {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        }
        finally {
            setLoading(false);
        }
    };

    const extraInfo = [{ label: getLabel("lbl164"), value: formDataList.clientInfo?.createdDate },
    { label: getLabel("lbl10"), value: formDataList.clientInfo?.userName }, { label: getLabel("lbl162"), value: formDataList.clientInfo?.enqUId },
    ...(deliveryFlag && flag ? [{ label: getLabel("lbl304"), value: formDataList.clientInfo?.poNumber }, { label: getLabel("lbl305"), value: formDataList.clientInfo?.raisedDate },
    { label: "Invoice Number", value: formDataList.clientInfo?.invoiceNumber }, { label: getLabel("lbl306"), value: formDataList.clientInfo?.actualdeliverydate }] : [])]

    const clientInfo = getClientInfo({}, {}, {}, getLabel, getOptionLabel, formDataList.clientInfo, extraInfo, userType);
    const enquiryDetails = getEnquiryDetails({}, {}, {}, getLabel, getOptionLabel, formDataList.enquiryDetails, false, userType);
    const rawLineItems = getLineneItems({}, formDataList, getLabel, getOptionLabel, formDataList.lineItems, userType);
    const lineItems = rawLineItems.map((item) => ({
        subTitle: `${item.itemTitle}`,
        enquiryId: item.enquiryId,
        items: item.items,
        files: item.files,
    }));

    const sections = getSummarySections({ menuId, lineItems, getLabel });

    //Edit & cancel section function
    const handleSlaChange = useCallback((data) => {
        setDynamicData(prev => {
            if (JSON.stringify(prev) === JSON.stringify(data)) {
                return prev;
            }
            return data;
        });
    }, []);

    const handleEdit = (e, flag) => {
        setFormData(prev => ({
            ...prev,
            [flag]: true,
            validateFlag: flag == "rfq" ? true : false
        }));
    };

    const handleCancel = async (e, flag) => {
        setFormData(prev => ({
            ...prev,
            [flag]: false,
            actualDeliveryDate: "",
            invoicenumber: "",
            poNumber: "",
            raisedDate: "",
            status: ""
        }));
        await fetchData();
    };

    const handleCalculate = async (e, flag) => {
        if (flag == "reCalculate") {
            const response = await PostApi(ProjectEnquiry_API.UpdateJobStatus, {
                enqId: id,
                modifiedBy: fkID,
                status: 2
            });
            if (isSuccess(response)) {
                toast(Labels.status.success, response.data);
                await fetchData();
            }
        }
        else {
            const payload = {
                enqid: id,
                ls_getsupplierQuotes: formDataList.selectedSupplierRows.map(item => ({
                    itemnumber: item.itemNumber,
                    supplierID: item.supplierId,
                    initialPrice: item.initialQuote,
                    negotiatePrice: item.negQuote,
                    supplierQuotesId: item.supplierQuotesId
                }))
            }
            try {
                setLoading(true);
                const response = await PostApi(ProjectEnquiry_API.CalculateSavings, payload);
                if (isSuccess(response)) {
                    // RFQ calculated -> fetchData moves to Project Savings (or stays on RFQ when the job has no savings)
                    await fetchData();
                    setFormDataList(prev => ({
                        ...prev,
                        selectedSupplierRows: [],
                    }));
                }
            } catch (error) {
                toast(Labels.status.failure, Labels.message.somethingWentWrong);
            } finally {
                setLoading(false);
            }

        }
    };

    const clientInfoMaster = async (globalBUMapping) => {
        try {
            setLoading(true);
            const response = await PostApi(ClientInfo_API.ClientInfoMaster, {
                Divisionid: globalBUMapping
            });
            setFormDataList(prev => ({
                ...prev,
                clientContact: response.client,
            }));
        } catch (error) {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        } finally {
            setLoading(false);
        }
    };

    //RFQ Section
    useEffect(() => {
        if (formDataList.suppliers?.length) {
            setFormDataList(prev => ({
                ...prev,
                selectedRows: formDataList.suppliers.map(item => ({
                    supplierId: item.supplierID
                }))
            }));
        }
    }, [formDataList.suppliers]);

    const handleValidationChange = (rows) => {
        const isValid = rows.length > 0;
        if (isValid) {
            setFormDataList(prev => ({
                ...prev,
                newSelectedRows: rows,
            }));
        }
    };

    const handleRFQ = (rows) => {
        const isValid = rows.length > 0;
        setFormDataList(prev => ({
            ...prev,
            selectedSupplierRows: rows,
        }));
        setFormData(prev => ({
            ...prev,
            isCalculate: isValid === true ? false : true
        }))

    };

    let filteredData = formDataList.supplierMaster;
    // Remove already selected/old suppliers
    const oldSupplierIds = new Set((formDataList.selectedRows || []).map(row => row.supplierId));
    filteredData = filteredData.filter(item => !oldSupplierIds.has(item.supplierId));
    if (formData.search.trim() !== "") {
        filteredData = filteredData.filter((item) =>
            item.suppliername.toLowerCase().includes(formData.search.toLowerCase())
        );
    }
    const data = filteredData;

    //historyToolData Functionlity
    // const search = formData.historySearchTool.trim().toLowerCase();
    // const historyToolData = formDataList.historySearches.filter(item =>
    //     !search || [item.brand, item.subCategory, item.qty, item.poNumber, item.enquiryID]
    //         .some(v => v?.toString().toLowerCase().includes(search))
    // );

    const handleHistory = async (rows) => {
        setFormDataList(prev => ({
            ...prev,
            selectedSupplierRows: rows,
        }));
    }

    const handleSendChoose = async () => {
        const oldSupplierIds = (formDataList.selectedRows || []).map(r => r.supplierId).join(",");
        const newSupplierIds = (formDataList.newSelectedRows || []).map(r => r.supplierId).join(",");
        const enqDetailsIds = (formDataList.lineItems || []).map(row => row.enqdetailsId);
        try {
            setLoading(true);
            const payload = {
                EnqId: id,
                EnqDetailsId: enqDetailsIds,
                SelectedSuppliers: oldSupplierIds,
                NewSelectedSuppliers: newSupplierIds
            };
            const response = await PostApi(Suppliers_API.AddSuppliers, payload);
            if (isSuccess(response)) {
                toast(Labels.status.success, response.data);
                setFormData(prev => ({
                    ...prev,
                    suppliers: false,
                }));
                await fetchData();
            } else {
                toast(Labels.status.failure, response.data);
            }
        } catch (error) {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        } finally {
            setLoading(false);
        }
    };

    //Project Saving Functionlity
    const handleProjectInputChange = (data, Id, enquiryId, field) => {
        setFormDataList(prev => ({
            ...prev,
            projectSavings: prev.projectSavings.map(group => ({
                ...group,
                items: group.items.map(item =>
                    item.id === Id
                        ? { ...item, [field]: data }
                        : item
                )
            }))
        }));
    }
    const renderProjectEditableField = (field) => ({
        render: (row) => {
            const isCostReduction = row?.savingType === "Cost Reduction";
            if (["baselineQuantity", "previousSupplier"].includes(field) && !isCostReduction) {
                return row[field];
            }

            const isNumeric = field === "baselineQuantity" || field === "previousPrice";
            return (
                <PTextField
                    name={field}
                    value={row[field]}
                    placeHolder={isNumeric ? "0.00" : "Enter PO no."}
                    onChange={(e) =>
                        handleProjectInputChange(isNumeric
                            ? e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")
                                .replace(/^(\d*\.\d{0,2}).*$/, "$1") : e.target.value,
                            row.id, row.enquiryId, field
                        )}
                    inputProps={{ inputMode: isNumeric ? "decimal" : "text" }}
                    startIcon={field === "previousPrice" && (
                        <span style={{ color: "#CF7729", fontWeight: 600, fontSize: 14 }}>{symbol}</span>
                    )}
                    width={field === "previousSupplier" ? 160 : 130}
                    sx={editableCellSx(isNumeric)}
                />
            )
        }
    });

    const savings = formDataList.savingsResponseDto;
    const savingsCalculation = [
        {
            label: getLabel("lbl351"),
            value: savings.totalPreviousPrice.toFixed(2)
        },
        {
            label: `${getLabel("lbl324")} ( ${getLabel("lbl354")} )`,
            value: savings.totalSellPrice
        },
        {
            label: `${getLabel("lbl355")} (${symbol})`,
            value: savings.totalSaving.toFixed(2)
        },
        {
            label: `${getLabel("lbl355")} ${Labels.symbols.percent}`,
            value: `${savings.totalSavingPercent.toFixed(2)} %`
        }
    ];

    const projectSavings = [
        {
            field: "previousSupplier", header: getLabel("lbl349"),
            ...(formData.inputPS && renderProjectEditableField("previousSupplier"))
        },
        {
            field: "reasonForSaving", header: getLabel("lbl118")
        },
        {
            field: "baselineQuantity", header: getLabel("lbl350"),
            ...(formData.inputPS && renderProjectEditableField("baselineQuantity")), align: "right"
        },
        {
            field: "previousPrice", header: `${getLabel("lbl351")} (${symbol})`,
            type: "rupee",
            ishide: true,
            align: "right",
            ...(formData.inputPS && renderProjectEditableField("previousPrice"))

        },
        {
            field: "negItemSellPrice", header: `${getLabel("lbl352")} (${getLabel("lbl354")})`, type: "rupee", align: "right"
        },
        {
            field: "itemSellPrice", header: `${getLabel("lbl352")} (${getLabel("lbl353")})`, type: "rupee", align: "right"
        }
    ];

    const summary = formDataList.savingsSummary || [];
    const totals = summary.flatMap(x => x.items).reduce(
        (acc, item) => {
            acc.totalSellPrice += Number(item.totalSellPrice || 0);
            acc.taxamount += Number(item.taxamount || 0);
            acc.totalsellpricewithtax += Number(item.totalsellpricewithtax || 0);
            // If tax percentage is the same for all items
            acc.taxpercentage = item.taxpercentage;
            return acc;
        },
        {
            totalSellPrice: 0,
            taxpercentage: 0,
            taxamount: 0,
            totalsellpricewithtax: 0
        }
    );

    const calculateProject = [
        {
            details: [
                {
                    label: getLabel("lbl324"),
                    value: totals.totalSellPrice.toFixed(2)
                },
                {
                    label: `${getLabel("lbl356")} ${Labels.symbols.percent}`,
                    value: totals.taxpercentage.toFixed(2)
                },
                {
                    label: getLabel("lbl357"),
                    value: totals.taxamount.toFixed(2)
                }
            ],
            total: {
                label: getLabel("lbl358"),
                value: totals.totalsellpricewithtax.toFixed(2)
            }
        }
    ];

    const handleQuotation = async (e, flag) => {
        const loadingType = [3, 4].includes(flag) ? "approveQuotation" : "submitQuotation";

        try {
            handleLoading(loadingType, true);
            if (flag) {
                const response = await PostApi(ProjectEnquiry_API.UpdateJobStatus, {
                    enqId: id,
                    modifiedBy: fkID,
                    status: flag,
                    // "Submit quotation to client" only: the Send to SAP choice (yesOrNo: 1 = Yes, 2 = No)
                    ...(flag === 3 && formData.sapVisible && { sapNeeded: formData.sap === 1 ? 1 : 0 })
                });
                if (isSuccess(response)) {
                    toast(Labels.status.success, response.data);
                    // status change -> fetchData moves to the next stage's tab
                    // (3 stays on Project Savings, 4 revise -> RFQ, 6 approved -> Delivery Order)
                    await fetchData();
                }
            }
            else {
                const response = await PostApi(ProjectEnquiry_API.GetPreviewQuotes, { enquiryId: id });
                if (response instanceof Blob) {
                    const pdfUrl = URL.createObjectURL(response);
                    const a = document.createElement("a");
                    a.href = pdfUrl;
                    const dateTime = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
                    a.download = `Quotation_${id}_${dateTime}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
                }
            }
        } catch (error) {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        } finally {
            handleLoading(loadingType, false);
        }
    };

    //RFQ functionality
    const renderEditableField = (field) => ({
        render: (row) => (
            <PTextField
                name={field}
                value={row[field] == null || row[field] === 0 ? "" : row[field]}
                onChange={(e) => handleInputChange(e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")
                    .replace(/^(\d*\.\d{0,2}).*$/, "$1"), row.supplierQuotesId, row.enquiryId, field)}
                placeHolder="0.00"
                inputProps={{ inputMode: "decimal" }}
                width={130}
                sx={editableCellSx(true)}
            />
        )
    });

    const handleInputChange = (data, Id, enquiryId, field) => {
        setFormDataList(prev => ({
            ...prev,
            requestQuotes: prev.requestQuotes.map(group => ({
                ...group,
                items: group.items.map(item =>
                    item.supplierQuotesId === Id
                        ? ((field === "negQuote" && Number(data) > Number(item.initialQuote)) ||
                            (field === "negUnitPrice" && Number(data) > Number(item.iniUnitPrice))
                        )
                            ? item : { ...item, [field]: data } : item
                )
            }))
        }));

        setFormData(prev => ({
            ...prev,
            validateFlag: data === ""
        }));
    };

    const isSupplier = userType?.toLowerCase() === Labels.userType.supplier.toLowerCase();
    const isQuote = formData.quote == 1 && (isSupplier || formData.rfq);
    const isUnit = formData.quote == 2 && (isSupplier || formData.rfq);

    const requestQuotes = [
        { field: "supplierName", header: "Supplier" },
        {
            field: "initialQuote",
            header: `Ini.Quote (${symbol})`,
            type: "rupee",
            align: "right",
            ishide: true,
            ...(isQuote && renderEditableField("initialQuote")),
        },
        {
            field: "negQuote",
            header: `Neg.Quote (${symbol})`,
            type: "rupee",
            align: "right",
            ishide: true,
            ...(isQuote && renderEditableField("negQuote")),
        },
        {
            field: "iniUnitPrice",
            header: `Ini.unit Price (${symbol})`,
            type: "rupee",
            align: "right",
            ishide: true,
            ...(isUnit && renderEditableField("iniUnitPrice")),
        },
        {
            field: "negUnitPrice",
            header: `Neg.unit Price (${symbol})`,
            type: "rupee",
            align: "right",
            ishide: true,
            ...(isUnit && renderEditableField("negUnitPrice")),
        },

        { field: "negUnitPriceFee", header: `Neg.unit Price with MFee (${symbol})`, type: "rupee", ishide: true, align: "right" },
        { field: "pmgSellPrice", header: `PMG Sell Price (${symbol})`, rowSpan: true, type: "rupee", align: "right" }
    ];

    //savings reason functionality
    useEffect(() => {
        if (!formData.project) return;
        const load = async () => {
            const rows = formDataList.savingsReasons.filter(row => row.savingsType);
            for (const row of rows) {
                await SavingsReasonMaster(row.savingsType, row.id);
            }
        };
        load();
    }, [formData.project]);

    const renderSavingsType = (field) => ({
        render: (row) => {
            const value = getOptionValue(formDataList.savingsType, row[field]);
            return (
                <PDropdown
                    value={value}
                    onChange={(e) => handleSaveReasonChange(e, row, field)}
                    name={field}
                    options={formDataList.savingsType}
                    flag={Labels.flag.auto}
                />
            );
        }
    });

    const renderSavingsReason = (field) => ({
        render: (row) => {
            const value = getOptionValue(row.savingsReasonOptions, row[field]);
            return (
                <PDropdown
                    value={value}
                    onChange={(e) => handleSaveReasonChange(e, row, field)}
                    name={field}
                    options={row.savingsReasonOptions}
                    flag={Labels.flag.auto}
                />
            );
        }
    });

    const savingsReasons = [{ field: "itemName", header: getLabel("lbl310") },
    { field: "savingsType", header: getLabel("lbl117"), ...(formData.project ? renderSavingsType("savingsType") : {}) },
    { field: "savingsReason", header: getLabel("lbl118"), ...(formData.project ? renderSavingsReason("savingsReason") : {}) }];

    // Project Savings input: every row needs a Savings Reference Price (> 0) before it can be saved
    const allRefPricesFilled = (formDataList.projectSavings ?? [])
        .flatMap(group => group.items ?? [])
        .every(item => Number(item.previousPrice) > 0);

    //Action button function
    const renderActionButtons = (flag) => (
        formData[flag] ? (
            <div className="pb-2 d-flex gap-2">
                <PButton
                    label={getLabel("lbl125")}
                    variant="outlined"
                    color={CommonColors.dark_blue}
                    onClick={() =>
                        setFormData(prev => ({
                            ...prev,
                            [flag]: false,
                        }))
                    }
                    width={180}
                />

                <PButton
                    label={getLabel("lbl124")}
                    variant="contained"
                    color={CommonColors.dark_blue}
                    onClick={(e) => handleSubmit(e, flag)}
                    width={180}
                    disabled={formData.validateFlag || (flag === "inputPS" && !allRefPricesFilled)}
                    startIcon={<img src={arrow} alt="arrow" className="icon" />}
                />
            </div>

        ) : (
            <PPillButton
                label={flag == "inputPS" ? getLabel("lbl165") : getLabel("lbl160")}
                onClick={(e) => handleEdit(e, flag)}
                disabled={formData.statusId >= 6 && (flag === "inputPS" || flag === "project")}
            />
        )
    );

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            ...(formDataList.clientInfo?.clientContactId && {
                clientContact: formDataList.clientInfo.clientContactId
            }),
            ...(formDataList.clientInfo?.poNumber && {
                poNo: formDataList.clientInfo.poNumber
            }),
            ...(formDataList.clientInfo?.raisedDate && {
                raisedDate: formDataList.clientInfo.raisedDate
            }),
            ...(formDataList.clientInfo?.invoiceNumber && {
                invoicenumber: formDataList.clientInfo.invoiceNumber
            }),
            ...(formDataList.clientInfo?.actualdeliverydate && {
                actualDeliveryDate: formDataList.clientInfo.actualdeliverydate
            }),
            ...(formDataList.clientInfo?.managementFee && {
                managementFee: Number(formDataList.clientInfo.managementFee).toFixed(2)
            }),
            ...(formDataList.enquiryDetails?.projectNo && {
                projectNo: formDataList.enquiryDetails.projectNo
            }),
            ...(formDataList.enquiryDetails?.projectDesc && {
                projectDescription: formDataList.enquiryDetails.projectDesc
            }),
            ...(formDataList.enquiryDetails?.estdate && {
                estdeliveryDate: formDataList.enquiryDetails.estdate
            }),
            ...(formDataList.enquiryDetails?.briefdate && {
                briefReceivedDate: formDataList.enquiryDetails.briefdate
            }),
        }));
    }, [formDataList.clientInfo, formDataList.enquiryDetails]);

    const handleSubmit = async (e, flag) => {
        let activeTab = "";
        let response;

        //job summary
        const updateSummary = {
            enqId: id,
            modifiedBy: fkID,
            createdBy: userID,
            clientContactId: formData.clientContact,
            projectNo: formData.projectNo,
            projectDesc: formData.projectDescription,
            estdate: formatDate(parseDate(formData.estdeliveryDate)),
            briefdate: formatDate(parseDate(formData.briefReceivedDate)),
            Action: actionFlag,
            invoiceNumber: formData.invoicenumber,
            poNumber: formData.poNo,
            actualdeliverydate: formData.actualDeliveryDate,
            raisedDate: formData.raisedDate,
            invoiceDate: "",
            statusId: flag === "order" ? 7 : formData.statusId
        }

        //management fee 
        const updateFeeSummary = {
            enqId: id,
            managementFee: formData.managementFee,
            Action: flag,
            statusId: formData.statusId
        }

        //sla 
        const enquiryDetails = {
            enqId: id,
            projectNo: formDataList.enquiryDetails.projectNo,
            projectDesc: formDataList.enquiryDetails.projectDesc,
            estdate: formDataList.enquiryDetails.estdate,
            briefdate: formDataList.enquiryDetails.briefdate,
            modifiedBy: fkID,
            quoteBy: formDataList.enquiryDetails.quoteBy,
            slaId: formDataList.enquiryDetails.slaId,
            managementfeetypeId: formDataList.enquiryDetails.managementfeetypeId,
            hybridModel: formDataList.enquiryDetails.hybridModel,
            attribute: formDataList.enquiryDetails.attribute,
            year: formDataList.enquiryDetails.year,
            ...dynamicData,
        };

        //RFQ Suppliers
        const supplierQuotes = formDataList.requestQuotes.flatMap(group =>
            group.items.map(item => ({
                enqId: item.enquiryId,
                quoteId: item.supplierQuotesId,
                supplierQuoteAmountPriceOrQuantity: formData.quote,
                itemNumber: item.enquiryDetailsId,
                qty: item.quantity,
                modifiedBy: fkID,
                intialprice: item.initialQuote?.toString(),
                negoprice: item.negQuote?.toString(),
                initialUnitprice: item.iniUnitPrice?.toString(),
                negoUnitprice: item.negUnitPrice?.toString()
            }))
        );

        //input project savings
        const projectQuotes = formDataList.projectSavings.flatMap(group =>
            group.items.map(item => ({
                Id: item.id,
                previousSupplier: item.previousSupplier,
                previousPrice: item.previousPrice,
                note: item.reasonForSaving,
                BaselineQuantity: item.baselineQuantity
            }))
        );

        const savingsReasons = formDataList.savingsReasons.map(item => ({
            Id: item.id,
            savingsReason: item.savingsReason,
            savingsType: item.savingsType,
            enquiryId: id,
        }));

        //project status
        const updateJobStatus = {
            enqId: id,
            modifiedBy: fkID,
            status: formData.status
        }

        const updateSurvey = {
            enqId: id,
            country: country,
            projectNumber: formDataList.enquiryDetails.projectNo,
            projectDescription: formDataList.enquiryDetails.projectDesc,
            enquiryNumber: enquiryId,
            clientName: userName,
            emailAddress: email,
        }

        const items = formDataList.projectSupplierQuotes.map(item => ({
            enquiryDetailsId: Number(item.enquiryDetailsId),
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalPrice)
        }));

        const supplierQuote = {
            enqId: id,
            username: userName,
            items: items
        }
        try {
            switch (flag) {
                case "status":
                    activeTab = "Job Summary";
                    response = await PostApi(ProjectEnquiry_API.UpdateJobStatus, updateJobStatus);
                    setFormData(prev => ({
                        ...prev,
                        statusFlag: false,
                    }))
                    break;

                case "sla":
                    activeTab = "SLA";
                    response = await PostApi(EnquiryDetails_API.AddUpdateEnquiryDetails, enquiryDetails);
                    break;

                case "job":
                case "order":
                    activeTab = "Job Summary";
                    response = await PostApi(ProjectEnquiry_API.UpdateJobSummary, updateSummary);
                    break;

                case "rfq":
                    activeTab = "RFQ";
                    response = await PostApi(ProjectEnquiry_API.PostSupplierQuotes, supplierQuotes);
                    break;

                case "fee":
                    activeTab = "SPOT";
                    response = await PostApi(ProjectEnquiry_API.UpdateJobSummary, updateFeeSummary);
                    break;

                case "project":
                    activeTab = "Project Savings";
                    response = await PostApi(ProjectEnquiry_API.UpdateSavingsReasons, savingsReasons);
                    break;

                case "inputPS":
                    activeTab = "Project Savings";
                    response = await PostApi(ProjectEnquiry_API.PostRefPrice, projectQuotes);
                    break;

                case "email":
                    activeTab = "Job Summary";
                    response = await PostApi(ProjectEnquiry_API.UpdateSurvey, updateSurvey);
                    break;

                case "quote":
                    activeTab = "Your Quote Submissions";
                    response = await PostApi(ProjectEnquiry_API.SaveSupplierQuotes, supplierQuote);
                    break;

                default:
                    return;
            }

            if (isSuccess(response)) {
                handleCancel(e, flag);
                setFormData(prev => ({
                    ...prev,
                    activeTab,
                }))
                toast(Labels.status.success, flag == "sla" ? response?.data?.message : response.data);
            }
            else {
                setLoading(false);
                setLoader("");
                setFormData(prev => ({
                    ...prev,
                    activeTab,
                }))
                toast(Labels.status.failure, response.data);
            }
        } catch (error) {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        } finally {
            setLoading(false);
        }
    };

    //Supplier Quotations

    const handleQuoteInputChange = (data, Id, field) => {
        setFormDataList(prev => {
            const currentItem = prev.projectSupplierQuotes.find(
                item => item.id === Id
            );
            if (!currentItem || currentItem[field] === data) {
                return prev;
            }
            return {
                ...prev,
                projectSupplierQuotes: prev.projectSupplierQuotes.map(item =>
                    item.id === Id ? { ...item, [field]: data } : item
                )
            };
        });
    };
    const renderQuoteEditableField = (field) => ({
        render: (row) => {
            return (
                <PTextField
                    name={field}
                    value={row[field]}
                    onChange={(e) => {
                        const value = e.target.value
                            .replace(/[^0-9.]/g, "")
                            .replace(/(\..*)\./g, "$1")
                            .replace(/^(\d*\.\d{0,2}).*$/, "$1");
                        handleQuoteInputChange(value, row.id, field);
                    }}
                    width={100}
                    sx={{
                        "& .MuiInputBase-root": {
                            height: 40,
                            minHeight: 40
                        }
                    }}
                />
            )
        }
    });

    const supplierQuotes = [
        { field: "itemName", header: "Item Name" },
        { field: "totalPrice", header: `Initial Quote (${symbol})`, ...(isQuote && renderQuoteEditableField("totalPrice")), type: "rupee", align: "right" },
        { field: "unitPrice", header: `Unit Price (${symbol})`, ...(isUnit && renderQuoteEditableField("unitPrice")), type: "rupee", align: "right" },
    ]

    return (
        <>
            <Box sx={{ py: 3 }}>
                <PGrid container className="peBoxWrapper mx-auto d-flex justify-content-center row-y-10">
                    <PGrid item xs={12} md={7} sm={12}>
                        <Box style={{ background: "#512668", minHeight: "282px" }} sx={{ borderRadius: "6px", display: "flex", alignItems: "start", padding: "30px 20px 30px 20px", flexDirection: "column", justifyContent: "space-between", flexWrap: "wrap" }}>
                            {statusInfo.map((item, i) => (
                                <Box className={`peBox-${i}`} sx={{ display: "flex", alignItems: "start", flexDirection: "column", gap: 1.5 }} key={i}>
                                    <PTypography
                                        labelText={`${item.label} :`}
                                        weight={FontWeight.regular}
                                        color={CommonColors.white}
                                        flag={Labels.fontFlags.header}
                                    />
                                    <PTypography
                                        labelText={`${item.value}`}
                                        weight={FontWeight.regular}
                                        color={CommonColors.white}
                                        flag={Labels.fontFlags.header}
                                    />
                                </Box>
                            ))}
                        </Box>
                    </PGrid>
                    <PGrid item xs={12} md={4} sm={12} style={{ display: "flex", minHeight: "282px", justifyContent: "space-between", flexDirection: "column", rowGap: "24px" }}>
                        <Box style={{ background: "#EEE9F1", padding: "30px 20px 30px 20px", height: "100%" }} sx={{ borderRadius: "6px", display: "flex", alignItems: "start", justifyContent: "start", flexWrap: "wrap" }}>
                            <PTypography
                                labelText={getLabel("lbl166")}
                                flag={Labels.fontFlags.sm}
                                color={CommonColors.primary}
                                weight={FontWeight.regular}
                            />
                            <PTypography
                                labelText={formData.projectStatus}
                                flag={Labels.fontFlags.header}
                                color={CommonColors.primary}
                                weight={FontWeight.regular}
                            />
                        </Box>
                        <Box sx={{ border: "1px solid #000000", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", padding: "10px 20px" }}>
                            <PTypography
                                labelText={`${getLabel("lbl297")} ${Labels.symbols.optional}`}
                                flag={Labels.fontFlags.subHeader}
                                color={CommonColors.primary}
                                weight={FontWeight.regular}
                            />
                            <PButton
                                label={getLabel("lbl252")}
                                variant="contained"
                                color={CommonColors.red.dark}
                                onClick={(e) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        status: 25,
                                    }));
                                    handleSubmit(e, "status");
                                }}
                                width={100}
                                height={43}
                                disabled={formData.statusId >= 18 || userType?.toLowerCase() !== Labels.userType.agency}
                            />
                        </Box>
                    </PGrid>
                </PGrid>

                {flag && formData.statusId >= 7 && formData.statusId <= 23 && (
                    <PGrid container className={Labels.margin.mb3}>
                        <PGrid item xs={12} md={12} sm={12}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, flexWrap: "wrap" }}>
                                <PDropdown
                                    name={Labels.commonLabel.status}
                                    value={formData.status}
                                    onChange={handleChange}
                                    options={formDataList.status}
                                    width={27}
                                    helperText={""}
                                    flag={Labels.flag.auto}
                                    labelMode={"inside"}
                                    label={"Please update the status"}
                                />
                                <PButton
                                    label={getLabel("lbl40")}
                                    variant="contained"
                                    color={CommonColors.dark_blue}
                                    onClick={() => setFormData((prev) => ({
                                        ...prev,
                                        statusFlag: true
                                    }))}
                                    startIcon={<img src={arrow} alt="arrow" className="icon" />}
                                    width={150}
                                    height={45}
                                    disabled={!formData.status || !formData.actualDeliveryDate}
                                />
                            </Box>
                        </PGrid>
                    </PGrid>
                )}

                {[24].includes(formData.statusId) && flag && (
                    <PGrid container className={Labels.margin.mb3}>
                        <PGrid item xs={12} md={12} sm={8}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, flexWrap: "wrap" }}>
                                <PTypography
                                    labelText={<>
                                        {getLabel("lbl299").split("here")[0]}
                                        <span style={{ color: CommonColors.blue.main }} onClick={() => {
                                            setFormData(prev => ({
                                                ...prev,
                                                email: true
                                            }))
                                        }}>
                                            here
                                        </span>
                                        {getLabel("lbl299").split("here")[1]}
                                    </>}
                                    flag={Labels.fontFlags.normalText}
                                    color={CommonColors.primary}
                                    weight={FontWeight.bold}
                                />
                            </Box>
                        </PGrid>
                    </PGrid>
                )}

                {[7, 8].includes(formData.statusId) && flag && !formData.actualDeliveryDate?.trim() && (
                    <PGrid container className={Labels.margin.mb3}>
                        <PGrid item xs={12} md={12} sm={8}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, flexWrap: "wrap" }}>
                                <Alert severity="error">{getLabel("lbl300")}</Alert>
                            </Box>
                        </PGrid>
                    </PGrid>
                )}

                {showProjectSaving && formData.psFlag && flag && (
                    <PGrid container className={Labels.margin.mb3}>
                        <PGrid item xs={12} md={12} sm={8}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, flexWrap: "wrap" }}>
                                <Alert severity="error">{getLabel("lbl301")}</Alert>
                            </Box>
                        </PGrid>
                    </PGrid>
                )}

                {[false].includes(createOrderFlag) && flag && [6, 7].includes(formData.statusId) && (
                    <PGrid container className={Labels.margin.mb3}>
                        <PGrid item xs={12} md={12} sm={8}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, flexWrap: "wrap" }}>
                                <Alert severity="error">{getLabel("lbl302")}</Alert>
                            </Box>
                        </PGrid>
                    </PGrid>
                )}

                <PGrid container className={Labels.margin.mb1}>
                    <PGrid item xs={12} sm={6} md={12}>
                        <Box sx={{ display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap", mb: 3 }}>
                            {tabs.map((tab) => {
                                const isActive = formData.activeTab === tab.label;
                                const selectTab = async () => {
                                    setFormData(prev => ({ ...prev, activeTab: tab.label }));
                                    if (tab.label === "Project Savings") await fetchData()
                                };
                                return (
                                    <Box key={tab.label}
                                        role="button"
                                        tabIndex={0}
                                        aria-pressed={isActive}
                                        onClick={selectTab}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectTab(); }
                                        }}
                                        sx={{
                                            width: 84, display: "flex", flexDirection: "column", alignItems: "center", gap: 0.75,
                                            cursor: "pointer", outline: "none",
                                            "&:hover .tab-circle, &:focus-visible .tab-circle": { background: "#16133F", color: "#fff" },
                                            "&:focus-visible .tab-circle": { boxShadow: "0 0 0 3px rgba(22,19,63,0.25)" }
                                        }}
                                    >
                                        <Box className="tab-circle"
                                            sx={{
                                                width: 50, height: 50, borderRadius: "50%",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                bgcolor: isActive ? "#16133F" : "#fff",
                                                color: isActive ? "#fff" : "#16133F",
                                                transition: "0.3s",
                                                border: "1px solid #16133F"
                                            }}
                                        >
                                            {tab.icon}
                                        </Box>
                                        <Box component="span"
                                            sx={{
                                                fontSize: 12, lineHeight: 1.25, textAlign: "center", color: "#16133F",
                                                fontWeight: isActive ? 700 : 500,
                                                borderBottom: isActive ? "2px solid #16133F" : "2px solid transparent",
                                                pb: 0.25
                                            }}
                                        >
                                            {tab.label}
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    </PGrid>
                </PGrid>

                {formData.activeTab === "Job Summary" && (
                    <div className={Labels.margin.mb3} style={{ padding: 0, boxShadow: "none" }}>
                        <PGrid container className="d-flex align-items-center justify-content-between mb-2">
                            <PGrid item xs={12} sm={6} md={6}>
                                <SectionHeading accent={PmgColors.red} label={getLabel("lbl167")} color={CommonColors.primary} />
                            </PGrid>
                            <PGrid item xs={12} sm={6} md={6} className="d-flex justify-content-end gap-2">
                                {flag && renderActionButtons("job")}
                            </PGrid>
                        </PGrid>
                        <Divider sx={{ mb: 2 }} />
                        {loading ? (
                            <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
                        ) : (
                            <>
                                <PGrid container className={Labels.margin.mb3}>
                                    {clientInfo.map((item, i) => {
                                        const job = item.label === getLabel("lbl304") ? (formData.job || !item.value) : formData.job;
                                        return (
                                            <PGrid item xs={12} md={6} xl={3} key={i}>
                                                {
                                                    formData.statusId < 6 && formData.job && item.label === getLabel("lbl35") ? (
                                                        <>
                                                            <PTypography
                                                                labelText={item.label}
                                                                weight={FontWeight.bold}
                                                                flag={Labels.fontFlags.normalText}
                                                            />
                                                            <PDropdown
                                                                name={Labels.clientInfo.clientContact}
                                                                value={formData.clientContact}
                                                                onChange={(e) => handleChange(e)}
                                                                options={formDataList.clientContact}
                                                                width={100}
                                                                flag={Labels.flag.auto}
                                                            />
                                                        </>
                                                    ) : item.label === getLabel("lbl304") && job ? (
                                                        <>
                                                            <PGrid container >
                                                                <PGrid item xs={12} md={6} xl={9}>
                                                                    <PTypography
                                                                        labelText={`${item.label} ${Labels.symbols.required}`}
                                                                        weight={FontWeight.bold}
                                                                        flag={Labels.fontFlags.normalText}
                                                                    />
                                                                    <PTextField
                                                                        name="poNo"
                                                                        value={formData.poNo}
                                                                        onChange={handleChange}
                                                                        disabled={!createOrderFlag}
                                                                        sx={{ mb: 3 }}
                                                                    />
                                                                </PGrid>
                                                                {[6].includes(formData.statusId) && (
                                                                    <PGrid item xs={12} md={6} xl={3} className={Labels.margin.mt4}>
                                                                        <Tooltip title={getLabel("lbl303")} arrow >
                                                                            <IconButton sx={iconStyle}
                                                                                onClick={(e) => handleSubmit(e, "order")}
                                                                                disabled={!createOrderFlag && !formData.poNo}
                                                                            >
                                                                                <PostAddIcon />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    </PGrid>
                                                                )}
                                                            </PGrid>
                                                        </>
                                                    ) : formData.statusId > 6 && formData.job && item.label === getLabel("lbl305") ? (
                                                        <>
                                                            <PTypography
                                                                labelText={`${item.label}`}
                                                                weight={FontWeight.bold}
                                                                flag={Labels.fontFlags.normalText}
                                                            />
                                                            <PDatepicker
                                                                name={"raisedDate"}
                                                                value={formData.raisedDate}
                                                                onChange={handleChange}
                                                                width={100}
                                                                allowFuture={false}
                                                            />
                                                        </>
                                                    ) : formData.statusId > 6 && formData.job && item.label === "Invoice Number" ? (
                                                        <>
                                                            <PTypography
                                                                labelText={`${item.label}`}
                                                                weight={FontWeight.bold}
                                                                flag={Labels.fontFlags.normalText}
                                                            />
                                                            <PTextField
                                                                name={"invoicenumber"}
                                                                value={formData.invoicenumber}
                                                                onChange={handleChange}
                                                            />
                                                        </>

                                                    ) : formData.statusId > 6 && formData.job && item.label === getLabel("lbl306") ? (
                                                        <>
                                                            <PTypography
                                                                labelText={`${item.label} ${Labels.symbols.required}`}
                                                                weight={FontWeight.bold}
                                                                flag={Labels.fontFlags.normalText}
                                                            />
                                                            <PDatepicker
                                                                name={"actualDeliveryDate"}
                                                                value={formData.actualDeliveryDate}
                                                                onChange={handleChange}
                                                                width={100}
                                                                allowFuture
                                                            />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <PGrid className={`ps-2 mb-4`}>
                                                                <PTypography
                                                                    labelText={
                                                                        <>
                                                                            {item.label}
                                                                            {(item.label === getLabel("lbl304") || item.label === getLabel("lbl306")) && (
                                                                                <span style={{ color: "red" }}>{" "}{Labels.symbols.required}</span>
                                                                            )}

                                                                        </>
                                                                    }
                                                                    weight={FontWeight.bold}
                                                                    flag={Labels.fontFlags.normalText}
                                                                />
                                                                <PTypography
                                                                    labelText={item.value}
                                                                    color={CommonColors.primary}
                                                                    weight={FontWeight.regular}
                                                                    flag={Labels.fontFlags.normalText}
                                                                />
                                                            </PGrid>
                                                        </>
                                                    )
                                                }
                                            </PGrid>
                                        )
                                    })}
                                </PGrid>
                                <PGrid container className={Labels.margin.mb3}>
                                    {enquiryDetails.map((item, i) => (
                                        <PGrid item xs={12} md={6} xl={3} key={i}>
                                            {
                                                formData.statusId < 6 && formData.job && item.label === getLabel("lbl42") ? (
                                                    <>
                                                        <PTypography
                                                            labelText={item.label}
                                                            weight={FontWeight.bold}
                                                            flag={Labels.fontFlags.normalText}
                                                        />
                                                        <PTextField
                                                            name={Labels.enquiryDetails.projectNo}
                                                            //label={item.label}
                                                            value={formData.projectNo}
                                                            onChange={(e) => handleChange(e)}
                                                        />
                                                    </>
                                                ) : formData.job && (item.label === getLabel("lbl43") || item.label === getLabel("lbl44")) ? (
                                                    <>
                                                        <PTypography
                                                            labelText={item.label}
                                                            weight={FontWeight.bold}
                                                            flag={Labels.fontFlags.normalText}
                                                        />
                                                        <PDatepicker
                                                            name={
                                                                getLabel("lbl43") === item.label
                                                                    ? Labels.enquiryDetails.estdeliveryDate
                                                                    : getLabel("lbl44") === item.label
                                                                        ? Labels.enquiryDetails.briefReceivedDate
                                                                        : ""
                                                            }
                                                            //label={item.label}
                                                            value={
                                                                getLabel("lbl43") === item.label
                                                                    ? formData.estdeliveryDate
                                                                    : getLabel("lbl44") === item.label
                                                                        ? formData.briefReceivedDate
                                                                        : null
                                                            }
                                                            onChange={handleChange}
                                                            width={100}
                                                            allowFuture
                                                            maxDate={getLabel("lbl44") === item.label ? formData.estdeliveryDate : null}
                                                            minDate={getLabel("lbl43") === item.label ? today : null}
                                                        />
                                                    </>
                                                ) : formData.statusId < 6 && formData.job && item.label === getLabel("lbl45") ? (
                                                    <>
                                                        <PTypography
                                                            labelText={item.label}
                                                            weight={FontWeight.bold}
                                                            flag={Labels.fontFlags.normalText}
                                                        />
                                                        <PTextField
                                                            name={Labels.enquiryDetails.projectDescription}
                                                            //label={item.label}
                                                            value={formData.projectDescription}
                                                            onChange={handleChange}
                                                            multiline={true}
                                                            rows={2.0}
                                                        />
                                                    </>

                                                ) : (

                                                    <PGrid className={`ps-2 mt-4`}>
                                                        <PTypography
                                                            labelText={item.label}
                                                            weight={FontWeight.bold}
                                                            flag={Labels.fontFlags.normalText}
                                                        />
                                                        <PTypography
                                                            labelText={item.value}
                                                            color={CommonColors.primary}
                                                            weight={FontWeight.regular}
                                                            flag={Labels.fontFlags.normalText}
                                                        />
                                                    </PGrid>
                                                )}
                                        </PGrid>
                                    ))}
                                </PGrid>
                            </>
                        )}
                    </div>
                )}

                {formData.activeTab === "Line Items" && (
                    <div>
                        <PGrid container className={Labels.margin.mb3}>
                            <PGrid item xs={12} sm={6} md={6}>
                                <SectionHeading accent={PmgColors.green} label={getLabel("lbl22")} />
                            </PGrid>
                        </PGrid>
                        <Divider sx={{ mb: 2 }} />
                        <PGrid container className={`${Labels.margin.mb3} ${"p-2"}`}>
                            <PGrid item xs={12} sm={12} md={12}>
                                <PSummary sections={sections} currentStep={3} layout={"column"} refreshSummary={fetchData} showFlag={false} lineItems={formDataList.lineItems} />
                            </PGrid>
                        </PGrid>
                    </div>
                )}

                {formData.activeTab === "Delivery Order" && (
                    <PDeliveryOrder response={formDataList.deliveryOrder} fetchData={fetchData} setFormData={setFormData} />
                )}

                {formData.activeTab === "SPOT" && (
                    <div>
                        {/* refetch after each SPOT save so a completed SPOT moves the job on to RFQ */}
                        <PSpotSection response={formDataList.materialUsed} onSaved={() => fetchData()} />
                        <PGrid container className={Labels.margin.mt4}>
                            <PGrid item xs={12} sm={6} md={6}>
                                <SectionHeading accent={PmgColors.navy} label={getLabel("lbl168")} />
                            </PGrid>
                            {[1].includes(formData.statusId) && (
                                <PGrid item xs={12} sm={6} md={6} className="d-flex justify-content-end gap-2">
                                    {renderActionButtons("fee")}
                                </PGrid>
                            )}
                        </PGrid>
                        <Divider sx={{ mb: 2 }} />
                        <PGrid container className={Labels.margin.mb3}>
                            <PGrid item xs={12} sm={6} md={3} className={Labels.margin.mt3}>
                                <PTypography
                                    labelText={`${getLabel("lbl168")} ( ${(Labels.symbols.percent)} ) : `}
                                    weight={FontWeight.bold}
                                />
                            </PGrid>

                            {formData.fee ? (
                                <PGrid item xs={12} sm={6} md={1}>
                                    <PTextField
                                        name="managementFee"
                                        value={formData.managementFee}
                                        onChange={handleChange}
                                    />
                                </PGrid>
                            ) : (
                                <PGrid item xs={12} sm={6} md={1} className={Labels.margin.mt3}>
                                    <PTypography
                                        labelText={formData.managementFee}
                                        color={CommonColors.grey.main}
                                        weight={FontWeight.bold}
                                    />
                                </PGrid>
                            )}

                        </PGrid>
                    </div>
                )}

                {formData.activeTab === "RFQ" && (
                    <div className={Labels.margin.mb3}>
                        <PGrid container className={Labels.margin.mb1}>
                            <PGrid item xs={12} sm={6} md={6}>
                                <SectionHeading accent={PmgColors.orange} label={getLabel("lbl169")} />
                            </PGrid>
                        </PGrid>

                        {/* RFQ Section */}
                        {[1, 2, 3].includes(formData.statusId) && (
                            <PGrid container className="d-flex align-items-center justify-content-between mb-3">
                                <PGrid item xs={12} sm={6} md={6}>
                                    <PTypography
                                        labelText={getLabel("lbl170")}
                                        flag={Labels.fontFlags.normalText}
                                        color={CommonColors.primary}
                                        weight={FontWeight.bold}
                                    />
                                    <PTypography
                                        labelText={getLabel("lbl171")}
                                        flag={Labels.fontFlags.smallText}
                                        color={CommonColors.primary}
                                        weight={FontWeight.regular}
                                    />
                                </PGrid>
                                <PGrid item xs={12} sm={6} md={6} className="d-flex justify-content-end gap-2">
                                    {!formData.marginFlag && (renderActionButtons("rfq"))}
                                </PGrid>
                            </PGrid>
                        )}

                        {/* Award Jobs Section */}
                        {formData.statusId >= 4 && (
                            <PGrid container className="d-flex align-items-center justify-content-between mb-3">
                                <PGrid item xs={12} sm={6} md={6}>
                                    <PTypography
                                        labelText={getLabel("lbl235")}
                                        flag={Labels.fontFlags.normalText}
                                        color={CommonColors.primary}
                                        weight={FontWeight.bold}
                                    />
                                    <PTypography
                                        labelText={getLabel("lbl236")}
                                        flag={Labels.fontFlags.smallText}
                                        color={CommonColors.primary}
                                        weight={FontWeight.regular}
                                    />
                                </PGrid>
                                <PGrid item xs={12} sm={6} md={6} className="d-flex justify-content-end gap-2">
                                    <PButton
                                        label={getLabel("lbl237")}
                                        variant="contained"
                                        color={CommonColors.dark_blue}
                                        onClick={() => setFormData((prev) => ({
                                            ...prev,
                                            preview: true,
                                        }))}
                                        width={300}
                                        startIcon={<img src={arrow} alt="arrow" className="icon" />}
                                    />
                                </PGrid>
                            </PGrid>
                        )}

                        <Divider sx={{ mb: 2 }} />
                        <PGrid container className={Labels.margin.mb4}>
                            <PGrid item xs={12} sm={6} md={12}>
                                <PTable columns={requestQuotes} rows={formDataList.requestQuotes} showCheckbox={formData.rfqFlag} selectedRows={formDataList.selectedSupplierRows} onValidationChange={handleRFQ} disabled={formData.rfq} bgColor={true} showPagination={false} loading={tableLoading.rfq} />
                            </PGrid>
                        </PGrid>
                        <PGrid container className={Labels.margin.mb4}>
                            {!formData.marginFlag && (
                                <PGrid item xs={12} sm={6} md={4}>
                                    <PButton
                                        label={getLabel("lbl172")}
                                        variant="outlined"
                                        color={CommonColors.dark_blue}
                                        onClick={() => setFormData((prev) => ({
                                            ...prev,
                                            suppliers: true
                                        }))}
                                        width={200}
                                    />
                                </PGrid>
                            )}
                            {formData.calculateFlag && [1, 2, 3, 4, 5].includes(formData.statusId) && (
                                <PGrid item xs={12} sm={12} md={formData.marginFlag ? 7 : 7} className="d-flex justify-content-end gap-2 ms-auto">
                                    <PButton
                                        label={getLabel("lbl173")}
                                        variant="outlined"
                                        color={CommonColors.grey.main}
                                        onClick={(e) => handleCalculate(e, "calculate")}
                                        width={300}
                                        disabled={formData.isCalculate}
                                    />
                                    <PButton
                                        label={getLabel("lbl174")}
                                        variant="contained"
                                        color={CommonColors.red.dark}
                                        onClick={(e) => handleCalculate(e, "reCalculate")}
                                        width={400}
                                        startIcon={<img src={arrow} alt="arrow" className="icon" />}
                                    />
                                </PGrid>
                            )}
                        </PGrid>
                        {formData.marginFlag && (
                            <>
                                <PGrid container className={Labels.margin.mb4}>
                                    <PGrid item xs={12} sm={6} md={12}>
                                        <PTable columns={formDataList.calculateRows} rows={formDataList.calculationDetails} showPagination={false} />
                                    </PGrid>
                                </PGrid>
                                <PGrid container className={Labels.margin.mb4}>
                                    <PGrid item xs={12} sm={6} md={12}>
                                        <PTable columns={formDataList.calculateSupplierlogsRows} rows={formDataList.calculationSupplierlogs} />
                                    </PGrid>
                                </PGrid>
                            </>
                        )}
                    </div>
                )}

                {formData.activeTab === "Project Savings" && (
                    <>
                        <div className={Labels.margin.mb3}>
                            <PGrid container >
                                <PGrid item xs={12} sm={6} md={6}>
                                    <SectionHeading accent={PmgColors.indigo} label={getLabel("lbl175")} />
                                </PGrid>
                                <PGrid item xs={12} sm={6} md={6} className="d-flex justify-content-end gap-2">
                                    {renderActionButtons("project")}
                                </PGrid>
                            </PGrid>

                            <Divider />
                            <PGrid container className={Labels.margin.mb4}>
                                <PGrid item xs={12} sm={6} md={12}>
                                    <PTable columns={savingsReasons} rows={formDataList.savingsReasons} showPagination={false} loading={tableLoading.savingReason} />
                                </PGrid>
                            </PGrid>
                            <PGrid container className={Labels.margin.mb0}>
                                <PGrid item xs={12} sm={12} md={12} className="d-flex justify-content-end">
                                    {renderActionButtons("inputPS")}
                                </PGrid>
                            </PGrid>
                            <PGrid container className={Labels.margin.mb3} style={{ marginTop: "-20px" }}>
                                <PGrid item xs={12} sm={6} md={12}>
                                    <PTable columns={projectSavings} rows={formDataList.projectSavings} showPagination={false} loading={tableLoading.projectSavings} />
                                </PGrid>
                            </PGrid>
                            <PGrid container className={Labels.margin.mb3}>
                                <PGrid item xs={12} sm={6} md={12}>
                                    <PTable columns={formDataList.savingsSummaryColumns} rows={formDataList.savingsSummary} showPagination={false} loading={tableLoading.projectSavings} />
                                </PGrid>
                            </PGrid>
                            <PGrid container className={Labels.margin.mb3}>
                                <PGrid item xs={12} sm={6} md={6} ></PGrid>
                                <PGrid item xs={12} sm={6} md={6} >
                                    {tableLoading.projectSavings ? (
                                        <Skeleton variant="rounded" height={220} />
                                    ) : (() => {
                                        // Savings summary card - PMG logo colours only
                                        const percent = Number(savings.totalSavingPercent) || 0;
                                        const positive = percent >= 0;
                                        const breakdown = savingsCalculation.slice(0, -1);
                                        const total = savingsCalculation[savingsCalculation.length - 1];
                                        return (
                                            <Box sx={{
                                                borderRadius: "12px", overflow: "hidden",
                                                bgcolor: "background.paper",
                                                border: `1px solid ${PmgColors.navy}1A`,
                                                boxShadow: `0 4px 16px ${PmgColors.navy}0F`,
                                                fontVariantNumeric: "tabular-nums"
                                            }}>
                                                {breakdown.map((row, index) => (
                                                    <Box key={row.label} sx={{
                                                        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2,
                                                        px: 3, py: 1.5,
                                                        bgcolor: index % 2 ? `${PmgColors.indigo}08` : "transparent",
                                                        borderBottom: `1px dashed ${PmgColors.navy}1F`
                                                    }}>
                                                        <span style={{ fontSize: 14, fontWeight: 500, color: PmgColors.indigo }}>{row.label}</span>
                                                        <span style={{ fontSize: 15, fontWeight: 700, color: PmgColors.navy }}>{row.value}</span>
                                                    </Box>
                                                ))}

                                                {/* highlighted Savings % row */}
                                                <Box sx={{
                                                    px: 3, py: 2,
                                                    background: `linear-gradient(90deg, ${PmgColors.navy} 0%, ${PmgColors.indigo} 100%)`,
                                                    borderLeft: `5px solid ${positive ? PmgColors.gold : PmgColors.red}`
                                                }}>
                                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
                                                        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "white" }}>
                                                            {total.label}
                                                        </span>
                                                        <span style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, whiteSpace: "nowrap", color: positive ? PmgColors.gold : PmgColors.red }}>
                                                            {total.value}
                                                        </span>
                                                    </Box>
                                                    {/* savings meter */}
                                                    <Box sx={{ mt: 1.5, height: 6, borderRadius: 3, bgcolor: `${PmgColors.gold}33`, overflow: "hidden" }}
                                                        role="meter" aria-label={total.label}
                                                        aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}
                                                    >
                                                        <Box sx={{
                                                            height: "100%", borderRadius: 3,
                                                            width: `${Math.min(Math.abs(percent), 100)}%`,
                                                            bgcolor: positive ? PmgColors.gold : PmgColors.red,
                                                            transition: "width 0.4s ease"
                                                        }} />
                                                    </Box>
                                                </Box>
                                            </Box>
                                        );
                                    })()}
                                </PGrid>
                            </PGrid>
                        </div>

                        {!formData.psFlag && (
                            <>
                                <div className={Labels.margin.mb5}
                                    style={{
                                        position: "relative",
                                        pointerEvents: tableLoading.projectSavings ? "none" : "auto",
                                        opacity: tableLoading.projectSavings ? 0.6 : 1,
                                    }}
                                >
                                    {tableLoading.projectSavings && (
                                        <CircularProgress size={24} sx={{ position: "absolute", top: "50%", left: "50%", zIndex: 1, }} />
                                    )}
                                    <PGrid container className="d-flex align-items-center justify-content-between mb-3">
                                        <PGrid item xs={12} sm={6} md={6}>
                                            <PTypography
                                                labelText={getLabel("lbl176")}
                                                flag={Labels.fontFlags.subHeader}
                                                color={CommonColors.black.main}
                                                weight={FontWeight.bold}
                                            />
                                            <div className="pt-1">
                                                <PTypography
                                                    labelText={getLabel("lbl177")}
                                                    flag={Labels.fontFlags.smallText}
                                                    weight={FontWeight.regular}
                                                />
                                            </div>
                                        </PGrid>
                                    </PGrid>
                                    <Divider sx={{ mb: 2 }} />
                                    {calculateProject.map((item, i) => (
                                        <Box
                                            key={i}
                                            sx={{
                                                mt: 3,
                                                mb: 3,
                                                width: "100%",
                                                maxWidth: 560,
                                                borderRadius: "12px",
                                                overflow: "hidden",
                                                backgroundColor: "#fff",
                                                border: "1px solid #ECE6F0",
                                                boxShadow: "0 4px 16px rgba(22, 19, 63, 0.06)",
                                                fontVariantNumeric: "tabular-nums"
                                            }}
                                        >
                                            {/* breakdown rows */}
                                            <Box sx={{ px: 3, py: 1 }}>
                                                {item.details.map((detail, index) => (
                                                    <Box
                                                        key={index}
                                                        sx={{
                                                            display: "flex",
                                                            justifyContent: "space-between",
                                                            alignItems: "center",
                                                            gap: 2,
                                                            py: 1.5,
                                                            borderBottom: index < item.details.length - 1 ? "1px dashed #E4DDE8" : "none"
                                                        }}
                                                    >
                                                        <span style={{ fontSize: 15, fontWeight: 500, color: "#5B5873" }}>
                                                            {detail.label}
                                                        </span>
                                                        <span style={{ fontSize: 15, fontWeight: 700, color: PmgColors.navy }}>
                                                            {detail.value}
                                                        </span>
                                                    </Box>
                                                ))}
                                            </Box>

                                            {/* highlighted total row */}
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    gap: 2,
                                                    px: 3,
                                                    py: 2,
                                                    background: `linear-gradient(90deg, ${PmgColors.navy} 0%, #2A2566 100%)`,
                                                    borderLeft: `5px solid ${PmgColors.orange}`
                                                }}
                                            >
                                                <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.06em", color: "#fff" }}>
                                                    {item.total.label}
                                                </span>
                                                <span style={{ fontSize: 22, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>
                                                    <span style={{ color: "#F3B27A", marginRight: 6, fontSize: 18 }}>{symbol}</span>
                                                    {item.total.value}
                                                </span>
                                            </Box>
                                        </Box>
                                    ))}
                                </div>
                                {[2, 3, 4, 5].includes(formData.statusId) && (
                                    <div className={Labels.margin.mb3}
                                        style={{
                                            position: "relative",
                                            pointerEvents: formData.statusId === 3 ? "none" : "auto",
                                            opacity: formData.statusId === 3 ? 0.6 : 1,
                                        }}
                                    >
                                        {tableLoading.submitQuotation && (
                                            <CircularProgress
                                                size={24}
                                                sx={{
                                                    position: "absolute",
                                                    top: "50%",
                                                    left: "50%",
                                                    zIndex: 1,
                                                }}
                                            />
                                        )}
                                        <PGrid container className="d-flex align-items-center justify-content-between mb-2">
                                            <PGrid item xs={12} sm={6} md={6}>
                                                <PTypography
                                                    labelText={getLabel("lbl238")}
                                                    flag={Labels.fontFlags.subHeader}
                                                    color={CommonColors.black.main}
                                                    weight={FontWeight.bold}
                                                />
                                                <div className="pt-1">
                                                    <PTypography
                                                        labelText={getLabel("lbl239")}
                                                        flag={Labels.fontFlags.smallText}
                                                        weight={FontWeight.regular}
                                                    />
                                                </div>
                                            </PGrid>
                                        </PGrid>
                                        {[0].includes(formData.isSpotCompleted) && (
                                            <PGrid container className={Labels.margin.mb3}>
                                                <PGrid item xs={12} sm={6} md={6}>
                                                    <PTypography
                                                        labelText={getLabel("lbl240")}
                                                        flag={Labels.fontFlags.smallText}
                                                        color={CommonColors.red.main}
                                                        weight={FontWeight.bold}
                                                    />
                                                </PGrid>
                                            </PGrid>
                                        )}

                                        <Divider sx={{ mb: 2 }} />
                                        {formData.sapVisible && (
                                            <PGrid container className={Labels.margin.mb3}>
                                                <PGrid item xs={12} sm={6} md={2} className={Labels.margin.mt3}>
                                                    <PTypography
                                                        labelText={`${getLabel("lbl241")} ${Labels.symbols.optional}`}
                                                        flag={Labels.fontFlags.normalText}
                                                        color={CommonColors.black.main}
                                                        weight={FontWeight.bold}
                                                    />
                                                </PGrid>
                                                <PGrid item xs={12} sm={6} md={2}>
                                                    <PDropdown
                                                        value={formData.sap}
                                                        onChange={(e) => setFormData((prev) => ({
                                                            ...prev,
                                                            sap: e.target.value
                                                        }))}
                                                        options={formDataList.yesOrNo}
                                                        width={Labels.fontSize.xxxxl}
                                                    />
                                                </PGrid>
                                            </PGrid>
                                        )}
                                        <PGrid item xs={12} sm={12} md={12} className="d-flex justify-content-end gap-2">
                                            <PButton
                                                label={getLabel("lbl242")}
                                                variant="outlined"
                                                onClick={(e) => handleQuotation(e, "")}
                                                width={250}
                                            />
                                            <PButton
                                                label={getLabel("lbl243")}
                                                variant="contained"
                                                color={CommonColors.dark_blue}
                                                onClick={(e) => handleQuotation(e, 3)}
                                                width={320}
                                                startIcon={<img src={arrow} alt="arrow" className="icon" />}
                                                disabled={formData.isSpotCompleted == 0}
                                            />
                                        </PGrid>
                                    </div>
                                )}

                                {[3, 4, 5].includes(formData.statusId) && (
                                    <div className={Labels.margin.mb3}>
                                        {tableLoading.approveQuotation && (
                                            <CircularProgress size={24} sx={{ position: "absolute", top: "50%", left: "50%", zIndex: 1, }} />
                                        )}
                                        <PGrid container className="d-flex align-items-center justify-content-between mb-3">
                                            <PGrid item xs={12} sm={6} md={6}>
                                                <PTypography
                                                    labelText={getLabel("lbl244")}
                                                    flag={Labels.fontFlags.normalText}
                                                    color={CommonColors.black.main}
                                                    weight={FontWeight.bold}
                                                />
                                            </PGrid>
                                        </PGrid>
                                        <Divider sx={{ mb: 2 }} />
                                        <PGrid item xs={12} sm={12} md={12} className="d-flex justify-content-end gap-2">
                                            <PButton
                                                label={getLabel("lbl245")}
                                                variant="outlined"
                                                onClick={(e) => handleQuotation(e, 6)}
                                                width={250}
                                            />
                                            <PButton
                                                label={getLabel("lbl246")}
                                                variant="contained"
                                                color={CommonColors.dark_blue}
                                                onClick={(e) => handleQuotation(e, 4)}
                                                width={300}
                                                startIcon={<img src={arrow} alt="arrow" className="icon" />}
                                            />
                                        </PGrid>
                                    </div>
                                )}

                            </>
                        )}
                    </>
                )}

                {formData.activeTab === "SLA" && (
                    <Box>
                        <PGrid container className={Labels.margin.mb3}>
                            <PGrid item xs={12} sm={6} md={6}>
                                <SectionHeading accent={PmgColors.purple} label={getLabel("lbl178")} />
                            </PGrid>
                            <PGrid item xs={12} sm={6} md={6} className="d-flex justify-content-end gap-2">
                                {renderActionButtons("sla")}
                            </PGrid>
                        </PGrid>
                        <Divider sx={{ mb: 2 }} />
                        <PSlaTemplate sla={formDataList?.enquiryDetails?.slaId} enquiryId={id} getLabel={getLabel} quoteStartDate={formDataList?.enquiryDetails?.quotestartdate} disabled={!formData.sla}
                            onChange={handleSlaChange} response={formDataList?.enquiryDetails}
                        />
                    </Box>
                )}

                {formData.activeTab === "Revised Quotes" && (
                    <div className={Labels.margin.mb0}>
                        <PGrid container className={Labels.margin.mb3}>
                            <SectionHeading accent={PmgColors.berry} label={getLabel("lbl179")} />
                        </PGrid>
                        <Divider sx={{ mb: 2 }} />
                        <PGrid container className={Labels.margin.mb4}>
                            <PGrid item xs={12} sm={6} md={12}>
                                <PTable columns={formDataList.revisedQuotesCloumns} rows={formDataList.revisedQuotes} showPagination={false} />
                            </PGrid>
                        </PGrid>
                    </div>
                )}

                {formData.activeTab === "Logs" && (
                    <div className={Labels.margin.mb0}>
                        <PGrid container className={Labels.margin.mb3}>
                            <SectionHeading accent={PmgColors.indigo} label={getLabel("lbl180")} />
                        </PGrid>
                        <Divider sx={{ mb: 2 }} />
                        <PGrid container className={Labels.margin.mb4}>
                            <PGrid item xs={12} sm={6} md={12}>
                                <PTable columns={formDataList.lineItemLogsCloumns} rows={formDataList.lineItemLogs} />
                            </PGrid>
                        </PGrid>

                        <PGrid container className={Labels.margin.mb3}>
                            <PTypography
                                labelText={getLabel("lbl181")}
                                flag={Labels.fontFlags.header}
                                weight={FontWeight.regular}
                            />
                        </PGrid>
                        <Divider sx={{ mb: 2 }} />
                        <PGrid container className={Labels.margin.mb4}>
                            <PGrid item xs={12} sm={6} md={12}>
                                <PTable columns={formDataList.historyLogsCloumns} rows={formDataList.historyLogs} />
                            </PGrid>
                        </PGrid>
                    </div>
                )}

                {formData.activeTab === "Attachment" && (
                    <div className={Labels.margin.mb0}>
                        <PGrid container className={Labels.margin.mb3}>
                            <SectionHeading accent={PmgColors.gold} label={getLabel("lbl182")} />
                        </PGrid>
                        <Divider sx={{ mb: 2 }} />
                        <PEnquiryAttachments enqId={id} userId={userID} />
                    </div>
                )}

                {formData.activeTab === "Project Quotation" && (
                    <PCard className={Labels.margin.mb3}>
                        <PProjectQuotation
                            title={getLabel("lbl247")}
                            subtitle={getLabel("lbl248")}
                            items={formDataList.projectClientQuotes}
                            totals={formDataList.clientQuotes}
                            symbol={symbol}
                            loading={loading}
                        />
                    </PCard>
                )}

                {formData.activeTab === "Your Quote Submissions" && (
                    <PCard className={Labels.margin.mb3}>
                        <PGrid container className={Labels.margin.mb4}>
                            <PGrid item xs={12} sm={6} md={6}>
                                <SectionHeading accent={PmgColors.purple} label={getLabel("lbl249")} />
                            </PGrid>
                        </PGrid>
                        <Divider sx={{ mb: 2 }} />

                        <PGrid container className={Labels.margin.mb4}>
                            <PGrid item xs={12} sm={6} md={12}>
                                <PTable columns={supplierQuotes} rows={formDataList.projectSupplierQuotes} showPagination={false} />
                            </PGrid>
                        </PGrid>
                        <PGrid container className={Labels.margin.mb4}>
                            <PGrid item xs={12} sm={12} md={12} className="d-flex justify-content-end gap-2">
                                <PButton
                                    label={getLabel("lbl250")}
                                    variant="outlined"
                                    color={CommonColors.grey.main}
                                    onClick={async (e) => {
                                        await handleSubmit(e, "quote")
                                        setFormData(prev => ({
                                            ...prev,
                                            isQuote: false,
                                            isSupplierCalculate: true
                                        }));
                                    }}
                                    width={180}
                                    disabled={formData.isSupplierCalculate}
                                />
                                <PButton
                                    label={getLabel("lbl251")}
                                    variant="contained"
                                    color={CommonColors.dark_blue}
                                    onClick={() =>
                                        setFormData(prev => ({
                                            ...prev,
                                            quoteFlag: true
                                        }))
                                    }
                                    width={250}
                                    startIcon={<img src={arrow} alt="arrow" className="icon" />}
                                    disabled={formData.isQuote}
                                />
                            </PGrid>
                        </PGrid>
                    </PCard>
                )}


                {/* Quote dialog */}
                <PDialog
                    open={formData.quoteFlag}
                    onClose={() => setFormData((prev) => ({
                        ...prev,
                        quoteFlag: false,
                    }))}
                    title={"Success"}
                    showCloseIcon={true}
                    maxWidth="sm"
                    actions={
                        < PGrid className="d-flex align-items-center justify-content-end gap-2" >
                            <PButton
                                fullWidth
                                label={"Close"}
                                variant="outlined"
                                onClick={() =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        quoteFlag: false,
                                        activeTab: "Job Summary"
                                    }))}
                                color={CommonColors.grey.main}
                                width={120}
                            />
                        </PGrid >
                    }

                >
                    <PGrid container className={Labels.margin.mb4}>
                        <PGrid item xs={12} sm={6} md={12}>
                            <PTypography
                                labelText={`${"Quote Sent Successfully"}`}
                                flag={Labels.fontFlags.errorLbl}
                                color={CommonColors.grey.main}
                                weight={FontWeight.light}
                            />
                        </PGrid>
                    </PGrid>
                </PDialog>

                {/* Status dialog */}
                <PDialog
                    open={formData.statusFlag}
                    onClose={() => setFormData((prev) => ({
                        ...prev,
                        statusFlag: false,
                    }))}
                    title={getLabel("lbl254")}
                    showCloseIcon={true}
                    maxWidth="sm"
                    actions={
                        < PGrid className="d-flex align-items-center justify-content-end gap-2" >
                            <PButton
                                fullWidth
                                label={getLabel("lbl125")}
                                variant="outlined"
                                onClick={() => setFormData((prev) => ({
                                    ...prev,
                                    statusFlag: false
                                }))}
                                color={CommonColors.grey.main}
                                width={120}
                            />
                            <PButton
                                fullWidth
                                label={getLabel("lbl252")}
                                variant={Labels.contained}
                                onClick={(e) => handleSubmit(e, "status")}
                                color={CommonColors.dark_blue}
                                width={120}
                                startIcon={<img src={arrow} alt="arrow" className="icon" />}
                            />
                        </PGrid >
                    }

                >
                    <PGrid container className={Labels.margin.mb4}>
                        <PGrid item xs={12} sm={6} md={12}>
                            <PTypography
                                labelText={`${getLabel("lbl255")} ${Labels.symbols.optional}`}
                                flag={Labels.fontFlags.errorLbl}
                                color={CommonColors.grey.main}
                                weight={FontWeight.light}
                            />
                        </PGrid>
                    </PGrid>
                </PDialog>

                {/* Survay dialog */}
                <PDialog
                    open={formData.email}
                    onClose={() => setFormData((prev) => ({
                        ...prev,
                        email: false,
                    }))}
                    title={getLabel("lbl268")}
                    showCloseIcon={true}
                    maxWidth="sm"
                    actions={
                        < PGrid className="d-flex align-items-center justify-content-end gap-2" >
                            <PButton
                                fullWidth
                                label={getLabel("lbl253")}
                                variant="outlined"
                                onClick={() => setFormData((prev) => ({
                                    ...prev,
                                    email: false
                                }))}
                                color={CommonColors.grey.main}
                                width={120}
                            />
                            <PButton
                                fullWidth
                                label={getLabel("lbl252")}
                                variant={Labels.contained}
                                onClick={(e) => handleSubmit(e, "email")}
                                color={CommonColors.dark_blue}
                                width={120}
                                startIcon={<img src={arrow} alt="arrow" className="icon" />}
                            />
                        </PGrid >
                    }

                >
                    <PGrid container className={Labels.margin.mb4}>
                        <PGrid item xs={12} sm={6} md={12}>
                            <PTypography
                                labelText={`${getLabel("lbl256")} ${Labels.symbols.optional}`}
                                flag={Labels.fontFlags.errorLbl}
                                color={CommonColors.grey.main}
                                weight={FontWeight.light}
                            />
                        </PGrid>
                    </PGrid>
                </PDialog>

                {/* Suppliers dialog */}
                <PDialog
                    open={formData.suppliers}
                    onClose={() => setFormData((prev) => ({
                        ...prev,
                        suppliers: false,
                        search: ""
                    }))}
                    title={getLabel("lbl23")}
                    showCloseIcon={true}
                    maxWidth="md"
                    actions={
                        < PGrid className="d-flex align-items-center justify-content-end gap-2" >
                            <PButton
                                fullWidth
                                label={getLabel("lbl125")}
                                variant="outlined"
                                onClick={() => setFormData((prev) => ({
                                    ...prev,
                                    suppliers: false
                                }))}
                                color={CommonColors.grey.main}
                                width={120}
                            />
                            <PButton
                                fullWidth
                                label={getLabel("lbl199")}
                                variant={Labels.contained}
                                onClick={handleSendChoose}
                                color={CommonColors.dark_blue}
                                width={290}
                                startIcon={<img src={arrow} alt="arrow" className="icon" />}
                            />
                        </PGrid >
                    }

                >
                    <PGrid container className={Labels.margin.mb4}>
                        <PGrid item xs={12} sm={6} md={6}>
                            <PSearch width="100%" placeholder={"Search a Suplier Name"}
                                onChange={(e) => setFormData((prev) => ({
                                    ...prev,
                                    search: e.target.value
                                }))} />
                        </PGrid>
                    </PGrid>
                    <PGrid item xs={12} sm={6} md={12}>
                        <PTable columns={formDataList.columns} rows={data} showCheckbox={true} selectedRows={formDataList.newSelectedRows || []} onValidationChange={handleValidationChange} />
                    </PGrid>
                </PDialog>

                {/* History Tool dialog */}
                {/* <PDialog
                    open={formData.historyTool}
                    onClose={() => setFormData((prev) => ({
                        ...prev,
                        historyTool: false,
                        historySearchTool: ""
                    }))}
                    title={getLabel("lbl257")}
                    showCloseIcon={true}
                    maxWidth="lg"
                    actions={
                        < PGrid className="d-flex align-items-center justify-content-end gap-2" >
                            <PButton
                                fullWidth
                                label={getLabel("lbl125")}
                                variant="outlined"
                                onClick={() => setFormData((prev) => ({
                                    ...prev,
                                    historyTool: false
                                }))}
                                color={CommonColors.grey.main}
                                width={120}
                            />
                            <PButton
                                fullWidth
                                label={getLabel("lbl200")}
                                variant={Labels.contained}
                                onClick={handleSendChoose}
                                color={CommonColors.green.main}
                                width={200}

                            />
                        </PGrid >
                    }

                >
                    <PGrid container className={Labels.margin.mb4}>
                        <PGrid item xs={12} sm={6} md={6}>
                            <PSearch width="100%" placeholder={"Search by EnquiryId, Material Used, PO Number, Qty, Brands, Sub category"}
                                onChange={(e) => setFormData((prev) => ({
                                    ...prev,
                                    historySearchTool: e.target.value
                                }))} />
                        </PGrid>
                    </PGrid>
                    <PGrid item xs={12} sm={6} md={12}>
                        <PTable columns={formDataList.historySearchesCloumns} rows={historyToolData} showCheckbox={true} onValidationChange={handleHistory} selectedRows={formDataList.selectedHistroyRows} />
                    </PGrid>
                </PDialog> */}

                {/* Preview Supplier Quotes dialog */}
                <PDialog
                    open={formData.preview}
                    onClose={() => setFormData((prev) => ({
                        ...prev,
                        preview: false,
                    }))}
                    title={getLabel("lbl237")}
                    showCloseIcon={true}
                    maxWidth="lg"
                >
                    <PGrid container className={Labels.margin.mb4}>
                        <PGrid item xs={12} sm={6} md={12}>
                            <PTable columns={formDataList.previewQuotes} rows={formDataList.previewSupplierQuotes} showPagination={false} />
                        </PGrid>
                    </PGrid>
                </PDialog>

                <style>
                    {`  
                        .peBoxWrapper{ margin-bottom:40px; max-width: 900px !important;}
                        .peBox-0 p:last-child{
                            font-size:48px;
                            line-height:52px;
                        }
                        @media only screen and (min-width:1500px){
                            .peBoxWrapper{ max-width: 1000px !important;}
                        }
                    `}
                </style>
            </Box >
        </>
    )
}
export default ProjectEnquiry;