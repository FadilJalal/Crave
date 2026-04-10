import React from "react";
import { useTranslation } from "react-i18next";
import "./Profile.css";

const Profile = () => {
  const { t } = useTranslation();
  return (
    <div className="profile-page">
      <div className="profile-row">
        <div className="profile-card taste-profile">
          <div className="profile-card-header">
            <span className="profile-icon" role="img" aria-label="Taste Profile">📊</span>
            <div>
              <div className="profile-card-title">{t("your_taste_profile")}</div>
              <div className="profile-card-desc">{t("based_on_orders")}</div>
            </div>
          </div>
          <div className="profile-bar-row">
            <span className="profile-bar-label">🍗 {t("chicken_buckets")}</span>
            <div className="profile-bar">
              <div className="profile-bar-fill" style={{width: '100%'}}></div>
            </div>
            <span className="profile-bar-percent">100%</span>
          </div>
        </div>
        <div className="profile-card order-again">
          <div className="profile-card-header">
            <span className="profile-icon" role="img" aria-label="Order Again">🔄</span>
            <div>
              <div className="profile-card-title">{t("order_again")}</div>
              <div className="profile-card-desc">{t("your_recent_favourites")}</div>
            </div>
          </div>
          <div className="profile-order-row">
            <img className="profile-order-img" src="https://images.ctfassets.net/9tka4b3550oc/4QkQwZr2Q2Q2Q2Q2Q2Q2Q2/15PCStrips.png" alt="15 PC Strips" />
            <div className="profile-order-info">
              <div className="profile-order-title">{t("15_pc_strips")}</div>
              <div className="profile-order-price">{t("aed_52")}</div>
            </div>
            <button className="profile-add-btn">{t("add")}</button>
          </div>
        </div>
      </div>
      <div className="profile-refresh-row">
        <button className="profile-refresh-btn">{t("refresh")}</button>
      </div>
    </div>
  );
};

export default Profile;
