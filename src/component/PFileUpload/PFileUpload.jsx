import { useState } from "react";
import {TextField, InputAdornment} from "@mui/material";
import {UploadFile as UploadFileIcon } from "@mui/icons-material";
import { FontFamily, FontSize } from "../../utils/constants/fonts";

/**
 * Controlled: the selected files are always `value` (the parent's list). onChange receives
 * { target: { name, files, value } } with the new list ({ name, file, url, size } per file).
 * Keeping no copy of its own means a list cleared or shortened by the parent (after a save,
 * after removing an attachment) is not brought back on the next selection.
 */
export default function PFileUpload({ label = "", value, onChange, disabled = false, name = "", helperText = "",
    variant = "outlined", multiple = false, maxLength = 5, width = "100%", placeholder = "" }) {

    const selectedFiles = Array.isArray(value) ? value : [];
    const [fileError, setFileError] = useState("");

    const allowedExtensions = [
        "pdf", "png", "jpg", "jpeg",
        "doc", "docx", "ppt", "pptx",
        "xls", "xlsx", "msg"
    ];

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        let updatedFiles = [...selectedFiles];
        let errorMsg = "";
        for (let file of files) {
            const ext = file.name.split(".").pop().toLowerCase();
            const isValidType = allowedExtensions.includes(ext);
            const isValidSize = file.size <= 20 * 1024 * 1024;
            if (!isValidType) {
                errorMsg = "Invalid file type";
                continue;
            }

            if (!isValidSize) {
                errorMsg = "File size exceeds 20MB";
                continue;
            }

            if (!multiple) {
                updatedFiles = [];
            }

            if (multiple && updatedFiles.length >= maxLength) {
                errorMsg = `Maximum ${maxLength} files allowed`;
                break;
            }

            // the same file picked again: keep one copy
            if (updatedFiles.some((f) => f.name === file.name && f.size === file.size)) {
                continue;
            }

            updatedFiles.push({ name: file.name, file, url: URL.createObjectURL(file), size: file.size });
        }
        onChange?.({ target: { name, files: updatedFiles, value: updatedFiles } });
        setFileError(errorMsg);
        e.target.value = "";
    };

    const baseSx = {
        width,
        mt: 0.4,
        "& .MuiOutlinedInput-root": {
            borderRadius: "12px",
            backgroundColor: "#fff",
        },

        "& .MuiInputLabel-root": {
            fontFamily: FontFamily.bold,
            fontSize: FontSize.textField.label,
        },
    };

    return (
        <TextField
            label={label}
            value=""
            disabled={disabled}
            helperText={fileError || helperText}
            error={!!fileError}
            variant={variant}
            fullWidth
            inputProps={{ readOnly: true }}
            sx={baseSx}
            placeholder={placeholder}
            InputProps={{
                endAdornment: (
                    <InputAdornment position="end">
                        <input
                            hidden
                            type="file"
                            multiple={multiple}
                            disabled={disabled}
                            onChange={handleFileChange}
                            id={`upload-${name}`}
                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.msg"
                        />

                        <label style={{ cursor: "pointer" }} htmlFor={`upload-${name}`}><UploadFileIcon /> </label>
                    </InputAdornment>
                )
            }}
        />
    );
}