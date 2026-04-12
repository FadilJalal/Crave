import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import ResetPassword from "./Pages/ResetPassword";
import Dashboard from "./Pages/Dashboard";
import Menu from "./Pages/Menu";
import AddFood from "./Pages/AddFood";
import EditFood from "./Pages/EditFood";
import Orders from "./Pages/Orders";
import Revenue from "./Pages/Revenue";
import Settings from "./Pages/Settings";
import Bridge from "./Pages/Bridge";
import BulkUpload from "./Pages/BulkUpload";
import Promos from "./Pages/Promos";
import Subscription from "./Pages/Subscription";
import EmailCampaign from "./Pages/EmailCampaign";
import Customers from "./Pages/Customers";
import Messages from "./Pages/Messages";
import Reviews from "./Pages/Reviews";
import AIInsights from "./Pages/AIInsights";
import AICustomerSegmentation from "./Pages/AICustomerSegmentation";
import Inventory from "./Pages/Inventory";
import InventoryAnalytics from "./Pages/InventoryAnalytics";
import ProtectedFeature from "./components/ProtectedFeature";
import Login from "./Pages/Login";
import Coupons from "./Pages/Coupons";
import Finance from "./Pages/Finance";

export default function App() {
  return (
    <Routes>
      {/* ✅ MUST be public */}
      <Route path="/login" element={<Login />} />
      <Route path="/bridge" element={<Bridge />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/menu" element={<ProtectedRoute><ProtectedFeature featureName="menu"><Menu /></ProtectedFeature></ProtectedRoute>} />
      <Route path="/add-food" element={<ProtectedRoute><ProtectedFeature featureName="menu"><AddFood /></ProtectedFeature></ProtectedRoute>} />
      <Route path="/bulk-upload" element={<ProtectedRoute><ProtectedFeature featureName="bulkUpload"><BulkUpload /></ProtectedFeature></ProtectedRoute>} />
      <Route path="/edit-food/:id" element={<ProtectedRoute><ProtectedFeature featureName="menu"><EditFood /></ProtectedFeature></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Revenue /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/flash-deals" element={<ProtectedRoute><ProtectedFeature featureName="aiPromoGenerator"><Promos /></ProtectedFeature></ProtectedRoute>} />
      <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
      <Route path="/email-campaign" element={<ProtectedRoute><EmailCampaign /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
      <Route path="/reviews" element={<ProtectedRoute><Reviews /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
      <Route path="/inventory/analytics" element={<ProtectedRoute><InventoryAnalytics /></ProtectedRoute>} />
      <Route path="/ai-insights" element={<ProtectedRoute><ProtectedFeature featureName="aiInsights"><AIInsights /></ProtectedFeature></ProtectedRoute>} />
      <Route path="/ai-customer-segmentation" element={<ProtectedRoute><ProtectedFeature featureName="aiCustomerSegmentation"><AICustomerSegmentation /></ProtectedFeature></ProtectedRoute>} />
      <Route path="/coupons" element={<ProtectedRoute><Coupons /></ProtectedRoute>} />
      <Route path="/finance" element={<ProtectedRoute><Finance /></ProtectedRoute>} />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}