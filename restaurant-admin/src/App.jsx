import { Suspense, lazy, useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ProtectedRoute from "./components/ProtectedRoute";
import ProtectedFeature from "./components/ProtectedFeature";

// ── Page skeleton fallback ────────────────────────────────────────────────────
const PageSkeleton = () => (
  <div style={{ padding: 40, display: "flex", flexDirection: "column", gap: 20 }}>
    {[200, 100, 300, 150].map((h, i) => (
      <div key={i} style={{ height: h, borderRadius: 20, background: "rgba(255,255,255,0.04)", animation: "ra-pulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
    ))}
    <style>{`@keyframes ra-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
  </div>
);

// ── Lazy page imports ─────────────────────────────────────────────────────────
const Login                 = lazy(() => import("./Pages/Login"));
const Bridge                = lazy(() => import("./Pages/Bridge"));
const ResetPassword         = lazy(() => import("./Pages/ResetPassword"));
const Dashboard             = lazy(() => import("./Pages/Dashboard"));
const Menu                  = lazy(() => import("./Pages/Menu"));
const AddFood               = lazy(() => import("./Pages/AddFood"));
const EditFood              = lazy(() => import("./Pages/EditFood"));
const BulkUpload            = lazy(() => import("./Pages/BulkUpload"));
const Orders                = lazy(() => import("./Pages/Orders"));
const Revenue               = lazy(() => import("./Pages/Revenue"));
const Settings              = lazy(() => import("./Pages/Settings"));
const Subscription          = lazy(() => import("./Pages/Subscription"));
const EmailCampaign         = lazy(() => import("./Pages/EmailCampaign"));
const Customers             = lazy(() => import("./Pages/Customers"));
const Messages              = lazy(() => import("./Pages/Messages"));
const Reviews               = lazy(() => import("./Pages/Reviews"));
const Inventory             = lazy(() => import("./Pages/Inventory"));
const InventoryAnalytics    = lazy(() => import("./Pages/InventoryAnalytics"));
const AIInsights            = lazy(() => import("./Pages/AIInsights"));
const AILaborOptimizer      = lazy(() => import("./Pages/AILaborOptimizer"));
const AICustomerSegmentation= lazy(() => import("./Pages/AICustomerSegmentation"));
const LaborManagement       = lazy(() => import("./Pages/LaborManagement"));
const Promos                = lazy(() => import("./Pages/Promos"));
const AICouponStrategist    = lazy(() => import("./Pages/AICouponStrategist"));
const Finance               = lazy(() => import("./Pages/Finance"));
const ReviewReply           = lazy(() => import("./Pages/ReviewReply"));
const KDS                   = lazy(() => import("./Pages/KDS"));

export default function App() {
  return (
    <>
      <ToastContainer theme="dark" position="top-center" autoClose={3000} />
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          {/* Public */}
          <Route path="/login"          element={<Login />} />
          <Route path="/bridge"         element={<Bridge />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected */}
          <Route path="/dashboard"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/orders"     element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/revenue"    element={<ProtectedRoute><Revenue /></ProtectedRoute>} />
          <Route path="/settings"   element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
          <Route path="/email-campaign" element={<ProtectedRoute><EmailCampaign /></ProtectedRoute>} />
          <Route path="/customers"  element={<ProtectedRoute><Customers /></ProtectedRoute>} />
          <Route path="/messages"   element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/reviews"    element={<ProtectedRoute><Reviews /></ProtectedRoute>} />
          <Route path="/inventory"  element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
          <Route path="/inventory/analytics" element={<ProtectedRoute><InventoryAnalytics /></ProtectedRoute>} />
          <Route path="/labor"      element={<ProtectedRoute><LaborManagement /></ProtectedRoute>} />
          <Route path="/finance"    element={<ProtectedRoute><Finance /></ProtectedRoute>} />
          <Route path="/kds"        element={<ProtectedRoute><KDS /></ProtectedRoute>} />
          <Route path="/review-reply" element={<ProtectedRoute><ReviewReply /></ProtectedRoute>} />

          {/* Protected + Feature-gated */}
          <Route path="/menu"       element={<ProtectedRoute><ProtectedFeature featureName="menu"><Menu /></ProtectedFeature></ProtectedRoute>} />
          <Route path="/add-food"   element={<ProtectedRoute><ProtectedFeature featureName="menu"><AddFood /></ProtectedFeature></ProtectedRoute>} />
          <Route path="/bulk-upload" element={<ProtectedRoute><ProtectedFeature featureName="bulkUpload"><BulkUpload /></ProtectedFeature></ProtectedRoute>} />
          <Route path="/edit-food/:id" element={<ProtectedRoute><ProtectedFeature featureName="menu"><EditFood /></ProtectedFeature></ProtectedRoute>} />
          <Route path="/ai-insights" element={<ProtectedRoute><ProtectedFeature featureName="aiInsights"><AIInsights /></ProtectedFeature></ProtectedRoute>} />
          <Route path="/ai-labor-optimizer" element={<ProtectedRoute><ProtectedFeature featureName="aiLaborOptimization"><AILaborOptimizer /></ProtectedFeature></ProtectedRoute>} />
          <Route path="/ai-customer-segmentation" element={<ProtectedRoute><ProtectedFeature featureName="aiCustomerSegmentation"><AICustomerSegmentation /></ProtectedFeature></ProtectedRoute>} />
          <Route path="/coupons"    element={<ProtectedRoute><ProtectedFeature featureName="aiPromoGenerator"><Promos /></ProtectedFeature></ProtectedRoute>} />
          <Route path="/coupon-strategist" element={<ProtectedRoute><ProtectedFeature featureName="aiPromoGenerator"><AICouponStrategist /></ProtectedFeature></ProtectedRoute>} />

          <Route path="/"  element={<Navigate to="/login" replace />} />
          <Route path="*"  element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}