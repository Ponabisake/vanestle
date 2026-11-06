import { useEffect, useState } from "react";
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
export const PDraftDialog = ({ open, onClose, onSave, onDelete }) => {
    const [mode, setMode] = useState('save');

    const [formData, setFormData] = useState({
        reason: '',
        remarks: ''
    });
    const [errors, setErrors] = useState({});

    const reasonList = [{ label: "Entry is stale/expired", value: 1 }, { label: "Wrongly input", value: 2 }, { label: "Others", value: 3 }]

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value
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

    const handleDeleteSubmit = () => {
        if (formData.reason == 3 && !formData.remarks) {
            setErrors({ remarks: "Remarks required" });
            return;
        }
        onDelete?.(formData);
        handleClose();
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
                                label={"Submit"}
                                variant={Labels.contained}
                                onClick={handleDeleteSubmit}
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
                    <PGrid container className={Labels.margin.mb4}>
                        <PGrid item xs={12}>
                            <PDropdown
                                name="reason"
                                label="Reason"
                                value={formData.reason}
                                onChange={handleChange}
                                options={reasonList}
                                width={100}
                                flag={Labels.flag.auto}
                            />
                        </PGrid>
                    </PGrid>

                    {formData.reason == 3 && (
                        <PGrid container>
                            <PGrid item xs={12}>
                                <PTextField
                                    name="remarks"
                                    label="Remarks"
                                    value={formData.remarks}
                                    onChange={handleChange}
                                    helperText={errors?.remarks}
                                    multiline
                                    rows={4.5}
                                    width={100}
                                />
                            </PGrid>
                        </PGrid>
                    )}
                </>
            )}

        </PDialog>
    );
};