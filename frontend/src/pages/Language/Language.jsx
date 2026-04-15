import "./Language.css";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

export default function Language() {
  const { t, i18n } = useTranslation();

  return (
    <div className="language-page-main">
      <div className="language-card">
        <h2 className="language-title">{t("language")}</h2>
        <p className="language-desc">{t("change_language")}</p>
        <div className="language-buttons">
          <button 
            className={i18n.language === "en" ? "active" : ""} 
            onClick={() => i18n.changeLanguage("en")}
          >
            English
          </button>
          <button 
            className={i18n.language === "ar" ? "active" : ""} 
            onClick={() => i18n.changeLanguage("ar")}
          >
            العربية
          </button>
        </div>
      </div>
    </div>
  );
}