import React from "react";

// Cartoon-realistic burger SVG (bold, unique style)
const BurgerSVG = ({ style = {}, className = "", size = 120 }) => (
  <svg
    width={size}
    height={size * 0.8}
    viewBox="0 0 120 96"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={style}
    className={className}
  >
    {/* Bun Top */}
    <ellipse cx="60" cy="32" rx="54" ry="28" fill="#FFD966" stroke="#E2B13C" strokeWidth="4" />
    {/* Bun shine */}
    <ellipse cx="80" cy="24" rx="16" ry="6" fill="#FFF7C2" fillOpacity="0.7" />
    {/* Lettuce */}
    <path d="M12 48 Q24 44 36 52 Q48 60 60 52 Q72 44 84 52 Q96 60 108 48 Q120 56 120 64 Q120 80 60 80 Q0 80 0 64 Q0 56 12 48Z" fill="#7ED957" stroke="#4E8C2B" strokeWidth="3" />
    {/* Tomato */}
    <ellipse cx="60" cy="60" rx="40" ry="8" fill="#FF5C5C" stroke="#B22222" strokeWidth="2" />
    {/* Patty */}
    <ellipse cx="60" cy="70" rx="44" ry="10" fill="#8B5C2A" stroke="#5C3310" strokeWidth="3" />
    {/* Bun Bottom */}
    <ellipse cx="60" cy="84" rx="54" ry="12" fill="#FFD966" stroke="#E2B13C" strokeWidth="4" />
    {/* Sesame seeds */}
    <ellipse cx="40" cy="28" rx="3" ry="1.5" fill="#FFF7C2" />
    <ellipse cx="60" cy="22" rx="2.5" ry="1.2" fill="#FFF7C2" />
    <ellipse cx="80" cy="30" rx="2" ry="1" fill="#FFF7C2" />
    <ellipse cx="70" cy="36" rx="1.5" ry="0.8" fill="#FFF7C2" />
    <ellipse cx="50" cy="34" rx="2" ry="1" fill="#FFF7C2" />
  </svg>
);

export default BurgerSVG;
