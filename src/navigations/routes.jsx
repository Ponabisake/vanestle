import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import PageLayout from "../container/layout/pageLayout";
import { labelRoutes } from "./labelRoutes";
import PageNotFound from "../container/pageNotFound/pageNotFound";
import { useSelector } from "react-redux";
import PerformanceSurvey from "../container/enquiry/performanceSurvey";

const UserRoute = () => {
  const verifiedUser = useSelector((state) => state.userDetails.user);
  return verifiedUser?.userName ? <Outlet /> : <Navigate to={labelRoutes.home} replace />;
};

const LoginPage = lazy(() => import("../container/login/login"));
const Dashboard = lazy(() => import("../container/dashboard/dashboard"));
const EqDashboard = lazy(() => import("../container/dashboard/eqDashboard"));
const ClientInfo = lazy(() => import("../container/enquiry/clientInfo"));
const EnquiryDetails = lazy(() => import("../container/enquiry/enquiryDetails"));
const LineItems = lazy(() => import("../container/enquiry/lineItems"));
const Suppliers = lazy(() => import("../container/enquiry/suppliers"));
const Review = lazy(() => import("../container/enquiry/review"));
const Report = lazy(() => import("../container/report/Report"));
const EnquirySuccess = lazy(() => import("../container/enquiry/enquirySuccess"))
const ProjectEnquiry = lazy(() => import("../container/enquiry/projectEnquiry"))
function AppRoutes() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>

        {/* Login */}
        <Route path={labelRoutes.home} element={<LoginPage />} />

        {/* Layout Pages */}
        <Route element={<UserRoute />}>
          <Route element={<PageLayout />}>
            <Route path={labelRoutes.dashboard} element={<Dashboard />} />
            <Route path={labelRoutes.eqDashboard} element={<EqDashboard />} />
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
