
import { Box } from "@mui/material";
import PTypography from "../../component/PTypography/PTypography";
import PGrid from "../../component/PGrid/PGrid";
import { Labels } from "../../utils/constants/labels";
import { useState, useEffect } from "react";
import { FontWeight } from "../../utils/constants/fonts";
import PCard from "../../component/PCard/PCard";
import { CommonColors } from "../../utils/constants/colors";
import PButton from "../../component/PButton/PButton";
import PStepper from "../../component/PStepper/PStepper";
import { getEnquirySteps, getOptionLabel, isSuccess, toast } from "../../utils/commonFunction/common";
import { useLanguage } from "../../utils/constants/language";
import { useNavigate, useLocation } from "react-router-dom";
import { Dashboard_API } from "../../utils/api/apiUrl";
import { PostApi } from "../../utils/api/networking";
import { getClientInfo, getEnquiryDetails, getLineneItems } from "../../utils/constants/summary";
import { labelRoutes } from "../../navigations/labelRoutes";
import UpdateLineItems from "./updateLineItems";
import { PDraftDialog } from "../../component/PDialog/PDraftDialog";
import { useSelector } from "react-redux";
import arrow from "../../utils/assets/images/arrow_white.svg";

const Review = () => {
    const { getLabel } = useLanguage();
    const { userID, menuId, id , userType } = useSelector((state) => state.userDetails.user);
    const enquirySteps = getEnquirySteps(getLabel, menuId);
    
    const navigate = useNavigate();
    const [allowRedirect, setAllowRedirect] = useState(false);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(0); // first item open by default
    const [openDraft, setOpenDraft] = useState();

    const [formDataList, setFormDataList] = useState({
        clientInfo: [],
        enquiryDetails: [],
        lineItems: [],
        suppliers: [],
    });

    const [openUpdateLineItems, setOpenUpdateLineItems] = useState(false);
    const [formData, setFormData] = useState({});

    
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await PostApi(Dashboard_API.GetDetails, {
                Enquiryid: id,
            });
            const supplierColor = ["success", "info", "primary", "warning"];
            const suppliers = response.supplierinfo.map((item, index) => ({
                name: item.suppliername,
                color: supplierColor[index % supplierColor.length]
            }));

            setFormDataList(prev => ({
                ...prev,
                suppliers: suppliers,
                lineItems: response.enqlineItems,
                clientInfo: response.enqClientinfo,
                enquiryDetails: response.enqProjectinfo
            }));
        } catch (error) {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        } finally {
            setLoading(false);
        }
    };

    const clientInfo = getClientInfo({}, {}, {}, getLabel, getOptionLabel, formDataList.clientInfo, "" ,userType);
    const enquiryDetails = getEnquiryDetails({}, {}, {}, getLabel, getOptionLabel, formDataList.enquiryDetails, userType);
    const lineItems = getLineneItems({}, {}, getLabel, getOptionLabel, formDataList.lineItems, userType);

    const handleOpen = (data = {}) => {
        setFormData(data);
        setOpenUpdateLineItems(true);
    };

    const handleEdit = (step, enquiryId = null) => {
        const data = formDataList.lineItems.find(item => item.enqdetailsId === enquiryId);
        if (step === 3 && data) {
            handleOpen(data);
            return;
        }
        const routeMap = {
            1: labelRoutes.clientInfo,
            2: labelRoutes.enquiryDetails,
            3: labelRoutes.lineItems,
            4: labelRoutes.suppliers
        };
        const route = routeMap[step] || labelRoutes.home;
        navigate(route);
    };

    const handleSubmit = async (e, flag) => {
        if (!flag) {
            navigate(labelRoutes.dashboard);
            return;
        }
        try {
            setLoading(true);
            const response = await PostApi(`${Dashboard_API.EnqReview}?enqId=${id}&createdBy=${userID}`);
            if (isSuccess(response)) {
                navigate(labelRoutes.enquirySuceess);
            }
        } catch (error) {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        } finally {
            setLoading(false);
        }

    }
    const handleExitDraft = () => {
        setOpenDraft(true);
    };
    return (
        <>
            <Box sx={{ px: 3, py: 3 }}>
                <PGrid container className={Labels.margin.mb3} >
                    <PStepper steps={enquirySteps} activeStep={4} allowRedirect={allowRedirect}></PStepper>
                </PGrid>
                <PGrid container className={Labels.margin.mb4} >
                    <PGrid item xs={12} sm={12} md={12}>

                        {/*Client Info*/}
                        <div style={{ background: "#ED3B25", width: "36px", height: "11px" }}></div>
                        <PGrid item xs={12} sm={12} md={12} className={Labels.margin.mb5}>
                            <PCard title={`${getLabel("lbl25")}`}
                                className="review"
                                rightAction={<PButton label="Edit" variant="outlined1" size="small"
                                    onClick={(e) => handleEdit(1)}
                                    sx={{ color: "#0371D0", borderColor: "#fff", "&:hover": { borderColor: "#fff" } }}
                                />
                                }>
                                <PGrid container className="g-4 pt-3">
                                    {clientInfo.map((item, i) => (
                                        <PGrid item xs={12} md={6} xl={3} key={i}>
                                            <PGrid className={``}>
                                                <PTypography
                                                    labelText={item.label}
                                                    weight={FontWeight.bold}
                                                    flag={Labels.fontFlags.xs}
                                                />
                                                <PTypography
                                                    labelText={item.value}
                                                    color={CommonColors.black}
                                                    weight={FontWeight.regular}
                                                    flag={Labels.fontFlags.xs}
                                                />
                                            </PGrid>
                                        </PGrid>
                                    ))}

                                </PGrid>
                            </PCard>
                        </PGrid>

                        {/*Enquiry Details*/}
                        <div style={{ background: "#991D52", width: "36px", height: "11px" }}></div>
                        <PGrid item xs={12} sm={12} md={12} className={Labels.margin.mb5}>
                            <PCard title={`${getLabel("lbl21")}`}
                                className="review"
                                rightAction={<PButton label="Edit" variant="outlined1" size="small"
                                    onClick={(e) => handleEdit(2)}
                                    sx={{ color: "#0371D0", borderColor: "#fff", "&:hover": { borderColor: "#fff" } }}
                                />
                                }>
                                <PGrid container className="g-4 pt-3">
                                    {enquiryDetails.map((item, i) => (
                                        <PGrid item xs={12} md={6} xl={3} key={i}>
                                            <PGrid >
                                                <PTypography
                                                    labelText={item.label}
                                                    weight={FontWeight.bold}
                                                    flag={Labels.fontFlags.xs}
                                                />
                                                <PTypography
                                                    labelText={item.value}
                                                    color={CommonColors.black}
                                                    weight={FontWeight.regular}
                                                    flag={Labels.fontFlags.xs}
                                                />
                                            </PGrid>
                                        </PGrid>
                                    ))}
                                </PGrid>
                            </PCard>
                        </PGrid>
                        {/*Line items*/}
                        <div style={{ background: "#00916B", width: "36px", height: "11px" }}></div>
                        <PGrid item xs={12} sm={12} md={12} className={Labels.margin.mb5}>
                            <PCard title={`${getLabel("lbl22")}`}
                                className="review"
                                rightAction={<PButton label="+ Add" variant="outlined1" size="small"
                                    onClick={(e) => handleEdit(3)}
                                    sx={{ color: "#0371D0", whiteSpace: "nowrap", borderColor: "#fff", "&:hover": { borderColor: "#fff" } }}
                                />

                                }>
                                {lineItems.map((item, index) => (
                                    <PCard key={index} className="mt-3 p-0" title={item.itemTitle}
                                        color={CommonColors.gray} collapsible
                                        isOpen={open === index}
                                        onToggle={() => setOpen((prev) => (prev === index ? null : index))}
                                        rightAction={
                                            <PButton
                                                label="Edit"
                                                variant="outlined1"
                                                size="small"
                                                // startIcon={<EditIcon />}
                                                onClick={(e) => {
                                                    e.stopPropagation(), handleEdit(3, item.enquiryId)
                                                }}
                                                sx={{
                                                    color: "#0371D0",
                                                    minWidth: "auto",
                                                    padding: "0 12px 0px 0", backgroundColor: "#F4F6FA",
                                                    "&:hover": {
                                                        borderColor: "#F4F6FA",
                                                        backgroundColor: "#F4F6FA"
                                                    }
                                                }}

                                            />
                                        }
                                    >
                                        <PGrid container className="g-4 pt-3">
                                            {item.items.map((field, i) => (
                                                <PGrid item xs={12} md={6} xl={3} key={i}>
                                                    <PGrid className="px-3 py-0">
                                                        <PTypography labelText={field.label} weight={FontWeight.bold} />
                                                        <PTypography
                                                            labelText={field.value}
                                                            color={CommonColors.black}
                                                            weight={FontWeight.regular}
                                                            flag={Labels.fontFlags.normalText}
                                                        />
                                                    </PGrid>
                                                </PGrid>
                                            ))}
                                        </PGrid>
                                    </PCard>
                                ))}
                            </PCard>
                        </PGrid>
                        {/* Suppliers */}
                        <div style={{ background: "#512668", width: "36px", height: "11px" }}></div>
                        <PGrid item xs={12} sm={12} md={12} className={Labels.margin.mb5}>
                            <PCard title={`${getLabel("lbl23")}`}
                                className="review"
                                rightAction={<PButton label="Edit" variant="outlined1" size="small"
                                    onClick={(e) => handleEdit(4)}
                                    sx={{ color: "#0371D0", borderColor: "#fff", "&:hover": { borderColor: "#fff" } }}
                                />
                                }>
                                <PGrid container className="g-3 pt-3">

                                    {formDataList.suppliers.map((item, index) => (
                                        <PGrid item xs={12} md={6} lg={3} key={index}>
                                            <PTypography
                                                labelText={item.name}
                                                color={CommonColors.black}
                                                weight={FontWeight.regular}
                                                flag={Labels.fontFlags.normalText}
                                            />
                                        </PGrid>
                                    ))}
                                </PGrid>
                            </PCard>
                        </PGrid>

                        <PGrid container className="d-flex align-items-center justify-content-between">
                            <PGrid item xs={12} sm={6} md={6}>
                                <PButton
                                    label={getLabel("lbl37")}
                                    variant="outlined"
                                    onClick={(e) => handleExitDraft(e)}
                                    width={200}

                                />
                            </PGrid>
                            <PGrid item xs={12} sm={6} md={6} className="d-flex justify-content-end gap-2">
                                <PButton
                                    label={getLabel("lbl127")}
                                    variant="contained"
                                    color={CommonColors.dark_blue}
                                    onClick={(e) => handleSubmit(e, true)}
                                    width={220}
                                    startIcon={<img src={arrow} alt="arrow" className="icon" />}
                                />
                            </PGrid>
                        </PGrid>

                    </PGrid>
                </PGrid>
            </Box >

            <UpdateLineItems
                open={openUpdateLineItems}
                onClose={() => setOpenUpdateLineItems(false)}
                data={formData}
                refreshSummary={fetchData}
            />
            <PDraftDialog
                open={openDraft}
                onClose={() => setOpenDraft(false)}
                onSave={(e) => handleSubmit(e, false)}
                onDelete={(e) => handleSubmit(e, false)}
            />
        </>
    );
};

export default Review;