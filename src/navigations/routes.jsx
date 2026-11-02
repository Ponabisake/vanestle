import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import PageLayout from "../container/layout/pageLayout";
import { labelRoutes } from "./labelRoutes";
import PageNotFound from "../container/pageNotFound/pageNotFound";
import { useSelector } from "react-redux";


const UserRoute = () => {
  const verifiedUser = useSelector((state) => state.userDetails.user);
  return verifiedUser?.userName ? <Outlet /> : <Navigate to={labelRoutes.home} replace />;
};

const LoginPage = lazy(() => import("../container/login/login"));
const VaDashboard = lazy(() => import("../container/dashboard/vaDashboard"));
const Dashboard = lazy(() => import("../container/dashboard/dashboard"));
const ClientInfo = lazy(() => import("../container/account/clientInfo"));
const EnquiryDetails = lazy(() => import("../container/account/enquiryDetails"));
const LineItems = lazy(() => import("../container/account/lineItems"));
const Suppliers = lazy(() => import("../container/account/suppliers"));
const Review = lazy(() => import("../container/account/review"));
const Report = lazy(() => import("../container/report/Report"));
const EnquirySuccess = lazy(() => import("../container/account/enquirySuccess"))
const ProjectEnquiry = lazy(() => import("../container/account/projectEnquiry"))
const PerformanceSurvey = lazy(() => import("../container/account/performanceSurvey"))
function AppRoutes() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>

        {/* Login */}
        <Route path={labelRoutes.home} element={<LoginPage />} />

        {/* Layout Pages */}
        <Route element={<UserRoute />}>
          <Route element={<PageLayout />}>
            <Route path={labelRoutes.vaDashboard} element={<VaDashboard />} />
            <Route path={labelRoutes.dashboard} element={< Dashboard />} />
            <Route path={labelRoutes.report} element={<Report />} />
            <Route path={labelRoutes.clientInfo} element={<ClientInfo />} />
            <Route path={labelRoutes.enquiryDetails} element={<EnquiryDetails />} />
            <Route path={labelRoutes.lineItems} element={<LineItems />} />
            <Route path={labelRoutes.suppliers} element={<Suppliers />} />
            <Route path={labelRoutes.review} element={<Review />} />
            <Route path={labelRoutes.enquirySuceess} element={<EnquirySuccess />} />
            <Route path={labelRoutes.projectEnquiry} element={<ProjectEnquiry />} />
            <Route path={labelRoutes.performanceSurvey} element={<PerformanceSurvey />} />
          </Route>
        </Route>

        {/* Page Not Found */}
        <Route path={labelRoutes.pageNotFound} element={<PageNotFound />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={labelRoutes.home} replace />} />

      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
