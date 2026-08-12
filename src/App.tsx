import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import LotCheck from "./pages/LotCheck";
import Checkout from "./pages/Checkout";
import Report from "./pages/Report";
import Builders from "./pages/Builders";
import HowItWorks from "./pages/HowItWorks";
import BuilderLogin from "./pages/BuilderLogin";
import Dashboard from "./pages/Dashboard";
import LeadDetail from "./pages/LeadDetail";

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
      </Route>
    </Routes>
  );
}

export default App;
