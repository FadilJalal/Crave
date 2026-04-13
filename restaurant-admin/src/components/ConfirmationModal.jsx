import React from "react";
import { useTheme } from "../ThemeContext";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Are you sure?", 
  message = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger" // danger | warning | info
}) {
  const { dark } = useTheme();

  if (!isOpen) return null;

  const colors = {
    danger: { bg: "#dc2626", text: "#fff" },
    warning: { bg: "#f59e0b", text: "#fff" },
    info: { bg: "#2563eb", text: "#fff" }
  };

  const selectedColor = colors[type] || colors.danger;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10000,
      padding: 20
    }} onClick={onClose}>
      <div 
        style={{
          background: dark ? "#1e293b" : "white",
          borderRadius: 20,
          width: "100%",
          maxWidth: 400,
          overflow: "hidden",
          boxShadow: dark ? "0 20px 50px rgba(0,0,0,0.5)" : "0 10px 30px rgba(0,0,0,0.1)",
          transform: "translateY(0)",
          transition: "transform 0.3s ease-out"
        }} 
        onClick={e => e.stopPropagation()}
        className="scale-in"
      >
        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
             <div style={{
               width: 48,
               height: 48,
               borderRadius: 14,
               background: `${selectedColor.bg}15`,
               display: "flex",
               alignItems: "center",
               justifyContent: "center",
               color: selectedColor.bg
             }}>
               <AlertTriangle size={24} />
             </div>
             <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
                <X size={20} />
             </button>
          </div>

          <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8, color: dark ? "#f8fafc" : "#0f172a" }}>{title}</h3>
          <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>{message}</p>
        </div>

        <div style={{ background: dark ? "rgba(0,0,0,0.2)" : "#f8fafc", padding: "16px 24px", display: "flex", gap: 12 }}>
           <button 
             onClick={onClose} 
             style={{ 
               flex: 1, 
               padding: "12px", 
               borderRadius: 12, 
               border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "#dbe3ef"}`, 
               background: "transparent", 
               color: dark ? "#f8fafc" : "#475569", 
               fontWeight: 700, 
               cursor: "pointer",
               fontSize: 14
             }}
           >
             {cancelText}
           </button>
           <button 
             onClick={() => { onConfirm(); onClose(); }} 
             style={{ 
               flex: 1, 
               padding: "12px", 
               borderRadius: 12, 
               border: "none", 
               background: selectedColor.bg, 
               color: selectedColor.text, 
               fontWeight: 900, 
               cursor: "pointer",
               fontSize: 14
             }}
           >
             {confirmText}
           </button>
        </div>
      </div>
    </div>
  );
}
