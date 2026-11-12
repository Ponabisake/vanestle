
import { useState, useEffect, useRef } from "react";
import { Box, LinearProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import SentimentVeryDissatisfiedRoundedIcon from "@mui/icons-material/SentimentVeryDissatisfiedRounded";
import SentimentDissatisfiedRoundedIcon from "@mui/icons-material/SentimentDissatisfiedRounded";
import SentimentNeutralRoundedIcon from "@mui/icons-material/SentimentNeutralRounded";
import SentimentSatisfiedRoundedIcon from "@mui/icons-material/SentimentSatisfiedRounded";
import SentimentVerySatisfiedRoundedIcon from "@mui/icons-material/SentimentVerySatisfiedRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import PButton from "../../component/PButton/PButton";
import { PmgColors } from "../../component/PHeadingAccent/PHeadingAccent";
import { Labels } from "../../utils/constants/labels";
import { CommonColors } from "../../utils/constants/colors";
import { useLanguage } from "../../utils/constants/language";
import { PostApi } from "../../utils/api/networking";
import { ProjectEnquiry_API } from "../../utils/api/apiUrl";
import { isSuccess, toast } from "../../utils/commonFunction/common";
import { labelRoutes } from "../../navigations/labelRoutes";
import arrow from "../../utils/assets/images/arrow_white.svg";

// 1..5 rating scale (legacy PerformanceSurvey.aspx), each with a face and a colour from red to green
const RATINGS = [
        { value: 1, text: "Extremely Unsatisfied", color: PmgColors.red, Icon: SentimentVeryDissatisfiedRoundedIcon },
        { value: 2, text: "Unsatisfied", color: PmgColors.orange, Icon: SentimentDissatisfiedRoundedIcon },
        { value: 3, text: "Neutral", color: PmgColors.gold, Icon: SentimentNeutralRoundedIcon },
        { value: 4, text: "Satisfied", color: "#6FA83A", Icon: SentimentSatisfiedRoundedIcon },
        { value: 5, text: "Extremely Satisfied", color: PmgColors.green, Icon: SentimentVerySatisfiedRoundedIcon },
];

const { responsive, accuracy, quality, overexperience, comments } = Labels.performanceSurvey;

// The four required questions: field, title label, question label
const QUESTIONS = [
        { field: responsive, title: "lbl273", question: "lbl274" },
        { field: accuracy, title: "lbl275", question: "lbl276" },
        { field: quality, title: "lbl277", question: "lbl278" },
        { field: overexperience, title: "lbl279", question: "lbl280" },
];

const COMMENTS_MAX = 2000;
const SURVEY_INCOMPLETE = "Please complete the Survey before you submit";

const card = {
        bgcolor: "white", borderRadius: "14px", border: `1px solid ${PmgColors.navy}14`,
        boxShadow: `0 4px 14px ${PmgColors.navy}0A`, p: { xs: 2, sm: 3 },
        transition: "border-color 0.25s, box-shadow 0.25s",
};

/** Ring showing how many required questions are answered. */
const ProgressRing = ({ answered, total }) => {
        const size = 76, stroke = 7, r = (size - stroke) / 2, c = 2 * Math.PI * r;
        const done = answered === total;
        return (
                <Box sx={{ position: "relative", width: size, height: size, flexShrink: 0 }}
                        role="img" aria-label={`${answered} of ${total} questions answered`}>
                        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
                                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={stroke} />
                                <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeLinecap="round" strokeWidth={stroke}
                                        stroke={done ? PmgColors.green : PmgColors.gold}
                                        strokeDasharray={c} strokeDashoffset={c * (1 - answered / total)}
                                        style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s" }} />
                        </svg>
                        <Box sx={{
                                position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                                alignItems: "center", justifyContent: "center", color: "white", lineHeight: 1
                        }}>
                                {done
                                        ? <CheckRoundedIcon sx={{ fontSize: 30, color: PmgColors.gold }} />
                                        : <>
                                                <Box sx={{ fontSize: 20, fontWeight: 700 }}>{answered}/{total}</Box>
                                                <Box sx={{ fontSize: 10, opacity: 0.75, mt: 0.4, letterSpacing: "0.06em" }}>DONE</Box>
                                        </>}
                        </Box>
                </Box>
        );
};

/** Five face tiles; native radios underneath, so Tab / arrow keys work. */
const RatingScale = ({ name, value, onChange, labelledBy }) => (
        <Box>
                <Box role="radiogroup" aria-labelledby={labelledBy} sx={{
                        display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: { xs: 0.75, sm: 1.5 }
                }}>
                        {RATINGS.map((rating) => {
                                const { value: v, text, color } = rating;
                                const selected = Number(value) === v;
                                const dimmed = !!value && !selected;
                                return (
                                        <Box component="label" key={v} title={text} sx={{
                                                position: "relative", cursor: "pointer", userSelect: "none",
                                                display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5,
                                                py: { xs: 1.25, sm: 1.75 }, px: 0.5, borderRadius: "12px",
                                                border: `2px solid ${selected ? color : `${PmgColors.navy}14`}`,
                                                bgcolor: selected ? `${color}14` : "#FAFAFC",
                                                color: selected ? color : `${PmgColors.navy}8C`,
                                                opacity: dimmed ? 0.65 : 1,
                                                transform: selected ? "translateY(-2px)" : "none",
                                                boxShadow: selected ? `0 6px 16px ${color}33` : "none",
                                                transition: "all 0.2s ease",
                                                "&:hover": { borderColor: color, color, opacity: 1, transform: "translateY(-2px)" },
                                                "&:has(input:focus-visible)": { outline: `3px solid ${PmgColors.indigo}55`, outlineOffset: 2 },
                                        }}>
                                                <input type="radio" name={name} value={v} checked={selected}
                                                        onChange={() => onChange({ target: { name, value: v } })}
                                                        aria-label={`${v} - ${text}`}
                                                        style={{ position: "absolute", opacity: 0, width: 1, height: 1, margin: 0 }} />
                                                <rating.Icon sx={{ fontSize: { xs: 30, sm: 38 }, transition: "transform 0.2s", transform: selected ? "scale(1.12)" : "none" }} />
                                                <Box sx={{ fontSize: { xs: 13, sm: 15 }, fontWeight: 700, color: selected ? color : PmgColors.navy }}>{v}</Box>
                                                <Box sx={{
                                                        display: { xs: "none", md: "block" }, fontSize: 11, lineHeight: 1.2, textAlign: "center",
                                                        fontWeight: selected ? 700 : 500, minHeight: 26
                                                }}>
                                                        {text}
                                                </Box>
                                        </Box>
                                );
                        })}
                </Box>
                {/* phone: tiles show only faces and numbers, so label the two ends of the scale */}
                <Box sx={{
                        display: { xs: "flex", md: "none" }, justifyContent: "space-between", mt: 0.75,
                        fontSize: 11, color: `${PmgColors.navy}99`
                }}>
                        <span>{RATINGS[0].text}</span>
                        <span>{RATINGS[4].text}</span>
                </Box>
        </Box>
);

const PerformanceSurvey = () => {
        const { getLabel } = useLanguage();
        const navigate = useNavigate();
        const { userName, id: enquiryId, enquiryId: enquiryNumber } = useSelector((state) => state.userDetails.user);
        const [loading, setLoading] = useState(false);
        const [submitted, setSubmitted] = useState(false);
        const [formData, setFormData] = useState({
                [responsive]: "",
                [accuracy]: "",
                [quality]: "",
                [overexperience]: "",
                [comments]: "",
        });
        const [errors, setErrors] = useState({});
        const cardRefs = useRef({});

        // The survey is opened from the dashboard's "Take Survey" button, which stores the enquiry id
        useEffect(() => {
                if (!enquiryId) navigate(labelRoutes.vaDashboard, { replace: true });
        }, [enquiryId, navigate]);

        const answered = QUESTIONS.filter(({ field }) => !!formData[field]).length;

        const handleChange = (e) => {
                const { name, value } = e.target;
                setFormData((prev) => ({ ...prev, [name]: value }));
                setErrors((prev) => ({ ...prev, [name]: "" }));
        };

        const validate = () => {
                const missing = QUESTIONS.filter(({ field }) => !formData[field]).map(({ field }) => field);
                setErrors(Object.fromEntries(missing.map(field => [field, Labels.commonLabel.required])));
                if (missing.length) {
                        cardRefs.current[missing[0]]?.scrollIntoView({ behavior: "smooth", block: "center" });
                }
                return missing.length === 0;
        };

        const handleSubmit = async () => {
                if (!validate()) {
                        toast(Labels.status.failure, SURVEY_INCOMPLETE);
                        return;
                }
                try {
                        setLoading(true);
                        const response = await PostApi(ProjectEnquiry_API.SaveSurvey, {
                                enqId: enquiryId,
                                username: userName,
                                responsive: Number(formData[responsive]),
                                accuracy: Number(formData[accuracy]),
                                quality: Number(formData[quality]),
                                overallExp: Number(formData[overexperience]),
                                comments: formData[comments]?.trim() ?? "",
                        });
                        if (isSuccess(response)) {
                                setSubmitted(true);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                        } else {
                                toast(Labels.status.failure, response?.data || Labels.message.somethingWentWrong);
                        }
                } catch {
                        toast(Labels.status.failure, Labels.message.somethingWentWrong);
                } finally {
                        setLoading(false);
                }
        };

        // ---------- thank-you screen ----------
        if (submitted) {
                return (
                        <Box sx={{ py: { xs: 3, md: 6 }, display: "flex", justifyContent: "center" }}>
                                <Box sx={{ ...card, maxWidth: 560, width: "100%", textAlign: "center", p: { xs: 3, sm: 5 }, borderTop: `4px solid ${PmgColors.green}` }}>
                                        <Box sx={{
                                                width: 84, height: 84, mx: "auto", mb: 2, borderRadius: "50%",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                bgcolor: `${PmgColors.green}14`, color: PmgColors.green,
                                                "@keyframes pop": { "0%": { transform: "scale(0.4)", opacity: 0 }, "70%": { transform: "scale(1.08)" }, "100%": { transform: "scale(1)", opacity: 1 } },
                                                animation: "pop 0.5s ease-out"
                                        }}>
                                                <TaskAltRoundedIcon sx={{ fontSize: 48 }} />
                                        </Box>
                                        <Box sx={{ fontSize: { xs: 22, sm: 26 }, fontWeight: 700, color: PmgColors.navy }}>
                                                Thank you for completing our survey!
                                        </Box>
                                        <Box sx={{ fontSize: 15, color: `${PmgColors.navy}B3`, mt: 1, mb: 3 }}>
                                                Your feedback helps PMG improve our services{enquiryNumber ? ` (Enquiry ${enquiryNumber})` : ""}.
                                        </Box>
                                        <Box sx={{ display: "flex", justifyContent: "center" }}>
                                                <PButton
                                                        label="Back to Dashboard"
                                                        variant="contained"
                                                        color={CommonColors.dark_blue}
                                                        onClick={() => navigate(labelRoutes.vaDashboard)}
                                                        width={220}
                                                />
                                        </Box>
                                </Box>
                        </Box>
                );
        }

        // ---------- survey ----------
        return (
                <Box sx={{ py: 3, maxWidth: 920, mx: "auto" }}>
                        {/* header */}
                        <Box sx={{
                                position: "relative", overflow: "hidden", borderRadius: "16px", color: "white",
                                p: { xs: 2.5, sm: 4 }, mb: 3,
                                background: `linear-gradient(135deg, ${PmgColors.navy} 0%, ${PmgColors.indigo} 70%, ${PmgColors.purple} 100%)`,
                                borderBottom: `4px solid ${PmgColors.gold}`,
                                display: "flex", alignItems: "center", gap: 3, justifyContent: "space-between",
                        }}>
                                {/* decorative circles */}
                                <Box aria-hidden sx={{ position: "absolute", right: -60, top: -60, width: 200, height: 200, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.05)" }} />
                                <Box aria-hidden sx={{ position: "absolute", right: 90, bottom: -80, width: 140, height: 140, borderRadius: "50%", bgcolor: `${PmgColors.gold}14` }} />

                                <Box sx={{ position: "relative", minWidth: 0 }}>
                                        <Box aria-hidden sx={{ width: 36, height: 6, bgcolor: PmgColors.gold, borderRadius: 3, mb: 1.5 }} />
                                        <Box component="h1" sx={{ m: 0, fontSize: { xs: 24, sm: 30 }, fontWeight: 600, lineHeight: 1.2 }}>
                                                {getLabel("lbl271")}
                                        </Box>
                                        <Box sx={{ fontSize: { xs: 13, sm: 15 }, opacity: 0.85, mt: 0.75 }}>{getLabel("lbl272")}</Box>
                                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
                                                {enquiryNumber && (
                                                        <Box sx={{ px: 1.5, py: 0.5, borderRadius: 99, fontSize: 12, fontWeight: 600, bgcolor: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
                                                                Enquiry No: {enquiryNumber}
                                                        </Box>
                                                )}
                                                <Box sx={{ px: 1.5, py: 0.5, borderRadius: 99, fontSize: 12, fontWeight: 600, bgcolor: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
                                                        Takes about 1 minute
                                                </Box>
                                        </Box>
                                </Box>
                                <Box sx={{ position: "relative", display: { xs: "none", sm: "block" } }}>
                                        <ProgressRing answered={answered} total={QUESTIONS.length} />
                                </Box>
                        </Box>

                        {/* questions */}
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                {QUESTIONS.map(({ field, title, question }, index) => {
                                        const value = formData[field];
                                        const rating = RATINGS.find(r => r.value === Number(value));
                                        const hasError = !!errors[field];
                                        const titleId = `survey-q-${field}`;
                                        return (
                                                <Box key={field} ref={el => { cardRefs.current[field] = el; }} sx={{
                                                        ...card,
                                                        borderColor: hasError ? PmgColors.red : rating ? `${rating.color}55` : `${PmgColors.navy}14`,
                                                        boxShadow: hasError ? `0 0 0 3px ${PmgColors.red}1F` : card.boxShadow,
                                                }}>
                                                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 2 }}>
                                                                <Box sx={{
                                                                        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                                                                        display: "flex", alignItems: "center", justifyContent: "center",
                                                                        fontSize: 14, fontWeight: 700, color: "white", transition: "background-color 0.25s",
                                                                        bgcolor: rating ? PmgColors.green : PmgColors.navy,
                                                                }}>
                                                                        {rating ? <CheckRoundedIcon sx={{ fontSize: 18 }} /> : index + 1}
                                                                </Box>
                                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                                        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                                                                                <Box sx={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: PmgColors.indigo }}>
                                                                                        {getLabel(title)} <Box component="span" sx={{ color: PmgColors.red }}>{Labels.symbols.required}</Box>
                                                                                </Box>
                                                                                {rating && (
                                                                                        <Box sx={{ ml: "auto", px: 1.25, py: 0.25, borderRadius: 99, fontSize: 12, fontWeight: 700, color: rating.color, bgcolor: `${rating.color}14` }}>
                                                                                                {rating.text}
                                                                                        </Box>
                                                                                )}
                                                                        </Box>
                                                                        <Box id={titleId} sx={{ fontSize: { xs: 15, sm: 17 }, fontWeight: 600, color: PmgColors.navy, mt: 0.5 }}>
                                                                                {getLabel(question)}{Labels.symbols.optional}
                                                                        </Box>
                                                                </Box>
                                                        </Box>
                                                        <RatingScale name={field} value={value} onChange={handleChange} labelledBy={titleId} />
                                                        {hasError && (
                                                                <Box role="alert" sx={{ mt: 1.25, fontSize: 13, color: PmgColors.red, fontWeight: 600 }}>
                                                                        Please choose a rating
                                                                </Box>
                                                        )}
                                                </Box>
                                        );
                                })}

                                {/* comments */}
                                <Box sx={card}>
                                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 1.5 }}>
                                                <Box sx={{
                                                        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                                                        display: "flex", alignItems: "center", justifyContent: "center",
                                                        bgcolor: `${PmgColors.navy}0D`, color: PmgColors.navy
                                                }}>
                                                        <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 17 }} />
                                                </Box>
                                                <Box>
                                                        <Box sx={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: PmgColors.indigo }}>
                                                                Comments <Box component="span" sx={{ textTransform: "none", fontWeight: 500, letterSpacing: 0, color: `${PmgColors.navy}80` }}>(optional)</Box>
                                                        </Box>
                                                        <Box component="label" htmlFor="survey-comments" sx={{ display: "block", fontSize: { xs: 15, sm: 17 }, fontWeight: 600, color: PmgColors.navy, mt: 0.5 }}>
                                                                {getLabel("lbl281")}
                                                        </Box>
                                                </Box>
                                        </Box>
                                        <Box
                                                component="textarea"
                                                id="survey-comments"
                                                name={comments}
                                                value={formData[comments]}
                                                onChange={handleChange}
                                                maxLength={COMMENTS_MAX}
                                                rows={5}
                                                placeholder="Tell us what went well, or what we could do better…"
                                                sx={{
                                                        width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit",
                                                        fontSize: 15, color: PmgColors.navy, p: 1.5, borderRadius: "10px",
                                                        border: `1px solid ${PmgColors.navy}26`, bgcolor: "#FAFAFC", outline: "none",
                                                        transition: "border-color 0.2s, box-shadow 0.2s",
                                                        "&:focus": { borderColor: PmgColors.indigo, boxShadow: `0 0 0 3px ${PmgColors.indigo}1F`, bgcolor: "white" },
                                                }}
                                        />
                                        <Box sx={{ textAlign: "right", fontSize: 12, color: `${PmgColors.navy}80`, mt: 0.5 }}>
                                                {formData[comments].length} / {COMMENTS_MAX}
                                        </Box>
                                </Box>
                        </Box>

                        {/* sticky submit bar */}
                        <Box sx={{
                                position: "sticky", bottom: 12, zIndex: 2, mt: 3,
                                display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap",
                                bgcolor: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)",
                                border: `1px solid ${PmgColors.navy}14`, borderRadius: "14px",
                                boxShadow: `0 10px 28px ${PmgColors.navy}1F`, px: { xs: 2, sm: 3 }, py: 1.5,
                        }}>
                                <Box sx={{ flex: 1, minWidth: 160 }}>
                                        <Box sx={{ fontSize: 13, fontWeight: 600, color: PmgColors.navy, mb: 0.75 }}>
                                                {answered === QUESTIONS.length
                                                        ? "All questions answered. Ready to submit!"
                                                        : `${answered} of ${QUESTIONS.length} required questions answered`}
                                        </Box>
                                        <LinearProgress
                                                variant="determinate"
                                                value={(answered / QUESTIONS.length) * 100}
                                                sx={{
                                                        height: 6, borderRadius: 3, bgcolor: `${PmgColors.navy}12`,
                                                        "& .MuiLinearProgress-bar": {
                                                                borderRadius: 3,
                                                                bgcolor: answered === QUESTIONS.length ? PmgColors.green : PmgColors.gold
                                                        }
                                                }}
                                        />
                                </Box>
                                <PButton
                                        label={getLabel("lbl40")}
                                        variant="contained"
                                        color={CommonColors.dark_blue}
                                        onClick={handleSubmit}
                                        width={180}
                                        loading={loading}
                                        startIcon={<img src={arrow} alt="" className="icon" />}
                                />
                        </Box>
                </Box>
        );
};
export default PerformanceSurvey;
