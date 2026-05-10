import React, { useContext } from "react";
import { useTranslation } from "react-i18next";
import { User, Mail, Phone, MapPin, Shield, Bell, CreditCard, LogOut, ArrowLeft, ChevronRight } from "lucide-react";
import { StoreContext } from "../../Context/StoreContext";
import "./Profile.css";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const { t } = useTranslation();
  const { userData, setToken } = useContext(StoreContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    setToken("");
    localStorage.removeItem("token");
    navigate("/");
  };

  if (!userData) return <div className="profile-loading">{t("syncing_profile")}</div>;

  return (
    <div className="profile-page">
      <div className="profile-container">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>

        {/* MAIN IDENTITY CARD */}
        <div className="profile-card main-identity">
          <header className="profile-header">
            <div className="avatar-wrapper">
              <div className="user-avatar-large">
                {userData.name ? userData.name.charAt(0).toUpperCase() : "U"}
              </div>
            </div>
            <div className="user-intro">
              <h1>{userData.name || "User"}</h1>
              <p className="member-tag">{t("member_since")} 2026</p>
            </div>
          </header>

          <div className="profile-content">
            <h3 className="section-label-pro">{t("personal_information")}</h3>
            
            <div className="info-grid-pro">
              <div className="info-row-pro">
                <div className="icon-box"><User size={18} /></div>
                <div className="info-details">
                  <label>{t("full_name")}</label>
                  <p>{userData.name || "—"}</p>
                </div>
              </div>

              <div className="info-row-pro">
                <div className="icon-box"><Mail size={18} /></div>
                <div className="info-details">
                  <label>{t("email_address")}</label>
                  <p>{userData.email || "—"}</p>
                </div>
              </div>

              <div className="info-row-pro">
                <div className="icon-box"><Phone size={18} /></div>
                <div className="info-details">
                  <label>{t("phone_number")}</label>
                  <p>{userData.phone || t("no_phone_linked")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ACCOUNT MANAGEMENT CARD */}
        <div className="profile-card actions-card">
          <h3 className="section-label-pro">{t("account_management")}</h3>
          
          <div className="action-grid-pro">
            <div className="action-row-pro" onClick={() => navigate('/addresses')}>
              <div className="icon-box blue"><MapPin size={18} /></div>
              <span>{t("saved_addresses")}</span>
              <ChevronRight size={16} className="chevron" />
            </div>

            <div className="action-row-pro" onClick={() => navigate('/settings')}>
              <div className="icon-box purple"><Bell size={18} /></div>
              <span>{t("notification_settings")}</span>
              <ChevronRight size={16} className="chevron" />
            </div>

            <div className="action-row-pro" onClick={() => navigate('/settings')}>
              <div className="icon-box green"><Shield size={18} /></div>
              <span>{t("security_privacy")}</span>
              <ChevronRight size={16} className="chevron" />
            </div>

            <div className="action-row-pro logout" onClick={handleLogout}>
              <div className="icon-box red"><LogOut size={18} /></div>
              <span>{t("log_out")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
