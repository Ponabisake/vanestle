import { useState } from "react";
import { Divider } from "@mui/material";
import PTable from "../PTable/PTable";
import PGrid from "../PGrid/PGrid";
import PTypography from "../PTypography/PTypography";
import { Labels } from "../../utils/constants/labels";
import { CommonColors } from "../../utils/constants/colors";
import { FontWeight } from "../../utils/constants/fonts";
import PButton from "../PButton/PButton";
import { useLanguage } from "../../utils/constants/language";
import PTextField from "../PTextField/PTextField";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import { isSuccess, toast, notifyValidation } from "../../utils/commonFunction/common";
import { PostApi } from "../../utils/api/networking";
import { ProjectEnquiry_API } from "../../utils/api/apiUrl";
import { useLocation } from "react-router-dom";
import arrow from "../../utils/assets/images/arrow_white.svg";
import { useSelector } from "react-redux";
const PDeliveryOrder = (props) => {
    // separate flags so each button only spins for its own action
    const [searching, setSearching] = useState(false);
    const [saving, setSaving] = useState(false);
    const { getLabel } = useLanguage();
    const { id } = useSelector((state) => state.userDetails.user);

    const [formData, setFormData] = useState({
        companyName: "",
        addressLineOne: "",
        addressLineTwo: "",
        addressLineThree: "",
        nameorDept: "",
        contactNo: "",
        remarks: "",
        id: 0,
        order: false
    });
    const [errors, setErrors] = useState({
        companyName: "",
        addressLineOne: "",
        addressLineTwo: "",
        addressLineThree: "",
        nameorDept: "",
        contactNo: "",
        remarks: ""
    });


    const handleChange = (e, row) => {
        const { name, value, label } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));

        setErrors((prev) => ({
            ...prev,
            [name]: ""   // clear only that field error
        }));
    }

    const handleEdit = (row) => {
        setFormData(row); // Load the selected row into the text fields
    };

    const [formDataList, setFormDataList] = useState({
        deliveryOrder: [{ field: "companyName", header: getLabel("lbl326") }, { field: "addressLineOne", header: getLabel("lbl327") }
            , { field: "addressLineTwo", header: getLabel("lbl328") }, { field: "addressLineThree", header: getLabel("lbl329") }
            , { field: "nameorDept", header: getLabel("lbl330") }, { field: "contactNo", header: getLabel("lbl331") }, { field: "remarks", header: getLabel("lbl332") }
            , {
            field: "id", header: "", render: (row) => (<EditIcon onClick={() => handleEdit(row)} style={{ cursor: "pointer" }} color={CommonColors.yellow.main} variant="outlined" />)
        }],
    })

    const handleSearch = async () => {
        try {
            setSearching(true);
            const response = await PostApi(ProjectEnquiry_API.CheckDeliveryAddress, {
                CompanyName: formData.companyName
            });
            const data = response.data;
            if (isSuccess(response)) {
                setFormData((prev) => ({
                    ...prev,
                    companyName: data.companyName ?? "",
                    addressLineOne: data.adressLine1 ?? "",
                    addressLineTwo: data.adressLine2 ?? "",
                    addressLineThree: data.adressLine3 ?? "",
                    nameorDept: data.nameorDept ?? "",
                    contactNo: data.contactNo ?? "",
                    remarks: data.remarks ?? "",
                    id: 0
                }));
            }
            else {
                setFormData((prev) => ({
                    ...prev,
                    companyName: formData.companyName,
                    addressLineOne: "",
                    addressLineTwo: "",
                    addressLineThree: "",
                    nameorDept: "",
                    contactNo: "",
                    remarks: "",
                    id: 0
                }));
                toast(Labels.status.success, data);
            }

        } catch (error) {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        } finally {
            setSearching(false);
        }
    };

    const DeliveryOrderValidation = () => {
        const requiredFields = [
            Labels.deliveryOrder.companyName,
            Labels.deliveryOrder.addressLineOne,
            Labels.deliveryOrder.nameorDept,
            Labels.deliveryOrder.contactNo,
        ];
        let newErrors = {};
        requiredFields.forEach((field) => {
            if (!formData[field]) {
                newErrors[field] = Labels.commonLabel.required;
            }
        });
        setErrors(newErrors);
        notifyValidation(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async (e) => {
        const isValid = DeliveryOrderValidation();
        if (isValid) {
            try {
                setSaving(true);
                const response = await PostApi(ProjectEnquiry_API.AddUpdateDeliveryAddress,
                    {
                        Enqid: id,
                        id: formData.id,
                        companyName: formData.companyName,
                        addressLineOne: formData.addressLineOne,
                        addressLineTwo: formData.addressLineTwo,
                        addressLineThree: formData.addressLineThree,
                        nameorDept: formData.nameorDept,
                        contactNo: formData.contactNo,
                        remarks: formData.remarks
                    }
                );
                if (response.status) {
                    await props.fetchData();
                    await props.setFormData(prev => ({
                        ...prev,
                        activeTab: "Job Summary",
                    }))
                    await handleCancel();
                    toast(Labels.status.success, response.data);
                }
            } catch (error) {
                toast(Labels.status.failure, Labels.message.somethingWentWrong);
            } finally {
                setSaving(false);
            }
        }

    }

    const handleCancel = async (e) => {
        setFormData({
            companyName: "",
            addressLineOne: "",
            addressLineTwo: "",
            addressLineThree: "",
            nameorDept: "",
            contactNo: "",
            remarks: "",
            id: 0
        });
    }

    return (
        <>
            <div className={Labels.margin.mb3}>
                <PGrid container className={Labels.margin.mb3}>
                    <PGrid item xs={12} sm={6} md={6}>
                        <PTypography
                            labelText={`${"Delivery Order"}`}
                            flag={Labels.fontFlags.header}
                            weight={FontWeight.regular}
                        />
                    </PGrid>
                </PGrid>
                <Divider sx={{ mb: 2 }} />
                <PGrid container className={Labels.margin.mb4}>
                    <PGrid item xs={12} sm={6} md={10}>
                        <PTextField
                            label={`${getLabel("lbl326")} ${Labels.symbols.required}`}
                            value={formData.companyName}
                            onChange={handleChange}
                            helperText={errors?.companyName}
                            name={Labels.deliveryOrder.companyName}
                        />
                    </PGrid>
                    <PGrid item xs={12} sm={6} md={2} className={Labels.margin.mt3} style={{ paddingTop: "16px" }}>
                        <PButton
                            label={"Search"}
                            variant="outlined"
                            onClick={handleSearch}
                            width={120}
                            startIcon={<SearchIcon />}
                            loading={searching}
                        />

                    </PGrid>
                </PGrid>
                <PGrid container className={Labels.margin.mb4}>
                    <PGrid item xs={12} sm={6} md={6}>
                        <PTextField
                            label={`${getLabel("lbl327")} ${Labels.symbols.required}`}
                            value={formData.addressLineOne}
                            onChange={handleChange}
                            helperText={errors?.addressLineOne}
                            name={Labels.deliveryOrder.addressLineOne}
                        />
                    </PGrid>
                    <PGrid item xs={12} sm={6} md={6}>
                        <PTextField
                            label={`${getLabel("lbl330")} ${Labels.symbols.required}`}
                            value={formData.nameorDept}
                            onChange={handleChange}
                            helperText={errors?.nameorDept}
                            name={Labels.deliveryOrder.nameorDept}
                        />
                    </PGrid>
                </PGrid>
                <PGrid container className={Labels.margin.mb4}>
                    <PGrid item xs={12} sm={6} md={6}>
                        <PTextField
                            label={`${getLabel("lbl328")}`}
                            value={formData.addressLineTwo}
                            onChange={handleChange}
                            helperText={errors?.addressLineTwo}
                            name={Labels.deliveryOrder.addressLineTwo}
                        />
                    </PGrid>
                    <PGrid item xs={12} sm={6} md={6}>
                        <PTextField
                            label={`${getLabel("lbl331")} ${Labels.symbols.required}`}
                            value={formData.contactNo}
                            onChange={handleChange}
                            helperText={errors?.contactNo}
                            name={Labels.deliveryOrder.contactNo}
                        />
                    </PGrid>

                </PGrid>
                <PGrid container className={Labels.margin.mb2}>
                    <PGrid item xs={12} sm={6} md={6}>
                        <PTextField
                            label={`${getLabel("lbl329")}`}
                            value={formData.addressLineThree}
                            onChange={handleChange}
                            helperText={errors?.addressLineThree}
                            name={Labels.deliveryOrder.addressLineThree}
                        />
                    </PGrid>
                    <PGrid item xs={12} sm={6} md={6}>
                        <PTextField
                            label={`${getLabel("lbl332")}`}
                            value={formData.remarks}
                            onChange={handleChange}
                            helperText={errors?.remarks}
                            name={Labels.deliveryOrder.remarks}
                        />
                    </PGrid>
                </PGrid>

                <PGrid container className={Labels.margin.mb4}>
                    <PGrid item xs={12} sm={12} md={12} className="d-flex justify-content-end gap-2" >
                        {formData.id ? (
                            <PButton
                                label={getLabel("lbl125")}
                                variant="outlined"
                                onClick={() => handleCancel()}
                                width={120}
                            />
                        ) : null}
                        <PButton
                            label={formData.id ? "Update Delivery Order" : "Save Delivery Order"}
                            variant="contained"
                            color={CommonColors.dark_blue}
                            onClick={(e) => handleSave()}
                            width={320}
                            startIcon={<img src={arrow} alt="arrow" className="icon" />}
                            loading={saving}
                            disabled={searching}
                        />
                    </PGrid>
                </PGrid>
                <Divider sx={{ mb: 2 }} />

                <PGrid container className={Labels.margin.mb4}>
                    <PGrid item xs={12} sm={6} md={12}>
                        <PTable columns={formDataList.deliveryOrder} rows={props.response} />
                    </PGrid>
                </PGrid>

            </div>
        </>
    )
}

export default PDeliveryOrder;