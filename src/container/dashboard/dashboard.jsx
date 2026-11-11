import { useState, useEffect, useMemo, lazy, Suspense, useRef } from "react";
import { Box, IconButton, Tooltip, Skeleton } from "@mui/material";
import PDropdown from "../../component/PDropdown/PDropdown";
import PDatepicker from "../../component/PDatepicker/PDatepicker";
import PDashboardCard from "../../component/PDashboardCard/PDashboardCard";
import PTable from "../../component/PTable/PTable";
import { Labels } from "../../utils/constants/labels";
import PButton from "../../component/PButton/PButton";
import PTypography from "../../component/PTypography/PTypography";
import PGrid from "../../component/PGrid/PGrid";
import ShowChartIcon from "@mui/icons-material/ShowChart"
import BarChartIcon from "@mui/icons-material/BarChart";
import PieChartIcon from "@mui/icons-material/PieChart";
import PToggleCircle from "../../component/PToggle/PToggleCircle";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import PSearch from "../../component/PSearch/PSearch";
import ImportExportOutlinedIcon from '@mui/icons-material/ImportExportOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import AddTaskRoundedIcon from '@mui/icons-material/AddTaskRounded';
import { FontWeight } from '../../utils/constants/fonts'
import { useLanguage } from "../../utils/constants/language";
import { Account_API, Dashboard_API } from "../../utils/api/apiUrl";
import { PostApi } from "../../utils/api/networking";
import { exportToExcel, isNotEmpty, isSuccess, notifyValidation } from "../../utils/commonFunction/common";
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
const dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { getLabel } = useLanguage();
  const [openFilter, setOpenFilter] = useState("");
  const [filter, setFilter] = useState(false);
  const [rows, setRows] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [chartOrginalData, setChartOrginalData] = useState([]);
  const { countryID, role, userName, userType, menuId, userID } = useSelector((state) => state.userDetails.user);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    clientName: "",
    country: "",
    user: "",
    startDate: "",
    endDate: "",
    search: "",
    chartType: "pie",
    status: "",
  });

  const [formDataList, setFormDataList] = useState({
    country: [],
    clientName: [],
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
      setFormDataList({
        country: response.country,
        user: response.user,
        clientName: response.client
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
          userID: item.clientId,
          jobStatusID: item.status,
          date: item.serverTime,
          id: item.id,
          stepID: item.stepId,
          clientId: item.clientId,
          ponumber: item.ponumber,
          attachments: item.attachments
        }));
        setRows(formattedRows);
        const formattedChartData = (data.summary?.jobStatus || []).map(
          ({ statusName, enquiryCount, statusId }) => ({
            name: statusName,
            value: enquiryCount,
            id: statusId
          })
        );
        setChartData(formattedChartData);
        setChartOrginalData(formattedChartData);
      }
      dispatch({
        type: userDetails,
        payload: {
          id: 0,
          enquiryId: "", // no enquiry open – avoids showing a previous enquiry ID in the stepper
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

  const columns = [
    { field: "enquiryId", header: getLabel("lbl162")},
    { field: "projectNumber", header: getLabel("lbl163") },
    ...(userType?.toLowerCase() === Labels.userType.client
      ? [{ field: "ponumber", header: "Do No" }]
      : [{ field: "requestedDate", header: "Requested Date" }]),
    { field: "projectName", header:  getLabel("lbl155") },
    {
      field: "status", header: "Status",
      render: (row) => (
        <>
          {[18, 19, 20, 21, 22, 23, 24].includes(row.statusId) &&
            row.attachments != 0 && (
              <span style={{ color: "#ffc104", fontSize: "20px", marginRight: "5px" }}>
                ●
              </span>
            )}
          {row.status}
        </>
      )
    },
    ...(userType?.toLowerCase() === Labels.userType.supplier
      ? []
      : [
        {
          field: "surveyStatus",
          header: userType?.toLowerCase() === Labels.userType.client ? "Survey" : "Survey Status",
          render: (row) =>
            userType?.toLowerCase() === Labels.userType.client
              ? [24].includes(row.statusId) && (
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

  const agencyCards = {
    1: [
      {
        title: getLabel("lbl13"),
        value: summary.approval,
        subtitle: getLabel("lbl17"),
        iconColor: Labels.primary,
        icon: <PendingActionsIcon />,
        statusId: 3,
        bgColor: "#FAB01B",
        indicatorColor: "#ED3B25",
        position: "start",
      },
      {
        title: getLabel("lbl14"),
        value: summary.awarded,
        subtitle: getLabel("lbl18"),
        iconColor: Labels.primary,
        icon: <EmojiEventsIcon />,
        statusId: 6,
        bgColor: "#fab01b1a",
        indicatorColor: "#CF7729",
        position: "end",
      },
      {
        title: getLabel("lbl12"),
        value: summary.active,
        subtitle: getLabel("lbl16"),
        iconColor: Labels.primary,
        icon: <AssignmentIcon />,
        statusId: 1,
        bgColor: "#fab01b1a",
        indicatorColor: "#CF7729",
        position: "end",
      },
      {
        title: getLabel("lbl15"),
        value: summary.completed,
        subtitle: getLabel("lbl18"),
        iconColor: Labels.primary,
        icon: <TaskAltIcon />,
        statusId: 24,
        bgColor: "#fab01b1a",
        indicatorColor: "#00916B",
        position: "start",
      },
      // {
      //   fileName: true,
      // },
    ],

    2: [
      {
        title: getLabel("lbl205"),
        value: 0,
        subtitle: getLabel("lbl216"),
        iconColor: Labels.primary,
        icon: <PauseIcon />,
        statusId: 3,
        bgColor: "#FAB01B",
        indicatorColor: "#ED3B25",
        position: "start",
      },
      {
        title: getLabel("lbl204"),
        value: 0,
        subtitle: getLabel("lbl215"),
        iconColor: Labels.primary,
        icon: <SettingsInputAntennaIcon />,
        statusId: 1,
        bgColor: "#fab01b1a",
        indicatorColor: "#CF7729",
        position: "end",
      },
      {
        title: getLabel("lbl206"),
        value: 0,
        subtitle: getLabel("lbl217"),
        iconColor: Labels.primary,
        icon: <PrintIcon />,
        statusId: 6,
        bgColor: "#fab01b1a",
        indicatorColor: "#CF7729",
        position: "end",
      },
    ],

    3: [
      {
        title: getLabel("lbl13"),
        value: summary.approval,
        subtitle: getLabel("lbl17"),
        iconColor: Labels.primary,
        icon: <MoveToInboxOutlinedIcon />,
        statusId: 3,
        bgColor: "#FAB01B",
        indicatorColor: "#ED3B25",
        position: "start",
      },
      {
        title: getLabel("lbl12"),
        value: summary.active,
        subtitle: getLabel("lbl16"),
        iconColor: Labels.primary,
        icon: <OutboxOutlinedIcon />,
        statusId: 1,
        bgColor: "#fab01b1a",
        indicatorColor: "#CF7729",
        position: "end",
      },
      {
        title: getLabel("lbl14"),
        value: summary.awarded,
        subtitle: getLabel("lbl18"),
        iconColor: Labels.primary,
        icon: <PrintOutlinedIcon />,
        statusId: 6,
        bgColor: "#fab01b1a",
        indicatorColor: "#CF7729",
        position: "end",
      },
    ],
  };

  const supplierCards = [
    {
      title: getLabel("lbl207"),
      value: summary.newrfq,
      subtitle: getLabel("lbl218"),
      iconColor: Labels.primary,
      icon: <LocalOfferIcon />,
      statusId: 3,
      bgColor: "#FAB01B",
      indicatorColor: "#ED3B25",
      position: "start",
    },
    {
      title: getLabel("lbl208"),
      value: summary.quoteproposed,
      subtitle: getLabel("lbl219"),
      iconColor: Labels.primary,
      icon: <MoveToInboxIcon />,
      statusId: 24,
      bgColor: "#fab01b1a",
      indicatorColor: "#CF7729",
      position: "end",
    },
    {
      title: getLabel("lbl209"),
      value: summary.invites,
      subtitle: getLabel("lbl220"),
      iconColor: Labels.primary,
      icon: <Inventory2Icon />,
      statusId: 6,
      bgColor: "#fab01b1a",
      indicatorColor: "#CF7729",
      position: "end",
    },
  ];

  const clientCards = [
    {
      title: getLabel("lbl13"),
      value: summary.forapproval,
      subtitle: getLabel("lbl17"),
      iconColor: Labels.primary,
      icon: <EditIcon />,
      statusId: 3,
      bgColor: "#FAB01B",
      indicatorColor: "#ED3B25",
      position: "start",
    },
    {
      title: getLabel("lbl210"),
      value: summary.artwork,
      subtitle: getLabel("lbl213"),
      iconColor: Labels.primary,
      icon: <ImageIcon />,
      statusId: 24,
      bgColor: "#fab01b1a",
      indicatorColor: "#CF7729",
      position: "end",
    },
    {
      title: getLabel("lbl55"),
      value: summary.proof,
      subtitle: getLabel("lbl214"),
      iconColor: Labels.primary,
      icon: <VisibilityIcon />,
      statusId: 24,
      bgColor: "#fab01b1a",
      indicatorColor: "#CF7729",
      position: "end",
    },
    {
      title: getLabel("lbl56"),
      value: summary.production,
      subtitle: getLabel("lbl221"),
      iconColor: Labels.primary,
      icon: <HourglassEmptyIcon />,
      statusId: 24,
      bgColor: "#fab01b1a",
      indicatorColor: "#CF7729",
      position: "end",
    },
    {
      title: getLabel("lbl15"),
      value: summary.completed,
      subtitle: getLabel("lbl222"),
      iconColor: Labels.primary,
      icon: <AssignmentTurnedInIcon />,
      statusId: 24,
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

  const chartOptions = [
    { value: "line", icon: <ShowChartIcon fontSize="small" /> },
    { value: "bar", icon: <BarChartIcon fontSize="small" /> },
    { value: "pie", icon: <PieChartIcon fontSize="small" /> }
  ];

  // Map chartType string to component
  const chartComponents = {
    line: lazy(() => import("../../component/PChart/PLineChart")),
    bar: lazy(() => import("../../component/PChart/PBarChart")),
    pie: lazy(() => import("../../component/PChart/PPieChart")),
  };

  const SelectedChart = chartComponents[formData.chartType];

  const iconStyle = {
    border: "1px solid #2D2F75",
    color: "#2D2F75",
    width: "50px",
    height: "50px",
    "&:hover": { bgcolor: "#2D2F75", color: "#fff", border: "1px solid #2D2F75" }
  };

  const handleOnClick = (payload) => {
    setFormData((prev) => ({
      ...prev,
      status: prev.status === payload.id ? "" : Number(payload.id)
    }));
  };

  const handleFilter = (statusId) => {
    const id = Number(statusId);
    setFormData((prev) => ({
      ...prev,
      status: prev.status === id ? "" : id,
    }));
  };

  const data = useMemo(() => {
    let result = [...rows]; // copy original rows

    // status filter
    if (isNotEmpty(formData.status)) {
      const status = Number(formData.status);
      result = result.filter((item) => status === 6 ? item.jobStatusID >= 6 && item.jobStatusID !== 24 : item.jobStatusID === status);
    }

    // country filter
    // if (isNotEmpty(formData.country)) {
    //   result = result.filter(
    //     (item) => item.countryID === Number(formData.country)
    //   );
    // }

    if (isNotEmpty(formData.clientName)) {
      result = result.filter(
        (item) => item.clientId === Number(formData.clientName)
      );
    }
    // user filter
    if (isNotEmpty(formData.user)) {
      result = result.filter(
        (item) => item.userID === Number(formData.user)
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
      const search = formData.search.toLowerCase();
      result = result.filter((item) =>
        item.enquiryId?.toLowerCase().includes(search) ||
        item.projectName?.toLowerCase().includes(search) ||
        item.projectNumber?.toLowerCase().includes(search)
      );
    }
    return result;

  }, [rows, formData, filter]);

  const handleReset = () => {
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
      clientName: ""
    }));

    setChartData(chartOrginalData);
  };

  const handleExport = () => {
    const exportData = rows.map((item) => ({
      "Enquiry ID": item.enquiryId,
      "Project Name": item.projectName,
      "Project Number": item.projectNumber,
      "Status": item.jobStatusName,
      "Country": item.countryName,
      "User": item.userName,
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
      user: "",
      search: "",
      status: ""
    }));
    setChartData(chartOrginalData);
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

  const handleDownload = (e) => {

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
    { icon: <ImportExportOutlinedIcon fontSize="large" />, tooltip: "Export", action: handleExport },
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
        id: row.id
      },
    });
    navigate(route);
  }
  const lgSizes = [4, 5, 3];
  const mdSizes = [6, 6, 12];

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
                  : col.cards.map((card, cardIndex) => (
                    <PDashboardCard
                      key={`${col.id}-${cardIndex}`}
                      {...card}
                      onClick={() => handleFilter(card.statusId)}
                    />
                  ))}
              </div>
            </PGrid>
          ))}
        </PGrid>

        {[Labels.userType.agency].includes(userType?.toLowerCase()) && (
          <>
            {loading ? (
              <Skeleton variant="rectangular" height={50} sx={{ borderRadius: 2 }} />
            ) : (
              <>
                {/* upload & download */}
                <PGrid container spacing={2} className={Labels.margin.mb3}>
                  <PGrid item xs={12} sm={12} md={12} lg={9}>
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

        {/* Two rows: [search + filters | chart type] then [table | chart], so the chart card
            starts on the table's top line and (stretched) ends on its bottom line. */}
        <PGrid container spacing={2} className={Labels.margin.mb3} style={{ display: "flex", alignItems: "stretch" }}>
          <PGrid item xs={12} lg={8} xl={9} className={Labels.margin.mb3}>
            <PGrid className={Labels.margin.mb3}>
              <PSearch width="100%" placeholder={getLabel("lbl298")} onChange={(e) => setFormData({ ...formData, search: e.target.value })} value={formData.search} />
            </PGrid>

            <PGrid container spacing={0}>
              {[Labels.userType.agency, Labels.userType.client].includes(userType?.toLowerCase()) && (
                <PGrid item xs={12} sm={6} md={4}>
                  <PDropdown
                    label={getLabel("lbl28")}
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    options={formDataList.clientName}
                    width={Labels.fontSize.xxxxl}
                    flag={Labels.flag.auto}
                    readOnly={role === Labels.role.admin ? true : false}
                    labelMode="inside"
                  />
                </PGrid>
              )}

              {[Labels.userType.agency].includes(userType?.toLowerCase()) && (
                <PGrid item xs={12} sm={6} md={4}>
                  <PDropdown
                    label={getLabel("lbl10")}
                    value={formData.user}
                    onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                    options={formDataList.user}
                    width={Labels.fontSize.xxxxl}
                    labelMode="inside"
                  />
                </PGrid>
              )}

              <PGrid item xs={12} sm={6} md={4} style={{ display: "flex" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
                              "&:hover": {
                                backgroundColor: "transparent",
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
            </PGrid>
          </PGrid>

          <PGrid item xs={12} lg={4} xl={3}>
            <div style={{ display: "flex" }}>
              <PToggleCircle
                options={chartOptions}
                value={formData.chartType}
                onChange={(value) => setFormData((prev) => ({ ...prev, chartType: value }))}
                disabled={loading}
              />
            </div>
          </PGrid>

          <PGrid item xs={12} lg={8} xl={9}>
            {loading ? (
              <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
            ) : (
              <PTable columns={columns} rows={data} onClick={(row) => { handleRoute(row) }} columnChooser storageKey={`dashboard.${userType?.toLowerCase() || "all"}`} emptyTitle="No enquiries found" emptyMessage="Try adjusting the search or filters, or reset them to see all enquiries." />
            )}
          </PGrid>

          <PGrid item xs={12} lg={4} xl={3} style={{ display: "flex", flexDirection: "column" }}>
            <Suspense>
              {/* stretched to the table row's height, so the chart card ends level with the table */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                {loading ? (
                  <Skeleton variant="rectangular" height="100%" width="100%" sx={{ borderRadius: 2, flex: 1, minHeight: 350 }} />
                ) : (
                  SelectedChart && chartData.length > 0 && (
                    <SelectedChart data={chartData} onSliceClick={handleOnClick} />
                  )
                )}
              </div>
            </Suspense>

          </PGrid>
        </PGrid>
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
