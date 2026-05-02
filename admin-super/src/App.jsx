import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

const PageSkeleton = () => (
  <div style={{ padding: 40, display: "flex", flexDirection: "column", gap: 20 }}>
    {[200, 100, 300].map((h, i) => (
      <div key={i} style={{ height: h, borderRadius: 16, background: "#f1f5f9", animation: "sa-pulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
    ))}
    <style>{`@keyframes sa-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
  </div>
);

const Bridge          = lazy(() => import("./pages/Bridge"));
const Dashboard       = lazy(() => import("./pages/Dashboard"));
const Restaurants     = lazy(() => import("./pages/Restaurants"));
const RestaurantList  = lazy(() => import("./pages/RestaurantList"));
const Orders          = lazy(() => import("./pages/Orders"));
const FoodList        = lazy(() => import("./pages/FoodList"));
const FoodAdd         = lazy(() => import("./pages/FoodAdd"));
const Subscriptions   = lazy(() => import("./pages/Subscriptions"));
const Broadcast       = lazy(() => import("./pages/Broadcast"));
const Messages        = lazy(() => import("./pages/Messages"));

export default function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/bridge" element={<Bridge />} />

        <Route path="/dashboard"       element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/restaurants"     element={<ProtectedRoute><Layout><Restaurants /></Layout></ProtectedRoute>} />
        <Route path="/restaurants/list" element={<ProtectedRoute><Layout><RestaurantList /></Layout></ProtectedRoute>} />
        <Route path="/orders"          element={<ProtectedRoute><Layout><Orders /></Layout></ProtectedRoute>} />
        <Route path="/food/list"       element={<ProtectedRoute><Layout><FoodList /></Layout></ProtectedRoute>} />
        <Route path="/food/add"        element={<ProtectedRoute><Layout><FoodAdd /></Layout></ProtectedRoute>} />
        <Route path="/subscriptions"   element={<ProtectedRoute><Layout><Subscriptions /></Layout></ProtectedRoute>} />
        <Route path="/broadcast"       element={<ProtectedRoute><Layout><Broadcast /></Layout></ProtectedRoute>} />
        <Route path="/messages"        element={<ProtectedRoute><Layout><Messages /></Layout></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}