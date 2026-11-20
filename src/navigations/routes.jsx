import React, { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import PageLayout from "../container/layout/pageLayout";
import AdminLayout from "../container/layout/AdminLayout";
import { labelRoutes } from "./labelRoutes";
import PageNotFound from "../container/pageNotFound/pageNotFound";
import { useDispatch, useSelector } from "react-redux";
import { isAdminUser } from "../container/admin/adminMenu";
import { useSiteStatus } from "../utils/api/siteStatus";
import { clearUserDetails } from "../redux/actionType/actionType";


// Agency / client / supplier pages; an admin console user is sent to the admin console.
// Maintenance mode (Site Settings): regular users are signed out and sent to the login page's maintenance notice
// (the API refuses their calls anyway).
const UserRoute = () => {
  const verifiedUser = useSelector((state) => state.userDetails.user);
  const dispatch = useDispatch();
  const { maintenanceMode } = useSiteStatus();
  const blocked = maintenanceMode && !!verifiedUser?.userName && !isAdminUser(verifiedUser);
  useEffect(() => {
    if (blocked) dispatch({ type: clearUserDetails });
  }, [blocked, dispatch]);
  if (!verifiedUser?.userName || blocked) return <Navigate to={labelRoutes.home} replace />;
  return isAdminUser(verifiedUser) ? <Navigate to={labelRoutes.adminDashboard} replace /> : <Outlet />;
};

// Backend admin console pages (tblWebAdmin logins only)
const AdminRoute = () => {
  const verifiedUser = useSelector((state) => state.userDetails.user);
  if (!verifiedUser?.userName) return <Navigate to={labelRoutes.home} replace />;
  return isAdminUser(verifiedUser) ? <Outlet /> : <Navigate to={labelRoutes.vaDashboard} replace />;
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
const VaReports = lazy(() => import("../container/vaReports/VaReports"));
const EnquirySuccess = lazy(() => import("../container/account/enquirySuccess"))
const ProjectEnquiry = lazy(() => import("../container/account/projectEnquiry"))
const PerformanceSurvey = lazy(() => import("../container/account/performanceSurvey"))
const AdminDashboard = lazy(() => import("../container/admin/AdminDashboard"))
const AdminProducts = lazy(() => import("../container/admin/AdminProducts"))
const AdminPlaceholder = lazy(() => import("../container/admin/AdminPlaceholder"))
const AdminSiteSettings = lazy(() => import("../container/admin/AdminSiteSettings"))
const AdminCountries = lazy(() => import("../container/admin/AdminCountries"))
const AdminDropdownLists = lazy(() => import("../container/admin/AdminDropdownLists"))
const AdminSubItems = lazy(() => import("../container/admin/AdminSubItems"))
const AdminTypesOfItem = lazy(() => import("../container/admin/AdminTypesOfItem"))
const AdminMaterialsUsed = lazy(() => import("../container/admin/AdminMaterialsUsed"))
const AdminOrderWindows = lazy(() => import("../container/admin/AdminOrderWindows"))
const AdminPmgUsers = lazy(() => import("../container/admin/AdminPmgUsers"))
const AdminClientUsers = lazy(() => import("../container/admin/AdminClientUsers"))
const AdminSuppliers = lazy(() => import("../container/admin/AdminSuppliers"))
const AdminDeleteEnquiries = lazy(() => import("../container/admin/AdminDeleteEnquiries"))
const AdminSla = lazy(() => import("../container/admin/AdminSla"))
const AdminClients = lazy(() => import("../container/admin/AdminClients"))
const AdminDownloadData = lazy(() => import("../container/admin/AdminDownloadData"))
const AdminCatalogueUsage = lazy(() => import("../container/admin/AdminCatalogueUsage"))
const AdminEnvironmentImpacts = lazy(() => import("../container/admin/AdminEnvironmentImpacts"))
const AdminEnvironmentComparison = lazy(() => import("../container/admin/AdminEnvironmentComparison"))
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
            <Route path={labelRoutes.vaReports} element={<VaReports />} />
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

        {/* Backend admin console */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path={labelRoutes.adminDashboard} element={<AdminDashboard />} />
            <Route path={labelRoutes.adminProducts} element={<AdminProducts />} />
            <Route path={labelRoutes.adminSiteSettings} element={<AdminSiteSettings />} />
            <Route path={labelRoutes.adminCountries} element={<AdminCountries />} />
            <Route path={labelRoutes.adminDropdownLists} element={<AdminDropdownLists />} />
            <Route path={labelRoutes.adminSubItems} element={<AdminSubItems />} />
            <Route path={labelRoutes.adminTypesOfItem} element={<AdminTypesOfItem />} />
            <Route path={labelRoutes.adminMaterialsUsed} element={<AdminMaterialsUsed />} />
            <Route path={labelRoutes.adminOrderWindows} element={<AdminOrderWindows />} />
            <Route path={labelRoutes.adminPmgUsers} element={<AdminPmgUsers />} />
            <Route path={labelRoutes.adminClientUsers} element={<AdminClientUsers />} />
            <Route path={labelRoutes.adminSuppliers} element={<AdminSuppliers />} />
            <Route path={labelRoutes.adminDeleteEnquiries} element={<AdminDeleteEnquiries kind="enquiries" key="enquiries" />} />
            <Route path={labelRoutes.adminDeleteEbidding} element={<AdminDeleteEnquiries kind="ebidding" key="ebidding" />} />
            <Route path={labelRoutes.adminSla} element={<AdminSla />} />
            <Route path={labelRoutes.adminClients} element={<AdminClients />} />
            <Route path={labelRoutes.adminDownloadData} element={<AdminDownloadData />} />
            <Route path={labelRoutes.adminCatalogueUsage} element={<AdminCatalogueUsage />} />
            <Route path={labelRoutes.adminEnvironmentImpacts} element={<AdminEnvironmentImpacts />} />
            <Route path={labelRoutes.adminEnvironmentComparison} element={<AdminEnvironmentComparison />} />
            <Route path={labelRoutes.adminMenu} element={<AdminPlaceholder />} />
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
