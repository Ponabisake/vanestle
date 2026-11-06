
import { Box } from "@mui/material";
import PGrid from "../../component/PGrid/PGrid";
import PTypography from "../../component/PTypography/PTypography";
import { Labels } from "../../utils/constants/labels";
import { CommonColors } from "../../utils/constants/colors";
import { FontWeight } from "../../utils/constants/fonts";
import PDropdown from "../../component/PDropdown/PDropdown";
import { useState, useEffect } from "react";
import PDatepicker from "../../component/PDatepicker/PDatepicker";
import PButton from "../../component/PButton/PButton";
import { useLanguage } from "../../utils/constants/language";
import arrow from "../../utils/assets/images/arrow_white.svg";
import { Divider } from "@mui/material";
import { PostApi } from "../../utils/api/networking";
import { Dashboard_API, Report_API } from "../../utils/api/apiUrl";
import { getOptionLabel, toast, notifyValidation } from "../../utils/commonFunction/common";
import { useSelector } from "react-redux";

const Report = () => {
    const { getLabel } = useLanguage();
    const { userID, userType, role, countryID } = useSelector((state) => state.userDetails.user);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false); // Generate report button only
    const [formData, setFormData] = useState({
        clientName: "",
        typeOfReport: "",
        country: "",
        jobStatus: "",
        fromDate: "",
        toDate: ""
    });

    const [errors, setErrors] = useState({
        clientName: "",
        typeOfReport: "",
        country: "",
        jobStatus: "",
        fromDate: "",
        toDate: ""
    });

    const [formDataList, setFormDataList] = useState({
        clientName: [],
        typeOfReport: [{ label: "All", value: 0, selected: true }, { label: "Enquries", value: 1 }, { label: "Ebidding", value: 2 }, { label: "Ecatalogue", value: 3 }],
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
            const allowedJobStatus = [2, 3, 7, 18, 24];
            const jobStatus = [{ value: 0, label: "All", selected: true },
            ...response.status.filter(status => allowedJobStatus.includes(status.value))];
            setFormDataList(prev => ({
                ...prev,
                country: response.country,
                jobStatus: jobStatus,
                clientName: response.client
            }));
            setFormData(prev => ({
                ...prev,
                country: countryID,
            }));
        } catch (error) {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        } finally {
            setLoading(false);
        }
    };
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
    const handleReset = () => {
        setFormData((prev) => ({
            ...prev,
            typeOfReport: "",
            jobStatus: "",
            fromDate: "",
            toDate: "",
        }));
        setErrors((prev) => ({
            ...prev,
            typeOfReport: "",
            jobStatus: "",
            fromDate: "",
            toDate: "",
        }));
    }

    const ReportValidation = () => {
        const requiredFields = [
            Labels.report.clientName,
            Labels.report.country,
            Labels.report.fromDate,
            Labels.report.toDate,
        ];
        const allowZeroFields = [
            Labels.report.typeOfReport,
            Labels.report.jobStatus,
        ];
        let newErrors = {};
        requiredFields.forEach((field) => {
            const value = formData[field];
            if (allowZeroFields.includes(field)) {
                if (value === "" || value === null || value === undefined) {
                    newErrors[field] = Labels.commonLabel.required;
                }
            } else {
                if (!value) {
                    newErrors[field] = Labels.commonLabel.required;
                }
            }
        });
        setErrors(newErrors);
        notifyValidation(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        const isValid = ReportValidation();
        if (isValid) {
            try {
                setGenerating(true);
                const response = await PostApi(Report_API.GetReport, {
                    startDate: formData.fromDate,
                    endDate: formData.toDate,
                    role: role,
                    userClientId: userID,
                    countryId: formData.country,
                    reportType: getOptionLabel(formDataList.typeOfReport, formData.typeOfReport),
                    clientName: getOptionLabel(formDataList.clientName, formData.clientName),
                    tco: "",
                    userType: userType
                });
                if (response instanceof Blob) {
                    const blob = response;
                    const dateTime = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
                    const excelUrl = URL.createObjectURL(blob);
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
        }
    }

    return (
        <>
            <Box sx={{ py: 3 }}>
                <PGrid container className={Labels.margin.mb4} >
                    <PTypography
                        labelText={getLabel("lbl150")}
                        flag={"big"}
                        weight={FontWeight.regular}
                    />
                    <PGrid item xs={12} sm={12} md={12} >
                        <PGrid container className={Labels.margin.mt4}>
                            <PGrid item xs={12} sm={6} md={4}>
                                <PDropdown
                                    name={Labels.report.clientName}
                                    label={`${getLabel("lbl28")} ${Labels.symbols.required} `}
                                    value={formData.clientName}
                                    onChange={handleChange}
                                    options={formDataList.clientName}
                                    width={100}
                                    helperText={errors?.clientName}
                                    flag={Labels.flag.auto}
                                />
                            </PGrid>
                            <PGrid item xs={12} sm={6} md={4}>
                                <PDropdown
                                    name={Labels.report.typeOfReport}
                                    label={`${"Type Of Report"} ${Labels.symbols.required}`}
                                    value={formData.typeOfReport}
                                    onChange={handleChange}
                                    options={formDataList.typeOfReport}
                                    width={100}
                                    helperText={errors?.typeOfReport}
                                    flag={Labels.flag.auto}
                                />
                            </PGrid>
                            <PGrid item xs={12} sm={6} md={4}>
                                <PDropdown
                                    name={Labels.report.country}
                                    label={`${getLabel("lbl09")} ${Labels.symbols.required}`}
                                    value={formData.country}
                                    onChange={handleChange}
                                    options={formDataList.country}
                                    width={100}
                                    helperText={errors?.country}
                                    flag={Labels.flag.auto}
                                    readOnly={true}
                                />
                            </PGrid>
                        </PGrid>
                        <PGrid container className={Labels.margin.mt4} >
                            <PGrid item xs={12} sm={6} md={4}>
                                <PDropdown
                                    name={Labels.report.jobStatus}
                                    label={`${'Job Status'} ${Labels.symbols.required}`}
                                    value={formData.jobStatus}
                                    onChange={handleChange}
                                    options={formDataList.jobStatus}
                                    width={100}
                                    helperText={errors?.jobStatus}
                                    flag={Labels.flag.auto}
                                />
                            </PGrid>
                            <PGrid item xs={12} sm={6} md={4}>
                                <PDatepicker
                                    name={Labels.report.fromDate}
                                    label={`${"From Date"} ${Labels.symbols.required}`}
                                    value={formData.fromDate}
                                    onChange={handleChange}
                                    width={100}
                                    helperText={errors?.fromDate}
                                    maxDate={formData.toDate}
                                />
                            </PGrid>
                            <PGrid item xs={12} sm={6} md={4}>
                                <PDatepicker
                                    name={Labels.report.toDate}
                                    label={`${"To Date"} ${Labels.symbols.required}`}
                                    value={formData.toDate}
                                    onChange={handleChange}
                                    width={100}
                                    helperText={errors?.toDate}
                                    minDate={formData.fromDate}
                                />
                            </PGrid>
                        </PGrid>

                        <Divider sx={{ mb: 2, mt: 4 }}></Divider>

                        <PGrid container className="d-flex align-items-center justify-content-between">
                            <PGrid item xs={12} sm={6} md={8}>
                            </PGrid>

                            <PGrid item xs={12} sm={6} md={4} className="d-flex justify-content-end gap-2">
                                <PButton
                                    label={getLabel("lbl123")}
                                    variant="outlined"
                                    onClick={(e) => handleReset(e)}
                                    width={180}
                                    disabled={loading || generating}
                                />
                                <PButton
                                    label={<span className="text">{getLabel("lbl126")}</span>}
                                    variant="contained"
                                    color={CommonColors.dark_blue}
                                    onClick={(e) => handleSubmit(e, true)}
                                    width={180}
                                    loading={generating}
                                    disabled={loading}
                                    startIcon={<img src={arrow} alt="arrow" className="icon" />}
                                />
                            </PGrid>
                        </PGrid>
                    </PGrid>
                </PGrid>
            </Box>
        </>
    )
};
export default Report;