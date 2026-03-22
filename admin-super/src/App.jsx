import { Routes, Route, Navigate } from "react-router-dom";

import Bridge from "./pages/Bridge";
import Dashboard from "./pages/Dashboard";
import Restaurants from "./pages/Restaurants";
import RestaurantList from "./pages/RestaurantList";
import Orders from "./pages/Orders";
import FoodList from "./pages/FoodList";
import FoodAdd from "./pages/FoodAdd";
import Subscriptions from "./pages/Subscriptions";
import Broadcast from "./pages/Broadcast";
import Messages from "./pages/Messages";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

export default function App() {
  return (
    <Routes>
      <Route path="/bridge" element={<Bridge />} />

      <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/restaurants" element={<ProtectedRoute><Layout><Restaurants /></Layout></ProtectedRoute>} />
      <Route path="/restaurants/list" element={<ProtectedRoute><Layout><RestaurantList /></Layout></ProtectedRoute>} />

      {/* ← ADD THESE THREE */}
      <Route path="/orders" element={<ProtectedRoute><Layout><Orders /></Layout></ProtectedRoute>} />
      <Route path="/food/list" element={<ProtectedRoute><Layout><FoodList /></Layout></ProtectedRoute>} />
      <Route path="/food/add" element={<ProtectedRoute><Layout><FoodAdd /></Layout></ProtectedRoute>} />
      <Route path="/subscriptions" element={<ProtectedRoute><Layout><Subscriptions /></Layout></ProtectedRoute>} />
      <Route path="/broadcast" element={<ProtectedRoute><Layout><Broadcast /></Layout></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><Layout><Messages /></Layout></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}