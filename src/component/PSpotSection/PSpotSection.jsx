import { useEffect, useState } from "react";
import { Box, Divider } from "@mui/material";
import PTable from "../PTable/PTable";
import PGrid from "../PGrid/PGrid";
import PTypography from "../PTypography/PTypography";
import { Labels } from "../../utils/constants/labels";
import { CommonColors } from "../../utils/constants/colors";
import { FontWeight } from "../../utils/constants/fonts";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import PButton from "../PButton/PButton";
import { useLanguage } from "../../utils/constants/language";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import arrow from "../../utils/assets/images/arrow_white.svg";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CompareOutlinedIcon from "@mui/icons-material/CompareOutlined";
import RuleOutlinedIcon from "@mui/icons-material/RuleOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import { PPillButton } from "../PLineItem/PLineItem";
import { PSectionHeading, PmgColors } from "../PHeadingAccent/PHeadingAccent";
import PTextField from "../PTextField/PTextField";
import PDropdown from "../PDropdown/PDropdown";
import { getOptionLabel, getOptionValue, isSuccess, toast, notifyValidation } from "../../utils/commonFunction/common";
import PDialog from "../PDialog/PDialog";
import ImpactSummary from "./ImpactSummary";
import { ProjectEnquiry_API, Spot_API } from "../../utils/api/apiUrl";
import { useLocation } from "react-router-dom";
import { GetApi, PostApi } from "../../utils/api/networking";
import CircularProgress from "@mui/material/CircularProgress";
import { useSelector } from "react-redux";

// onSaved: optional; called after any SPOT save so the parent can re-check completion
const PSpotSection = ({ response, onSaved }) => {
    const { getLabel } = useLanguage();
    const [loading, setLoading] = useState(true);
    const { id } = useSelector((state) => state.userDetails.user);
    const [formData, setFormData] = useState({
        epdSpot: true,
        emmdSpot: true,
        factor: false,
        compare: false,
        nonCompare: false,
        impact: false,
        id: "",
        material: "",
        type: "",
        weight: "",
        reason: "",
        data: null
    });

    const [formDataList, setFormDataList] = useState({
        mainMaterial: [],
        packagingMaterial: [],
        impactMaterial: [],
        comparativeImpactMaterial: [],
        totalMaterial: [],
        enviromantalImpactMaterial: [],
        packageComparativeImpact: [],
        //materialUsed: [],
        bindMaterial: [],
        environmentalType: [],
        impactDetails: [],

        emissionFactors: [{ field: "country", header: getLabel("lbl09") }, { field: "emissionFactor", header: getLabel("lbl189"), align: "right" }],
        emissionFactorsData: [{ country: "Australia", emissionFactor: 0.76 }, { country: "China", emissionFactor: 0.8953 },
        { country: "India", emissionFactor: 0.9405 }, { country: "Indonesia", emissionFactor: 0.811 },
        { country: "Japan", emissionFactor: 0.471 }, { country: "Malaysia", emissionFactor: 0.67 },
        { country: "New Zealand", emissionFactor: 0.12 }, { country: "Phillipines", emissionFactor: 0.7122 },
        { country: "Singapore", emissionFactor: 0.408 }, { country: "South Korea", emissionFactor: 0.625 }, { country: "Thailand", emissionFactor: 0.529 },
        { country: "Vietnam", emissionFactor: 0.9242 },]
    });

    const [errors, setErrors] = useState({
        material: "",
        type: "",
        weight: "",
        reason: ""
    });

    // row action icons sit inside PPillButton, which owns colour/hover
    const actionIconSx = { fontSize: 18 };

    
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const spot = await GetApi(`${Spot_API.GetSpotEnvItems}?enqId=${id}`);
            const response = await GetApi(`${Spot_API.GetSpotEnvironmentResult}?enqId=${id}`);
            if (isSuccess(response)) {
                const main = [...new Map(spot.data.main.map(x => [x.itemnumber, x])).values()].map(x => ({
                    isSubTitle: true,
                    subTitle: x.itemName,
                    items: spot.data.main.filter(y => y.itemnumber === x.itemnumber)
                }));

                setFormDataList(prev => ({
                    ...prev,
                    mainMaterial: main,
                    packagingMaterial: spot.data.package,
                    impactMaterial: response.data.mainEnvironmental,
                    comparativeImpactMaterial: response.data.mainComparative,
                    totalMaterial: response.data.totalEnvResults,
                    enviromantalImpactMaterial: response.data.packageEnvironmental,
                    packageComparativeImpact: response.data.packageComparative
                }));
            }
        } catch (error) {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        } finally {
            setLoading(false);
        }
    };

    const handleView = async (row, flag) => {
        try {
            let response;
            if (flag === "compare") {
                response = await GetApi(`${Spot_API.GetComparativeImpactDetails}?id=${row.id}`);
            }
            else if (flag === "total") {
                response = await GetApi(`${Spot_API.GetTotalImpactDetails}?enqDetailsid=${row.enqDetailsid}`);
            }
            else {
                response = await GetApi(`${Spot_API.GetEnvironmentImpactDetails}?id=${row.id}`);
            }
            if (isSuccess(response)) {
                setFormDataList(prev => ({
                    ...prev,
                    impactDetails: response.data,
                }));
                setFormData((prev) => ({
                    ...prev,
                    impact: true
                }));
            }
        } catch (error) {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        }
    };

    const handleEdit = async (row) => {
        if (row.materialused) {
            await BindMaterial(row.materialused);
        }
        if (row.material) {
            await EnvironmentalType(row.material);
        }
        setFormData(prev => ({
            ...prev,
            id: row.id
        }));
    };

    const handleCancel = async () => {
        setFormData((prev) => ({
            ...prev,
            id: ""
        }));
        await fetchData();
    };

    const handleSave = async (row) => {
        const payload = [{
            materialused: row.materialused,
            material: row.material,
            typeofmaterial: row.typeofmaterial,
            weight: row.weight,
            unit: row.unit,
            enqDetailsId: row.enqDetailsid,
            enqId: row.enqid,
            id: row.id,
            type: row.type,
        }];
        try {
            const response = await PostApi(Spot_API.UpdateEnvironmental, payload);
            if (isSuccess(response)) {
                toast(Labels.status.success, response.data);
                await handleCancel();
                await onSaved?.();
            }
        } catch (error) {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        }
    };

    const renderActions = (row) => {
        const flag = formData.id === row.id;
        return (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {flag ? (
                    <>
                        <PPillButton iconOnly label="Save" icon={<SaveOutlinedIcon sx={actionIconSx} />}
                            onClick={() => handleSave(row)} />
                        <PPillButton iconOnly label="Cancel" icon={<CloseOutlinedIcon sx={actionIconSx} />}
                            onClick={handleCancel} />
                    </>
                ) : (
                    <PPillButton iconOnly label="Edit" icon={<EditOutlinedIcon sx={actionIconSx} />}
                        onClick={() => handleEdit(row)} />
                )}
            </div>
        );
    };

    const renderViewActions = (row, flag = "") => {
        let data = null;
        if (["impact"].includes(flag) && row.type == "Main") {
            data = formDataList.comparativeImpactMaterial.find(item => item.id == row.id)
        }
        else if (["impact"].includes(flag) && row.type == "Package") {
            data = formDataList.packageComparativeImpact.find(item => item.id == row.id)
        }
        data = data ?? row;
        return (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <PPillButton iconOnly label="View" icon={<VisibilityOutlinedIcon sx={actionIconSx} />}
                    onClick={() => handleView(row, flag)} />

                {["impact"].includes(flag) && (
                    <PPillButton iconOnly label="Compare" icon={<CompareOutlinedIcon sx={actionIconSx} />}
                            onClick={async () => {
                                const materialOptions = await BindMaterial(data?.materialused ?? row.materialused, "Compare");
                                const typeOptions = await EnvironmentalType(data?.compareEnvironmentalPaperName ?? row.environmentalPaperName);

                                setFormData(prev => ({
                                    ...prev,
                                    compare: true,
                                    data: data,
                                    material: getOptionValue(materialOptions, data?.compareEnvironmentalPaperName),
                                    type: getOptionValue(typeOptions, data?.compareEnvironmentalPaperGrade),
                                    weight: data?.compareEnvironmentalPaperQuantity ?? row.environmentalPaperQuantity
                                }));
                            }}
                    />
                )}

                {[1].includes(Number(row.flag)) && (
                    <PPillButton iconOnly label="Non-Compare" icon={<RuleOutlinedIcon sx={actionIconSx} />}
                        onClick={() => setFormData((prev) => ({
                            ...prev,
                            nonCompare: true,
                            data: data,
                            reason: data?.compareEnvReason
                        }))}
                    />
                )}
            </div>
        );
    };

    const handleRowChange = (id, field, value) => {
        setFormDataList((prev) => ({
            ...prev,

            mainMaterial: (prev.mainMaterial ?? []).map((group) => ({
                ...group,
                items: (group.items ?? []).map((row) =>
                    row.id === id
                        ? { ...row, [field]: value }
                        : row
                )
            })),

            packagingMaterial: (prev.packagingMaterial ?? []).map((row) =>
                row.id === id
                    ? { ...row, [field]: value }
                    : row
            )
        }));
    };

    const handleChange = async (e) => {
        const { name, value, label } = e.target;
        let data = value;
        if (name === "weight") {
            data = value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")
        }
        if (name == "material") {
            await EnvironmentalType(label)
        }
        setFormData((prev) => ({
            ...prev,
            [name]: data
        }));
        setErrors((prev) => ({
            ...prev,
            [name]: "",
        }));

    };

    const SpotValidation = (flag) => {
        const requiredFields = flag === "nonCompare" ? ["reason"]
            : ["material", "type", "weight"];

        let newErrors = {};
        requiredFields.forEach((field) => {
            const value = formData[field];
            if (value === "" || value === null || value === undefined) {
                newErrors[field] = Labels.commonLabel.required;
            }
        });
        setErrors(newErrors);
        notifyValidation(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    const handleUpdate = async (e, flag) => {
        const isValid = SpotValidation(flag);
        if (!isValid) return;
        try {
            let res;
            if (flag === "nonCompare") {
                const nonpayload = [{
                    compareEnvReason: formData.reason,
                    enqDetailsid: formData.data.enqDetailsid,
                    enqId: formData.data.enqid,
                    id: formData.data.id,
                    type: formData.data.type,
                }];
                res = await PostApi(Spot_API.UpdateNoCompareReason, nonpayload);
            } else {
                const comparepayload = [{
                    enqDetailsid: formData.data.enqDetailsid,
                    enqId: formData.data.enqid,
                    id: formData.data.id,
                    type: formData.data.type,
                    materialused: formData.data.materialused,
                    material: getOptionLabel(formDataList.bindMaterial, formData.material),
                    typeofmaterial: getOptionLabel(formDataList.environmentalType, formData.type),
                    weight: formData.weight,
                }];
                res = await PostApi(Spot_API.UpdateComparativeEnvironmental, comparepayload);
            }
            toast(Labels.status.success, res.data);
            setFormData(prev => ({
                ...prev,
                data: null,
                [flag]: false,
            }))
            await fetchData();
            await onSaved?.();
        } catch (error) {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        }
    };

    const BindMaterial = async (materialused, type = "") => {
        const response = await GetApi(`${Spot_API.BindMaterial}?materialUsed=${materialused}&Type=${type}`);
        try {
            setFormDataList(prev => ({
                ...prev,
                bindMaterial: response
            }));
            return response;
        } catch (error) {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        } finally {
            //setLoading(false);
        }
    };

    const EnvironmentalType = async (material) => {
        try {
            const response = await GetApi(`${Spot_API.GetEnvironmentalType}?material=${material}`);
            setFormDataList(prev => ({
                ...prev,
                environmentalType: response
            }));
            return response;
        } catch (error) {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        } finally {
            //setLoading(false);
        }
    };

    const unit = [{ value: 1, label: "Kilograms", selected: true },];

    const renderTextInputField = (field) => ({
        render: (row) => {
            if (formData.id !== row.id) {
                return row[field] || "";
            }
            return (
                <PTextField
                    name={field}
                    value={row[field]}
                    onChange={(e) => handleRowChange(row.id, field, e.target.value.replace(/[^0-9.]/g, ""))}
                    inputProps={{ inputMode: "decimal" }}
                    width={100}
                    sx={{
                        "& .MuiInputBase-root": {
                            height: 40,
                            minHeight: 40
                        },
                        "& .MuiOutlinedInput-input": {
                            height: "auto",
                            textAlign: "right",
                            fontVariantNumeric: "tabular-nums"
                        }
                    }}
                />
            )
        }
    });

    const renderDropdownField = (field, option = []) => ({
        render: (row) => {
            const value = getOptionValue(option, row[field]) ?? "";
            if (formData.id !== row.id) return row[field] || "";
            return (
                <PDropdown
                    name={field}
                    value={value}
                    options={option}
                    onChange={e => handleMaterialChange(row, field, e, option)}
                    width={100}
                    sx={{
                        "& .MuiInputBase-root": {
                            height: 40,
                            minHeight: 40
                        }
                    }}
                    disabled={true}
                />
            )
        }
    });

    const handleMaterialChange = async (row, field, e, options) => {
        const label = getOptionLabel(options, e.target.value);
        if (field === "materialused") {
            await BindMaterial(label);
        }
        if (field === "material") {
            await EnvironmentalType(label);
        }
        handleRowChange(row.id, field, e.target.label);
    };

    const mainMaterial = [{ field: "materialused", header: getLabel("lbl201"), ...renderDropdownField("materialused", response) }
        , { field: "material", header: getLabel("lbl197"), ...renderDropdownField("material", formDataList.bindMaterial) }
        , { field: "typeofmaterial", header: getLabel("lbl311"), ...renderDropdownField("typeofmaterial", formDataList.environmentalType) }
        , { field: "weight", header: getLabel("lbl313"), align: "right", ...renderTextInputField("weight") }
        , { field: "unit", header: getLabel("lbl314"), ...renderDropdownField("unit", unit) }
        , { field: "action", header: getLabel("lbl315"), render: (row) => renderActions(row) }
    ]

    const packagingMaterial = [
        { field: "materialused", header: getLabel("lbl201"), ...renderDropdownField("materialused", response) }
        , { field: "material", header: getLabel("lbl312"), ...renderDropdownField("material", formDataList.bindMaterial) }
        , { field: "typeofmaterial", header: getLabel("lbl311"), ...renderDropdownField("typeofmaterial", formDataList.environmentalType) }
        , { field: "weight", header: getLabel("lbl313"), align: "right", ...renderTextInputField("weight") }
        , { field: "unit", header: getLabel("lbl316"), ...renderDropdownField("unit", unit) }
        , { field: "action", header: getLabel("lbl315"), render: (row) => renderActions(row) }
    ]

    const impactMaterial = [{ field: "itemnumber", header: getLabel("lbl317"), align: "right" }
        , { field: "environmentalPaperGrade", header: getLabel("lbl318"), render: (row) => row.type === Labels.flag.total ? row.environmentalPaperName : row.environmentalPaperGrade }
        , { field: "environmentalGhg", header: getLabel("lbl319"), align: "right" }, { field: "environmentalWater", header: getLabel("lbl320"), align: "right" }
        , { field: "environmentalEnergy", header: getLabel("lbl321"), align: "right" }, { field: "environmentalWood", header: getLabel("lbl322"), align: "right" }
        , { field: "explanation", header: getLabel("lbl323"), render: (row) => row.type !== Labels.flag.total ? renderViewActions(row, "impact") : "" }
    ]

    const comparativeImpactMaterial = [{ field: "itemnumber", header: getLabel("lbl317"), align: "right" }
        , { field: "compareEnvironmentalPaperGrade", header: getLabel("lbl318"), render: (row) => row.type === Labels.flag.total ? row.compareEnvironmentalPaperName : row.compareEnvironmentalPaperGrade }
        , { field: "compareEnvironmentalGhg", header: getLabel("lbl319"), align: "right" }, { field: "compareEnvironmentalWater", header: getLabel("lbl320"), align: "right" }
        , { field: "compareEnvironmentalEnergy", header: getLabel("lbl321"), align: "right" }, { field: "compareEnvironmentalWood", header: getLabel("lbl322"), align: "right" }
        , { field: "explanation", header: getLabel("lbl323"), render: (row) => row.type !== Labels.flag.total ? renderViewActions(row, "compare") : "" }
    ]

    const totalMaterial = [{ field: "itemnumber", header: getLabel("lbl317"), align: "right" }
        , { field: "itemName", header: getLabel("lbl66") }
        , {
        field: "embodiedCarbon", header: getLabel("lbl319"), align: "right",
        render: (row) => (
            <span style={{ color: getCompareColor(row.embodiedCarbon) }}>
                {formatCompareValue(row.embodiedCarbon)}
            </span>
        )
    }
        , {
        field: "water", header: getLabel("lbl320"), align: "right",
        render: (row) => (
            <span style={{ color: getCompareColor(row.water) }}>
                {formatCompareValue(row.water)}
            </span>)
    }
        , {
        field: "energy", header: getLabel("lbl321"), align: "right", render: (row) => (
            <span style={{ color: getCompareColor(row.energy) }}>
                {formatCompareValue(row.energy)}
            </span>)
    }
        , {
        field: "wood", header: getLabel("lbl322"), align: "right", render: (row) => (
            <span style={{ color: getCompareColor(row.wood) }}>
                {formatCompareValue(row.wood)}
            </span>)
    }
        , { field: "explanation", header: getLabel("lbl323"), render: (row) => renderViewActions(row, "total") }
    ]

    const enviromantalImpactMaterial = [{ field: "environmentalPaperGrade", header: getLabel("lbl318") }, { field: "environmentalGhg", header: getLabel("lbl319"), align: "right" }
        , { field: "environmentalWater", header: getLabel("lbl320"), align: "right" }, { field: "environmentalEnergy", header: getLabel("lbl321"), align: "right" }
        , { field: "environmentalWood", header: getLabel("lbl322"), align: "right" }, { field: "explanation", header: getLabel("lbl323"), render: (row) => renderViewActions(row, "impact") }
    ]

    const packageComparativeImpact = [{ field: "compareEnvironmentalPaperName", header: getLabel("lbl318") }, { field: "compareEnvironmentalGhg", header: getLabel("lbl319"), align: "right" }
        , { field: "compareEnvironmentalWater", header: getLabel("lbl320"), align: "right" }, { field: "compareEnvironmentalEnergy", header: getLabel("lbl321"), align: "right" }
        , { field: "compareEnvironmentalWood", header: getLabel("lbl322"), align: "right" }, { field: "explanation", header: getLabel("lbl323"), render: (row) => renderViewActions(row, "compare") }
    ]

    const getCompareColor = (value) => {
        const text = String(value ?? "").toLowerCase().trim();
        const number = Number(value);
        if (text == "red") return CommonColors.red.dark;
        if (text == "green") return CommonColors.green.dark;

        if (text !== "" && !Number.isNaN(number)) {
            if (number < 0) return CommonColors.red.dark;
            if (number > 0) return CommonColors.green.dark;
        }
        return CommonColors.gray.main;
    };
    const title = getLabel("lbl307");
    const subTitle = getLabel("lbl308")
    const formatCompareValue = (value) => !isNaN(value) && value !== "" ? Math.abs(Number(value)) : value;
    return (
        <>

            <PGrid container className={Labels.margin.mb3}>
                <PGrid item xs={12} sm={6} md={6}>
                    <PSectionHeading accent={PmgColors.navy} label={`${getLabel("lbl191")} ( ${getLabel("lbl190")} )`} />
                </PGrid>
            </PGrid>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ mb: 3 }}>
                {/* Main Material Section */}

                <PGrid container className="d-flex justify-content-end align-items-center mb-1">
                    <PGrid item xs={12} sm={6} md={8}>
                        <PTypography
                            labelText={`${title} ( ${subTitle} )`}
                            weight={FontWeight.bold}
                            flag={Labels.fontFlags.normalText}
                        />
                    </PGrid>

                    <PGrid item xs={12} sm={6} md={4} className="d-flex justify-content-end align-items-center mb-2">
                        <IconButton onClick={() =>
                            setFormData((prev) => ({
                                ...prev,
                                emmdSpot: !prev.emmdSpot,
                            }))}
                        >
                            {formData.emmdSpot ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                    </PGrid>

                </PGrid>

                <Divider sx={{ mb: 2 }} />

                <Collapse in={formData.emmdSpot} timeout="auto" unmountOnExit>
                    <PGrid container className={Labels.margin.mb1}>
                        <PGrid item xs={12} sm={6} md={12}>
                            <PTable columns={mainMaterial} rows={formDataList.mainMaterial} showPagination={false} loading={loading} />
                        </PGrid>
                    </PGrid>
                </Collapse>
            </Box>

            <Box sx={{ mb: 3 }}>
                {/* Packaging Material Section */}
                <PGrid container className="d-flex justify-content-end align-items-center mb-1">
                    <PGrid item xs={12} sm={6} md={8}>
                        <PTypography
                            labelText={`${getLabel("lbl198")} ( ${subTitle} )`}
                            weight={FontWeight.bold}
                            flag={Labels.fontFlags.normalText}
                        />
                    </PGrid>

                    <PGrid item xs={12} sm={6} md={4} className="d-flex justify-content-end align-items-center mb-2" >
                        <IconButton onClick={() =>
                            setFormData((prev) => ({
                                ...prev,
                                epdSpot: !prev.epdSpot,
                            }))}
                        >
                            {formData.epdSpot ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                    </PGrid>
                </PGrid>

                <Divider sx={{ mb: 2 }} />

                <Collapse in={formData.epdSpot} timeout="auto" unmountOnExit>
                    <PGrid container className={Labels.margin.mb1} >
                        <PGrid item xs={12} sm={6} md={12}>
                            <PTable columns={packagingMaterial} rows={formDataList.packagingMaterial} showPagination={false} loading={loading} />
                        </PGrid>
                    </PGrid>
                </Collapse>
            </Box>

            {formDataList.impactMaterial.length > 0 && (
                <Box sx={{ mt: 3 }}>
                    {/* Environmental Impact Section */}
                    <PGrid container className={Labels.margin.mb3}>
                        <PGrid item xs={12} sm={6} md={6}>
                            <PTypography
                                labelText={`${getLabel("lbl194")} ( ${title} )`}
                                weight={FontWeight.bold}
                                flag={Labels.fontFlags.normalText}
                            />
                        </PGrid>
                        <PGrid item xs={12} sm={6} md={6} className="d-flex justify-content-end gap-2">
                            <PButton
                                label={getLabel("lbl189")}
                                variant="contained"
                                color={CommonColors.dark_blue}
                                onClick={() => setFormData((prev) => ({
                                    ...prev,
                                    factor: true,
                                }))}
                                width={280}
                                startIcon={<img src={arrow} alt="arrow" className="icon" />}
                            />
                        </PGrid>
                    </PGrid>

                    <Divider sx={{ mb: 2 }} />

                    <PGrid container>
                        <PGrid item xs={12} sm={6} md={12}>
                            <PTable columns={impactMaterial} rows={formDataList.impactMaterial} showPagination={false} loading={loading} />
                        </PGrid>
                    </PGrid>
                </Box>
            )}

            {formDataList.comparativeImpactMaterial.length > 0 && (
                <Box sx={{ mt: 3 }}>
                    {/* Comparative Impact Section */}
                    <PGrid container className={Labels.margin.mb3}>
                        <PGrid item xs={12} sm={6} md={8}>
                            <PTypography
                                labelText={`${getLabel("lbl309")} ( ${title} )`}
                                weight={FontWeight.bold}
                                flag={Labels.fontFlags.normalText}
                            />
                        </PGrid>
                    </PGrid>

                    <Divider sx={{ mb: 2 }} />

                    <PGrid container >
                        <PGrid item xs={12} sm={6} md={12}>
                            <PTable columns={comparativeImpactMaterial} rows={formDataList.comparativeImpactMaterial} showPagination={false} loading={loading} />
                        </PGrid>
                    </PGrid>
                </Box>
            )}

            {formDataList.totalMaterial.length > 0 && (
                <Box sx={{ mt: 3 }}>
                    {/* Total Impact Section */}
                    <PGrid container className={Labels.margin.mb3}>
                        <PGrid item xs={12} sm={6} md={8}>
                            <PTypography
                                labelText={`${getLabel("lbl196")} ( ${title} )`}
                                weight={FontWeight.bold}
                                flag={Labels.fontFlags.normalText}
                            />
                        </PGrid>
                    </PGrid>

                    <Divider sx={{ mb: 2 }} />

                    <PGrid container >
                        <PGrid item xs={12} sm={6} md={12}>
                            <PTable columns={totalMaterial} rows={formDataList.totalMaterial} showPagination={false} loading={loading} />
                        </PGrid>
                    </PGrid>
                </Box>
            )}

            {formDataList.enviromantalImpactMaterial.length > 0 && (
                <Box sx={{ mt: 3 }}>
                    {/* Packaging Environmental Impact Section */}
                    <PGrid container className={Labels.margin.mb3}>
                        <PGrid item xs={12} sm={6} md={8}>
                            <PTypography
                                labelText={`${getLabel("lbl194")} ( ${getLabel("lbl198")} )`}
                                weight={FontWeight.bold}
                                flag={Labels.fontFlags.normalText}
                            />
                        </PGrid>
                    </PGrid>

                    <Divider sx={{ mb: 2 }} />

                    <PGrid container>
                        <PGrid item xs={12} sm={6} md={12}>
                            <PTable columns={enviromantalImpactMaterial} rows={formDataList.enviromantalImpactMaterial} showPagination={false} loading={loading} />
                        </PGrid>
                    </PGrid>
                </Box>
            )}

            {formDataList.packageComparativeImpact.length > 0 && (
                <Box sx={{ mt: 3 }}>
                    {/* Comparative Packaging Impact Section */}
                    <PGrid container className={Labels.margin.mb3}>
                        <PGrid item xs={12} sm={6} md={8}>
                            <PTypography
                                labelText={`${getLabel("lbl195")} ( ${getLabel("lbl198")} )`}
                                weight={FontWeight.bold}
                                flag={Labels.fontFlags.normalText}
                            />
                        </PGrid>
                    </PGrid>

                    <Divider sx={{ mb: 2 }} />

                    <PGrid container>
                        <PGrid item xs={12} sm={6} md={12}>
                            <PTable columns={packageComparativeImpact} rows={formDataList.packageComparativeImpact} showPagination={false} loading={loading} />
                        </PGrid>
                    </PGrid>
                </Box>
            )}

            {/* factor dialog */}
            <PDialog
                open={formData.factor}
                onClose={() => setFormData((prev) => ({
                    ...prev,
                    factor: false,
                }))}
                title={`${getLabel("lbl194")} ${getLabel("lbl189")}`}
                showCloseIcon={true}
                maxWidth="sm"
            >
                <PGrid container className={Labels.margin.mb4}>
                    <PGrid item xs={12} sm={12} md={12}>
                        <PTable columns={formDataList.emissionFactors} rows={formDataList.emissionFactorsData} showCheckbox={false} />
                    </PGrid>
                </PGrid>
            </PDialog>

            {/* compare dialog */}
            <PDialog
                open={formData.compare}
                onClose={() => setFormData((prev) => ({
                    ...prev,
                    compare: false,
                }))}
                title={getLabel("lbl211")}
                showCloseIcon={true}
                maxWidth="sm"
                actions={
                    <PGrid className="d-flex align-items-center justify-content-end gap-2" >
                        <PButton
                            fullWidth
                            label={getLabel("lbl125")}
                            variant="outlined"
                            onClick={() => setFormData((prev) => ({
                                ...prev,
                                compare: false
                            }))}
                            color={CommonColors.grey.main}
                            width={120}
                        />
                        <PButton
                            fullWidth
                            label={getLabel("lbl120")}
                            variant={Labels.contained}
                            onClick={(e) => handleUpdate(e, "compare")}
                            color={CommonColors.dark_blue}
                            width={200}
                            startIcon={<img src={arrow} alt="arrow" className="icon" />}
                        />
                    </PGrid >
                }
            >
                <PGrid container className={Labels.margin.mb3}>
                    <PDropdown
                        label={`${getLabel("lbl258")} ${Labels.symbols.required}`}
                        name={"material"}
                        value={formData.material}
                        options={formDataList.bindMaterial}
                        onChange={handleChange}
                        width={100}
                        disabled={true}
                        helperText={errors?.material}
                        flag={Labels.flag.auto}

                    />
                </PGrid>
                <PGrid container className={Labels.margin.mb3}>
                    <PDropdown
                        label={`${getLabel("lbl318")} ${Labels.symbols.required}`}
                        name={"type"}
                        value={formData.type}
                        options={formDataList.environmentalType}
                        onChange={handleChange}
                        width={100}
                        disabled={true}
                        helperText={errors?.type}
                        flag={Labels.flag.auto}
                    />
                </PGrid>
                <PGrid container className={Labels.margin.mb3}>
                    <PGrid item xs={12} sm={12} md={12}>
                        <PTextField
                            label= {`${getLabel("lbl313")} ${Labels.symbols.required}`}
                            name={"weight"}
                            value={formData.weight}
                            onChange={handleChange}
                            helperText={errors?.weight}
                        />
                    </PGrid>
                </PGrid>
            </PDialog>

            {/* Impact dialog */}
            <PDialog
                open={formData.impact}
                onClose={() =>
                    setFormData((prev) => ({
                        ...prev,
                        impact: false,
                    }))
                }
                showCloseIcon={true}
                title={formDataList.impactDetails?.title}
                maxWidth="md"
            >
                <ImpactSummary lines={formDataList.impactDetails?.lines ?? []} />
            </PDialog >

            {/* reason dialog */}
            < PDialog
                open={formData.nonCompare}
                onClose={() => setFormData((prev) => ({
                    ...prev,
                    nonCompare: false,
                }))}
                title={getLabel("lbl227")}
                showCloseIcon={true}
                maxWidth="sm"
                actions={
                    < PGrid className="d-flex align-items-center justify-content-end gap-2" >
                        <PButton
                            fullWidth
                            label={getLabel("lbl125")}
                            variant="outlined"
                            onClick={() => {
                                setFormData((prev) => ({
                                    ...prev,
                                    nonCompare: false,
                                }));
                            }}
                            color={CommonColors.grey.main}
                            width={120}
                        />
                        <PButton
                            fullWidth
                            label={getLabel("lbl120")}
                            variant={Labels.contained}
                            onClick={(e) => handleUpdate(e, "nonCompare")}
                            color={CommonColors.dark_blue}
                            width={200}
                            startIcon={<img src={arrow} alt="arrow" className="icon" />}
                        />
                    </PGrid >
                }
            >
                <PGrid container className={Labels.margin.mb4}>
                    <PGrid item xs={12} sm={12} md={12}>
                        <PTextField
                            label= {getLabel("lbl212")}
                            name={"reason"}
                            value={formData.reason}
                            onChange={handleChange}
                            helperText={errors?.reason}
                            multiline={true}
                            rows={4.5}
                        />
                    </PGrid>
                </PGrid>
            </PDialog >

        </>

    )
}

export default PSpotSection;