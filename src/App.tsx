import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import ConsumerProtectedRoute from "./components/ConsumerProtectedRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import Home from "./pages/Home";
import LotCheck from "./pages/LotCheck";
import Checkout from "./pages/Checkout";
import Report from "./pages/Report";
import Builders from "./pages/Builders";
import HowItWorks from "./pages/HowItWorks";
import BuilderLogin from "./pages/BuilderLogin";
import Dashboard from "./pages/Dashboard";
import LeadDetail from "./pages/LeadDetail";
import Renovate from "./pages/Renovate";
import RenovateCheck from "./pages/RenovateCheck";
import RenovationJobDetail from "./pages/RenovationJobDetail";
import AccountLogin from "./pages/AccountLogin";
import Account from "./pages/Account";
import LotCheckHistoryDetail from "./pages/LotCheckHistoryDetail";
import RenovationCheckDetail from "./pages/RenovationCheckDetail";
import RenovateListingDetail from "./pages/RenovateListingDetail";
import Admin from "./pages/Admin";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/lot-check" element={<LotCheck />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/report" element={<Report />} />
        <Route path="/builders" element={<Builders />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/builder-login" element={<BuilderLogin />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/leads/:leadId"
          element={
            <ProtectedRoute>
              <LeadDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/renovation-jobs/:listingId"
          element={
            <ProtectedRoute>
              <RenovationJobDetail />
            </ProtectedRoute>
          }
        />
        <Route path="/renovate" element={<Renovate />} />
        <Route
          path="/renovate/check"
          element={
            <ConsumerProtectedRoute>
              <RenovateCheck />
            </ConsumerProtectedRoute>
          }
        />
        <Route path="/account/login" element={<AccountLogin />} />
        <Route
          path="/account"
          element={
            <ConsumerProtectedRoute>
              <Account />
            </ConsumerProtectedRoute>
          }
        />
        <Route
          path="/account/lot-checks/:checkId"
          element={
            <ConsumerProtectedRoute>
              <LotCheckHistoryDetail />
            </ConsumerProtectedRoute>
          }
        />
        <Route
          path="/account/renovation-checks/:checkId"
          element={
            <ConsumerProtectedRoute>
              <RenovationCheckDetail />
            </ConsumerProtectedRoute>
          }
        />
        <Route
          path="/account/listings/:listingId"
          element={
            <ConsumerProtectedRoute>
              <RenovateListingDetail />
            </ConsumerProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <Admin />
            </AdminProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
