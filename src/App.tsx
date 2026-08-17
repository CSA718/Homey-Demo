import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import RenoProtectedRoute from "./components/RenoProtectedRoute";
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
import RenovateLogin from "./pages/RenovateLogin";
import RenovateCheck from "./pages/RenovateCheck";
import RenovateDashboard from "./pages/RenovateDashboard";
import RenovateCheckDetail from "./pages/RenovateCheckDetail";

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
        <Route path="/renovate" element={<Renovate />} />
        <Route path="/renovate/login" element={<RenovateLogin />} />
        <Route
          path="/renovate/check"
          element={
            <RenoProtectedRoute>
              <RenovateCheck />
            </RenoProtectedRoute>
          }
        />
        <Route
          path="/renovate/dashboard"
          element={
            <RenoProtectedRoute>
              <RenovateDashboard />
            </RenoProtectedRoute>
          }
        />
        <Route
          path="/renovate/checks/:checkId"
          element={
            <RenoProtectedRoute>
              <RenovateCheckDetail />
            </RenoProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
