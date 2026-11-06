import { useState, useEffect, useRef } from "react";
//import { Checkbox,FormControlLabel } from "@mui/material";
import PTypography from "../../component/PTypography/PTypography";
import PTextField from "../../component/PTextField/PTextField";
import LockIcon from "@mui/icons-material/Lock";
import PButton from "../../component/PButton/PButton";
import PRadio from "../../component/PRadio/PRadio";
import { Labels } from "../../utils/constants/labels";
import "./login.css";
import { CommonColors } from "../../utils/constants/colors";
import PDialog from "../../component/PDialog/PDialog";
import { FontWeight } from "../../utils/constants/fonts";
import arrow from "../../utils/assets/images/arrow_white.svg";
import { validatePassword, validateName, isSuccess, notifyValidation } from "../../utils/commonFunction/common";
import { userDetails, clearUserDetails } from "../../redux/actionType/actionType";
import { connect } from "react-redux";
import { AppNavigation } from "../../navigations/appNavigation";
import { labelRoutes } from "../../navigations/labelRoutes";
import PMGLogo from "../../utils/assets/images/pmglogo.svg";
import VALogo from "../../utils/assets/images/valogo.svg";
import { PostApi } from "../../utils/api/networking";
import { Account_API } from "../../utils/api/apiUrl";
import PGrid from "../../component/PGrid/PGrid";
import { useLanguage } from "../../utils/constants/language";

function Login(props) {
  const { navigate } = props;
  const [isLogin, setIsLogin] = useState(false);
  const [openRecover, setOpenRecover] = useState(false);
  const [selected, setSelected] = useState(false);
  const { getLabel } = useLanguage();
  const userNameRef = useRef(null);
  const passwordRef = useRef(null);

  const [formData, setFormData] = useState({
    userName: "",
    password: "",
    resetUsername: "",
    newPassword: "",
    confirmPassword: "",
    default: false,
  })

  const [errors, setErrors] = useState({
    userName: "",
    password: "",
    resetUsername: "",
    newPassword: "",
    confirmPassword: ""
  })

  const usetypeOptions = [
    { label: 'Agency', value: 'Agency' },
    { label: 'Client', value: 'Client' },
    { label: 'Supplier', value: 'Supplier' },
  ];

  useEffect(() => {
    userNameRef.current?.focus();
    navigate(labelRoutes.home);
  }, []);
  const currency = {
    INR: "₹",
    IDR: "Rp",
    MYR: "RM",
    PHP: "₱",
    SGD: "$",
    THB: "฿",
    VND: "₫"
  };

  const handleOpenRecover = () => {
    setOpenRecover(true);
  };

  const handleCloseRecover = () => {
    setOpenRecover(false);
    setFormData((prev) => ({
      ...prev,
      resetUsername: "",
    }));
    setErrors((prev) => ({
      ...prev,
      resetUsername: "",
    }));
  };

  const handleSendRecover = async () => {
    const isValid = resetUserNameValidation();
    if (isValid) {
      try {
        const response = await PostApi(Account_API.ForgotPassword, {
          username: formData.userName,
        });
        if (isSuccess(response)) {
          toast(Labels.status.success, response.data);
        }
      } catch (error) {
        toast(Labels.status.failure, Labels.message.somethingWentWrong);
      } finally {
        setLoading(false);
      }
    }
    setOpenRecover(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Update form data
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Validation
    setErrors((prev) => {
      let errorMsg = "";

      if (name === Labels.login.userName) {
        errorMsg = value ? validateName(value) : "";
      }

      if (name === Labels.login.newPassword) {
        errorMsg = value ? validatePassword(value) : "";

        // also validate confirm password
        if (formData.confirmPassword && value !== formData.confirmPassword) {
          return {
            ...prev,
            newPassword: errorMsg,
            confirmPassword: Labels.loginPage.passwordDoNotMatch,
          };
        }
      }

      if (name === Labels.login.confirmPassword) {
        errorMsg =
          value !== formData.newPassword
            ? Labels.loginPage.passwordDoNotMatch
            : "";
      }

      return {
        ...prev,
        [name]: errorMsg,
      };
    });
  };

  const handleLogin = async (e, isLogin) => {
    e.preventDefault();
    const isValid = loginValidation();
    if (formData.password === "password" || formData.password === "Password") {
      setFormData((prev) => ({
        ...prev,
        default: true,
      }));
      return;
    }

    if (isValid) {
      const res = await PostApi(Account_API.Login, {
        userName: formData.userName,
        password: formData.password,
      });
      if (isLogin) {
        if (isSuccess(res)) {
          const user = res?.data;
          props.saveUserDetails({
            userName: user?.username,
            email: user?.email,
            fkID: user?.fkID,
            userID: user?.userID,
            role: user?.role,
            currency: user?.currency,
            country: user?.country,
            countryID: user?.countryId,
            userType: user?.usertype,
            menuId: 0,
            symbol: currency[user?.currency],
          });
          navigate(labelRoutes.vaDashboard);
        } else {
          setErrors((prev) => ({
            ...prev,
            password: res?.data || "Login failed",
          }));
        }
      } else {
        if (isSuccess(res)) {
          setIsLogin(true);
        } else {
          setErrors((prev) => ({
            ...prev,
            password: res?.data || "Login failed",
          }));
        }
      }
    }
  };

  const resetUserNameValidation = () => {
    const requiredFields = [
      Labels.login.resetUsername,
    ];

    let newErrors = {};
    requiredFields.forEach((field) => {
      const value = formData[field];
      if (!value || value.trim() === "") {
        newErrors[field] = Labels.commonLabel.required;
      }
    });

    setErrors(newErrors);
    notifyValidation(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const loginValidation = () => {
    const requiredFields = [
      Labels.login.userName,
      Labels.login.password
    ];

    let newErrors = {};

    requiredFields.forEach((field) => {
      const value = formData[field];
      if (!value || value.trim() === "") {
        newErrors[field] = Labels.commonLabel.required;
      }
    });

    setErrors(newErrors);
    notifyValidation(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <div className="login-wrapper">
      <form onSubmit={(e) => handleLogin(e, true)} noValidate className="loginwrapper">
        <div className="login-container">
          <div className="login-left">
            <div className="logo-group mt-5">
              <img src={VALogo} alt="Logo" style={{ height: 70 }} />
              <img src={PMGLogo} alt="Logo" style={{ height: 70 }} />
            </div>
            {formData.default ? (
              <div className="login-box">
                <div className="text-center title">Change Password</div>
                <div className="mb-4">
                  <PRadio
                    value={selected}
                    onChange={setSelected}
                    options={usetypeOptions}
                    xs={{ fontSize: "16px" }}
                    flag="customstyle"
                  />
                </div>

                <PTextField
                  label={`${Labels.loginPage.newPassword} ${Labels.symbols.required}`}
                  name={Labels.login.newPassword}
                  value={formData.newPassword}
                  helperText={errors?.newPassword}
                  startIcon={<LockIcon sx={{ color: "#9CA3AF" }} />}
                  flag={Labels.flag.password}
                  onChange={handleChange}
                  sx={{
                    "& .MuiOutlinedInput-notchedOutline": {
                      border: "none",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      border: "none",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      border: "none",
                    },
                    "& .MuiInputBase-input": {
                      fontSize: "16px",
                    },
                    mb: 2
                  }}
                />
                <PTextField
                  label={`${Labels.loginPage.confirmPassword} ${Labels.symbols.required}`}
                  name={Labels.login.confirmPassword}
                  value={formData.confirmPassword}
                  helperText={errors?.confirmPassword}
                  startIcon={<LockIcon sx={{ color: "#9CA3AF" }} />}
                  flag={Labels.flag.password}
                  onChange={handleChange}
                  sx={{
                    "& .MuiOutlinedInput-notchedOutline": {
                      border: "none",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      border: "none",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      border: "none",
                    },
                    "& .MuiInputBase-input": {
                      fontSize: "16px",
                    },
                  }}
                />
                <div className="position-relative" style={{ marginTop: '-20px' }}>
                  <PButton
                    type="submit"
                    label={Labels.buttonLabel.changePassword}
                    styleClass="primary-btn"
                    fullWidth
                    sx={{
                      "marginTop": "42px"
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="login-box">
                <div className="text-center title">Sign In</div>
                <div className="mb-4">
                  <PRadio
                    value={selected}
                    onChange={setSelected}
                    options={usetypeOptions}
                    xs={{ fontSize: "16px" }}
                    flag="customstyle"
                  />
                </div>

                <PTextField
                  name={Labels.login.userName}
                  value={formData.userName}
                  label={`${Labels.loginPage.userName}${Labels.symbols.required}`}
                  helperText={errors?.userName}
                  onChange={handleChange}
                  inputRef={userNameRef}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault(); // stop form submit
                      passwordRef.current?.focus();
                    }
                  }}
                  sx={{
                    "& .MuiOutlinedInput-notchedOutline": {
                      border: "none",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      border: "none",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      border: "none",
                    },
                    "& .MuiInputBase-input": {
                      fontSize: "16px",
                    },
                    mb: 2
                  }}
                />

                <PTextField
                  name={Labels.login.password}
                  value={formData.password}
                  label={`${Labels.loginPage.password}${Labels.symbols.required}`}
                  helperText={errors?.password}
                  flag={Labels.flag.password}
                  onChange={handleChange}
                  inputRef={passwordRef}
                  sx={{
                    "& .MuiOutlinedInput-notchedOutline": {
                      border: "none",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      border: "none",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      border: "none",
                    },
                    "& .MuiInputBase-input": {
                      fontSize: "16px",
                    },
                  }}
                />
                <div className="position-relative" >
                  <div className="forgot-password position-absolute top-0">
                    <PTypography
                      labelText={Labels.loginPage.forgotPassword}
                      color={CommonColors.dark_blue}
                      flag={Labels.fontFlags.normalText}
                      onClick={handleOpenRecover}
                    />
                  </div>

                  <PButton
                    type="submit"
                    label={Labels.buttonLabel.login}
                    styleClass="primary-btn"
                    fullWidth
                    sx={{
                      "marginTop": "42px"
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div >
      </form >
      <div className="footer bg-transparent mt-4 border-0 z-1 position-relative py-3">
        <PTypography
          labelText={`© ${new Date().getFullYear()} ${getLabel("lbl07")}`}
          flag={Labels.fontFlags.errorLbl}
          font={FontWeight.regular}
        />
      </div>
      <PDialog
        open={openRecover}
        onClose={handleCloseRecover}
        title={Labels.loginPage.recoverPasswordByYourUserName}
        showCloseIcon={true}
        maxWidth="sm"
        actions={
          <PGrid className="d-flex align-items-center justify-content-end gap-2" >
            <PButton
              label={Labels.buttonLabel.backToLogin}
              variant="outlined"
              onClick={handleCloseRecover}
              color={CommonColors.dark_blue}
              width={190}
              sx={{
                "&:hover": {
                  border: "1px solid #16133F",
                }
              }}
            />
            <PButton
              label={Labels.buttonLabel.submit}
              variant={Labels.contained}
              onClick={handleSendRecover}
              color={CommonColors.dark_blue}
              width={180}
              startIcon={<img src={arrow} alt="arrow" className="icon" />}
            />
          </PGrid>
        }
      >
        <PGrid container>
          <PGrid item xs={12} sm={12} md={12}>
            <PTextField
              name={Labels.login.resetUsername}
              label={`${Labels.loginPage.userName}${Labels.symbols.required}`}
              value={formData.resetUsername}
              onChange={handleChange}
              helperText={errors?.resetUsername}
              sx={{
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  border: "1px solid #16133F",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  border: "none",
                },
              }}
            />
          </PGrid>
        </PGrid>
      </PDialog>

    </div >
  );
}

const mapStateToProps = (state) => ({
  user: state.userDetails.user,
});

const mapDispatchToProps = (dispatch) => ({
  saveUserDetails: (user) =>
    dispatch({ type: userDetails, payload: user }),
  clearUserData: () => dispatch({ type: clearUserDetails }),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AppNavigation(Login));