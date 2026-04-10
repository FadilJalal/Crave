import "./Settings.css";
import { useContext, useEffect, useRef, useState } from "react";
import { StoreContext } from "../../Context/StoreContext";
import { useTheme } from "../../Context/ThemeContext";
import { assets } from "../../assets/assets";

export default function Settings() {
  const { token } = useContext(StoreContext);
  const { dark, toggle } = useTheme();
  const [profile, setProfile] = useState({ name: "", email: "", phone: "", avatar: "" });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState("");
  const [notifPrefs, setNotifPrefs] = useState({ email: true, sms: false, push: true });
  const [saveMsg, setSaveMsg] = useState("");
  const fileInputRef = useRef();

  // Fetch user info (simulate API)
  useEffect(() => {
    // TODO: Replace with real API call
    setTimeout(() => {
      setProfile({
        name: "Jane Doe",
        email: "jane@example.com",
        phone: "+971 50 123 4567",
        avatar: "",
      });
      setLoading(false);
    }, 600);
  }, []);

  const handleProfileChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleProfileSave = (e) => {
    e.preventDefault();
    setEditing(false);
    setSaveMsg("Profile updated!");
    setTimeout(() => setSaveMsg(""), 2000);
    // TODO: Save profile info & avatar to backend
  };

  const handlePasswordChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const handlePasswordSave = (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setPwMsg("New passwords do not match.");
      return;
    }
    setPwMsg("Password updated!");
    setPasswords({ current: "", new: "", confirm: "" });
    setTimeout(() => setPwMsg(""), 2000);
    // TODO: Save password to backend
  };

  const handleNotifToggle = (type) => {
    setNotifPrefs((prev) => ({ ...prev, [type]: !prev[type] }));
    setSaveMsg("Preferences updated!");
    setTimeout(() => setSaveMsg(""), 1500);
    // TODO: Save notification prefs to backend
  };

  return (
    <div className="settings-page-main">
      <h2 className="settings-title">Account Settings</h2>
      {loading ? (
        <div className="settings-loading">Loading...</div>
      ) : (
        <>
          <div className="settings-card settings-profile-card">
            <div className="settings-avatar-wrap">
              <img
                src={avatarPreview || profile.avatar || assets.profile_icon}
                alt="avatar"
                className="settings-avatar"
                onClick={() => fileInputRef.current?.click()}
                title="Change avatar"
              />
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                ref={fileInputRef}
                onChange={handleAvatarChange}
              />
            </div>
            {editing ? (
              <form className="settings-form" onSubmit={handleProfileSave}>
                <label>
                  Name
                  <input name="name" value={profile.name} onChange={handleProfileChange} />
                </label>
                <label>
                  Email
                  <input name="email" value={profile.email} onChange={handleProfileChange} />
                </label>
                <label>
                  Phone
                  <input name="phone" value={profile.phone} onChange={handleProfileChange} />
                </label>
                <button type="submit">Save</button>
                <button type="button" onClick={() => setEditing(false)}>Cancel</button>
              </form>
            ) : (
              <div className="settings-profile-view">
                <div className="settings-profile-main">
                  <div><b>Name:</b> {profile.name}</div>
                  <div><b>Email:</b> {profile.email}</div>
                  <div><b>Phone:</b> {profile.phone}</div>
                </div>
                <button onClick={() => setEditing(true)}>Edit Profile</button>
              </div>
            )}
            {saveMsg && <div className="settings-msg settings-msg-success">{saveMsg}</div>}
          </div>

          <div className="settings-card">
            <h3>Change Password</h3>
            <form className="settings-form" onSubmit={handlePasswordSave}>
              <label>
                Current Password
                <input type="password" name="current" value={passwords.current} onChange={handlePasswordChange} />
              </label>
              <label>
                New Password
                <input type="password" name="new" value={passwords.new} onChange={handlePasswordChange} />
              </label>
              <label>
                Confirm New Password
                <input type="password" name="confirm" value={passwords.confirm} onChange={handlePasswordChange} />
              </label>
              <button type="submit">Update Password</button>
            </form>
            {pwMsg && <div className="settings-msg">{pwMsg}</div>}
          </div>

          <div className="settings-card">
            <h3>Preferences</h3>
            <div className="settings-pref-row">
              <span>Theme:</span>
              <button className="settings-theme-btn" onClick={toggle}>{dark ? "🌙 Dark" : "☀️ Light"} Mode</button>
            </div>
            <div className="settings-pref-row">
              <span>Email Notifications</span>
              <label className="switch">
                <input type="checkbox" checked={notifPrefs.email} onChange={() => handleNotifToggle("email")}/>
                <span className="slider round"></span>
              </label>
            </div>
            <div className="settings-pref-row">
              <span>SMS Alerts</span>
              <label className="switch">
                <input type="checkbox" checked={notifPrefs.sms} onChange={() => handleNotifToggle("sms")}/>
                <span className="slider round"></span>
              </label>
            </div>
            <div className="settings-pref-row">
              <span>Push Notifications</span>
              <label className="switch">
                <input type="checkbox" checked={notifPrefs.push} onChange={() => handleNotifToggle("push")}/>
                <span className="slider round"></span>
              </label>
            </div>
            {saveMsg && <div className="settings-msg settings-msg-success">{saveMsg}</div>}
          </div>
        </>
      )}
    </div>
  );
}