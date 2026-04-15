import React, { createContext, useContext, useState, useEffect } from "react";

const translations = {
  en: {
    // Sidebar
    dashboard: "Dashboard",
    menu: "Menu & Dishes",
    addFood: "Add New Food",
    bulkUpload: "Bulk Asset Upload",
    orders: "Active Orders",
    inventory: "Inventory & Stock",
    analytics: "Inventory Analytics",
    promo: "AI Promo Lab",
    coupons: "Coupon Strategies",
    campaigns: "AI Campaigns",
    settings: "Settings",
    logout: "Logout",
    
    // Dashboard
    welcome: "Welcome back",
    controlCenter: "Control Center",
    todayOrders: "Today's Orders",
    pending: "Pending",
    revenue: "Revenue",
    completion: "Completion",
    quickActions: "Quick Management",
    healthHub: "Business Health Hub",
    activeItems: "Active Menu Items",
    
    // Orders
    orderId: "Order ID",
    status: "Status",
    payment: "Payment",
    customer: "Customer",
    accept: "Accept Order",
    preparing: "Preparing",
    ready: "Ready",
    
    // Common
    loading: "Loading...",
    save: "Save Changes",
    cancel: "Cancel",
    search: "Search...",
    filter: "Filters"
  },
  ar: {
    // Sidebar
    dashboard: "لوحة التحكم",
    menu: "المنيو والأطباق",
    addFood: "إضافة طعام جديد",
    bulkUpload: "تحميل الأصول بالجملة",
    orders: "الطلبات النشطة",
    inventory: "المخزون والجرد",
    analytics: "تحليلات المخزون",
    promo: "مختبر العروض الذكي",
    coupons: "إستراتيجيات الكوبونات",
    campaigns: "الحملات الذكية",
    settings: "الإعدادات",
    logout: "تسجيل الخروج",
    
    // Dashboard
    welcome: "أهلاً بك مجدداً",
    controlCenter: "مركز التحكم",
    todayOrders: "طلبات اليوم",
    pending: "قيد الانتظار",
    revenue: "الإيرادات",
    completion: "نسبة الإنجاز",
    quickActions: "الإدارة السريعة",
    healthHub: "مركز صحة الأعمال",
    activeItems: "الأصناف النشطة",
    
    // Orders
    orderId: "رقم الطلب",
    status: "الحالة",
    payment: "الدفع",
    customer: "العميل",
    accept: "قبول الطلب",
    preparing: "جاري التحضير",
    ready: "جاهز",
    
    // Common
    loading: "جاري التحميل...",
    save: "حفظ التغييرات",
    cancel: "إلغاء",
    search: "بحث...",
    filter: "فلترة"
  }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [locale, setLocale] = useState(() => {
    return localStorage.getItem("crave_locale") || "en";
  });

  useEffect(() => {
    localStorage.setItem("crave_locale", locale);
    // Apply RTL direction globally
    const dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
    
    // Apply font change for Arabic if needed
    if (locale === "ar") {
      document.body.style.fontFamily = "'Cairo', sans-serif";
    } else {
      document.body.style.fontFamily = "'Plus Jakarta Sans', sans-serif";
    }
  }, [locale]);

  const t = (key) => {
    return translations[locale][key] || key;
  };

  const isRTL = locale === "ar";

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
