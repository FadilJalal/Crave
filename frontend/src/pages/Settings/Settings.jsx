import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Bell, ChevronRight, Mail, Phone, Smartphone, MapPin, CreditCard, LogOut } from "lucide-react";
import "./Settings.css";

const Settings = () => {
	const [notifications, setNotifications] = useState({ email: true, sms: false, push: true });
	const navigate = useNavigate();

	const handleToggle = (type) => {
		setNotifications(prev => ({ ...prev, [type]: !prev[type] }));
	};

	return (
		<div className="settings-container">
			<div className="settings-card">
				<header className="settings-header">
					<h2 className="settings-title">Settings</h2>
					<p className="settings-subtitle">Account preferences and security</p>
				</header>

				{/* Account Section */}
				<section className="settings-section">
					<h3 className="section-label">Account</h3>
					<div className="settings-item" onClick={() => navigate('/profile')} tabIndex={0} role="button">
						<div className="item-icon"><User size={20} /></div>
						<div className="item-content">
							<span className="item-title">Profile Information</span>
							<span className="item-desc">John Doe • john@example.com</span>
						</div>
						<ChevronRight size={18} className="chevron" />
					</div>
					<div className="settings-item" onClick={() => navigate('/addresses')} tabIndex={0} role="button">
						<div className="item-icon"><MapPin size={20} /></div>
						<div className="item-content">
							<span className="item-title">Manage Addresses</span>
							<span className="item-desc">Home, Work, and other saved places</span>
						</div>
						<ChevronRight size={18} className="chevron" />
					</div>
				</section>

				{/* Payments Section */}
				<section className="settings-section">
					<h3 className="section-label">Payments</h3>
					<div className="settings-item" onClick={() => navigate('/payments')} tabIndex={0} role="button">
						<div className="item-icon payments"><CreditCard size={20} /></div>
						<div className="item-content">
							<span className="item-title">Payment Methods</span>
							<span className="item-desc">Visa **** 4242</span>
						</div>
						<ChevronRight size={18} className="chevron" />
					</div>
				</section>

				{/* Notifications Section */}
				<section className="settings-section">
					<h3 className="section-label">Notifications</h3>
					<NotificationToggle 
						icon={<Mail size={18} />} 
						label="Email Notifications" 
						active={notifications.email} 
						onToggle={() => handleToggle('email')} 
					/>
					<NotificationToggle 
						icon={<Smartphone size={18} />} 
						label="Push Notifications" 
						active={notifications.push} 
						onToggle={() => handleToggle('push')} 
					/>
				</section>

				<section className="settings-section">
					<h3 className="section-label">Security</h3>
					<div className="settings-item" onClick={() => navigate('/change-password')} tabIndex={0} role="button">
						<div className="item-icon security"><Lock size={20} /></div>
						<div className="item-content">
							<span className="item-title">Change Password</span>
						</div>
						<ChevronRight size={18} className="chevron" />
					</div>
				</section>

				<button className="logout-btn" onClick={() => navigate('/logout')}>
					<LogOut size={18} style={{ marginRight: '8px' }} />
					Log Out
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