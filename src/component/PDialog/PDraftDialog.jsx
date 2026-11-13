import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import PButton from "../PButton/PButton";
import PGrid from "../PGrid/PGrid";
import PTypography from "../PTypography/PTypography";
import PDialog from "./PDialog";
import { CommonColors } from "../../utils/constants/colors";
import { FontWeight } from "../../utils/constants/fonts";
import { Labels } from "../../utils/constants/labels";
import PTextField from "../PTextField/PTextField";
import PDropdown from "../PDropdown/PDropdown";
import arrow from "../../utils/assets/images/arrow_white.svg";
import { PostApi } from "../../utils/api/networking";
import { Dashboard_API } from "../../utils/api/apiUrl";
import { isSuccess, toast } from "../../utils/commonFunction/common";
import { labelRoutes } from "../../navigations/labelRoutes";
import { userDetails } from "../../redux/actionType/actionType";

// Legacy ddlReson; the label is what the API stores (tblEnquiryMaster.DeletReason)
const reasonList = [
    { label: "Entry is stale/expired", value: 1 },
    { label: "Wrongly input", value: 2 },
    { label: "Others", value: 3 },
];
const OTHERS = 3;
// tblEnquiryMaster.Deletreasontext is nvarchar(50)
const REMARKS_MAX = 50;

/**
 * Exit dialog of the enquiry wizard: Save Draft (onSave of the page) or Delete Draft. Delete asks for a reason
 * (remarks for Others) and soft-deletes the open enquiry through VA/DeleteDraft, then returns to the dashboard.
 * An enquiry that was never saved (id 0) is simply left.
 */
export const PDraftDialog = ({ open, onClose, onSave }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { id, userName } = useSelector((state) => state.userDetails.user);
    const [mode, setMode] = useState('save');

    const [formData, setFormData] = useState({
        reason: '',
        remarks: ''
    });
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: name === "remarks" ? String(value).slice(0, REMARKS_MAX) : value
        }));

        setErrors((prev) => ({
            ...prev,
            [name]: ""
        }));
    };
    useEffect(() => {
        if (open) {
            setMode('save');
        }
    }, [open]);

    const handleClose = () => {
        setFormData({ reason: '', remarks: '' });
        setErrors({});
        onClose();
    };

    const handleDeleteDraft = () => {
        setMode('delete');
    };

    const handleSaveSubmit = async () => {
        // awaited so the Save button shows its spinner while the draft is saved
        await onSave?.(formData);
        handleClose();
    };

    const leaveToDashboard = () => {
        dispatch({ type: userDetails, payload: { id: 0, enquiryId: "" } });
        handleClose();
        navigate(labelRoutes.dashboard);
    };

    const handleDeleteSubmit = async () => {
        const newErrors = {};
        if (!formData.reason) newErrors.reason = Labels.commonLabel.required;
        if (formData.reason == OTHERS && !formData.remarks?.trim()) newErrors.remarks = "Remarks required";
        if (Object.keys(newErrors).length) {
            setErrors(newErrors);
            return;
        }

        // nothing saved yet: just leave the wizard
        if (!id) {
            leaveToDashboard();
            return;
        }

        try {
            const response = await PostApi(Dashboard_API.DeleteDraft, {
                enqId: id,
                reason: reasonList.find((r) => r.value == formData.reason)?.label,
                remarks: formData.reason == OTHERS ? formData.remarks.trim() : "",
                username: userName,
            });
            if (isSuccess(response)) {
                toast(Labels.status.success, response.data);
                leaveToDashboard();
            } else {
                toast(Labels.status.failure, response?.data || Labels.message.somethingWentWrong);
            }
        } catch {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        }
    };

    return (
        <PDialog
            open={open}
            onClose={handleClose}
            title={mode === 'save' ? "You have unsaved changes !" : "Delete Draft"}
            showCloseIcon
            actions={
                <PGrid className="d-flex align-items-center justify-content-end gap-2">

                    {mode === 'save' ? (
                        <>
                            <PButton
                                label={"Delete Draft"}
                                variant="outlined"
                                onClick={handleDeleteDraft}
                                width={180}
                            />
                            <PButton
                                label={"Save Draft"}
                                variant={Labels.contained}
                                onClick={handleSaveSubmit}
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
                        </>
                    ) : (
                        <>
                            <PButton
                                label={"Cancel"}
                                variant="outlined"
                                onClick={handleClose}
                                width={180}
                            />
                            <PButton
                                label={"Delete"}
                                variant={Labels.contained}
                                onClick={handleDeleteSubmit}
                                color={CommonColors.dark_blue}
                                width={180}
                                disabled={!formData.reason}
                                startIcon={
                                    <img
                                        src={arrow}
                                        alt="arrow"
                                        className="icon"
                                    />
                                }
                            />
                        </>
                    )}

                </PGrid>
            }
        >

            {mode === 'save' ? (
                <PGrid container>
                    <PGrid item xs={12}>
                        <PTypography
                            labelText={"Saving your progress as a draft will allow you to pick up where you left off."}
                            color={CommonColors.primary}
                            weight={FontWeight.regular}
                        />
                    </PGrid>
                </PGrid>
            ) : (
                <>
                    <PGrid container className={Labels.margin.mb3}>
                        <PGrid item xs={12}>
                            <PTypography
                                labelText={"The draft will be removed from the dashboard. Please tell us why."}
                                color={CommonColors.primary}
                                weight={FontWeight.regular}
                            />
                        </PGrid>
                    </PGrid>
                    <PGrid container className={Labels.margin.mb4}>
                        <PGrid item xs={12}>
                            <PDropdown
                                name="reason"
                                label={`Reason${Labels.symbols.required}`}
                                value={formData.reason}
                                onChange={handleChange}
                                options={reasonList}
                                width={100}
                                flag={Labels.flag.auto}
                                helperText={errors?.reason}
                            />
                        </PGrid>
                    </PGrid>

                    {formData.reason == OTHERS && (
                        <PGrid container>
                            <PGrid item xs={12}>
                                <PTextField
                                    name="remarks"
                                    label={`Remarks${Labels.symbols.required} (${formData.remarks.length}/${REMARKS_MAX})`}
                                    value={formData.remarks}
                                    onChange={handleChange}
                                    helperText={errors?.remarks}
                                    inputProps={{ maxLength: REMARKS_MAX }}
                                    multiline
                                    rows={3}
                                    width="100%"
                                />
                            </PGrid>
                        </PGrid>
                    )}
                </>
            )}

        </PDialog>
    );
};
