import { Box, Tooltip, IconButton, Typography } from "@mui/material";
import PTypography from "../../component/PTypography/PTypography";
import PGrid from "../../component/PGrid/PGrid";
import PDropdown from "../../component/PDropdown/PDropdown";
import { Labels } from "../../utils/constants/labels";
import React, { useState, useEffect } from "react";
import { FontWeight } from "../../utils/constants/fonts";
// import PCard from "../../component/PCard/PCard";
import { CommonColors } from "../../utils/constants/colors";
import PButton from "../../component/PButton/PButton";
import PStepper from "../../component/PStepper/PStepper";
import { allowOnlyNumbers, getEnquirySteps, getOptionLabel, getOptionValue, isNotEmpty, isSuccess, toast } from "../../utils/commonFunction/common"
import AddIcon from "@mui/icons-material/Add"
import { useLanguage } from "../../utils/constants/language";
import { labelRoutes } from "../../navigations/labelRoutes";
import { useNavigate, useLocation } from "react-router-dom";
import { ClientInfo_API, Dashboard_API } from "../../utils/api/apiUrl";
import { PostApi } from "../../utils/api/networking";
import PDialog from "../../component/PDialog/PDialog";
import PTextField from "../../component/PTextField/PTextField";
import { PDraftDialog } from "../../component/PDialog/PDraftDialog";
import { PSummary } from "../../component/PSummary/PSummary";
import { getClientInfo, getSummarySections } from "../../utils/constants/summary";
import PRadio from "../../component/PRadio/PRadio";
import arrow from "../../utils/assets/images/arrow_white.svg";
import { useSelector } from "react-redux";

const ClientInfo = () => {
    const { state } = useLocation();
    const { getLabel } = useLanguage();
    const { countryID, userID, fkID, role, menuId, country } = useSelector((state) => state.userDetails.user);
    const navigate = useNavigate();
    const enquirySteps = getEnquirySteps(getLabel, menuId);
    const [allowRedirect, setAllowRedirect] = useState(false);
    const [loading, setLoading] = useState(true);
    const [ccOpenFilter, setCcOpenFilter] = useState(false);
    const [brandOpenFilter, setBrandOpenFilter] = useState(false);
    const [open, setOpen] = useState(false);
    const [disable, setDisable] = useState(true);
    const [type, setType] = useState("");
    const [openSummary, setOpenSummary] = useState(true);
    const [formData, setFormData] = useState({
        division: "",
        brand: "",
        deliveryCountry: "",
        clientContact: "",
        pmgEntity: "",
        aboveAtMarket: "",
        globalBUMapping: "",

        firstName: "",
        lastName: "",
        logonID: "",
        jobTitle: "",
        email: "",
        phone: "",
        receiveNotification: "",
        jobRole: "",
        brandName: "",

        reason: "",
        remarks: ""
    });

    const [fields, setFieldsData] = useState({
        clientName: "",
        country: "",
        entityName: "",
        businessUnit: "",
        globalBUMapping: "",
        countryCode: "",
        clientCode: "",
        channel: "",
    });

    // Single state for all errors
    const [errors, setErrors] = useState({
        division: "",
        brand: "",
        deliveryCountry: "",
        clientContact: "",
        pmgEntity: "",
        aboveAtMarket: "",
        globalBUMapping: "",

        firstName: "",
        logonID: "",
        email: "",
        receiveNotification: "",
        jobRole: "",
        brandName: "",

        remarks: ""
    });

    const [formDataList, setFormDataList] = useState({
        division: [],
        brand: [],
        deliveryCountry: [],
        clientContact: [],
        pmgEntity: [],
        aboveAtMarket: [{ label: "Above", value: 1 }, { label: "At Market", value: 2 }],
        globalBUMapping: [],

        receiveNotification: [{ label: "Yes", value: 1 }, { label: "No", value: 2 }],
        jobRole: [{ label: "Procurement", value: 1 }, { label: "Marketing & Sales", value: 2 }, { label: "Team Lead", value: 3 }, { label: "Reg_Proc_PBI", value: 4 }, { label: "Others", value: 5 }],

        reason: [{ label: "Entry is stale/expired", value: 1 }, { label: "Wrongly input", value: 2 }, { label: "Others", value: 3 }],

        clientInfo: []
    });


    const flag = isNotEmpty(state?.id) && state?.id !== 0 ? Labels.flag.Update : Labels.flag.Insert;
    const id = state?.id > 0 ? state.id : 0;

    const clientInfo = getClientInfo(fields, formData, formDataList, getLabel, getOptionLabel, id ? formDataList.clientInfo : null);
    const sections = getSummarySections({ menuId, clientInfo, getLabel });

    const GlobalBuMappingMaster = async (division) => {
        try {
            setLoading(true);
            const response = await PostApi(ClientInfo_API.ClientInfoMaster, {
                Divisionid: division,
                country: country
            });
            setFormDataList(prev => ({
                ...prev,
                brand: response.brands,
                clientContact: response.client,
                globalBUMapping: response.division,
            }));

        } catch (error) {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        } finally {
            setLoading(false);
        }
    };

    const ClientInfoMaster = async (globalBUMapping) => {
        try {
            setLoading(true);
            const response = await PostApi(ClientInfo_API.ClientInfoMaster, {
                Divisionid: globalBUMapping,
                country: country
            });
            setFormDataList(prev => ({
                ...prev,
                brand: response.brands,
                clientContact: response.client,
            }));

        } catch (error) {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
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
                division: response.division,
                pmgEntity: response.country,
                deliveryCountry: response.country,
            }));
            setFormData(prev => ({
                ...prev,
                pmgEntity: role === Labels.role.admin ? 0 : countryID,
                deliveryCountry: countryID,
            }));
            if (id !== 0) {
                const data = await PostApi(Dashboard_API.GetDetails, {
                    Enquiryid: id,
                });
                setFormDataList(prev => ({
                    ...prev,
                    clientInfo: data.enqClientinfo
                }))

                const aboveAtMarket = formDataList.aboveAtMarket.find(item => item.label === data.enqClientinfo.aboveorAtmarket)?.value;
                // Update state
                setFormData(prev => ({
                    ...prev,
                    division: data.enqClientinfo.divisionid, //getOptionValue(response.division, data.enqClientinfo.divisionname),
                    globalBUMapping: data.enqClientinfo.divisionid,
                    clientContact: data.enqClientinfo.clientContactId,
                    pmgEntity: data.enqClientinfo.pmgEntity,
                    deliveryCountry: data.enqClientinfo.deliveryCountryId,
                    aboveAtMarket: aboveAtMarket,
                }));
            }

        } catch (error) {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (formDataList.brand?.length && formDataList.clientInfo.brand) {
            const brandId = getOptionValue(formDataList.brand, formDataList.clientInfo.brand);
            setFormData(prev => ({
                ...prev,
                brand: brandId,
            }));
        }
    }, [formDataList.brand]);

    useEffect(() => {
        if (formData.division) {
            const divisionLabel = getOptionLabel(formDataList.division, formData.division);
            handleDivisionSelection(formData.division, divisionLabel);
        }
    }, [formData.division, formDataList.division]);

    const handleChange = async (e) => {
        const { name, value, label } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));

        // Clear errors
        setErrors((prev) => ({
            ...prev,
            [name]: ""
        }));

        // Division logic
        if (name === Labels.clientInfo.division) {
            handleDivisionSelection(value, label);
        }

        if (name == Labels.clientInfo.globalBUMapping) {
            ClientInfoMaster(value);
            setDisable(false);
        }

        if (name === Labels.clientInfo.logonID) {
            await GetCheckUserName(value);
        }
    };

    const GetCheckUserName = async (value) => {
        let timeoutId;
        clearTimeout(timeoutId);
        if (!value || value.trim() === "") {
            setErrors((prev) => ({
                ...prev,
                logonID: ""
            }));
            return;
        }
        timeoutId = setTimeout(async () => {
            try {
                setLoading(true);

                const response = await PostApi(ClientInfo_API.CheckforUsername, {
                    Username: value,
                });

                if (isSuccess(response)) {
                    setErrors((prev) => ({
                        ...prev,
                        logonID: "",
                    }));
                } else {
                    setErrors((prev) => ({
                        ...prev,
                        logonID: response?.data,
                    }));
                }

            } catch (error) {
                toast(Labels.status.failure, Labels.message.somethingWentWrong);
            } finally {
                setLoading(false);
            }
        }, 300); // waits 500ms after typing stops
    }

    const handleDivisionSelection = (divisionId, division) => {
        if (!divisionId) return;
        const parts = division.split(">").map(v => v.trim());
        const keys = Object.keys(fields);
        setFieldsData(prev => {
            const data = { ...prev };
            keys.forEach((key, index) => {
                data[key] = parts[index] || " - ";
            });
            return data;
        });
        GlobalBuMappingMaster(divisionId);
    };

    const handleSubmit = async (e, submit) => {
        const isValid = ClientInfoValidation();
        if (isValid) {
            try {
                setLoading(true);
                const response = await PostApi(ClientInfo_API.AddUpdateClientInfo, {
                    divisionid: formData.globalBUMapping, //formData.division,
                    clientContactId: formData.clientContact,
                    createdBy: userID,
                    modifiedBy: fkID,
                    brand: getOptionLabel(formDataList.brand, formData.brand),
                    deliveryCountryId: formData.deliveryCountry,
                    pMGEntity: formData.pmgEntity,
                    aboveorAtmarket: getOptionLabel(formDataList.aboveAtMarket, formData.aboveAtMarket),
                    Action: flag,
                    Enqid: id,
                    menuId: menuId
                });
                if (isSuccess(response)) {
                    setAllowRedirect(true);
                    toast(Labels.status.success, response.data.message);
                    setTimeout(() => {
                        navigate(submit ? labelRoutes.enquiryDetails : labelRoutes.dashboard, {
                            state: { id: response.data.enqId }
                        });
                    }, 500);
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

    const ClientInfoValidation = () => {
        const requiredFields = [
            Labels.clientInfo.division,
            Labels.clientInfo.brand,
            Labels.clientInfo.deliveryCountry,
            Labels.clientInfo.clientContact,
            Labels.clientInfo.pmgEntity,
            Labels.clientInfo.aboveAtMarket,
            Labels.clientInfo.globalBUMapping,
        ];

        let newErrors = {};

        requiredFields.forEach((field) => {
            if (!formData[field]) {
                newErrors[field] = Labels.commonLabel.required;
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const NewClientContantValidation = () => {
        const requiredFields = [
            Labels.clientInfo.firstName,
            Labels.clientInfo.email,
            Labels.clientInfo.jobRole,
            Labels.clientInfo.receiveNotification,
            Labels.clientInfo.logonID,
        ];
        let newErrors = {};
        requiredFields.forEach((field) => {
            if (!formData[field]) {
                newErrors[field] = Labels.commonLabel.required;
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const NewBrandValidation = () => {
        const requiredFields = [
            Labels.clientInfo.brandName,
        ];
        let newErrors = {};
        requiredFields.forEach((field) => {
            if (!formData[field]) {
                newErrors[field] = Labels.commonLabel.required;
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCloseChoose = () => {
        setCcOpenFilter(false);
        setBrandOpenFilter(false);
        // setSaveDraft(false);
        //setDeleteDraft(false);
        setFormData((prev) => ({
            ...prev,
            firstName: "",
            lastName: "",
            logonID: "",
            jobTitle: "",
            email: "",
            phone: "",
            receiveNotification: "",
            jobRole: "",
            brandName: ""
        }));
        setErrors((prev) => ({
            ...prev,
            firstName: "",
            logonID: "",
            email: "",
            receiveNotification: "",
            jobRole: "",
            brandName: ""
        }));
    };

    const handleSendChoose = async () => {
        if (type === "Contant") {
            const isValid = NewClientContantValidation();
            if (isValid) {
                try {
                    setLoading(true);
                    const response = await PostApi(ClientInfo_API.AddUpdateClientContant, {
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        logonid: formData.logonID,
                        jobtitle: formData.jobTitle,
                        email: formData.email,
                        phone: formData.phone,
                        jobposition: getOptionLabel(formDataList.jobRole, formData.jobRole),
                        receivenotification: formData.receiveNotification == 1 ? true : false,
                        divisionid: formData.globalBUMapping //formData.division
                    });
                    if (isSuccess(response)) {
                        setCcOpenFilter(false);
                        toast(Labels.status.success, response.data);
                        ClientInfoMaster(formData.globalBUMapping);
                    } else {
                        setErrors((prev) => ({
                            ...prev,
                            name: ""
                        }));
                        setCcOpenFilter(true);
                        toast(Labels.status.failure, response.data);
                    }

                } catch (error) {
                    toast(Labels.status.failure, Labels.message.somethingWentWrong);
                } finally {
                    setLoading(false);
                }
            }
        } else {
            const isValid = NewBrandValidation();
            if (isValid) {
                try {
                    setLoading(true);
                    const response = await PostApi(ClientInfo_API.AddUpdateBrand, {
                        brand: formData.brandName,
                        Divisionid: formData.globalBUMapping //formData.division
                    });
                    if (isSuccess(response)) {
                        setBrandOpenFilter(false);
                        toast(Labels.status.success, response.data);
                        ClientInfoMaster(formData.division);
                    } else {
                        setErrors((prev) => ({
                            ...prev,
                            name: ""
                        }));
                        setBrandOpenFilter(true);
                        toast(Labels.status.failure, response.data);
                    }
                } catch (error) {
                    toast(Labels.status.failure, Labels.message.somethingWentWrong);
                } finally {
                    setLoading(false);
                }
            }
        }
    };

    const handleOpenChoose = (e, name) => {
        setType(name);
        if (name === "Contant") {
            setCcOpenFilter(true);
        } else {
            setBrandOpenFilter(true);
        }
    };

    // const handleBack = () => {
    //     if (window.history.length > 1) {
    //         navigate(labelRoutes.dashboard);
    //     } else {
    //         navigate(labelRoutes.home); // fallback route
    //     }
    // };

    const handleExitDraft = () => {
        setOpen(true);
    };

    return (
        <>

            <Box sx={{ py: 3 }}>
                <PGrid container className={Labels.margin.mb3} >
                    <PStepper steps={enquirySteps} activeStep={0} allowRedirect={allowRedirect}></PStepper>
                </PGrid>
                <PGrid container className={`${Labels.margin.mb3} ${ccOpenFilter || brandOpenFilter ? "pe-none opacity-50" : ""}`}>
                    <PGrid item xs={12} sm={12} md={12}>
                        {/* <PCard> */}
                        <div style={{ background: "#ED3B25", width: "36px", height: "11px" }}></div>
                        <PGrid container className={Labels.margin.mb4}>
                            <PTypography
                                labelText={getLabel("lbl25")}
                                flag={Labels.fontFlags.header}
                                color={CommonColors.primary}
                                weight={FontWeight.regular}
                            />
                            <PTypography
                                labelText={getLabel("lbl26")}
                                flag={Labels.fontFlags.normalText}
                                color={CommonColors.primary}
                                weight={FontWeight.regular}
                            />
                        </PGrid>

                        <PGrid container className={Labels.margin.mb4}>
                            <PGrid item xs={12} sm={12} md={12}>
                                <PDropdown
                                    name={Labels.clientInfo.division}
                                    label={`${getLabel("lbl27")}${Labels.symbols.required}`}
                                    value={formData.division}
                                    onChange={handleChange}
                                    options={formDataList.division}
                                    width={100}
                                    helperText={errors?.division}
                                    flag={Labels.flag.auto}
                                />
                            </PGrid>
                        </PGrid>

                        <PGrid container className={Labels.margin.mb4}>
                            <PGrid item xs={12} sm={6} md={4}>
                                <PTypography
                                    labelText={getLabel("lbl28")}
                                    weight={FontWeight.regular}
                                    flag={Labels.fontFlags.normalText}
                                    marginBottom="8px"
                                />
                                <PTypography
                                    labelText={fields.clientName}
                                    color={CommonColors.primary}
                                    weight={FontWeight.regular}
                                    flag={Labels.fontFlags.normalText}
                                />
                            </PGrid>
                            <PGrid item xs={12} sm={6} md={4}>
                                <PTypography
                                    labelText={getLabel("lbl09")}
                                    weight={FontWeight.regular}
                                    flag={Labels.fontFlags.normalText}
                                    marginBottom="8px"
                                />
                                <PTypography
                                    labelText={fields.country}
                                    color={CommonColors.primary}
                                    weight={FontWeight.regular}
                                    flag={Labels.fontFlags.normalText}
                                />
                            </PGrid>
                            <PGrid item xs={12} sm={6} md={4}>
                                <PTypography
                                    labelText={getLabel("lbl29")}
                                    weight={FontWeight.regular}
                                    flag={Labels.fontFlags.normalText}
                                    marginBottom="8px"
                                />
                                <PTypography
                                    labelText={fields.entityName}
                                    color={CommonColors.primary}
                                    weight={FontWeight.regular}
                                    flag={Labels.fontFlags.normalText}
                                />
                            </PGrid>
                        </PGrid>

                        <PGrid container className={Labels.margin.mb4}>
                            <PGrid item xs={12} sm={6} md={4}>
                                <PTypography
                                    labelText={getLabel("lbl30")}
                                    weight={FontWeight.regular}
                                    marginBottom="8px"
                                    flag={Labels.fontFlags.normalText}
                                />
                                <PTypography
                                    labelText={fields.businessUnit}
                                    color={CommonColors.primary}
                                    weight={FontWeight.regular}
                                    flag={Labels.fontFlags.normalText}
                                />
                            </PGrid>
                            {/* <PGrid item xs={12} sm={6} md={4}>
                                    <PTypography
                                        labelText={getLabel("lbl91")}
                                        weight={FontWeight.bold}
                                    />
                                    <PTypography
                                        labelText={fields.globalBUMapping}
                                        color={CommonColors.grey.main}
                                        weight={FontWeight.bold}
                                    />
                                </PGrid> */}

                        </PGrid>
                        {/* <PGrid container className={Labels.margin.mb3}>
                                <PGrid item xs={12} sm={6} md={4}>
                                    <PTypography
                                        labelText={getLabel("lbl32")}
                                        weight={FontWeight.bold}
                                    />
                                    <PTypography
                                        labelText={fields.clientCode}
                                        color={CommonColors.grey.main}
                                        weight={FontWeight.bold}
                                    />
                                </PGrid>
                                <PGrid item xs={12} sm={6} md={4}>
                                    <PTypography
                                        labelText={getLabel("lbl31")}
                                        weight={FontWeight.bold}

                                    />
                                    <PTypography
                                        labelText={fields.channel}
                                        color={CommonColors.grey.main}
                                        weight={FontWeight.bold}
                                    />
                                </PGrid>

                            </PGrid> */}

                        {/* Row 3 */}
                        <PGrid container className={Labels.margin.mb4}>
                            <PGrid item xs={12} sm={6} md={6}>
                                {/* {formDataList.globalBUMapping.length === 1 ? (
                                    <>
                                        <PTypography
                                            labelText={getLabel("lbl91")}
                                            weight={FontWeight.regular}
                                            marginBottom="8px"
                                            flag={Labels.fontFlags.normalText}
                                        />
                                        <PTypography
                                            labelText={fields.businessUnit}
                                            color={CommonColors.primary}
                                            weight={FontWeight.regular}
                                            flag={Labels.fontFlags.normalText}
                                        />
                                    </>

                                ) : ( */}
                                <PDropdown
                                    name={Labels.clientInfo.globalBUMapping}
                                    label={`${getLabel("lbl91")}${Labels.symbols.required}`}
                                    value={formData.globalBUMapping}
                                    onChange={handleChange}
                                    options={formDataList.globalBUMapping}
                                    width={100}
                                    helperText={errors?.globalBUMapping}
                                    flag={Labels.flag.auto}
                                />
                                {/* )} */}
                            </PGrid>
                            <PGrid item xs={12} sm={6} md={6}>
                                <PRadio
                                    name={Labels.clientInfo.aboveAtMarket}
                                    label={`${getLabel("lbl92")}${Labels.symbols.required}`}
                                    options={formDataList.aboveAtMarket}
                                    onChange={handleChange}
                                    value={formData.aboveAtMarket}
                                    helperText={errors?.aboveAtMarket}
                                    xs={{ fontSize: "16px" }}
                                />
                            </PGrid>
                        </PGrid >
                        <PGrid container className={Labels.margin.mb4}>
                            <PGrid item xs={12} sm={6} md={6} style={{ display: "flex", alignItems: "flex-start", flexDirection: "column", position: "relative" }} >
                                {[Labels.role.admin].includes(role) && (
                                    <Typography style={{ fontSize: "14px", color: disable ? "#C6C7C8" : "#0371D0", position: "absolute", right: "10px", top: "0" }}>
                                        <span onClick={disable ? undefined : ((e) => handleOpenChoose(e, "Brand"))}>+ New Brand</span>
                                    </Typography>
                                )}
                                <PDropdown
                                    name={Labels.clientInfo.brand}
                                    label={`${getLabel("lbl33")}${Labels.symbols.required}`}
                                    value={formData.brand}
                                    onChange={handleChange}
                                    options={formDataList.brand}
                                    width={100}
                                    helperText={errors?.brand}
                                    flag={Labels.flag.auto}
                                />
                                {/* <div style={{ marginTop: "15px" }}>
                                        <Tooltip title="Add New Brand" arrow>
                                            <IconButton sx={{ backgroundColor: "#d5d5d5", color: "#fff", width: 30, height: 30, "&:hover": { backgroundColor: "#1976d2" }, }}
                                                onClick={!disible ? (e) => handleOpenChoose(e, "Brand") : undefined}
                                            >
                                                <AddIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </div> */}
                            </PGrid>

                            <PGrid item xs={12} sm={6} md={6}>
                                <PDropdown
                                    name={Labels.clientInfo.deliveryCountry}
                                    // label="Please Select"
                                    label={`${getLabel("lbl34")}${Labels.symbols.required}`}
                                    value={formData.deliveryCountry}
                                    onChange={handleChange}
                                    options={formDataList.deliveryCountry}
                                    width={100}
                                    helperText={errors?.deliveryCountry}
                                    flag={Labels.flag.auto}
                                />

                            </PGrid>
                        </PGrid >

                        {/* Row 4 */}
                        <PGrid container className={Labels.margin.mb5}>
                            <PGrid item xs={12} sm={6} md={6} style={{ display: "flex", alignItems: "flex-start", flexDirection: "column", position: "relative" }} >
                                <Typography style={{ fontSize: "14px", color: disable ? "#C6C7C8" : "#0371D0", position: "absolute", right: "10px", top: "0" }}>
                                    <span onClick={disable ? undefined : (e) => handleOpenChoose(e, "Contant")} >+ New Contact</span>
                                </Typography>
                                <PDropdown
                                    name={Labels.clientInfo.clientContact}
                                    label={`${getLabel("lbl35")}${Labels.symbols.required}`}
                                    value={formData.clientContact}
                                    onChange={handleChange}
                                    options={formDataList.clientContact}
                                    width={100}
                                    helperText={errors?.clientContact}
                                    flag={Labels.flag.auto}
                                />
                                {/* <div style={{ marginTop: "15px" }}>
                                        <Tooltip title="Add New Brand" arrow>
                                            <IconButton sx={{ backgroundColor: "#d5d5d5", color: "#fff", width: 30, height: 30, "&:hover": { backgroundColor: "#1976d2" }, }}
                                                onClick={!disible ? (e) => handleOpenChoose(e, "Brand") : undefined}
                                            >
                                                <AddIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </div> */}
                            </PGrid>

                            <PGrid item xs={12} sm={6} md={6}>
                                <PDropdown
                                    name={Labels.clientInfo.pmgEntity}
                                    label={`${getLabel("lbl36")}${Labels.symbols.required}`}
                                    value={formData.pmgEntity}
                                    onChange={handleChange}
                                    options={formDataList.pmgEntity}
                                    width={100}
                                    helperText={errors?.pmgEntity}
                                    flag={Labels.flag.auto}
                                    readOnly={true}
                                />
                            </PGrid>
                        </PGrid >


                        <PGrid container className="d-flex align-items-center justify-content-between">

                            {/* Left Button */}
                            <PGrid item xs={12} sm={6} md={8}>
                                <PButton
                                    label={getLabel("lbl37")}
                                    variant="outlined"
                                    onClick={(e) => handleExitDraft(e)}
                                    width={200}
                                />
                            </PGrid>

                            {/* Right Buttons */}
                            <PGrid
                                item
                                xs={12}
                                sm={6}
                                md={4}
                                className="d-flex justify-content-end gap-2"
                            >
                                {/* <PButton
                                        label={getLabel("lbl38")}
                                        variant="contained"
                                        color={CommonColors.grey.main}
                                        onClick={(e) => handleBack(e)}
                                        width={120}
                                    /> */}

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
                        <PSummary sections={sections} currentStep={1} />
                    </PGrid> */}
                </PGrid >
            </Box >

            {/*Add Client Contant*/}
            < PDialog
                open={ccOpenFilter}
                onClose={handleCloseChoose}
                title={getLabel("lbl129")}
                showCloseIcon={true}
                maxWidth="md"
                actions={
                    < PGrid className="d-flex align-items-center justify-content-end gap-2" >
                        <PButton
                            fullWidth
                            label={getLabel("lbl125")}
                            variant="outlined"
                            onClick={handleCloseChoose}
                            // color={CommonColors.grey.main}
                            width={180}
                        />
                        <PButton
                            fullWidth
                            label={getLabel("lbl124")}
                            variant={Labels.contained}
                            onClick={handleSendChoose}
                            color={CommonColors.dark_blue}
                            width={180}
                            startIcon={
                                <img
                                    src={arrow}
                                    alt="arrow"
                                    className="icon"
                                />
                            }
                        />
                    </PGrid >
                }

            >
                <PGrid container>
                    <PGrid item xs={12} sm={6} md={6}>
                        <PTextField
                            name={Labels.clientInfo.firstName}
                            label={`${getLabel("lbl130")}${Labels.symbols.required}`}
                            value={formData.firstName}
                            onChange={handleChange}
                            helperText={errors?.firstName}
                        />
                    </PGrid>
                    <PGrid item xs={12} sm={6} md={6}>
                        <PTextField
                            name={Labels.clientInfo.lastName}
                            label={`${getLabel("lbl131")}`}
                            value={formData.lastName}
                            onChange={handleChange}
                        />
                    </PGrid>
                </PGrid>
                <PGrid container>
                    <PGrid item xs={12} sm={6} md={6}>
                        <PTextField
                            name={Labels.clientInfo.logonID}
                            label={`${getLabel("lbl132")}${Labels.symbols.required}`}
                            value={formData.logonID}
                            onChange={handleChange}
                            helperText={errors?.logonID}
                        />
                    </PGrid>
                    <PGrid item xs={12} sm={6} md={6}>
                        <PTextField
                            name={Labels.clientInfo.email}
                            label={`${getLabel("lbl133")}${Labels.symbols.required}`}
                            value={formData.email}
                            onChange={handleChange}
                            helperText={errors?.email}
                        />

                    </PGrid>
                </PGrid>
                <PGrid container >
                    <PGrid item xs={12} sm={6} md={6}>
                        <PTextField
                            name={Labels.clientInfo.jobTitle}
                            label={`${getLabel("lbl134")}`}
                            value={formData.jobTitle}
                            onChange={handleChange}
                        />
                    </PGrid>
                    <PGrid item xs={12} sm={6} md={6}>
                        <PTextField
                            name={Labels.clientInfo.phone}
                            label={`${getLabel("lbl135")}`}
                            value={allowOnlyNumbers(formData.phone)}
                            onChange={handleChange}
                        />
                    </PGrid>
                </PGrid>
                <PGrid container >
                    <PGrid item xs={12} sm={6} md={6}>
                        <PDropdown
                            name={Labels.clientInfo.receiveNotification}
                            label={`${getLabel("lbl136")}${Labels.symbols.required}`}
                            value={formData.receiveNotification}
                            onChange={handleChange}
                            options={formDataList.receiveNotification}
                            width={100}
                            helperText={errors?.receiveNotification}
                            disabled={true}
                        />
                    </PGrid>
                    <PGrid item xs={12} sm={6} md={6}>
                        <PDropdown
                            name={Labels.clientInfo.jobRole}
                            label={`${getLabel("lbl137")}${Labels.symbols.required}`}
                            value={formData.jobRole}
                            onChange={handleChange}
                            options={formDataList.jobRole}
                            width={100}
                            helperText={errors?.jobRole}
                        />
                    </PGrid>
                </PGrid>
            </PDialog >

            {/*Add New Brand*/}
            < PDialog
                open={brandOpenFilter}
                onClose={handleCloseChoose}
                title={getLabel("lbl138")}
                showCloseIcon={true}
                actions={
                    < PGrid className="d-flex align-items-center justify-content-end gap-2" >
                        <PButton
                            fullWidth
                            label={getLabel("lbl125")}
                            variant="outlined"
                            onClick={handleCloseChoose}
                            // color={CommonColors.grey.main}
                            width={180}
                        />
                        <PButton
                            fullWidth
                            label={getLabel("lbl124")}
                            variant={Labels.contained}
                            onClick={handleSendChoose}
                            color={CommonColors.dark_blue}
                            width={180}
                            startIcon={
                                <img
                                    src={arrow}
                                    alt="arrow"
                                    className="icon"
                                />
                            }
                        />
                    </PGrid >
                }
            >
                <PGrid>
                    <PTextField
                        name={Labels.clientInfo.brandName}
                        label={`${getLabel("lbl139")}${Labels.symbols.required}`}
                        value={formData.brandName}
                        onChange={handleChange}
                        helperText={errors?.brandName}
                    />
                </PGrid>
            </PDialog >

            <PDraftDialog
                open={open}
                onClose={() => setOpen(false)}
                onSave={handleSubmit}
                onDelete={handleSubmit}
            />
        </>
    );
};

export default ClientInfo;