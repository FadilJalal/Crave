import React from "react";
import "./Profile.css";

const Profile = () => {
  return (
    <div className="profile-page">
      <div className="profile-row">
        <div className="profile-card taste-profile">
          <div className="profile-card-header">
            <span className="profile-icon" role="img" aria-label="Taste Profile">📊</span>
            <div>
              <div className="profile-card-title">Your Taste Profile</div>
              <div className="profile-card-desc">Based on 2 orders</div>
            </div>
          </div>
          <div className="profile-bar-row">
            <span className="profile-bar-label">🍗 Chicken Buckets</span>
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
              <div className="profile-card-title">Order Again</div>
              <div className="profile-card-desc">Your recent favourites</div>
            </div>
          </div>
          <div className="profile-order-row">
            <img className="profile-order-img" src="https://images.ctfassets.net/9tka4b3550oc/4QkQwZr2Q2Q2Q2Q2Q2Q2Q2/15PCStrips.png" alt="15 PC Strips" />
            <div className="profile-order-info">
              <div className="profile-order-title">15 PC Strips</div>
              <div className="profile-order-price">AED 52</div>
            </div>
            <button className="profile-add-btn">+ Add</button>
          </div>
        </div>
      </div>
      <div className="profile-refresh-row">
        <button className="profile-refresh-btn">⟳ Refresh</button>
      </div>
    </div>
  );
};

export default Profile;
