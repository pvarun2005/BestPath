import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import { RouteOptimizer } from "@/components/RouteOptimizer";
import { Toaster } from "sonner";

export default function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/optimizer" element={<RouteOptimizer />} />
          <Route path="/other" element={<div className="text-center text-xl">Other Page - Coming Soon</div>} />
        </Routes>
      </Router>
      <Toaster position="top-right" />
    </>
  );
}
