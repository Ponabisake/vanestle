import { useState, useEffect, useMemo, useRef } from "react";
import { Box, Chip, IconButton, Tooltip, Skeleton } from "@mui/material";
import PDropdown from "../../component/PDropdown/PDropdown";
import PDatepicker from "../../component/PDatepicker/PDatepicker";
import PDashboardCard from "../../component/PDashboardCard/PDashboardCard";
import PTable from "../../component/PTable/PTable";
import { Labels } from "../../utils/constants/labels";
import PButton from "../../component/PButton/PButton";
import PTypography from "../../component/PTypography/PTypography";
import PGrid from "../../component/PGrid/PGrid";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import PSearch from "../../component/PSearch/PSearch";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import AddTaskRoundedIcon from '@mui/icons-material/AddTaskRounded';
import { FontWeight } from '../../utils/constants/fonts'
import { useLanguage } from "../../utils/constants/language";
import { Account_API, Dashboard_API } from "../../utils/api/apiUrl";
import { PostApi } from "../../utils/api/networking";
import { exportToExcel, isNotEmpty, isSuccess, notifyValidation, toast } from "../../utils/commonFunction/common";
import { useNavigate } from "react-router-dom";
import { labelRoutes } from "../../navigations/labelRoutes";
import PDialog from "../../component/PDialog/PDialog";
import "./dashboard.css";
import arrow from "../../utils/assets/images/arrow_white.svg";
import MoveToInboxIcon from "@mui/icons-material/MoveToInbox";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import EditIcon from "@mui/icons-material/Edit";
import ImageIcon from "@mui/icons-material/Image";
import VisibilityIcon from "@mui/icons-material/Visibility";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import PauseIcon from "@mui/icons-material/Pause";
import SettingsInputAntennaIcon from "@mui/icons-material/SettingsInputAntenna";
import PrintIcon from "@mui/icons-material/Print";
import OutboxOutlinedIcon from "@mui/icons-material/OutboxOutlined";
import MoveToInboxOutlinedIcon from "@mui/icons-material/MoveToInboxOutlined";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import { userDetails } from "../../redux/actionType/actionType";
import { useDispatch, useSelector } from "react-redux";
import { CommonColors } from "../../utils/constants/colors";

// ViewDashboard SurveyStatusName for a client's completed job that still needs the survey
const SURVEY_TAKE = "Take Survey";

// Status "RFQ Sent To Supplier": the API sends quoteDaysLeft (legacy "!" with "N Day(s) Left" / "Job expired")
const RFQ_SENT_STATUS = 1;
// Statuses that show the yellow dot when the enquiry has attachments (legacy "Attachment Exist")
const ATTACHMENT_DOT_STATUSES = [18, 19, 20, 21, 22, 23, 24];

const quoteDaysLeftText = (days) => (days > 0 ? `${days} ${days === 1 ? "Day" : "Days"} Left` : "Job expired");

// Job status: first entry "All" (legacy ddl "ALL") shows every status
const ALL_STATUSES = "__all";
const STATUS_ALL_OPTION = { value: ALL_STATUSES, label: "All" };

// A filter dropdown is off when it is empty (cleared with its ×) or set to All
const isActiveFilter = (value) => isNotEmpty(value) && value !== ALL_STATUSES;

const dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { getLabel } = useLanguage();
  const [openFilter, setOpenFilter] = useState("");
  const [filter, setFilter] = useState(false);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const { countryID, role, userName, userType, menuId, userID } = useSelector((state) => state.userDetails.user);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    clientName: "",
    country: "",
    user: "",
    startDate: "",
    endDate: "",
    search: "",
    status: "",
    tile: "",
  });

  const [formDataList, setFormDataList] = useState({
    country: [],
    clientName: [],
    status: [],
    user: [],
  });
  const [errors, setErrors] = useState({
    startDate: "",
    endDate: "",
  })


  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await PostApi(Dashboard_API.Master, {
        userCountryId: countryID,
        role: role,
        userId: userID
      });
      setFormData({
        ...formData,
        country: role === Labels.role.admin ? 0 : countryID
      });
      const res = await PostApi(Dashboard_API.Dashboard, {
        userCountryId: countryID,
        role: role,
        createdName: 0,
        enqUId: "",
        projectNo: "",
        startDate: "",
        endDate: "",
        statusId: "",
        jobposition: "",
        client: "",
        username: userName,
        menuId: menuId
      });

      // Agency Enquiry dashboard: the API sends the legacy filter lists (clients of the user, job statuses,
      // creators of the listed enquiries); elsewhere the master lists are used
      const filters = isSuccess(res) ? res?.data?.filters : null;
      setFormDataList({
        country: response?.country || [],
        clientName: filters?.clients || response?.client || [],
        status: filters?.statuses || response?.status || [],
        user: (filters?.createdBy || []).map((name) => ({ value: name, label: name })),
      });

      if (isSuccess(res)) {
        const data = res?.data;

        setSummary(data.summary || {});
        const formattedRows = (data.detailed || []).map(item => ({
          enquiryId: item.enquiryId,
          projectNumber: item.projectNo,
          projectName: item.projectDesc,
          requestedDate: item.serverTime,
          status: item.statusName,
          statusId: item.status,
          surveyStatus: item.surveyStatusName,
          countryID: item.pmgEntity,
          jobStatusID: item.status,
          serchjobs: item.serchjobs,
          date: item.serverTime,
          id: item.id,
          stepID: item.stepId,
          clientId: item.clientId,
          createdBy: item.createdBy,
          ponumber: item.ponumber,
          attachments: item.attachments,
          quoteDaysLeft: item.quoteDaysLeft
        }));
        setRows(formattedRows);
        // No filter lists from the API: offer the creators of the loaded rows
        if (!filters) {
          const creators = [...new Set(formattedRows.map((r) => r.createdBy?.trim()).filter(Boolean))].sort();
          setFormDataList((prev) => ({ ...prev, user: creators.map((name) => ({ value: name, label: name })) }));
        }
      }
      dispatch({
        type: userDetails,
        payload: {
          id: 0,
          enquiryId: "", // no enquiry open – avoids showing a previous enquiry ID in the stepper
          attachment: 0
        },
      });
    } catch (error) {
      toast(Labels.status.failure, Labels.message.somethingWentWrong);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [menuId]);

  const renderStatus = (row) => {
    const showDot = ATTACHMENT_DOT_STATUSES.includes(row.statusId) && row.attachments != 0;
    const showDaysLeft = row.statusId === RFQ_SENT_STATUS && row.quoteDaysLeft != null;
    return (
      <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
        {showDot && (
          <Tooltip title="Attachment Exist" arrow>
            <span style={{ color: "#ffc104", fontSize: "20px", lineHeight: 1 }} aria-label="Attachment Exist">●</span>
          </Tooltip>
        )}
        <span>{row.status}</span>
        {showDaysLeft && (
          <Tooltip title={quoteDaysLeftText(row.quoteDaysLeft)} arrow>
            <span
              aria-label={quoteDaysLeftText(row.quoteDaysLeft)}
              style={{ color: "#d32f2f", fontSize: "22px", fontWeight: 700, lineHeight: 1, cursor: "help", paddingLeft: "4px" }}
            >
              !
            </span>
          </Tooltip>
        )}
      </Box>
    );
  };

  const columns = [
    { field: "enquiryId", header: getLabel("lbl162") },
    { field: "projectNumber", header: getLabel("lbl163") },
    ...(userType?.toLowerCase() === Labels.userType.client
      ? [{ field: "ponumber", header: "Do No" }]
      : [{ field: "requestedDate", header: "Requested Date" }]),
    { field: "projectName", header: getLabel("lbl155") },
    { field: "status", header: "Status", render: renderStatus },
    ...(userType?.toLowerCase() === Labels.userType.supplier
      ? []
      : [
        {
          field: "surveyStatus",
          header: userType?.toLowerCase() === Labels.userType.client ? "Survey" : "Survey Status",
          // Client: the API sends "Take Survey" (show the button), "Survey Taken", "Survey Expired" or blank,
          // as the legacy client dashboard. Agency: "Survey email sent to Client" / "Survey Taken" / blank.
          render: (row) =>
            userType?.toLowerCase() === Labels.userType.client && row.surveyStatus === SURVEY_TAKE
              ? (
                <PButton
                  variant="contained"
                  label="Take Survey"
                  width={150}
                  height={30}
                  sx={{
                    cursor: "pointer",
                    "&:hover": {
                      textDecoration: "underline",
                      cursor: "pointer",
                    },
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRoute(row, "Survey");
                  }}
                />
              )
              : row.surveyStatus,
        },
      ]),
  ];

  // Each tile filters the grid with `match`. Agency Enquiry: as the legacy serchjobs search (30 = item status 1,
  // 31 = 3, 32 = 6 and above, so Awarded includes Completed); Client: the API's serchjobs codes.
  const byStatus = (id) => (row) => row.jobStatusID === id;
  const agencyCards = {
    1: [
      {
        key: "approval",
        title: getLabel("lbl13"),
        value: summary.approval,
        subtitle: getLabel("lbl17"),
        iconColor: Labels.primary,
        icon: <PendingActionsIcon />,
        match: byStatus(3),
        bgColor: "#FAB01B",
        indicatorColor: "#ED3B25",
        position: "start",
      },
      {
        key: "awarded",
        title: getLabel("lbl14"),
        value: summary.awarded,
        subtitle: getLabel("lbl18"),
        iconColor: Labels.primary,
        icon: <EmojiEventsIcon />,
        match: (row) => row.jobStatusID >= 6,
        bgColor: "#fab01b1a",
        indicatorColor: "#CF7729",
        position: "end",
      },
      {
        key: "active",
        title: getLabel("lbl12"),
        value: summary.active,
        subtitle: getLabel("lbl16"),
        iconColor: Labels.primary,
        icon: <AssignmentIcon />,
        match: byStatus(1),
        bgColor: "#fab01b1a",
        indicatorColor: "#CF7729",
        position: "end",
      },
      {
        key: "completed",
        title: getLabel("lbl15"),
        value: summary.completed,
        subtitle: getLabel("lbl18"),
        iconColor: Labels.primary,
        icon: <TaskAltIcon />,
        match: byStatus(24),
        bgColor: "#fab01b1a",
        indicatorColor: "#00916B",
        position: "start",
      },
    ],

    2: [
      {
        key: "paused",
        title: getLabel("lbl205"),
        value: 0,
        subtitle: getLabel("lbl216"),
        iconColor: Labels.primary,
        icon: <PauseIcon />,
        match: byStatus(3),
        bgColor: "#FAB01B",
        indicatorColor: "#ED3B25",
        position: "start",
      },
      {
        key: "live",
        title: getLabel("lbl204"),
        value: 0,
        subtitle: getLabel("lbl215"),
        iconColor: Labels.primary,
        icon: <SettingsInputAntennaIcon />,
        match: byStatus(1),
        bgColor: "#fab01b1a",
        indicatorColor: "#CF7729",
        position: "end",
      },
      {
        key: "scheduled",
        title: getLabel("lbl206"),
        value: 0,
        subtitle: getLabel("lbl217"),
        iconColor: Labels.primary,
        icon: <PrintIcon />,
        match: (row) => row.jobStatusID >= 6 && row.jobStatusID !== 24,
        bgColor: "#fab01b1a",
        indicatorColor: "#CF7729",
        position: "end",
      },
    ],

    3: [
      {
        key: "approval",
        title: getLabel("lbl13"),
        value: summary.approval,
        subtitle: getLabel("lbl17"),
        iconColor: Labels.primary,
        icon: <MoveToInboxOutlinedIcon />,
        match: byStatus(3),
        bgColor: "#FAB01B",
        indicatorColor: "#ED3B25",
        position: "start",
      },
      {
        key: "active",
        title: getLabel("lbl12"),
        value: summary.active,
        subtitle: getLabel("lbl16"),
        iconColor: Labels.primary,
        icon: <OutboxOutlinedIcon />,
        match: byStatus(1),
        bgColor: "#fab01b1a",
        indicatorColor: "#CF7729",
        position: "end",
      },
      {
        key: "awarded",
        title: getLabel("lbl14"),
        value: summary.awarded,
        subtitle: getLabel("lbl18"),
        iconColor: Labels.primary,
        icon: <PrintOutlinedIcon />,
        match: (row) => row.jobStatusID >= 6 && row.jobStatusID !== 24,
        bgColor: "#fab01b1a",
        indicatorColor: "#CF7729",
        position: "end",
      },
    ],
  };

  const supplierCards = [
    {
      key: "newrfq",
      title: getLabel("lbl207"),
      value: summary.newrfq,
      subtitle: getLabel("lbl218"),
      iconColor: Labels.primary,
      icon: <LocalOfferIcon />,
      match: byStatus(3),
      bgColor: "#FAB01B",
      indicatorColor: "#ED3B25",
      position: "start",
    },
    {
      key: "quoteproposed",
      title: getLabel("lbl208"),
      value: summary.quoteproposed,
      subtitle: getLabel("lbl219"),
      iconColor: Labels.primary,
      icon: <MoveToInboxIcon />,
      match: byStatus(24),
      bgColor: "#fab01b1a",
      indicatorColor: "#CF7729",
      position: "end",
    },
    {
      key: "invites",
      title: getLabel("lbl209"),
      value: summary.invites,
      subtitle: getLabel("lbl220"),
      iconColor: Labels.primary,
      icon: <Inventory2Icon />,
      match: (row) => row.jobStatusID >= 6 && row.jobStatusID !== 24,
      bgColor: "#fab01b1a",
      indicatorColor: "#CF7729",
      position: "end",
    },
  ];

  const bySearchJobs = (code) => (row) => row.serchjobs === code;
  const clientCards = [
    {
      key: "forapproval",
      title: getLabel("lbl13"),
      value: summary.forapproval,
      subtitle: getLabel("lbl17"),
      iconColor: Labels.primary,
      icon: <EditIcon />,
      match: bySearchJobs(30),
      bgColor: "#FAB01B",
      indicatorColor: "#ED3B25",
      position: "start",
    },
    {
      key: "artwork",
      title: getLabel("lbl210"),
      value: summary.artwork,
      subtitle: getLabel("lbl213"),
      iconColor: Labels.primary,
      icon: <ImageIcon />,
      match: bySearchJobs(33),
      bgColor: "#fab01b1a",
      indicatorColor: "#CF7729",
      position: "end",
    },
    {
      key: "proof",
      title: getLabel("lbl55"),
      value: summary.proof,
      subtitle: getLabel("lbl214"),
      iconColor: Labels.primary,
      icon: <VisibilityIcon />,
      match: bySearchJobs(34),
      bgColor: "#fab01b1a",
      indicatorColor: "#CF7729",
      position: "end",
    },
    {
      key: "production",
      title: getLabel("lbl56"),
      value: summary.production,
      subtitle: getLabel("lbl221"),
      iconColor: Labels.primary,
      icon: <HourglassEmptyIcon />,
      match: bySearchJobs(31),
      bgColor: "#fab01b1a",
      indicatorColor: "#CF7729",
      position: "end",
    },
    {
      key: "completed",
      title: getLabel("lbl15"),
      value: summary.completed,
      subtitle: getLabel("lbl222"),
      iconColor: Labels.primary,
      icon: <AssignmentTurnedInIcon />,
      match: bySearchJobs(32),
      bgColor: "#fab01b1a",
      indicatorColor: "#00916B",
      position: "start",
    },
  ];

  const cardData = [
    ...(userType?.toLowerCase() === Labels.userType.agency
      ? agencyCards[menuId] || []
      : userType?.toLowerCase() === Labels.userType.supplier
        ? supplierCards
        : userType?.toLowerCase() === Labels.userType.client
          ? clientCards
          : []),
  ];

  const layout = [
    { id: 'col-1', cards: cardData.slice(0, 1) },
    {
      id: 'col-2',
      cards: cardData.length === 3 ? cardData.slice(1, 3) : cardData.slice(1, cardData.length - 1),
    },
    { id: 'col-3', cards: cardData.length === 3 ? [] : cardData.slice(-1) },
  ];

  const iconStyle = {
    border: "1px solid #2D2F75",
    color: "#2D2F75",
    width: "50px",
    height: "50px",
    "&:hover": { bgcolor: "#2D2F75", color: "#fff", border: "1px solid #2D2F75" }
  };

  // Tile click: toggles that tile's filter (legacy datafilter_manual)
  const handleFilter = (key) => {
    setFormData((prev) => ({
      ...prev,
      tile: prev.tile === key ? "" : key,
    }));
  };

  const activeTile = cardData.find((card) => card.key === formData.tile);

  const data = useMemo(() => {
    let result = [...rows]; // copy original rows

    // tile filter
    if (activeTile?.match) {
      result = result.filter(activeTile.match);
    }

    // job status filter
    if (isActiveFilter(formData.status)) {
      const status = Number(formData.status);
      result = result.filter((item) => item.jobStatusID === status);
    }

    if (isActiveFilter(formData.clientName)) {
      result = result.filter(
        (item) => item.clientId === Number(formData.clientName)
      );
    }

    // created by filter (agency): the creator's name, as the legacy grid's CreatedBy column
    if (isActiveFilter(formData.user)) {
      const createdBy = String(formData.user).trim().toLowerCase();
      result = result.filter(
        (item) => (item.createdBy || "").trim().toLowerCase() === createdBy
      );
    }


    const parse = d => new Date(...(d.includes("/") ? d.split("/") : d.split("-")).reverse().map((v, i) => i === 1 ? v - 1 : +v));
    // Date Filter
    if (filter && isNotEmpty(formData.startDate) && isNotEmpty(formData.endDate)) {
      result = result.filter(item => {
        const req = parse(item.requestedDate);
        const start = parse(formData.startDate);
        const end = parse(formData.endDate);
        end.setHours(23, 59, 59, 999);
        return req >= start && req <= end;
      });
    }
    // search filter
    if (formData.search?.trim()) {
      const search = formData.search.trim().toLowerCase();
      result = result.filter((item) =>
        [item.enquiryId, item.projectName, item.projectNumber, item.status, item.createdBy, item.requestedDate]
          .some((value) => value?.toLowerCase().includes(search))
      );
    }
    return result;

  }, [rows, formData, filter, activeTile]);

  const dateFilterOn = filter && isNotEmpty(formData.startDate) && isNotEmpty(formData.endDate);

  const clearDateFilter = () => {
    setFilter(false);
    setFormData((prev) => ({ ...prev, startDate: "", endDate: "" }));
  };

  const filterChipSx = {
    height: 36,
    borderRadius: "18px",
    border: "1px solid #16133F",
    backgroundColor: "#fff",
    color: "#16133F",
    fontSize: "15px",
    "& .MuiChip-deleteIcon": { color: "#16133F", "&:hover": { color: "#ED3B25" } },
  };

  const handleReset = () => {
    setFilter(false);
    setErrors((prev) => ({
      ...prev,
      startDate: "",
      endDate: ""
    }));

    setFormData((prev) => ({
      ...prev,
      startDate: "",
      endDate: "",
      //country: "",
      user: "",
      search: "",
      status: "",
      tile: "",
      clientName: ""
    }));
  };

  // Exports what the grid currently shows (filters applied)
  const handleExport = () => {
    const exportData = data.map((item) => ({
      "Enquiry ID": item.enquiryId,
      "Project Number": item.projectNumber,
      "Requested Date": item.requestedDate,
      "Project Name": item.projectName,
      "Status": item.status,
      "Survey Status": item.surveyStatus,
      "Created By": item.createdBy,
    }));
    exportToExcel(exportData, Labels.reportName.enquiryReport);
  };

  const handleOpenChoose = () => {
    setOpenFilter(true);
  };

  const handleCloseChoose = () => {
    setOpenFilter(false);
    setErrors((prev) => ({
      ...prev,
      startDate: "",
      endDate: ""
    }));

    setFormData((prev) => ({
      ...prev,
      startDate: "",
      endDate: "",
    }));
  };

  const handleSendChoose = () => {
    const isValid = FliterValidation();
    if (isValid) {
      setFilter(true);
      setOpenFilter(false);
    }
  };

  const FliterValidation = () => {
    const requiredFields = [
      Labels.dashboard.startDate,
      Labels.dashboard.endDate
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

  const handleRedirect = () => {
    menuId === 3 ? window.open(Account_API.Echo, "_blank") : navigate(labelRoutes.clientInfo);
  };

  const handleDownload = () => {

  };

  const handleUpload = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
    }
  };

  const eProcurement = {
    1: getLabel("lbl19"),
    2: getLabel("lbl223"),
    3: getLabel("lbl224"),
  }[menuId];

  const title = {
    1: getLabel("lbl03"),
    2: getLabel("lbl04"),
    3: getLabel("lbl05"),
  }[menuId];

  const icons = [
    { icon: <AddTaskRoundedIcon color="green" />, tooltip: eProcurement, action: handleRedirect },
    { icon: <FileDownloadOutlinedIcon fontSize="large" />, tooltip: "Export", action: handleExport },
    { icon: <CalendarTodayOutlinedIcon fontSize="medium" />, tooltip: "Date Range Filter", action: handleOpenChoose },
    { icon: <span className="resetlabel">Reset filter</span>, tooltip: "", action: handleReset, noHover: true },

  ];

  const stepRoutes = {
    0: labelRoutes.clientInfo,
    1: labelRoutes.enquiryDetails,
    2: labelRoutes.lineItems,
    3: labelRoutes.suppliers,
    4: labelRoutes.review,
  }

  const handleRoute = (row, flag = "") => {
    const route = flag === "Survey" ? labelRoutes.performanceSurvey : row.status === "Draft" ? stepRoutes[row.stepID] : labelRoutes.projectEnquiry;
    dispatch({
      type: userDetails,
      payload: {
        enquiryId: row.enquiryId,
        id: row.id,
        attachment: row.attachments
      },
    });
    navigate(route);
  }
  const lgSizes = [4, 5, 3];
  const mdSizes = [6, 6, 12];

  const isAgency = userType?.toLowerCase() === Labels.userType.agency;
  const showClientFilter = [Labels.userType.agency, Labels.userType.client].includes(userType?.toLowerCase());

  return (
    <div className="dashboard">
      <Box sx={{ py: 3 }}>
        <PGrid item xs={12} sm={6} md={7} style={{ paddingBottom: "30px" }}>
          <PTypography
            labelText={[Labels.userType.client].includes(userType?.toLowerCase()) ? getLabel("lbl270") : `${title}`}
            weight={FontWeight.regular}
            flag={"big"}
            style={{ fontFamily: "'Montserrat', Tahoma, Geneva, Verdana, sans-serif", }}
          />
        </PGrid>

        <PGrid container className={`dashboard-wrapper ${Labels.margin.mb3}`}>
          {layout.map((col, index) => (
            <PGrid key={col.id} item xs={12} md={mdSizes[index]} lg={lgSizes[index]}>
              <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "16px", }}>
                {loading
                  ? col.cards.map((card, cardIndex) => (
                    <Skeleton
                      key={`skeleton-${col.id}-${cardIndex}`}
                      variant="rectangular"
                      height={150}
                      sx={{ borderRadius: 0 }}
                    />
                  ))
                  : col.cards.map((card, cardIndex) => {
                    // eslint-disable-next-line no-unused-vars
                    const { key, match, ...cardProps } = card;
                    return (
                      <PDashboardCard
                        key={`${col.id}-${cardIndex}`}
                        {...cardProps}
                        onClick={() => handleFilter(key)}
                      />
                    );
                  })}
              </div>
            </PGrid>
          ))}
        </PGrid>

        {isAgency && (
          <>
            {loading ? (
              <Skeleton variant="rectangular" height={50} sx={{ borderRadius: 2 }} />
            ) : (
              <>
                {/* upload & download */}
                <PGrid container spacing={2} className={Labels.margin.mb3}>
                  <PGrid item xs={12}>
                    <Box sx={{ border: "1px solid #66658A", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", padding: "10px 20px" }}>
                      <PTypography
                        labelText={getLabel("lbl264")}
                        flag={Labels.fontFlags.subHeader}
                        color={CommonColors.dark_blue}
                      />

                      <Box display="flex" alignItems="center" justifyContent="flex-end" gap={2}>
                        <PButton
                          label={getLabel("lbl265")}
                          variant="contained"
                          onClick={handleDownload}
                          width={300}
                          height={40}
                          startIcon={<img src={arrow} alt="arrow" className="icon" />}
                        />
                        <PButton
                          label={getLabel("lbl266")}
                          variant="outlined"
                          onClick={handleUpload}
                          width={250}
                          height={40}
                        />
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          ref={fileInputRef}
                          style={{ display: "none" }}
                          onChange={handleFileChange}
                        />
                      </Box>
                    </Box>
                  </PGrid>
                </PGrid>
              </>
            )}
          </>
        )}

        {/* Search + filters, then the table across the full width (charts are on the VA Reports page) */}
        {/* PGrid is a Bootstrap row/col: g-3 gives the 1rem gap between the search, the filters and the actions */}
        <PGrid container className={`dashboard-filters g-3 align-items-center ${Labels.margin.mb3}`}>
          <PGrid item xs={12}>
            <PSearch width="100%" placeholder={getLabel("lbl298")} onChange={(e) => setFormData({ ...formData, search: e.target.value })} value={formData.search}
              onClear={() => setFormData((prev) => ({ ...prev, search: "" }))} />
          </PGrid>

          <PGrid item xs={12} sm={6} xl={3}>
            <PDropdown
              label="Job status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[STATUS_ALL_OPTION, ...(formDataList.status || [])]}
              width={Labels.fontSize.xxxxl}
              flag={Labels.flag.auto}
              labelMode="inside"
              clearable
            />
          </PGrid>

          {showClientFilter && (
            <PGrid item xs={12} sm={6} xl={3}>
              <PDropdown
                label={getLabel("lbl28")}
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                options={formDataList.clientName}
                width={Labels.fontSize.xxxxl}
                flag={Labels.flag.auto}
                labelMode="inside"
                clearable
              />
            </PGrid>
          )}

          {isAgency && (
            <PGrid item xs={12} sm={6} xl={3}>
              <PDropdown
                label={getLabel("lbl10")}
                value={formData.user}
                onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                options={formDataList.user}
                width={Labels.fontSize.xxxxl}
                flag={Labels.flag.auto}
                labelMode="inside"
                clearable
              />
            </PGrid>
          )}

          {/* Export, date range, reset: right-aligned on wide screens, after the filters on narrow ones */}
          <PGrid item xs={12} sm={6} xl={3} className="d-flex justify-content-sm-end align-items-center">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              {icons.slice(1).map((item, index) => (
                <Tooltip title={item.tooltip} arrow key={index}>
                  <span>
                    <IconButton
                      sx={{
                        ...iconStyle,
                        ...(item.noHover && {
                          border: "0px solid #fff",
                          width: "auto",
                          height: "auto",
                          px: 1,
                          "&:hover": {
                            backgroundColor: "transparent",
                            textDecoration: "underline",
                          },
                        }),
                      }}
                      onClick={item.action}
                      disabled={loading}
                    >
                      {item.icon}
                    </IconButton>
                  </span>
                </Tooltip>
              ))}
            </Box>
          </PGrid>

          {/* Filters without a field of their own (tile, date range): a chip each, × removes it */}
          {(activeTile || dateFilterOn) && (
            <PGrid item xs={12}>
              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
                {activeTile && (
                  <Chip
                    label={activeTile.title}
                    onDelete={() => setFormData((prev) => ({ ...prev, tile: "" }))}
                    sx={filterChipSx}
                  />
                )}
                {dateFilterOn && (
                  <Chip
                    label={`Requested ${formData.startDate} – ${formData.endDate}`}
                    onDelete={clearDateFilter}
                    sx={filterChipSx}
                  />
                )}
              </Box>
            </PGrid>
          )}
        </PGrid>

        {loading ? (
          <Skeleton variant="rectangular" height={420} sx={{ borderRadius: 2 }} />
        ) : (
          <PTable columns={columns} rows={data} onClick={(row) => { handleRoute(row) }} columnChooser storageKey={`dashboard.${userType?.toLowerCase() || "all"}`} emptyTitle="No enquiries found" emptyMessage="Try adjusting the search or filters, or reset them to see all enquiries." />
        )}
      </Box >


      <PDialog
        open={openFilter}
        onClose={handleCloseChoose}
        title={getLabel("lbl267")}
        showCloseIcon={true}
        actions={
          <>
            <PButton
              fullWidth
              label={getLabel("lbl123")}
              variant="outlined"
              onClick={handleReset}
              width={180}
            />
            <PButton
              fullWidth
              label={getLabel("lbl40")}
              variant={Labels.contained}
              onClick={handleSendChoose}
              width={180}
              startIcon={<img src={arrow} alt="arrow" className="icon" />}
            />
          </>
        }
      >
        <PGrid>
          <PGrid item xs={12} sm={12} md={12} lg={12}>
            <PDatepicker
              name={Labels.dashboard.startDate}
              label={getLabel("lbl52")}
              value={formData.startDate}
              onChange={handleChange}
              width={100}
              helperText={errors?.startDate}
              maxDate={formData.endDate}
            />
          </PGrid>
          <PGrid item xs={12} sm={12} md={12} lg={12}>
            <PDatepicker
              name={Labels.dashboard.endDate}
              label={getLabel("lbl53")}
              value={formData.endDate}
              onChange={handleChange}
              width={100}
              helperText={errors?.endDate}
              minDate={formData.startDate}
            />
          </PGrid>
        </PGrid>
      </PDialog>
    </div >
  );
};

export default dashboard;
