import React, { useEffect, useState } from "react";
import PDialog from "../../component/PDialog/PDialog";
import { CommonColors } from "../../utils/constants/colors";
import { Labels } from "../../utils/constants/labels";
import PGrid from "../../component/PGrid/PGrid";
import { useLanguage } from "../../utils/constants/language";
import { allowOnlyNumbers, getOptionLabel, getOptionValue, isNotEmpty, isSuccess, toast } from "../../utils/commonFunction/common";
import { PostApi } from "../../utils/api/networking";
import { LineItems_API } from "../../utils/api/apiUrl";
import PButton from "../../component/PButton/PButton";
import PTextField from "../../component/PTextField/PTextField";
import PDropdown from "../../component/PDropdown/PDropdown";
import { labelRoutes } from "../../navigations/labelRoutes";
import { useLocation, useNavigate } from "react-router-dom";
import arrow from "../../utils/assets/images/arrow_white.svg";
import { useSelector } from "react-redux";
const UpdateLineItems = ({ open, onClose, data = {}, step, refreshSummary }) => {
    const { getLabel } = useLanguage();
    const { state } = useLocation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [allowRedirect, setAllowRedirect] = useState(false);
    const { fkID } = useSelector((state) => state.userDetails.user);
    const [formData, setFormData] = useState({
        enquiryId: "",
        itemName: "",
        quantity: "",
        itemNameDescription: "",
        globalOrderWindowCatalogueName: "",
        printingMethod: "",
        localCatalogueName: "",
        digitalInnovation: "",
        innovation: "",
        sourcingLocation: "",
        savingsType: "",
        savingsReason: "",
        noOfVersion: "",
        specifications: "",
        notesComments: ""
    });

    const [formDataList, setFormDataList] = useState({
        globalOrder: [],
        localCatalog: [],
        sourcingLocation: [],
        printingMethod: [],
        savingsType: [],
        savingsReason: [],
        yesNoNa: [{ label: "Yes", value: 1 }, { label: "No", value: 2 }, { label: "N/A", value: 3, selected: true }],
    });

    useEffect(() => {
        if (open && data?.printornonprint) {
            LineItemsMaster(data.printornonprint);
        }
        if (open && data?.savingstype) {
            SavingsReasonMaster(data.savingstype);
        }
    }, [open, data]);

    const LineItemsMaster = async (typeOfJob) => {
        try {
            setLoading(true);
            const response = await PostApi(LineItems_API.GetEnqLineItemsMaster, {
                TypeOfJob: typeOfJob
            });
            setFormDataList(prev => ({
                ...prev,
                localCatalog: response.localCatalog,
                globalOrder: response.globalOrder,
                sourcingLocation: response.sourcingLocation,
                printingMethod: response.printingMethod,
                savingsType: response.savingsType,
            }));
            setFormData(prev => ({
                ...prev,
                itemName: data.itemName,
                itemNameDescription: data.itemDescription,
                noOfVersion: data.version,
                specifications: data.specNote,
                notesComments: data.sNote,
                sourcingLocation: getOptionValue(response.sourcingLocation, data.sourcinglocation),
                printingMethod: getOptionValue(response.printingMethod, data.printingMethod),
                globalOrderWindowCatalogueName: getOptionValue(response.globalOrder, data.promoOSSOrderWindows),
                localCatalogueName: getOptionValue(response.localCatalog, data.catalogueUsage),
                digitalInnovation: getOptionValue(formDataList.yesNoNa, data.digitalInnovation),
                innovation: getOptionValue(formDataList.yesNoNa, data.innovation),
                savingsType: getOptionValue(response.savingsType, data.savingstype),
                quantity: data.quoteQtyOrSize,
                enquiryId: data.enqdetailsId
            }));
        } catch (error) {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        } finally {
            setLoading(false);
        }
    };

    const SavingsReasonMaster = async (type) => {
        try {
            setLoading(true);
            const response = await PostApi(LineItems_API.GetEnqLineItemsMaster, {
                TypeOfJob: data.printornonprint,
                Savingstype: type,
            });
            setFormDataList(prev => ({
                ...prev,
                savingsReason: response.savingsReason,
            }));
            setFormData(prev => ({
                ...prev,
                savingsReason: getOptionValue(response.savingsReason, data.savingsreason),
            }));
        } catch (error) {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        } finally {
            setLoading(false);
        }
    };

    const [errors, setErrors] = useState({
        itemName: "",
        quantity: "",
        itemNameDescription: "",
        globalOrderWindowCatalogueName: "",
        printingMethod: "",
        localCatalogueName: "",
        digitalInnovation: "",
        innovation: "",
        sourcingLocation: "",
        savingsType: "",
        savingsReason: "",
        noOfVersion: "",
        specifications: "",
        notesComments: ""
    });

    const fieldConfig = {
        [Labels.lineItems.noOfVersion]: { type: "number" },
        [Labels.lineItems.quantity]: { type: "number" },
    };

    // ✅ Handle Change
    const handleChange = (e) => {
        const { name, value, label } = e.target;
        const config = fieldConfig[name];
        const data = config?.type === "number" ? allowOnlyNumbers(value) : value;
        switch (name) {
            case Labels.lineItems.savingsType:
                SavingsReasonMaster(label);
                break;
            default:
                break;
        }
        setFormData(prev => ({
            ...prev,
            [name]: data
        }));

        setErrors(prev => ({
            ...prev,
            [name]: ""
        }));
    };

    const LineItemsValidation = () => {
        const requiredFields = [
            Labels.lineItems.itemName,
            Labels.lineItems.itemNameDescription,

            // Catalogue Section
            Labels.lineItems.globalOrderWindowCatalogueName,
            Labels.lineItems.localCatalogueName,
            Labels.lineItems.printingMethod,
            Labels.lineItems.digitalInnovation,
            Labels.lineItems.innovation,
            Labels.lineItems.sourcingLocation,

            // Specifications
            Labels.lineItems.noOfVersion,
            Labels.lineItems.specifications,

            //quantity
            Labels.lineItems.quantity,
        ];

        let newErrors = {};
        requiredFields.forEach((field) => {
            if (!formData[field]) {
                newErrors[field] = Labels.commonLabel.required;
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const route = step === 4 ? labelRoutes.suppliers : step === 5 ? labelRoutes.review : labelRoutes.LineItems;
    const flag = isNotEmpty(state?.id) && state?.id !== 0 ? Labels.flag.Update : Labels.flag.Insert;
    const id = state?.id > 0 ? state.id : 0;
    // ✅ Submit
    const handleSubmit = async () => {
        const isValid = LineItemsValidation();
        if (isValid) {
            try {
                const payload = {
                    //lineItems
                    EnqdetailsId: formData.enquiryId,
                    EnqId: id,
                    ItemName: formData.itemName,
                    ItemDescription: formData.itemNameDescription,
                    PromoOSSOrderWindows: getOptionLabel(formDataList.globalOrder, formData.globalOrderWindowCatalogueName),
                    CatalogueUsage: getOptionLabel(formDataList.localCatalog, formData.localCatalogueName),
                    printingmethod: getOptionLabel(formDataList.printingMethod, formData.printingMethod),
                    DigitalInnovation: getOptionLabel(formDataList.yesNoNa, formData.digitalInnovation),
                    Innovation: getOptionLabel(formDataList.yesNoNa, formData.innovation),
                    Sourcinglocation: getOptionLabel(formDataList.sourcingLocation, formData.sourcingLocation),
                    harmonizedOrder: formData.globalOrderWindowCatalogueName == 1 ? "No" : "Yes",
                    Version: formData.noOfVersion,
                    SpecNote: formData.specifications,
                    SNote: formData.notesComments,
                    QuoteQtyOrSize: formData.quantity,
                    ModifiedBy: fkID,
                };
                const response = await PostApi(LineItems_API.AddUpdateLineItems, payload);
                if (isSuccess(response)) {
                    setAllowRedirect(true);
                    toast(Labels.status.success, response.data.message);
                    setTimeout(() => {
                        navigate(route, {
                            state: { id: response.data.enqId }
                        });
                    }, 500);
                    onClose();
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
        } else {
            setAllowRedirect(false);
        }
    };
    const showSavingsFields = true;
    {/*Update LineItems*/ }
    return (
        < PDialog
            open={open}
            onClose={onClose}
            title={"Update LineItems"}
            showCloseIcon={true}
            maxWidth="lg"
            actions={
                < PGrid className="d-flex align-items-center justify-content-end gap-2" >
                    <PButton
                        fullWidth
                        label={getLabel("lbl125")}
                        variant="outlined"
                        onClick={onClose}
                        //color={CommonColors.grey.main}
                        width={180}
                    />
                    <PButton
                        fullWidth
                        label={getLabel("lbl124")}
                        variant={Labels.contained}
                        onClick={handleSubmit}
                        color={CommonColors.dark_blue}
                        width={180}
                        disabled={loading}
                        startIcon={
                            <img
                                src={arrow}
                                alt="arrow"
                                className="icon"
                            />
                        }
                    />
                </PGrid >
            }

        >
            <PGrid container className={Labels.margin.mb4}>
                <PGrid item xs={12} sm={6} md={4} style={{ paddingRight: "0" }}>
                    <PTextField
                        label={`${getLabel("lbl66")}${Labels.symbols.required}`}
                        value={formData.itemName}
                        onChange={handleChange}
                        helperText={errors?.itemName}
                        name={Labels.lineItems.itemName}
                        sx={{ mb: 3 }}
                    />
                    <PTextField
                        label={`${getLabel("lbl87")}${Labels.symbols.required}`}
                        value={formData.quantity}
                        onChange={handleChange}
                        helperText={errors?.quantity}
                        name={Labels.lineItems.quantity}
                    />
                </PGrid>
                <PGrid item xs={12} sm={6} md={8} >
                    <PTextField
                        label={`${getLabel("lbl67")}${Labels.symbols.required}`}
                        value={formData.itemNameDescription}
                        onChange={handleChange}
                        helperText={errors?.itemNameDescription}
                        name={Labels.lineItems.itemNameDescription}
                        multiline={true}
                        rows={5.5}
                    />
                </PGrid>
            </PGrid>
            <PGrid container className={Labels.margin.mb4}>
                <PGrid item xs={12} sm={6} md={4} style={{ paddingRight: "0" }}>
                    <PDropdown
                        label={`${getLabel("lbl107")}${Labels.symbols.required}`}
                        value={formData.globalOrderWindowCatalogueName}
                        onChange={handleChange}
                        helperText={errors?.globalOrderWindowCatalogueName}
                        name={Labels.lineItems.globalOrderWindowCatalogueName}
                        options={formDataList.globalOrder}
                        flag={Labels.flag.auto}
                        disabled={true}
                    />
                </PGrid>
                <PGrid item xs={12} sm={6} md={4} style={{ paddingRight: "0" }}>
                    <PDropdown
                        label={`${getLabel("lbl111")}${Labels.symbols.required}`}
                        value={formData.printingMethod}
                        onChange={handleChange}
                        helperText={errors?.printingMethod}
                        name={Labels.lineItems.printingMethod}
                        options={formDataList.printingMethod}
                        flag={Labels.flag.auto}
                        disabled={true}
                    />
                </PGrid>
                <PGrid item xs={12} sm={6} md={4}>
                    <PDropdown
                        label={`${getLabel("lbl109")}${Labels.symbols.required}`}
                        value={formData.localCatalogueName}
                        onChange={handleChange}
                        helperText={errors?.localCatalogueName}
                        name={Labels.lineItems.localCatalogueName}
                        options={formDataList.localCatalog}
                        flag={Labels.flag.auto}
                        disabled={true}
                    />
                </PGrid>
            </PGrid>
            <PGrid container className={Labels.margin.mb4} >
                <PGrid item xs={12} sm={6} md={4} style={{ paddingRight: "0" }}>
                    <PDropdown
                        label={`${getLabel("lbl114")}${Labels.symbols.required}`}
                        value={formData.digitalInnovation}
                        onChange={handleChange}
                        helperText={errors?.digitalInnovation}
                        name={Labels.lineItems.digitalInnovation}
                        options={formDataList.yesNoNa}
                        disabled={true}

                    />
                </PGrid>
                <PGrid item xs={12} sm={6} md={4} style={{ paddingRight: "0" }}>
                    <PDropdown
                        label={`${getLabel("lbl115")}${Labels.symbols.required}`}
                        value={formData.innovation}
                        onChange={handleChange}
                        helperText={errors?.innovation}
                        name={Labels.lineItems.innovation}
                        options={formDataList.yesNoNa}
                        disabled={true}
                    />
                </PGrid>
                <PGrid item xs={12} sm={6} md={4}>
                    <PDropdown
                        label={`${getLabel("lbl116")}${Labels.symbols.required}`}
                        value={formData.sourcingLocation}
                        onChange={handleChange}
                        helperText={errors?.sourcingLocation}
                        name={Labels.lineItems.sourcingLocation}
                        options={formDataList.sourcingLocation}
                        flag={Labels.flag.auto}

                    />
                </PGrid>
            </PGrid>
            <PGrid container className={Labels.margin.mb3}>
                <PGrid item xs={12} sm={6} md={4} style={{ paddingRight: "0" }}>
                    <PTextField
                        label={`${getLabel("lbl85")}${Labels.symbols.required}`}
                        value={formData.noOfVersion}
                        onChange={handleChange}
                        helperText={errors?.noOfVersion}
                        name={Labels.lineItems.noOfVersion}
                    />
                </PGrid>

                {["Yes"].includes(data?.hybrid) && (
                    <>
                        <PGrid item xs={12} sm={6} md={4}>
                            <PDropdown
                                label={`${getLabel("lbl117")}${Labels.symbols.required}`}
                                value={formData.savingsType}
                                onChange={handleChange}
                                helperText={errors?.savingsType}
                                name={Labels.lineItems.savingsType}
                                options={formDataList.savingsType}
                                flag={Labels.flag.auto}
                            />
                        </PGrid>

                        <PGrid item xs={12} sm={6} md={4}>
                            <PDropdown
                                label={`${getLabel("lbl118")}${Labels.symbols.required}`}
                                value={formData.savingsReason}
                                onChange={handleChange}
                                helperText={errors?.savingsReason}
                                name={Labels.lineItems.savingsReason}
                                options={formDataList.savingsReason}
                                flag={Labels.flag.auto}
                            />
                        </PGrid>
                    </>
                )}

                {["No"].includes(data?.hybrid) && (
                    <>
                        <PGrid item xs={12} sm={6} md={4} style={{ paddingRight: "0" }}>
                            <PTextField
                                label={`${getLabel("lbl83")}${Labels.symbols.required}`}
                                value={formData.specifications}
                                onChange={handleChange}
                                helperText={errors?.specifications}
                                name={Labels.lineItems.specifications}
                                multiline={true}
                                rows={2.5}
                            />
                        </PGrid>

                        <PGrid item xs={12} sm={6} md={4}>
                            <PTextField
                                label={getLabel("lbl86")}
                                value={formData.notesComments}
                                onChange={handleChange}
                                name={Labels.lineItems.notesComments}
                                multiline={true}
                                rows={2.5}
                            />
                        </PGrid>
                    </>
                )}
            </PGrid>

            {["Yes"].includes(data?.hybrid) && (
                <PGrid container className={Labels.margin.mb3}>
                    <PGrid item xs={12} sm={6} md={4} style={{ paddingRight: "0" }}>
                        <PTextField
                            label={`${getLabel("lbl83")}${Labels.symbols.required}`}
                            value={formData.specifications}
                            onChange={handleChange}
                            helperText={errors?.specifications}
                            name={Labels.lineItems.specifications}
                            multiline={true}
                            rows={2.5}
                        />
                    </PGrid>

                    <PGrid item xs={12} sm={6} md={4}>
                        <PTextField
                            label={getLabel("lbl86")}
                            value={formData.notesComments}
                            onChange={handleChange}
                            name={Labels.lineItems.notesComments}
                            multiline={true}
                            rows={2.5}
                        />
                    </PGrid>
                </PGrid>
            )}
        </PDialog >

    );
};

export default UpdateLineItems;