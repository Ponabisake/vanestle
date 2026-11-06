

import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import App from "./App";
import './index.css'
import store, { persistor } from "./redux/store/store"; // Import both store and persistor
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import PToast from './component/PToast/PToast'
import { LanguageProvider } from "./utils/constants/language";
import PScroll from "./component/PScroll/PScroll";
import { initFitToScreen } from "./utils/commonFunction/fitToScreen";

initFitToScreen();
const basename = window.location.hostname === "localhost" ? "/"
  : window.location.pathname.startsWith("/web/") ? "/web/virtualagency/VANestle4.0"
    : "/iweb/virtualagency/VANestle4.0";
const container = document.getElementById("root");
const root = createRoot(container);
root.render(
  <BrowserRouter basename= {basename}>
    <Provider store={store}>
      <LanguageProvider>
        <PToast />
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <PScroll />
          <App />
        </LocalizationProvider>
      </LanguageProvider>
    </Provider>
  </BrowserRouter>
);