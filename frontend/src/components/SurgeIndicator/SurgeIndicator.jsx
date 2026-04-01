import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { StoreContext } from "../../Context/StoreContext";
import "./SurgeIndicator.css";

const SurgeIndicator = ({ restaurantId }) => {
  const { url } = useContext(StoreContext);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!restaurantId) return;
    axios.get(url + "/api/ai/surge/" + restaurantId)
      .then((res) => { if (res.data.success) setData(res.data.data); })
      .catch(() => {});
  }, [restaurantId, url]);

  if (!data || data.surgeLevel === "normal") return null;

  const colors = {
    high: { bg: "#fef2f2", border: "#fecaca", text: "#dc2626" },
    moderate: { bg: "#fff7ed", border: "#fed7aa", text: "#ea580c" },
    low: { bg: "#f0fdf4", border: "#bbf7d0", text: "#16a34a" },
  };
  const c = colors[data.surgeLevel] || colors.moderate;

  return (
    <div className="si-wrap" style={{ background: c.bg, borderColor: c.border }}>
      <span className="si-dot" style={{ background: c.text }} />
      <span className="si-msg" style={{ color: c.text }}>{data.message}</span>
      {data.peakHours?.length > 0 && (
        <span className="si-peak" style={{ color: c.text }}>
          Peak: {data.peakHours.map(h => `${h.hour}:00`).join(", ")}
        </span>
      )}
    </div>
  );
};

export default SurgeIndicator;
