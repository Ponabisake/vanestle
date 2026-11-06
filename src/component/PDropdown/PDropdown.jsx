import { useEffect, useMemo, useRef, useState } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Autocomplete,
  TextField,
  Typography,
  Tooltip
} from "@mui/material";

import { Labels } from "../../utils/constants/labels";
import { FontFamily, FontSize } from "../../utils/constants/fonts";
import { CommonColors } from "../../utils/constants/colors";
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined';
import { FormControlBaseStyle } from "../../utils/constants/styles";

/**
 * Popper.js modifier: make the option list exactly as wide as the field *on screen*.
 * (MUI uses the field's layout width, which is wider than what is shown when the
 * fit-to-screen zoom is active – see utils/commonFunction/fitToScreen.js.)
 */
const matchFieldWidth = {
  name: "matchFieldWidth",
  enabled: true,
  phase: "beforeWrite",
  requires: ["computeStyles"],
  fn: ({ state }) => {
    state.styles.popper.width = `${state.rects.reference.width}px`;
  },
  effect: ({ state }) => {
    state.elements.popper.style.width = `${state.elements.reference.getBoundingClientRect().width}px`;
  },
};
const popperModifiers = [matchFieldWidth];

const PDropdown = ({ name = "", label, value = "", onChange, options = [], required = false, helperText = "",
  width = "", mt = 0, flag = "", disabled = false, readOnly = false, sx = {}, labelMode = "" }) => {
  const defaultValueRef = useRef(false);
  const selectRef = useRef(null);
  const [menuWidth, setMenuWidth] = useState(null);
  useEffect(() => {
    if (value !== undefined && value !== null && value !== "") {
      defaultValueRef.current = false;
      return;
    }
    const selectedOption = options.find(option => option.selected === true);
    if (!selectedOption || defaultValueRef.current) {
      return;
    }
    defaultValueRef.current = true;
    onChange({
      target: {
        name,
        value: selectedOption.value,
        label: selectedOption.label
      }
    });
  }, [options, value, name, onChange]);

  const internalValue = useMemo(() => {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
    const selectedOption = options.find(option => option.selected);
    return selectedOption?.value ?? "";
  }, [value, options]);

  const selectedOption = useMemo(() =>
    options.find(option => option.value === internalValue) ?? null, [options, internalValue]
  );

  const baseSx = {
    width: width ? `${width}%` : "100%",
    minWidth: 0,
    mt,

    "& .MuiInputLabel-root": {
      fontFamily: FontFamily.regular,
      fontSize: FontSize.textField.label,
      color: "#9e9e9e",
      top: "0px",
      "&.Mui-focused": { color: "#49C9E9" },
      "&.Mui-error": { color: "#d32f2f" },
      "&.Mui-disabled": { color: "#bdbdbd" },
    },

    // Same height for normal Select and Autocomplete
    "& .MuiOutlinedInput-root": {
      height: "50px",
      minHeight: "50px",
      boxSizing: "border-box",
      borderRadius: "12px",
      backgroundColor: "#fcfbfd",
      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      fontFamily: FontFamily.bold,
      fontSize: FontSize.textField.input,
      color: "#424242",

      "& fieldset": {
        borderColor: helperText ? "#d32f2f" : "#ccc",
        borderWidth: "1.5px",
      },

      "&:hover fieldset": {
        borderColor: "#42A8C8",
      },

      "&.Mui-focused fieldset": {
        borderColor: "#ccc",
        borderWidth: "1.5px",
        boxShadow: "0 0 0 3px rgba(98,188,216,0.15)",
      },

      "& .MuiAutocomplete-popupIndicator": {
        pointerEvents: readOnly ? "none" : "auto",
        cursor: readOnly ? "default" : "pointer",
        opacity: readOnly ? 0.5 : 1,
      },
    },

    // Normal Select text alignment
    "& .MuiSelect-select": {
      height: "50px !important",
      minHeight: "0",
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      paddingTop: "0 !important",
      paddingBottom: "0 !important",
    },

    // Autocomplete input alignment
    "& .MuiAutocomplete-inputRoot": {
      height: "50px",
      minHeight: "50px",
      boxSizing: "border-box",
      paddingTop: "0 !important",
      paddingBottom: "0 !important",
    },

    "& .MuiAutocomplete-input": {
      padding: "0 !important",
    },

    "& .MuiFormHelperText-root": {
      fontFamily: FontFamily.bold,
      fontSize: FontSize.textField.error,
      color: CommonColors.textError,
      marginLeft: "2px",
      marginTop: "4px",
    },
  };

  const renderTextField = params => (
    <TextField
      {...params}
      label=""
      placeholder={labelMode === "inside" ? label : "Please Select"}
      required={required}
      error={!!helperText}
      helperText={helperText}
      InputLabelProps={{ shrink: false }}
    />
  );

  if (flag === Labels.flag.auto) {
    return (
      <>
        {labelMode === "" && (
          <Tooltip title={label?.length > 30 ? label : ""} arrow placement="top">
            <Typography style={{ fontSize: "16px", color: "#171717", marginBottom: "8px", whiteSpace: "nowrap", cursor: label?.length > 30 ? "pointer" : "default",}}>
              {label?.length > 30 ? `${label.slice(0, 30)}...` : label}
            </Typography>
          </Tooltip>

        )}
        <Autocomplete
          options={options}
          value={selectedOption}
          disableClearable
          disabled={readOnly}
          slots={{
            popupIndicator: KeyboardArrowDownOutlinedIcon,
          }}
          slotProps={{
            popper: { className: "pdropdown-popper", modifiers: popperModifiers },
          }}
          //disableClearable={!selectedOption}
          getOptionLabel={(option) => option?.label || ""}
          isOptionEqualToValue={(option, value) => option.value === value?.value}
          renderOption={(props, option) => (
            <li {...props} key={option.value}>
              {option.label}
            </li>
          )}
          onChange={(e, newValue) =>
            onChange({
              target: {
                name,
                value: newValue?.value,
                label: newValue?.label
              }
            })
          }
          sx={baseSx}
          renderInput={renderTextField}
        />
      </>
    );
  }

  return (
    <>
    {/* label sits outside the FormControl (like PTextField) so labels and boxes line up across a row */}
    {labelMode === "" && (
      <Tooltip title={label?.length > 30 ? label : ""} arrow placement="top">
        <Typography style={{ fontSize: "16px", color: "#171717", marginBottom: "8px", whiteSpace: "nowrap", cursor: label?.length > 30 ? "pointer" : "default", }}>
          {label?.length > 30 ? `${label.slice(0, 30)}...` : label}
        </Typography>
      </Tooltip>
    )}
    <FormControl
      fullWidth
      required={required}
      error={!!helperText}
      sx={baseSx}
      disabled={readOnly}
      ref={selectRef}
    >
      <Select
        onOpen={() => setMenuWidth(selectRef.current?.getBoundingClientRect().width ?? null)}
        MenuProps={{
          className: "pdropdown-menu",
          // list as wide as the field on screen (see matchFieldWidth above)
          slotProps: { paper: { style: menuWidth ? { minWidth: menuWidth } : undefined } },
        }}
        displayEmpty
        value={internalValue}
        name={name}
        renderValue={(selected) => selected ? (options.find((o) => o.value === selected)?.label) : (
          <span style={{ color: "#C6C7C8" }}>
            {labelMode === "inside" ? label : "Please Select"}
          </span>
        )}
        IconComponent={KeyboardArrowDownOutlinedIcon}
        onChange={(e) => {
          const selected = options.find((opt) => opt.value === e.target.value);
          onChange({
            target: {
              name: name,
              value: selected?.value,
              label: selected?.label
            }
          });
        }}
      >
        {!disabled && (
          <MenuItem value="">
            -- Choose --
          </MenuItem>
        )}

        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>

      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
    </>
  );
};

export default PDropdown;