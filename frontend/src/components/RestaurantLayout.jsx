import React from "react";

// Simple layout wrapper for restaurant admin pages
export default function RestaurantLayout({ children }) {
  return (
    <div className="restaurant-layout">
      {/* You can add a sidebar, header, or nav here if needed */}
      {children}
    </div>
  );
}
