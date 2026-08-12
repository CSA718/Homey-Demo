import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import LotCheck from "./pages/LotCheck";
import Report from "./pages/Report";
import Builders from "./pages/Builders";
import HowItWorks from "./pages/HowItWorks";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/lot-check" element={<LotCheck />} />
        <Route path="/report" element={<Report />} />
        <Route path="/builders" element={<Builders />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
      </Route>
    </Routes>
  );
}

export default App;
