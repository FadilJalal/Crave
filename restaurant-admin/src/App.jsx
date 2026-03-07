import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import ResetPassword from "./Pages/ResetPassword";
import Dashboard from "./Pages/Dashboard";
import Menu from "./Pages/Menu";
import AddFood from "./Pages/AddFood";
import EditFood from "./Pages/EditFood";
import Orders from "./Pages/Orders";
import Settings from "./Pages/Settings";
import Bridge from "./Pages/Bridge";

export default function App() {
  return (
    <Routes>
      {/* ✅ MUST be public */}
      <Route path="/bridge" element={<Bridge />} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/menu" element={<ProtectedRoute><Menu /></ProtectedRoute>} />
      <Route path="/add-food" element={<ProtectedRoute><AddFood /></ProtectedRoute>} />
      <Route path="/edit-food/:id" element={<ProtectedRoute><EditFood /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}