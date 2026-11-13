import React from "react";
import { Box, IconButton, InputBase } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import { styled } from "@mui/material/styles";

// ✅ Styled components
const SearchContainer = styled(Box)(({ theme }) => ({
    display: "flex",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: "12px 12px",
    borderRadius: "50px",
    width: "280px",
    color: "#171717",
    marginTop: "7px",
    border: "1px solid #16133F",
    transition: "border-color 0.2s",
    "&:hover": {
        // borderColor: "#888",
        border: "1px solid #16133F",
    },
    "&:focus-within": {
        borderColor: "#16133F",
    },
}));

const IconWrapper = styled(Box)({
    marginRight: "8px",
    display: "flex",
    alignItems: "center",
    color: "#707070",
});

const StyledInput = styled(InputBase)(({ theme }) => ({
    color: "#000",
    fontSize: "1rem",
    opacity: 1,
    width: "100%",
    paddingLeft:"15px",
    "& input::placeholder": {
        color: "#C6C7C8",
        opacity: 1,
    },
}));

// onClear (optional): shows a × while there is text
const PSearch = ({ value, onChange ,width , placeholder, onClear}) => {
    return (
        <SearchContainer sx={{width:width || 250, height: 50}}>
            <StyledInput placeholder={placeholder || "Search…"} value={value} onChange={onChange} fullWidth />
            {onClear && value && (
                <IconButton size="small" aria-label="Clear search" title="Clear" onClick={onClear} sx={{ mr: 0.5, color: "#16133F" }}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            )}
            <IconWrapper>
                <SearchIcon />
            </IconWrapper>
        </SearchContainer>
    );
};

export default PSearch;
