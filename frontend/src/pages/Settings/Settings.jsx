import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { User, Lock, Bell, ChevronRight, Mail, Phone, Smartphone, MapPin, CreditCard, LogOut } from "lucide-react";
import "./Settings.css";

const Settings = () => {
	const { t, i18n } = useTranslation();
	const [notifications, setNotifications] = useState({ email: true, sms: false, push: true });
	const navigate = useNavigate();

	const handleToggle = (type) => {
		setNotifications(prev => ({ ...prev, [type]: !prev[type] }));
	};

	return (
		<div className="settings-container">
			<div className="settings-card">
				<header className="settings-header">
					<h2 className="settings-title">{t("settings")}</h2>
					<p className="settings-subtitle">{t("settings_subtitle")}</p>
				</header>

				{/* Account Section */}
				<section className="settings-section">
					<h3 className="section-label">{t("account")}</h3>
					<div className="settings-item" onClick={() => navigate('/profile')} tabIndex={0} role="button">
						<div className="item-icon"><User size={20} /></div>
						<div className="item-content">
							<span className="item-title">{t("profile_information")}</span>
							<span className="item-desc">John Doe • john@example.com</span>
						</div>
						<ChevronRight size={18} className="chevron" style={{ transform: i18n.language === 'ar' ? 'scaleX(-1)' : 'none' }} />
					</div>
					<div className="settings-item" onClick={() => navigate('/addresses')} tabIndex={0} role="button">
						<div className="item-icon"><MapPin size={20} /></div>
						<div className="item-content">
							<span className="item-title">{t("manage_addresses")}</span>
							<span className="item-desc">{t("manage_addresses_desc")}</span>
						</div>
						<ChevronRight size={18} className="chevron" style={{ transform: i18n.language === 'ar' ? 'scaleX(-1)' : 'none' }} />
					</div>
				</section>

				{/* Payments Section */}
				<section className="settings-section">
					<h3 className="section-label">{t("payments")}</h3>
					<div className="settings-item" onClick={() => navigate('/payment-methods')} tabIndex={0} role="button">
						<div className="item-icon payments"><CreditCard size={20} /></div>
						<div className="item-content">
							<span className="item-title">{t("payment_methods")}</span>
							<span className="item-desc">Visa **** 4242</span>
						</div>
						<ChevronRight size={18} className="chevron" style={{ transform: i18n.language === 'ar' ? 'scaleX(-1)' : 'none' }} />
					</div>
				</section>

				{/* Notifications Section */}
				<section className="settings-section">
					<h3 className="section-label">{t("notifications")}</h3>
					<NotificationToggle 
						icon={<Mail size={18} />} 
						label={t("email_notifications")} 
						active={notifications.email} 
						onToggle={() => handleToggle('email')} 
					/>
					<NotificationToggle 
						icon={<Smartphone size={18} />} 
						label={t("push_notifications")} 
						active={notifications.push} 
						onToggle={() => handleToggle('push')} 
					/>
				</section>

				<section className="settings-section">
					<h3 className="section-label">{t("security")}</h3>
					<div className="settings-item" onClick={() => navigate('/change-password')} tabIndex={0} role="button">
						<div className="item-icon security"><Lock size={20} /></div>
						<div className="item-content">
							<span className="item-title">{t("change_password")}</span>
						</div>
						<ChevronRight size={18} className="chevron" style={{ transform: i18n.language === 'ar' ? 'scaleX(-1)' : 'none' }} />
					</div>
				</section>

				<button className="logout-btn" onClick={() => navigate('/logout')}>
					<LogOut size={18} style={{ marginRight: '8px', transform: i18n.language === 'ar' ? 'scaleX(-1)' : 'none' }} />
					{t("log_out")}
				</button>
			</div>
		</div>
	);
};

const NotificationToggle = ({ icon, label, active, onToggle }) => (
	<div className="settings-item">
		<div className="item-icon notification-sub">{icon}</div>
		<div className="item-content">
			<span className="item-title">{label}</span>
		</div>
		<label className="switch">
			<input type="checkbox" checked={active} onChange={onToggle} />
			<span className="slider"></span>
		</label>
	</div>
);

export default Settings;