import React, { useEffect, useState } from "react";
import {
    Box,
    Typography,
    Card,
    Grid,
    Button,
    Divider,
    Avatar
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DescriptionIcon from "@mui/icons-material/Description";
import FolderIcon from "@mui/icons-material/Folder";
import PersonIcon from "@mui/icons-material/Person";
import PublicIcon from "@mui/icons-material/Public";
import EventIcon from "@mui/icons-material/Event";
import PGrid from "../../component/PGrid/PGrid";
import PCard from "../../component/PCard/PCard";
import PTypography from "../../component/PTypography/PTypography";
import PHeadingAccent, { PmgColors } from "../../component/PHeadingAccent/PHeadingAccent";
import { Labels } from "../../utils/constants/labels";
import { CommonColors } from "../../utils/constants/colors";
import { FontWeight } from "../../utils/constants/fonts";
import PButton from "../../component/PButton/PButton";
import { labelRoutes } from "../../navigations/labelRoutes";
import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "../../utils/constants/language";
import { Dashboard_API } from "../../utils/api/apiUrl";
import { PostApi } from "../../utils/api/networking";
import { toast } from "../../utils/commonFunction/common";
import arrow from "../../utils/assets/images/arrow_white.svg";
import { useSelector } from "react-redux";
const EnquirySuccess = () => {
    
    const { getLabel } = useLanguage();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const { id, userName } = useSelector((state) => state.userDetails.user);
    const [formDataList, setFormDataList] = useState({
        clientInfo: [],
        enquiryDetails: []
    });

    
    useEffect(() => {
        fetchData();
    }, []);
    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await PostApi(Dashboard_API.GetDetails, {
                Enquiryid: id,
                Username: userName,
            });
            setFormDataList(prev => ({
                ...prev,
                clientInfo: response.enqClientinfo,
                enquiryDetails: response.enqProjectinfo
            }));
        } catch (error) {
            toast(Labels.status.failure, Labels.message.somethingWentWrong);
        } finally {
            setLoading(false);
        }
    };
    const data = [
        { label: getLabel("lbl162"), value: formDataList.clientInfo?.enqUId || "-", icon: <DescriptionIcon /> },
        { label: getLabel("lbl42"), value: formDataList.enquiryDetails?.projectNo || "-", icon: <FolderIcon /> },
        { label: getLabel("lbl28"), value: formDataList.clientInfo?.client || "-", icon: <PersonIcon /> },
        { label: getLabel("lbl09"), value: formDataList.clientInfo?.country || "-", icon: <PublicIcon /> },
        { label: getLabel("lbl183"), value: formDataList.enquiryDetails?.estdate || "-", icon: <EventIcon /> }
    ];

    const handleSubmit = async (e) => {
        navigate(labelRoutes.projectEnquiry);
    };
    const handleBack = async () => {
        navigate(labelRoutes.dashboard);
    };

    const columnWidths = [2, 3, 2, 2, 3];

    return (


        <Box sx={{ py: 3 }}>
            <PGrid container style={{paddingBottom:"60px"}}>
                <div style={{paddingBottom:"12px"}}>
                    <PHeadingAccent color={PmgColors.gold} />
                    <PTypography
                        labelText={`${getLabel("lbl184")} ${Labels.symbols.important}`}
                        flag={Labels.fontFlags.header}
                        color={CommonColors.primary}
                        weight={FontWeight.regular}
                    />
                </div>
                <PTypography
                    labelText={getLabel("lbl185")}
                    flag={Labels.fontFlags.normalText}
                    color={CommonColors.primary}
                    weight={FontWeight.regular}
                />
            </PGrid>
            <PHeadingAccent color={PmgColors.indigo} />

            {/* Job Summary */}
            <PGrid container className={Labels.margin.mb3}>
                <PGrid item xs={12} sm={12} md={12} className="d-flex">
                    <PTypography
                        labelText={getLabel("lbl167")}
                        flag={Labels.fontFlags.header}
                        color={CommonColors.primary}
                        weight={FontWeight.regular}
                    />
                </PGrid>
            </PGrid>
            <PGrid  className={Labels.margin.mb3}>
                 <Divider sx={{ mb: 2 }} />
                <PGrid item xs={12} sm={12} md={12}>
                    <PGrid container className="align-items-center" sx={{width: "100%", py: 1.5}}>
                        
                        {data.map((item, index) => (
                            <React.Fragment key={index}>
                                <PGrid item xs={12} sm={6} md={columnWidths[index]}>
                                    <PTypography
                                        labelText={item.label}
                                        weight={FontWeight.bold}
                                        flag={Labels.fontSize.sm}
                                        marginBottom={1}
                                    />

                                    <PTypography
                                        labelText={item.value}
                                        weight={FontWeight.regular}
                                        color={CommonColors.primary}
                                        flag={Labels.fontSize.sm}
                                    />
                                </PGrid>
                            </React.Fragment>
                        ))}
                    </PGrid>
                    <Divider sx={{ mt: 2,mb:3, width: "100%" }} />
                </PGrid>

            </PGrid>



            {/* Info Box */}
            <Box
                sx={{
                    borderRadius: 2,
                    p: 0,
                    mb: 5,
                    display: "flex",
                    alignItems: "center",
                    gap: 1
                }}
            >
                {/* <CheckCircleIcon sx={{ color: "#22c55e" }} /> */}
                <PTypography
                    labelText={"We'll notify you via email once suppliers respond to your enquiry."}
                    flag={Labels.fontFlags.normalText}
                    color={CommonColors.primary}
                    weight={FontWeight.regular}
                />
            </Box>

            {/* Buttons */}
            <PGrid container className={Labels.margin.mb3}>
                <PGrid item xs={12} sm={12} md={12} className="d-flex gap-2" >
                    <PButton
                        label={getLabel("lbl187")}
                        variant="contained"
                        color={CommonColors.dark_blue}
                        onClick={(e) => handleSubmit(e)}
                        width={250}
                        startIcon={<img src={arrow} alt="arrow" className="icon" />}
                    />

                    <PButton
                        label={getLabel("lbl188")}
                        variant="outlined"
                        onClick={(e) => handleBack()}
                        width={200}
                    />
                </PGrid>
            </PGrid>
        </Box>
    );
};

export default EnquirySuccess;