import React, { useState, useEffect } from "react";
import "./Language.css";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";

const languages = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "ar", name: "Arabic", flag: "🇦🇪" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "fr", name: "French", flag: "🇫🇷" },
];

export default function Language() {
  const [selected, setSelected] = useState(
    localStorage.getItem("lang") || "en"
  );
  const { t } = useTranslation();

  const handleSelect = (code) => {
    setSelected(code);
    i18n.changeLanguage(code);
    localStorage.setItem("lang", code);
  };

  useEffect(() => {
    i18n.changeLanguage(selected);
  }, [selected]);

  return (
    <main className="language-page">
      <div className="language-container">
        <h1 className="lang-title">🌍 <b>{t("choose_language")}</b></h1>
        <p className="lang-sub"><b>{t("personalize")}</b> ✨</p>

        <div className="lang-grid">
          {languages.map((lang) => (
            <div
              key={lang.code}
              className={`lang-card ${
                selected === lang.code ? "active" : ""
              }`}
              onClick={() => handleSelect(lang.code)}
            >
              <span className="flag">{lang.flag}</span>
              <span className="name">{t(lang.name.toLowerCase())}</span>
              {selected === lang.code && <span className="check">✔</span>}
            </div>
          ))}
        </div>

        <button className="save-btn">
          {t("save_preference")}
        </button>
      </div>
    </main>
  );
}