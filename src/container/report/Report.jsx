
import { useState, useEffect } from "react";
import { Box, Divider } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import PGrid from "../../component/PGrid/PGrid";
import PTypography from "../../component/PTypography/PTypography";
import PDropdown from "../../component/PDropdown/PDropdown";
import PDatepicker from "../../component/PDatepicker/PDatepicker";
import PButton from "../../component/PButton/PButton";
import PHeadingAccent, { PmgColors } from "../../component/PHeadingAccent/PHeadingAccent";
import { Labels } from "../../utils/constants/labels";
import { CommonColors } from "../../utils/constants/colors";
import { FontWeight } from "../../utils/constants/fonts";
import { useLanguage } from "../../utils/constants/language";
import { PostApi } from "../../utils/api/networking";
import { Dashboard_API, Report_API } from "../../utils/api/apiUrl";
import { formatDate, getOptionLabel, parseDate, toast, notifyValidation } from "../../utils/commonFunction/common";
import { useSelector } from "react-redux";

// Report types (same for every role): label is what the user sees, value is what the procedures expect in @Type
const REPORT_TYPES = [
    { label: "All", value: "All" },
    { label: "Enquiries", value: "Enquiries" },
    { label: "eBidding", value: "E-Bidding" },
    { label: "Ecatalog", value: "Catalog" },
];

// Status From / Status To: only these tblJobStatus statuses (0 = All -> procedure default range)
// 2 Quotes Received From Suppliers, 3 Quote Sent To Customer, 7 Order Raised, 18 Delivery Complete, 24 Completed
const REPORT_JOB_STATUS = [2, 3, 7, 18, 24];

// Sheets the export workbook contains (VAController.GetReport)
const EXPORT_SHEETS = ["Savings Data", "Job Cancelled", "Performance Survey", "Performance Survey New"];

const EMPTY_FILTERS = { statusFrom: 0, statusTo: 0, fromDate: "", toDate: "" };

// dd/mm/yyyy -> yyyy-mm-dd (the procedures compare CONVERT(char(10), servertime, 126) as text)
const toIsoDate = (value, addDays = 0) => {
    const d = parseDate(value);
    d.setDate(d.getDate() + addDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const DATE_PRESETS = [
    {
        label: "This month", range: (t) => [new Date(t.getFullYear(), t.getMonth(), 1), t]
    },
    {
        label: "Last month", range: (t) => [new Date(t.getFullYear(), t.getMonth() - 1, 1), new Date(t.getFullYear(), t.getMonth(), 0)]
    },
    {
        label: "Last 3 months", range: (t) => [new Date(t.getFullYear(), t.getMonth() - 3, t.getDate()), t]
    },
    {
        label: "Year to date", range: (t) => [new Date(t.getFullYear(), 0, 1), t]
    },
];

/** Numbered step heading inside the filter card. */
const StepHeading = ({ step, title, hint }) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
        <Box sx={{
            width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            bgcolor: PmgColors.navy, color: "white", fontSize: 14, fontWeight: 700
        }}>
            {step}
        </Box>
        <Box>
            <Box sx={{ fontSize: 16, fontWeight: 700, color: PmgColors.navy, lineHeight: 1.2 }}>{title}</Box>
            {hint && <Box sx={{ fontSize: 13, color: PmgColors.indigo, opacity: 0.8 }}>{hint}</Box>}
        </Box>
    </Box>
);


const Report = () => {
    const { getLabel } = useLanguage();
    const { userID, userType, role, countryID, country: userCountry } = useSelector((state) => state.userDetails.user);
    const isAdmin = role === Labels.role.admin;

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [formData, setFormData] = useState({
        typeOfReport: "All",
        country: isAdmin ? 0 : countryID,
        ...EMPTY_FILTERS
    });
    const [errors, setErrors] = useState({});
    const [formDataList, setFormDataList] = useState({
        typeOfReport: REPORT_TYPES,
        country: [],
        jobStatus: [],
    });

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
            const jobStatus = [
                { value: 0, label: "All" },
                ...response.status
                    .filter(status => REPORT_JOB_STATUS.includes(status.value))
                    .sort((a, b) => a.value - b.value)
            ];

            // Administration: all countries (with "All"). ClientServices: only the logged-in country.
            const countries = isAdmin
                ? [{ value: 0, label: "All" }, ...response.country]
                : response.country.filter(c => c.value === countryID);

            setFormDataList(prev => ({
                ...prev,
                country: countries,
                jobStatus
            }));
            setFormData(prev => ({
                ...prev,
                country: isAdmin ? 0 : countryID
            }));
        } catch (error) {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: "" }));
    };

    const applyPreset = (preset) => {
        const [from, to] = preset.range(new Date());
        setFormData(prev => ({ ...prev, fromDate: formatDate(from), toDate: formatDate(to) }));
        setErrors(prev => ({ ...prev, fromDate: "", toDate: "" }));
    };

    const handleReset = () => {
        setFormData(prev => ({
            ...prev,
            ...EMPTY_FILTERS,
            typeOfReport: "All",
            ...(isAdmin && { country: 0 })
        }));
        setErrors({});
    };

    const ReportValidation = () => {
        const newErrors = {};
        if (!formData.typeOfReport) newErrors.typeOfReport = Labels.commonLabel.required;
        if (!isAdmin && !formData.country) newErrors.country = Labels.commonLabel.required;
        if (!formData.fromDate) newErrors.fromDate = Labels.commonLabel.required;
        if (!formData.toDate) newErrors.toDate = Labels.commonLabel.required;
        if (Number(formData.statusFrom) > 0 && Number(formData.statusTo) > 0
            && Number(formData.statusFrom) > Number(formData.statusTo)) {
            newErrors.statusTo = "Status To must come after Status From";
        }
        setErrors(newErrors);
        notifyValidation(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!ReportValidation()) return;
        try {
            setGenerating(true);
            const response = await PostApi(Report_API.GetReport, {
                // dates are shown as DD/MM/YYYY but EB_GetReport needs YYYY-MM-DD (both days inclusive)
                startDate: toIsoDate(formData.fromDate),
                endDate: toIsoDate(formData.toDate),
                role: role,
                countryId: isAdmin ? Number(formData.country) || 0 : countryID,
                reportType: formData.typeOfReport, // Enquiries / E-Bidding / Catalog / All
                statusFrom: String(formData.statusFrom || 0),
                statusTo: String(formData.statusTo || 0),
                tco: "",
                userType: userType
            });
            if (response instanceof Blob) {
                const dateTime = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
                const excelUrl = URL.createObjectURL(response);
                const a = document.createElement("a");
                a.href = excelUrl;
                a.download = `Report_${dateTime}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(excelUrl), 1000);
            }
        } catch (error) {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        } finally {
            setGenerating(false);
        }
    };

    // live summary of the current selection
    const selectedCountry = getOptionLabel(formDataList.country, formData.country) || userCountry || "-";
    const summary = [
        { label: "Report", value: getOptionLabel(formDataList.typeOfReport, formData.typeOfReport) || "-" },
        { label: "Country", value: selectedCountry },
        {
            label: "Job status",
            value: `${getOptionLabel(formDataList.jobStatus, formData.statusFrom) || "All"} → ${getOptionLabel(formDataList.jobStatus, formData.statusTo) || "All"}`
        },
        {
            label: "Period",
            value: formData.fromDate && formData.toDate ? `${formData.fromDate} → ${formData.toDate}` : "Not selected"
        },
    ];

    const cardSx = {
        bgcolor: "background.paper",
        borderRadius: "16px",
        border: `1px solid ${PmgColors.navy}14`,
        boxShadow: `0 10px 30px ${PmgColors.navy}0F`,
    };

    return (
        <Box sx={{ py: 3 }}>
            {/* Header */}
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 2, mb: 3 }}>
                <Box>
                    <PHeadingAccent color={PmgColors.red} />
                    <PTypography labelText={getLabel("lbl150")} flag={"big"} weight={FontWeight.regular} />
                    <Box sx={{ mt: 0.5, fontSize: 15, color: PmgColors.indigo }}>
                        Pick the scope, job status and period, then export the workbook to Excel.
                    </Box>
                </Box>

                {/* access scope chip */}
                <Box sx={{
                    display: "inline-flex", alignItems: "center", gap: 1, px: 2, py: 1, borderRadius: 999,
                    bgcolor: isAdmin ? `${PmgColors.green}14` : `${PmgColors.indigo}12`,
                    border: `1px solid ${isAdmin ? PmgColors.green : PmgColors.indigo}40`,
                    color: isAdmin ? PmgColors.green : PmgColors.indigo, fontSize: 13, fontWeight: 600
                }}>
                    {isAdmin ? <PublicOutlinedIcon fontSize="small" /> : <LockOutlinedIcon fontSize="small" />}
                    {isAdmin ? "Administrator · all countries" : `Client Services · ${userCountry || "your country"} only`}
                </Box>
            </Box>

            <PGrid container className="g-4">
                {/* Filters */}
                <PGrid item xs={12} md={8}>
                    {/* no overflow:hidden here - the datepicker calendar opens inside the card and must not be clipped */}
                    <Box sx={{ ...cardSx, position: "relative" }}>
                        <Box sx={{ height: 6, borderRadius: "16px 16px 0 0", background: `linear-gradient(90deg, ${PmgColors.red}, ${PmgColors.orange}, ${PmgColors.gold}, ${PmgColors.green}, ${PmgColors.indigo})` }} />
                        <Box sx={{ p: { xs: 2, md: 4 } }}>
                            <StepHeading step={1} title="Scope" hint="Which country and report" />
                            <PGrid container className="g-3">
                                <PGrid item xs={12} sm={6} md={6}>
                                    <PDropdown
                                        name={Labels.report.country}
                                        label={`${getLabel("lbl09")} ${Labels.symbols.required}`}
                                        value={formData.country}
                                        onChange={handleChange}
                                        options={formDataList.country}
                                        width={100}
                                        helperText={errors.country}
                                        flag={Labels.flag.auto}
                                        readOnly={!isAdmin}
                                    />
                                </PGrid>
                                <PGrid item xs={12} sm={6} md={6}>
                                    <PDropdown
                                        name={Labels.report.typeOfReport}
                                        label={`Type Of Report ${Labels.symbols.required}`}
                                        value={formData.typeOfReport}
                                        onChange={handleChange}
                                        options={formDataList.typeOfReport}
                                        width={100}
                                        helperText={errors.typeOfReport}
                                    />
                                </PGrid>
                            </PGrid>

                            <Divider sx={{ my: 3, borderColor: `${PmgColors.navy}14` }} />

                            <StepHeading step={2} title="Job status" hint="Leave both on All for the standard range" />
                            <PGrid container className="g-3">
                                <PGrid item xs={12} sm={6} md={6}>
                                    <PDropdown
                                        name="statusFrom"
                                        label="Status From"
                                        value={formData.statusFrom}
                                        onChange={handleChange}
                                        options={formDataList.jobStatus}
                                        width={100}
                                        helperText={errors.statusFrom}
                                        flag={Labels.flag.auto}
                                    />
                                </PGrid>
                                <PGrid item xs={12} sm={6} md={6}>
                                    <PDropdown
                                        name="statusTo"
                                        label="Status To"
                                        value={formData.statusTo}
                                        onChange={handleChange}
                                        options={formDataList.jobStatus}
                                        width={100}
                                        helperText={errors.statusTo}
                                        flag={Labels.flag.auto}
                                    />
                                </PGrid>
                            </PGrid>

                            <Divider sx={{ my: 3, borderColor: `${PmgColors.navy}14` }} />

                            <StepHeading step={3} title="Period" hint="Enquiry created between these dates" />
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                                {DATE_PRESETS.map(preset => {
                                    const [from, to] = preset.range(new Date());
                                    const active = formData.fromDate === formatDate(from) && formData.toDate === formatDate(to);
                                    return (
                                        <Box key={preset.label} component="button" type="button"
                                            onClick={() => applyPreset(preset)}
                                            aria-pressed={active}
                                            sx={{
                                                px: 1.75, py: 0.75, borderRadius: 999, cursor: "pointer",
                                                fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                                                border: `1px solid ${active ? PmgColors.orange : `${PmgColors.navy}26`}`,
                                                bgcolor: active ? PmgColors.orange : "transparent",
                                                color: active ? "white" : PmgColors.navy,
                                                transition: "0.2s",
                                                "&:hover": { borderColor: PmgColors.orange, color: active ? "white" : PmgColors.orange },
                                                "&:focus-visible": { outline: `2px solid ${PmgColors.orange}`, outlineOffset: 2 }
                                            }}
                                        >
                                            {preset.label}
                                        </Box>
                                    );
                                })}
                            </Box>
                            <PGrid container className="g-3">
                                <PGrid item xs={12} sm={6} md={6}>
                                <PDatepicker
                                    name={Labels.report.fromDate}
                                    label={`From Date ${Labels.symbols.required}`}
                                    value={formData.fromDate}
                                    onChange={handleChange}
                                    width={100}
                                    helperText={errors.fromDate}
                                    maxDate={formData.toDate}
                                />
                                </PGrid>
                                <PGrid item xs={12} sm={6} md={6}>
                                <PDatepicker
                                    name={Labels.report.toDate}
                                    label={`To Date ${Labels.symbols.required}`}
                                    value={formData.toDate}
                                    onChange={handleChange}
                                    width={100}
                                    helperText={errors.toDate}
                                    minDate={formData.fromDate}
                                />
                                </PGrid>
                            </PGrid>
                        </Box>

                        {/* actions */}
                        <Box sx={{
                            display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 2,
                            px: { xs: 2, md: 4 }, py: 2.5,
                            bgcolor: `${PmgColors.navy}06`, borderTop: `1px solid ${PmgColors.navy}14`,
                            borderRadius: "0 0 16px 16px"
                        }}>
                            <PButton
                                label={getLabel("lbl123")}
                                variant="outlined"
                                onClick={handleReset}
                                width={180}
                                disabled={loading || generating}
                            />
                            <PButton
                                label={<span className="text">{getLabel("lbl126")}</span>}
                                variant="contained"
                                color={CommonColors.dark_blue}
                                onClick={handleSubmit}
                                width={200}
                                loading={generating}
                                disabled={loading}
                                startIcon={<FileDownloadOutlinedIcon />}
                            />
                        </Box>
                    </Box>
                </PGrid>

                {/* Summary */}
                <PGrid item xs={12} md={4}>
                    <Box sx={{ ...cardSx, overflow: "hidden", position: { md: "sticky" }, top: { md: 100 } }}>
                        <Box sx={{
                            px: 3, py: 2.5,
                            background: `linear-gradient(135deg, ${PmgColors.navy} 0%, ${PmgColors.indigo} 100%)`,
                            borderLeft: `5px solid ${PmgColors.gold}`, color: "white"
                        }}>
                            <Box sx={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: PmgColors.gold, fontWeight: 700 }}>
                                Export summary
                            </Box>
                            <Box sx={{ fontSize: 20, fontWeight: 700, mt: 0.5 }}>
                                {summary[0].value} report
                            </Box>
                        </Box>
                        <Box sx={{ px: 3, py: 1 }}>
                            {summary.slice(1).map((row, index, rows) => (
                                <Box key={row.label} sx={{
                                    display: "flex", justifyContent: "space-between", gap: 2, py: 1.5,
                                    borderBottom: index < rows.length - 1 ? `1px dashed ${PmgColors.navy}1F` : "none"
                                }}>
                                    <span style={{ fontSize: 13, color: PmgColors.indigo }}>{row.label}</span>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: PmgColors.navy, textAlign: "right" }}>{row.value}</span>
                                </Box>
                            ))}
                        </Box>
                        <Box sx={{ px: 3, py: 2.5, bgcolor: `${PmgColors.orange}0D`, borderTop: `1px solid ${PmgColors.orange}33` }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.25, color: PmgColors.orange, fontSize: 13, fontWeight: 700 }}>
                                <TableChartOutlinedIcon fontSize="small" /> Sheets in the workbook
                            </Box>
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                                {EXPORT_SHEETS.map(sheet => (
                                    <Box key={sheet} sx={{
                                        px: 1.25, py: 0.5, borderRadius: "6px", fontSize: 12, fontWeight: 600,
                                        bgcolor: "background.paper", color: PmgColors.navy, border: `1px solid ${PmgColors.navy}1F`
                                    }}>
                                        {sheet}
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </Box>
                </PGrid>
            </PGrid>
        </Box>
    );
};
export default Report;
