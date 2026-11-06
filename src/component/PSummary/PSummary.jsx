import { CommonColors } from "../../utils/constants/colors";
import { FontWeight } from "../../utils/constants/fonts";
import { Labels } from "../../utils/constants/labels";
import PCard from "../PCard/PCard";
import PGrid from "../PGrid/PGrid";
import PTypography from "../PTypography/PTypography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import EditIcon from "@mui/icons-material/Edit";
import { useState, Fragment } from "react";
import { Tooltip } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import PButton from "../PButton/PButton";
import { labelRoutes } from "../../navigations/labelRoutes";
import UpdateLineItems from "../../container/account/updateLineItems";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { isSuccess, toast } from "../../utils/commonFunction/common";
import { LineItems_API } from "../../utils/api/apiUrl";
import { PostApi } from "../../utils/api/networking";
import { useSelector } from "react-redux";

// compact square icon button for the line-item Edit / Duplicate actions
const itemActionBtnSx = {
    minWidth: 0,
    width: 28,
    height: 28,
    padding: 0,
    "& .MuiButton-startIcon": { margin: 0 },
};

export const PSummary = ({ sections = [], currentStep = 3, refreshSummary, layout = "row", duplicate = false, showFlag = true, lineItems = [] }) => {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(currentStep);
    const [activeItemIndex, setActiveItemIndex] = useState({ 3: 0 });
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({});
    const { userType, enquiryID, fkID, id } = useSelector((state) => state.userDetails.user);
    const flag = userType?.toLowerCase() === Labels.userType.agency
    const handleOpen = (data = {}) => {
        setFormData(data);
        setOpen(true);
    };

    const visibleSections = sections.filter((section) => section.step == currentStep);
    const hybridModel = sections.find((section) => section.step === 2)?.items.find((item) => item.label === "Hybrid")?.value;
    const handleEdit = (step, enquiryId = null) => {
        const data = lineItems.find(item => item.enqdetailsId === enquiryId);
        if (step === 3 && data) {
            const updateData = {...data, hybrid : hybridModel};
            handleOpen(updateData);
            return;
        }
        const routeMap = {
            1: labelRoutes.clientInfo,
            2: labelRoutes.enquiryDetails,
            4: labelRoutes.suppliers
        };
        const route = routeMap[step] || labelRoutes.home;
        navigate(route);
    };
    const SummaryItem = ({ label, value, layout }) => (

        <PGrid container className={Labels.margin.mb2}>
            {label === "" ? (
                <PGrid item xs={12} sm={12} md={12}>
                    <PTypography
                        labelText={value || "-"}
                        weight={FontWeight.bold}
                    />
                </PGrid>
            ) : (
                <>
                    {layout === 'row' && (
                        <PGrid item xs={12} sm={12} md={12}>
                            <PTypography labelText={label} weight={FontWeight.bold}
                                flag={Labels.fontFlags.smallText} />
                            <PTypography
                                flag={Labels.fontFlags.smallText}
                                labelText={value || "-"}
                                weight={FontWeight.regular}
                            />
                        </PGrid>
                    )}
                    {layout === 'column' && (
                        <>
                            <PGrid item xs={12} sm={12} md={6}>
                                <PTypography labelText={label}
                                    weight={FontWeight.bold}
                                    flag={Labels.fontFlags.normalText} />
                            </PGrid>
                            <PGrid item xs={12} sm={12} md={6}>
                                <PTypography
                                    flag={Labels.fontFlags.normalText}
                                    labelText={value || "-"}
                                    weight={FontWeight.regular}
                                />
                            </PGrid>
                        </>
                    )}


                </>
            )}
        </PGrid>
    );

    const handleDuplicate = async (step, data) => {
        try {
            const payload = {
                EnqdetailsId: data.enquiryId,
                EnqId: id,
                modifiedBy: fkID,
            };
            const response = await PostApi(LineItems_API.GetEnqDuplicate, payload);
            if (isSuccess(response)) {
                toast(Labels.status.success, response.data);
                await refreshSummary();
            } else {
                setErrors((prev) => ({
                    ...prev,
                    name: ""
                }));
                toast(Labels.status.failure, response.data.message);
            }

        } catch (error) {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        }
    };
    const ComponentDiv = layout === 'column' ? PGrid : PCard;

    return (
        <>
            <ComponentDiv>
                {showFlag && (
                    <>
                        <PGrid container className="justify-content-center">
                            <PTypography
                                labelText={`${Labels.clientInfo.summary}${enquiryID && currentStep != 1 ? ` (${enquiryID})` : ""}`}
                                flag={Labels.fontFlags.subHeader}
                                weight={FontWeight.bold}
                                color={CommonColors.red.main}
                            />
                        </PGrid>
                        <hr className="my-2" />
                    </>
                )}

                {visibleSections.map((section) => {
                    const isOpen = activeStep === section.step;
                    return (
                        <Fragment key={section.step}>
                            {layout === 'row' && <>
                                <PGrid container className="d-flex align-items-center justify-content-between"
                                    style={{ cursor: "pointer" }}
                                    onClick={() => {
                                        const newStep = isOpen ? null : section.step;
                                        setActiveStep(newStep);
                                        if (newStep === 3) {
                                            setActiveItemIndex({ 3: 0 });
                                        } else {
                                            setActiveItemIndex({});
                                        }
                                    }}
                                >
                                    <PGrid item xs={12} sm={6} md={8}>
                                        <PTypography
                                            labelText={`${section.title}${[3, 4].includes(section.step) ? `(${section.items?.length || 0})` : ""}`}
                                            flag={Labels.fontFlags.errorLbl}
                                            weight={FontWeight.bold}
                                        />
                                    </PGrid>

                                    <PGrid item xs={12} sm={6} md={4} className="d-flex justify-content-end align-items-center">
                                        {isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                    </PGrid>
                                </PGrid>
                                <hr className="mb-3 mt-1" />
                            </>

                            }

                            {/* CONTENT */}
                            {isOpen && (
                                <PGrid container className={Labels.margin.mt1}>
                                    {section.step === 3 ? (
                                        section.items?.map((item, i) => {
                                            const isItemOpen = activeItemIndex[3] === i;
                                            return (
                                                <Fragment key={i}>
                                                    {i != 0 && <hr className="mb-3 mt-1" />}
                                                    <PGrid container className="w-100 d-flex align-items-center justify-content-between pb-2"
                                                        style={{ cursor: "pointer" }}
                                                        onClick={() => setActiveItemIndex((prev) => ({ ...prev, 3: prev[3] === i ? null : i }))}
                                                    >
                                                        <PGrid item xs={12} sm={6} md={8}>
                                                            <PTypography
                                                                labelText={item.subTitle}
                                                                weight={FontWeight.bold}
                                                                flag={Labels.fontFlags.subHeader}
                                                            />
                                                        </PGrid>

                                                        <PGrid item xs={12} sm={6} md={4} className="d-flex justify-content-end align-items-center m-0 p-0">
                                                            {isItemOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                        </PGrid>
                                                    </PGrid>
                                                    {isItemOpen && (
                                                        <>
                                                            {/* item actions sit above the first field (Category) so they're easy to find */}
                                                            {section.step && (
                                                                <PGrid container>
                                                                    <PGrid item xs={12} className="d-flex justify-content-end gap-2 pb-2">
                                                                        <Tooltip title="Edit item" arrow>
                                                                            <span>
                                                                                <PButton
                                                                                    variant="outlined"
                                                                                    startIcon={<EditIcon sx={{ fontSize: "16px !important" }} />}
                                                                                    sx={itemActionBtnSx}
                                                                                    onClick={() => handleEdit(section.step, item.enquiryId)}
                                                                                />
                                                                            </span>
                                                                        </Tooltip>
                                                                        {duplicate &&
                                                                            <Tooltip title="Duplicate item" arrow>
                                                                                <span>
                                                                                    <PButton
                                                                                        variant="outlined"
                                                                                        startIcon={<ContentCopyIcon sx={{ fontSize: "16px !important" }} />}
                                                                                        sx={itemActionBtnSx}
                                                                                        onClick={() => handleDuplicate(section.step, item)}
                                                                                    />
                                                                                </span>
                                                                            </Tooltip>
                                                                        }
                                                                    </PGrid>
                                                                </PGrid>
                                                            )}

                                                            <PGrid className="mt-1 mb-2">
                                                                {(item.items || []).map((subItem, j) => (
                                                                    <SummaryItem
                                                                        key={j}
                                                                        label={subItem.label}
                                                                        value={subItem.value}
                                                                        layout={layout}
                                                                    />
                                                                ))}
                                                            </PGrid>
                                                        </>
                                                    )}
                                                </Fragment>
                                            );
                                        })
                                    ) : (
                                        <>
                                            {(section.items || []).map((item, i) => (
                                                <SummaryItem
                                                    key={i}
                                                    label={item.label}
                                                    value={item.value}
                                                    layout={layout}
                                                />
                                            ))}

                                            {section.step < currentStep && (
                                                <PGrid container>
                                                    <PGrid item xs={12} className="d-flex justify-content-end">
                                                        <PButton
                                                            label="Edit"
                                                            variant="contained"
                                                            color={CommonColors.grey.main}
                                                            startIcon={<EditIcon />}
                                                            width={80}
                                                            onClick={() => handleEdit(section.step)}
                                                        />
                                                    </PGrid>
                                                </PGrid>
                                            )}
                                        </>
                                    )}

                                </PGrid>
                            )}
                        </Fragment>
                    );
                })}
            </ComponentDiv>

            <UpdateLineItems
                open={open}
                onClose={() => setOpen(false)}
                data={formData}
                step={currentStep}
                refreshSummary={refreshSummary}
            />
        </>
    );
};