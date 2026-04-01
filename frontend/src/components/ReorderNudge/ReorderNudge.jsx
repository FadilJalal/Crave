import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { StoreContext } from "../../Context/StoreContext";
import { useNavigate } from "react-router-dom";
import "./ReorderNudge.css";

const ReorderNudge = () => {
  const { url, token } = useContext(StoreContext);
  const [data, setData] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;
    axios.post(url + "/api/ai/reorder-nudge", {}, { headers: { token } })
      .then((res) => { if (res.data.success && res.data.data?.shouldNudge) setData(res.data.data); })
      .catch(() => {});
  }, [token, url]);

  if (!data || dismissed) return null;

  return (
    <div className="rn-wrap">
      <button className="rn-close" onClick={() => setDismissed(true)}>✕</button>
      <div className="rn-icon">🔔</div>
      <div className="rn-content">
        <p className="rn-title">Time to reorder?</p>
        <p className="rn-msg">{data.message}</p>
        {data.favorites?.length > 0 && (
          <div className="rn-favs">
            <span className="rn-favs-label">Your favorites:</span>
            {data.favorites.map((f, i) => (
              <span key={i} className="rn-fav-chip">{f.name}</span>
            ))}
          </div>
        )}
        {data.topRestaurant && (
          <button className="rn-btn" onClick={() => navigate(`/restaurant/${data.topRestaurant._id}`)}>
            Order from {data.topRestaurant.name} →
          </button>
        )}
      </div>
    </div>
  );
};

export default ReorderNudge;
