import "./Language.css";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

export default function Language() {
  const { t, i18n } = useTranslation();

  // Set dir only on the main container for proper text alignment
  const dir = i18n.language === "ar" ? "rtl" : "ltr";

  return (
    <div className="language-page-main" dir={dir}>
      <div className="language-card">
        <h2 className="language-title">{t("language")}</h2>
        <p className="language-desc">{t("change_language")}</p>
        <div className="language-buttons">
          <button onClick={() => i18n.changeLanguage("en")}>English</button>
          <button onClick={() => i18n.changeLanguage("ar")}>العربية</button>
        </div>
      </div>
    </div>
  );
}