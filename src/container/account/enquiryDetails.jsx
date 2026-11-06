import { Box } from "@mui/material";
import PTypography from "../../component/PTypography/PTypography";
import PGrid from "../../component/PGrid/PGrid";
import PDropdown from "../../component/PDropdown/PDropdown";
import { Labels } from "../../utils/constants/labels";
import { useState, useEffect, useCallback } from "react";
import { FontWeight } from "../../utils/constants/fonts";
import { CommonColors } from "../../utils/constants/colors";
import PButton from "../../component/PButton/PButton";
import PStepper from "../../component/PStepper/PStepper";
import PTextField from "../../component/PTextField/PTextField";
import PDatepicker from "../../component/PDatepicker/PDatepicker";
import { formatDate, getEnquirySteps, getOptionLabel, getOptionValue, isNotEmpty, isSuccess, parseDate, toast, notifyValidation } from "../../utils/commonFunction/common";
import { useLanguage } from "../../utils/constants/language";
import { labelRoutes } from "../../navigations/labelRoutes";
import { useNavigate, useLocation } from "react-router-dom";
import { Dashboard_API, EnquiryDetails_API } from "../../utils/api/apiUrl";
import { PostApi } from "../../utils/api/networking";
import { PDraftDialog } from "../../component/PDialog/PDraftDialog";
import { getClientInfo, getEnquiryDetails, getSummarySections } from "../../utils/constants/summary";
import PSlaTemplate from "../../component/PSlaTemplate/PSlaTemplate";
import { useSelector, useDispatch } from "react-redux";
import { userDetails } from "../../redux/actionType/actionType";
import arrow from "../../utils/assets/images/arrow_white.svg";
import PRadio from "../../component/PRadio/PRadio";
const EnquiryDetails = () => {
    //
    const { getLabel } = useLanguage();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { countryID, role, fkID, menuId, userID, id } = useSelector((state) => state.userDetails.user);
    const enquirySteps = getEnquirySteps(getLabel, menuId);
    const [allowRedirect, setAllowRedirect] = useState(false);
    const [loading, setLoading] = useState(true);
    const [dynamicData, setDynamicData] = useState({});
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        projectNo: "",
        estdeliveryDate: "",
        briefReceivedDate: "",
        projectDescription: "",
        projectQuoteType: "",
        year: "",
        managementFeeType: "",
        hybrid: "",
        projectAttribute: "",
        slaTemplate: "",

        startDate: "",
        startTime: "",
        duration: "",
        endDate: ""
    });

    // Single state for all errors
    const [errors, setErrors] = useState({
        projectNo: "",
        estdeliveryDate: "",
        briefReceivedDate: "",
        projectDescription: "",
        projectQuoteType: "",
        year: "",
        managementFeeType: "",
        hybrid: "",
        projectAttribute: "",
        slaTemplate: "",

        startDate: "",
        startTime: "",
        duration: "",
    });

    const [formDataList, setFormDataList] = useState({
        managementFeeType: [],
        projectAttribute: [],
        year: [],
        slaTemplate: [],
        quoteType: [{ label: "Quote By Total Price", value: 1 }, { label: "Quote By Unit Price", value: 2 }],
        hybird: [{ label: "Yes", value: 1 }, { label: "No", value: 2, selected: true }],
        duration: [{ label: "15 mins", value: 1, selected: true }, { label: "30 mins", value: 2 }, { label: "1 hour", value: 3 }],

        clientInfo: [],
        enquiryDetails: []
    });

    

    const startTime = Array.from({ length: 48 }, (_, index) => {
        const hours = Math.floor(index / 2);
        const minutes = index % 2 === 0 ? "00" : "30";
        const period = hours < 12 ? "AM" : "PM";
        const displayHour = hours % 12 === 0 ? 12 : hours % 12;
        return {
            value: index + 1,
            label: `${String(displayHour).padStart(2, "0")}:${minutes} ${period}`,
        };
    });

    const setDefaultDateTime = () => {
        const now = new Date();
        const start = new Date(now);
        const minutes = start.getMinutes();
        if (minutes <= 30) {
            start.setMinutes(30, 0, 0);
        } else {
            start.setHours(start.getHours() + 1);
            start.setMinutes(30, 0, 0);
        }
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + 15);
        const formatDate = date =>
            `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

        const formatTime = date => {
            const hours = date.getHours();
            return `${String(hours % 12 || 12).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
        };

        const currentTime = formatTime(start);
        const data = getOptionValue(startTime, currentTime);
        setFormData(prev => ({
            ...prev,
            startDate: formatDate(start),
            startTime: data,
            duration: 1,
            endDate: `${formatDate(end)} ${formatTime(end)}`
        }));
    };


    useEffect(() => {
        fetchData();
        setDefaultDateTime();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await PostApi(Dashboard_API.Master, {
                userCountryId: countryID,
                role: role,
                userId: userID
            });
            setFormDataList(prev => ({
                ...prev,
                managementFeeType: response.managementFeetype,
                projectAttribute: response.projectAttribute,
                year: response.year,
                slaTemplate: response.sla
            }));
            if (id !== 0) {
                await GetData(response);
            }
        } catch (error) {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        } finally {
            setLoading(false);
        }
    };

    const GetData = async (response) => {
        try {
            if (id !== 0) {
                const data = await PostApi(Dashboard_API.GetDetails, {
                    Enquiryid: id,
                });
                setFormDataList(prev => ({
                    ...prev,
                    clientInfo: data.enqClientinfo,
                    enquiryDetails: data.enqProjectinfo
                }))
                // Update state
                const projectQuoteType = formDataList.quoteType.find(item => item.label === data.enqProjectinfo.projectQuotetype)?.value;
                setFormData(prev => ({
                    ...prev,
                    projectNo: data.enqProjectinfo.projectNo,
                    estdeliveryDate: data.enqProjectinfo.estdate,
                    briefReceivedDate: data.enqProjectinfo.briefdate,
                    projectDescription: data.enqProjectinfo.projectDesc,
                    projectQuoteType: projectQuoteType,
                    year: getOptionValue(response.year, data.enqProjectinfo.year),
                    managementFeeType: data.enqProjectinfo.managementfeetypeId ?? 8,
                    hybrid: getOptionValue(formDataList.hybird, data.enqProjectinfo.hybridModel) || 2,
                    projectAttribute: getOptionValue(response.projectAttribute, data.enqProjectinfo.attribute),
                    slaTemplate: data.enqProjectinfo.slaId ?? 22,
                }));
                dispatch({
                    type: userDetails,
                    payload: {
                        enquiryId: data?.enqClientinfo?.enqUId, 
                    },
                });
            }
        } catch (error) {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, label } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
        setErrors((prev) => ({
            ...prev,
            [name]: ""   // clear only that field error
        }));
    };

    const handleSubmit = async (e, flag) => {
        const isValid = EnquiryDetailsValidation();
        if (isValid) {
            try {
                setLoading(true);
                const response = await PostApi(EnquiryDetails_API.AddUpdateEnquiryDetails, {
                    enqId: id,
                    projectNo: formData.projectNo,
                    projectDesc: formData.projectDescription,
                    estdate: formatDate(parseDate(formData.estdeliveryDate)),
                    briefdate: formatDate(parseDate(formData.briefReceivedDate)),
                    modifiedBy: fkID,
                    quoteBy: formData.projectQuoteType,
                    slaId: formData.slaTemplate,
                    managementfeetypeId: formData.managementFeeType,
                    hybridModel: formData.hybrid == 1 ? "Yes" : "No",
                    attribute: getOptionLabel(formDataList.projectAttribute, formData.projectAttribute),
                    year: getOptionLabel(formDataList.year, formData.year),
                    ...dynamicData
                });
                if (isSuccess(response)) {
                    setAllowRedirect(true);
                    toast(Labels.status.success, response.data.message);
                    // keep the button spinner until we leave the page
                    await new Promise((r) => setTimeout(r, 500));
                    navigate(flag ? labelRoutes.lineItems : labelRoutes.dashboard);
                } else {
                    setErrors((prev) => ({
                        ...prev,
                        name: ""
                    }));
                    toast(Labels.status.failure, response.data.message);
                }

            } catch (error) {
                toast(Labels.status.failure, Labels.message.somethingWentWrong);
            } finally {
                setLoading(false);
            }
        } else {
            setAllowRedirect(false);
        }
    };

    const EnquiryDetailsValidation = () => {
        const requiredFields = [
            Labels.enquiryDetails.projectNo,
            Labels.enquiryDetails.projectDescription,
            Labels.enquiryDetails.briefReceivedDate,
            Labels.enquiryDetails.estdeliveryDate,
            Labels.enquiryDetails.year,
            Labels.enquiryDetails.managementFeeType,
            Labels.enquiryDetails.hybrid,
            //Labels.enquiryDetails.projectAttribute,
            Labels.enquiryDetails.slaTemplate,
            Labels.enquiryDetails.projectQuoteType,

            ...(menuId == 2 ? [Labels.enquiryDetails.startDate] : []),
            ...(menuId == 2 ? [Labels.enquiryDetails.startTime] : []),
            ...(menuId == 2 ? [Labels.enquiryDetails.duration] : []),
        ];

        let newErrors = {};

        requiredFields.forEach((field) => {
            if (!formData[field]) {
                newErrors[field] = Labels.commonLabel.required;
            }
        });

        setErrors(newErrors);
        notifyValidation(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(labelRoutes.clientInfo);
        } else {
            navigate(labelRoutes.home); // fallback route
        }
    };

    const handleExitDraft = () => {
        setOpen(true);
    };

    const handleSlaChange = useCallback((data) => {
        setDynamicData(prev => {
            if (JSON.stringify(prev) === JSON.stringify(data)) {
                return prev;
            }
            return data;
        });
    }, []);

    const today = formatDate(new Date());
    const clientInfo = getClientInfo({}, {}, {}, getLabel, getOptionLabel, formDataList.clientInfo);
    const enquiryDetails = getEnquiryDetails(formData, dynamicData, formDataList, getLabel, getOptionLabel, id ? formDataList.enquiryDetails : null);
    const sections = getSummarySections({ menuId, clientInfo, enquiryDetails, getLabel });
    return (
        <>
            <Box sx={{ py: 3 }}>
                <PGrid container className={Labels.margin.mb3} >
                    <PStepper steps={enquirySteps} activeStep={1} allowRedirect={allowRedirect}></PStepper>
                </PGrid>
                <PGrid container className={Labels.margin.mb4} >
                    <PGrid item xs={12} sm={12} md={12}>
                        {/* <PCard> */}

                        <div style={{ background: "#991D52", width: "36px", height: "11px" }}></div>
                        <PGrid container className={Labels.margin.mb4}>
                            <PTypography
                                labelText={getLabel("lbl21")}
                                flag={Labels.fontFlags.header}
                                color={CommonColors.primary}
                                weight={FontWeight.regular}
                            />
                            <PTypography
                                labelText={getLabel("lbl41")}
                                flag={Labels.fontFlags.normalText}
                                color={CommonColors.primary}
                                weight={FontWeight.regular}
                            />
                        </PGrid>
                        <PGrid container className={Labels.margin.mb4}>
                            <PGrid item xs={12} sm={6} md={4}>
                                <PTextField
                                    name={Labels.enquiryDetails.projectNo}
                                    label={`${getLabel("lbl42")}${Labels.symbols.required}`}
                                    value={formData.projectNo}
                                    onChange={handleChange}
                                    helperText={errors?.projectNo}
                                    flag={Labels.flag.auto}
                                    sx={{ mb: 3 }}
                                />
                                <PDatepicker
                                    name={Labels.enquiryDetails.estdeliveryDate}
                                    label={`${getLabel("lbl43")}${Labels.symbols.required}`}
                                    value={formData.estdeliveryDate}
                                    onChange={handleChange}
                                    helperText={errors?.estdeliveryDate}
                                    width={100}
                                    allowFuture={true}
                                    minDate={today}
                                />
                            </PGrid>
                            <PGrid item xs={12} sm={6} md={8}>
                                <PTextField
                                    name={Labels.enquiryDetails.projectDescription}
                                    label={`${getLabel("lbl45")}${Labels.symbols.required}`}
                                    value={formData.projectDescription}
                                    onChange={handleChange}
                                    helperText={errors?.projectDescription}
                                    multiline={true}
                                    rows={5.5}
                                />
                            </PGrid>
                        </PGrid>
                        <PGrid container className={Labels.margin.mb4}>
                            <PGrid item xs={12} sm={6} md={4}>
                                <PDatepicker
                                    name={Labels.enquiryDetails.briefReceivedDate}
                                    label={`${getLabel("lbl44")}${Labels.symbols.required}`}
                                    value={formData.briefReceivedDate}
                                    onChange={handleChange}
                                    helperText={errors?.briefReceivedDate}
                                    width={100}
                                    allowFuture={true}
                                    maxDate={formData.estdeliveryDate}
                                />
                            </PGrid>
                            <PGrid item xs={12} sm={6} md={4}>
                                <PRadio
                                    name={Labels.enquiryDetails.projectQuoteType}
                                    label={`${getLabel("lbl46")}${Labels.symbols.required}`}
                                    options={formDataList.quoteType}
                                    onChange={handleChange}
                                    value={formData.projectQuoteType}
                                    helperText={errors?.projectQuoteType}
                                    xs={{ fontSize: "16px" }}
                                />
                            </PGrid>

                            <PGrid item xs={12} sm={6} md={4}>
                                <PDropdown
                                    name={Labels.enquiryDetails.year}
                                    label={`${getLabel("lbl47")}${Labels.symbols.required}`}
                                    value={formData.year}
                                    onChange={handleChange}
                                    helperText={errors?.year}
                                    options={formDataList.year}
                                    flag={Labels.flag.auto}
                                />
                            </PGrid>
                        </PGrid>
                        <PGrid container className={Labels.margin.mb4}>
                            <PGrid item xs={12} sm={6} md={4}>
                                <PDropdown
                                    name={Labels.enquiryDetails.managementFeeType}
                                    label={`${getLabel("lbl93")}${Labels.symbols.required}`}
                                    value={formData.managementFeeType}
                                    onChange={handleChange}
                                    helperText={errors?.managementFeeType}
                                    options={formDataList.managementFeeType}
                                    flag={Labels.flag.auto}
                                />
                            </PGrid>
                            <PGrid item xs={12} sm={6} md={4}>
                                <PDropdown
                                    name={Labels.enquiryDetails.hybrid}
                                    label={`${getLabel("lbl94")}${Labels.symbols.required}`}
                                    value={formData.hybrid}
                                    onChange={handleChange}
                                    helperText={errors?.hybrid}
                                    options={formDataList.hybird}
                                    disabled={true}
                                    flag={Labels.flag.auto}
                                />
                            </PGrid>
                            {/* <PGrid item xs={12} sm={6} md={4}>
                                <PDropdown
                                    name={Labels.enquiryDetails.projectAttribute}
                                    label={`${getLabel("lbl95")} ${Labels.symbols.required}`}
                                    value={formData.projectAttribute}
                                    onChange={handleChange}
                                    helperText={errors?.projectAttribute}
                                    options={formDataList.projectAttribute}
                                    width={100}
                                    flag={Labels.flag.auto}
                                />
                            </PGrid> */}
                        </PGrid>
                        {[2].includes(menuId) && (
                            <>
                                <hr className="my-4" />
                                <PGrid container className={Labels.margin.mb4}>
                                    <PTypography
                                        labelText={getLabel("lbl225")}
                                        flag={Labels.fontFlags.subHeader}
                                        color={CommonColors.blue.main}
                                        weight={FontWeight.bold}
                                    />
                                    <PTypography
                                        labelText={getLabel("lbl226")}
                                        flag={Labels.fontFlags.smallText}
                                        color={CommonColors.grey.main}
                                        weight={FontWeight.bold}
                                    />
                                </PGrid>
                                <PGrid container className={Labels.margin.mb3}>
                                    <PGrid item xs={12} sm={6} md={4}>
                                        <PDatepicker
                                            name={Labels.enquiryDetails.startDate}
                                            label={`${getLabel("lbl52")} ${Labels.symbols.required}`}
                                            value={formData.startDate}
                                            onChange={handleChange}
                                            helperText={errors?.startDate}
                                            width={100}
                                            allowFuture={true}
                                            minDate={today}
                                        />
                                    </PGrid>
                                    <PGrid item xs={12} sm={6} md={3}>
                                        <PDropdown
                                            name={Labels.enquiryDetails.startTime}
                                            label={`${getLabel("lbl228")} ${Labels.symbols.required}`}
                                            value={formData.startTime}
                                            onChange={handleChange}
                                            helperText={errors?.startTime}
                                            options={startTime}
                                            disabled={true}
                                            flag={Labels.flag.auto}
                                        />
                                    </PGrid>
                                    <PGrid item xs={12} sm={6} md={3}>
                                        <PDropdown
                                            name={Labels.enquiryDetails.duration}
                                            label={`${getLabel("lbl229")} ${Labels.symbols.required}`}
                                            value={formData.duration}
                                            onChange={handleChange}
                                            helperText={errors?.duration}
                                            options={formDataList.duration}
                                            disabled={true}
                                        />
                                    </PGrid>
                                    <PGrid item xs={12} sm={6} md={2}>
                                        <PTypography
                                            labelText={getLabel("lbl230")}
                                            weight={FontWeight.bold}
                                        />
                                        <PTypography
                                            labelText={formData.endDate}
                                            color={CommonColors.grey.main}
                                            weight={FontWeight.semiBold}
                                        />
                                    </PGrid>
                                </PGrid>
                            </>
                        )}

                        <hr className="my-4" />
                        <PGrid container className={Labels.margin.mb4}>
                            <PTypography
                                labelText={getLabel("lbl48")}
                                flag={Labels.fontFlags.subHeader}
                                color={CommonColors.primary}
                                weight={FontWeight.bold}
                            />
                        </PGrid>
                        <PGrid container className={Labels.margin.mb4}>
                            <PGrid item xs={12} sm={12} md={4}>
                                <PDropdown
                                    name={Labels.enquiryDetails.slaTemplate}
                                    label={`${getLabel("lbl49")}${Labels.symbols.required}`}
                                    value={formData.slaTemplate}
                                    onChange={handleChange}
                                    helperText={errors?.slaTemplate}
                                    options={formDataList.slaTemplate}
                                    width={100}
                                    flag={Labels.flag.auto}
                                />
                            </PGrid>

                        </PGrid>

                        <PSlaTemplate sla={formData.slaTemplate} enquiryId={id} getLabel={getLabel}
                            quoteStartDate={formDataList?.enquiryDetails?.quotestartdate}
                            onChange={handleSlaChange} response={formDataList?.enquiryDetails}
                        />

                        <hr className="my-4" />
                        <PGrid container className="d-flex align-items-center justify-content-between">
                            <PGrid item xs={12} sm={6} md={8}>
                                <PButton
                                    label={getLabel("lbl37")}
                                    variant="outlined"
                                    onClick={(e) => handleExitDraft(e)}
                                    width={200}
                                />
                            </PGrid>
                            <PGrid
                                item
                                xs={12}
                                sm={6}
                                md={4}
                                className="d-flex justify-content-end gap-2"
                            >
                                <PButton
                                    label={getLabel("lbl38")}
                                    variant="outlined"
                                    onClick={(e) => handleBack(e)}
                                    width={180}
                                />

                                <PButton
                                    label={getLabel("lbl39")}
                                    variant="contained"
                                    color={CommonColors.dark_blue}
                                    onClick={(e) => handleSubmit(e, true)}
                                    width={180}
                                    startIcon={<img src={arrow} alt="arrow" className="icon" />}
                                />
                            </PGrid>

                        </PGrid>
                        {/* </PCard> */}
                    </PGrid>
                    {/* <PGrid item xs={12} sm={12} md={3}>
                    <PSummary sections={sections} currentStep={2} />
                </PGrid> */}
                </PGrid>
            </Box>

            <PDraftDialog
                open={open}
                onClose={() => setOpen(false)}
                onSave={handleSubmit}
                onDelete={handleSubmit}
            />
        </>

    );
};

export default EnquiryDetails;