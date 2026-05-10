import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, ArrowLeft, ShieldCheck } from 'lucide-react';
import { StoreContext } from '../../Context/StoreContext';
import './ChangePassword.css';

const ChangePassword = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { changePassword } = useContext(StoreContext);
    const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            alert("New passwords do not match");
            return;
        }
        setLoading(true);
        const success = await changePassword(passwords.old, passwords.new);
        setLoading(false);
        if (success) navigate('/settings');
    };

    return (
        <div className="change-password-page">
            <div className="cp-container">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                </button>

                <div className="cp-header">
                    <div className="cp-icon"><ShieldCheck size={32} /></div>
                    <h1>{t("change_password")}</h1>
                    <p>{t("secure_account_desc") || "Choose a strong password to keep your account safe."}</p>
                </div>

                <form className="cp-form" onSubmit={handleSubmit}>
                    <div className="cp-input-group">
                        <label>{t("old_password") || "Old Password"}</label>
                        <div className="input-wrapper">
                            <Lock size={18} className="input-icon" />
                            <input 
                                type="password" 
                                required 
                                value={passwords.old}
                                onChange={(e) => setPasswords({...passwords, old: e.target.value})}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="cp-input-group">
                        <label>{t("new_password") || "New Password"}</label>
                        <div className="input-wrapper">
                            <Lock size={18} className="input-icon" />
                            <input 
                                type="password" 
                                required 
                                value={passwords.new}
                                onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="cp-input-group">
                        <label>{t("confirm_new_password") || "Confirm New Password"}</label>
                        <div className="input-wrapper">
                            <Lock size={18} className="input-icon" />
                            <input 
                                type="password" 
                                required 
                                value={passwords.confirm}
                                onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button type="submit" className="cp-submit-btn" disabled={loading}>
                        {loading ? t("updating") : t("update_password") || "Update Password"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChangePassword;
