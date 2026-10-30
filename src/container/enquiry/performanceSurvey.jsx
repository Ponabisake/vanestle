
import { Box } from "@mui/material";
import PGrid from "../../component/PGrid/PGrid";
import PTypography from "../../component/PTypography/PTypography";
import { Labels } from "../../utils/constants/labels";
import { CommonColors } from "../../utils/constants/colors";
import { FontWeight } from "../../utils/constants/fonts";
import { useState, useEffect } from "react";
import PButton from "../../component/PButton/PButton";
import { useLanguage } from "../../utils/constants/language";
import arrow from "../../utils/assets/images/arrow_white.svg";
import { Divider } from "@mui/material";
import { toast } from "../../utils/commonFunction/common";
import { useSelector } from "react-redux";
import PTextField from "../../component/PTextField/PTextField";
import PRadio from "../../component/PRadio/PRadio";

const PerformanceSurvey = () => {
const { getLabel } = useLanguage();
const { userID, userType, role, countryID } = useSelector((state) => state.userDetails.user);
const [loading, setLoading] = useState(true);
const [formData, setFormData] = useState({
        responsive: "",
        accuracy: "",
        quality: "",
        overexperience: "",
        comments: "",

});

const [errors, setErrors] = useState({
        responsive: "",
        accuracy: "",
        quality: "",
        overexperience: "",
        comments: "",
});

const [formDataList, setFormDataList] = useState({
        responsive: [{ label: "1  Extremely Unsatisfied", value: 1 }
                , { label: "2", value: 2 }
                , { label: "3", value: 3 }
                , { label: "4", value: 4 }
                , { label: "5  Extremely Satisfied", value: 5 }
        ],
});

useEffect(() => {
        fetchData();
}, []);

const fetchData = async () => {
        try {
           setLoading(true);

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

const handleSubmit = async () => {

}

return (
<>
        <Box sx={{ py: 3 }}>
                <PGrid container className={Labels.margin.mb4} >
                        <PTypography
                                labelText={"Performance Survey"}
                                flag={Labels.fontFlags.header}
                                weight={FontWeight.regular}
                        />
                        <PTypography
                                labelText={"This Survey is for PMG to collect your feedback and improve our services"}
                                flag={Labels.fontFlags.errorLbl}
                                color={CommonColors.primary}
                                weight={FontWeight.regular}
                        />
                        <Divider sx={{ mb: 2, mt: 4 }}></Divider>

                        <PGrid container className={Labels.margin.mt4} >
                                <PGrid item xs={12} sm={12} md={8}>
                                        <PTypography
                                                labelText={`${"1. "} ${Labels.symbols.required} ${"RESPONSIVENESS"}`}
                                                flag={Labels.fontFlags.normalText}
                                                color={CommonColors.primary}
                                                weight={FontWeight.bold}
                                        />
                                        <PRadio
                                                name={Labels.performanceSurvey.responsive}
                                                label={`${"How satisfied are you with PMG contact’s responsiveness to your requests ?"}`}
                                                options={formDataList.responsive}
                                                onChange={handleChange}
                                                value={formData.responsive}
                                                helperText={errors?.responsive}
                                                xs={{ fontSize: "10px" }}
                                        />
                                </PGrid>
                        </PGrid>
                        <PGrid container className={Labels.margin.mt4} >
                                <PGrid item xs={12} sm={12} md={8}>
                                        <PTypography
                                                labelText={`${"2. "} ${Labels.symbols.required} ${"ACCURACY OF INFORMATION"}`}
                                                flag={Labels.fontFlags.normalText}
                                                color={CommonColors.primary}
                                                weight={FontWeight.bold}
                                        />
                                        <PRadio
                                                name={Labels.performanceSurvey.accuracy}
                                                label={`${"How would you rate the accuracy of the quotes and specifications supplied ?"}`}
                                                options={formDataList.responsive}
                                                onChange={handleChange}
                                                value={formData.accuracy}
                                                helperText={errors?.accuracy}
                                                xs={{ fontSize: "10px" }}
                                        />
                                </PGrid>
                        </PGrid>
                        <PGrid container className={Labels.margin.mt4} >
                                <PGrid item xs={12} sm={12} md={8}>
                                        <PTypography
                                                labelText={`${"3. "} ${Labels.symbols.required} ${"QUALITY"}`}
                                                flag={Labels.fontFlags.normalText}
                                                color={CommonColors.primary}
                                                weight={FontWeight.bold}
                                        />
                                        <PRadio
                                                name={Labels.performanceSurvey.quality}
                                                label={`${"How would you rate the quality of the finished items delivered by PMG ?"}`}
                                                options={formDataList.responsive}
                                                onChange={handleChange}
                                                value={formData.quality}
                                                helperText={errors?.quality}
                                                xs={{ fontSize: "10px" }}
                                        />
                                </PGrid>
                        </PGrid>
                        <PGrid container className={Labels.margin.mt4} >
                                <PGrid item xs={12} sm={12} md={8}>
                                        <PTypography
                                                labelText={`${"4. "} ${Labels.symbols.required} ${"OVERALL EXPERIENCE"}`}
                                                flag={Labels.fontFlags.normalText}
                                                color={CommonColors.primary}
                                                weight={FontWeight.bold}
                                        />
                                        <PRadio
                                                name={Labels.performanceSurvey.overexperience}
                                                label={`${"Overall, how was your experience with PMG on this project ?"}`}
                                                options={formDataList.responsive}
                                                onChange={handleChange}
                                                value={formData.overexperience}
                                                helperText={errors?.overexperience}
                                                xs={{ fontSize: "10px" }}
                                        />
                                </PGrid>
                        </PGrid>

                        <PGrid container className={Labels.margin.mt4} >
                                <PGrid item xs={12} sm={12} md={8}>
                                        <PTypography
                                                labelText={`${"5."} ${"If you have any further comments, please enter them here:"}`}
                                                flag={Labels.fontFlags.normalText}
                                                color={CommonColors.primary}
                                                weight={FontWeight.big}
                                        />
                                        <PTextField
                                                name={Labels.performanceSurvey.comments}
                                                value={formData.comments}
                                                onChange={handleChange}
                                                //width={100}
                                                rows={4.5}
                                                multiline={true}
                                                helperText={errors?.comments}
                                        />
                                </PGrid>
                        </PGrid>

                        <Divider sx={{ mb: 2, mt: 4 }}></Divider>

                        <PGrid container className="d-flex align-items-center justify-content-between">
                                <PGrid item xs={12} sm={6} md={8}>
                                </PGrid>

                                <PGrid item xs={12} sm={6} md={4} className="d-flex justify-content-end gap-2">
                                        <PButton
                                                label={getLabel("lbl40")}
                                                variant="contained"
                                                color={CommonColors.dark_blue}
                                                onClick={(e) => handleSubmit(e, true)}
                                                width={180}
                                                loading={loading}
                                                startIcon={<img src={arrow} alt="arrow" className="icon" />}
                                        />
                                </PGrid>
                        </PGrid>
                </PGrid>
        </Box >
</>
)
};
export default PerformanceSurvey;