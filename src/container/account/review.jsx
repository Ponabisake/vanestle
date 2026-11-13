
import { Box, Skeleton } from "@mui/material";
import PGrid from "../../component/PGrid/PGrid";
import { Labels } from "../../utils/constants/labels";
import { useState, useEffect } from "react";
import { CommonColors } from "../../utils/constants/colors";
import PButton from "../../component/PButton/PButton";
import PStepper from "../../component/PStepper/PStepper";
import { getEnquirySteps, getOptionLabel, isSuccess, toast } from "../../utils/commonFunction/common";
import { useLanguage } from "../../utils/constants/language";
import { useNavigate } from "react-router-dom";
import { Dashboard_API } from "../../utils/api/apiUrl";
import { PostApi } from "../../utils/api/networking";
import { getClientInfo, getEnquiryDetails, getLineneItems } from "../../utils/constants/summary";
import { labelRoutes } from "../../navigations/labelRoutes";
import UpdateLineItems from "./updateLineItems";
import { PDraftDialog } from "../../component/PDialog/PDraftDialog";
import { useSelector } from "react-redux";
import arrow from "../../utils/assets/images/arrow_white.svg";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { PFieldGrid, PLineItem, PPillButton } from "../../component/PLineItem/PLineItem";
import "./review.css";

/** Card for one review section: coloured top edge, icon, step number, title and an Edit action. */
function ReviewSection({ step, title, count, icon, accent, action, children }) {
    return (
        <section className="review-section" style={{ "--accent": accent }}>
            <header className="review-section-head">
                <div className="review-section-icon">{icon}</div>
                <div className="review-section-titles">
                    <div className="review-section-step">Step {step}</div>
                    <h2 className="review-section-title">
                        {title}
                        {count != null && <span className="review-section-count">({count})</span>}
                    </h2>
                </div>
                {action}
            </header>
            <div className="review-section-body">{children}</div>
        </section>
    );
}

// shared with Project Enquiry → Line Items and the step summaries
const FieldGrid = PFieldGrid;
const EditButton = ({ label = "Edit", icon, onClick }) => <PPillButton label={label} icon={icon} onClick={onClick} />;

const initials = (name = "") =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

const Review = () => {
    const { getLabel } = useLanguage();
    const { userID, menuId, id, userType, userName } = useSelector((state) => state.userDetails.user);
    const enquirySteps = getEnquirySteps(getLabel, menuId);

    const navigate = useNavigate();
    const [allowRedirect, setAllowRedirect] = useState(false);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(0); // first item open by default
    const [openDraft, setOpenDraft] = useState();
    const [hasLoaded, setHasLoaded] = useState(false); // placeholders only until the first load (not while submitting)

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
                Username: userName,
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
            setHasLoaded(true);
        }
    };

    const showSkeleton = !hasLoaded;

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

                <div className="review-page">
                    <div className="review-intro">
                        <div className="review-intro-icon"><FactCheckOutlinedIcon /></div>
                        <div>
                            <strong>Almost there – please review your enquiry</strong>
                            <span>Check the details below. Use <b>Edit</b> on any section to make changes, then submit.</span>
                        </div>
                    </div>

                    {/* Client Info */}
                    <ReviewSection
                        step={1}
                        title={getLabel("lbl25")}
                        icon={<BusinessOutlinedIcon />}
                        accent="#ED3B25"
                        action={<EditButton onClick={() => handleEdit(1)} />}
                    >
                        <FieldGrid fields={clientInfo} loading={showSkeleton} />
                    </ReviewSection>

                    {/* Enquiry Details */}
                    <ReviewSection
                        step={2}
                        title={getLabel("lbl21")}
                        icon={<AssignmentOutlinedIcon />}
                        accent="#991D52"
                        action={<EditButton onClick={() => handleEdit(2)} />}
                    >
                        <FieldGrid fields={enquiryDetails} loading={showSkeleton} />
                    </ReviewSection>

                    {/* Line Items */}
                    <ReviewSection
                        step={3}
                        title={getLabel("lbl22")}
                        count={showSkeleton ? null : lineItems.length}
                        icon={<Inventory2OutlinedIcon />}
                        accent="#00916B"
                        action={<EditButton label="Add item" icon={<AddRoundedIcon sx={{ fontSize: 18 }} />} onClick={() => handleEdit(3)} />}
                    >
                        {showSkeleton ? (
                            <FieldGrid loading />
                        ) : lineItems.length === 0 ? (
                            <div className="review-empty">No line items added yet.</div>
                        ) : (
                            <div className="pli-list">
                                {lineItems.map((item, index) => (
                                    <PLineItem
                                        key={index}
                                        title={item.itemTitle}
                                        name={item.itemName}
                                        fields={item.items}
                                        files={item.files}
                                        enqDetailsId={item.enquiryId}
                                        isOpen={open === index}
                                        onToggle={() => setOpen((prev) => (prev === index ? null : index))}
                                        actions={<PPillButton label="Edit" onClick={() => handleEdit(3, item.enquiryId)} />}
                                    />
                                ))}
                            </div>
                        )}
                    </ReviewSection>

                    {/* Suppliers */}
                    <ReviewSection
                        step={4}
                        title={getLabel("lbl23")}
                        count={showSkeleton ? null : formDataList.suppliers.length}
                        icon={<StorefrontOutlinedIcon />}
                        accent="#512668"
                        action={<EditButton onClick={() => handleEdit(4)} />}
                    >
                        {showSkeleton ? (
                            <div className="review-suppliers">
                                {[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" width={180} height={44} sx={{ borderRadius: "999px" }} />)}
                            </div>
                        ) : formDataList.suppliers.length === 0 ? (
                            <div className="review-empty">No suppliers selected yet.</div>
                        ) : (
                            <div className="review-suppliers">
                                {formDataList.suppliers.map((item, index) => (
                                    <span className="review-supplier" key={index}>
                                        <span className="review-supplier-avatar">{initials(item.name)}</span>
                                        {item.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </ReviewSection>

                    <div className="review-actions">
                        <PButton
                            label={getLabel("lbl37")}
                            variant="outlined"
                            onClick={(e) => handleExitDraft(e)}
                            width={200}
                        />
                        <PButton
                            label={getLabel("lbl127")}
                            variant="contained"
                            color={CommonColors.dark_blue}
                            onClick={(e) => handleSubmit(e, true)}
                            width={220}
                            startIcon={<img src={arrow} alt="arrow" className="icon" />}
                        />
                    </div>
                </div>
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
            />
        </>
    );
};

export default Review;
