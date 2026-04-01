import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { StoreContext } from "../../Context/StoreContext";
import "./SentimentSummary.css";

const SentimentSummary = ({ restaurantId }) => {
  const { url } = useContext(StoreContext);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!restaurantId) return;
    axios.get(url + "/api/ai/sentiment/" + restaurantId)
      .then((res) => { if (res.data.success && res.data.data?.total > 0) setData(res.data.data); })
      .catch(() => {});
  }, [restaurantId, url]);

  if (!data) return null;

  const colorMap = {
    positive: { badge: "#ecfdf5", bar: "#22c55e", accent: "#059669" },
    neutral: { badge: "#fffbeb", bar: "#f59e0b", accent: "#92400e" },
    negative: { badge: "#fef2f2", bar: "#ef4444", accent: "#dc2626" },
  };
  const c = colorMap[data.overall] || colorMap.neutral;
  const total = data.total;
  const label = data.overall.charAt(0).toUpperCase() + data.overall.slice(1);

  return (
    <div className="sent-wrap">
      <p className="sent-label">AI Sentiment Analysis</p>

      <div className="sent-header">
        <div className="sent-badge" style={{ background: c.badge }}>
          <span style={{ color: c.accent, fontWeight: 900, fontSize: 16 }}>{label[0]}</span>
        </div>
        <div>
          <p className="sent-title">Overall: {label}</p>
          <p className="sent-sub">Based on {total} review{total !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="sent-bars">
        {["positive", "neutral", "negative"].map((key) => {
          const pct = total > 0 ? Math.round((data.breakdown[key] / total) * 100) : 0;
          return (
            <div key={key} className="sent-bar-row">
              <span className="sent-bar-label">{key}</span>
              <div className="sent-bar-track">
                <div
                  className="sent-bar-fill"
                  style={{ width: `${pct}%`, background: colorMap[key].bar }}
                />
              </div>
              <span className="sent-bar-pct">{pct}%</span>
            </div>
          );
        })}
      </div>

      {(data.keywords.positive.length > 0 || data.keywords.negative.length > 0) && (
        <div className="sent-keywords">
          {data.keywords.positive.length > 0 && (
            <div className="sent-kw-group">
              <span className="sent-kw-label">Praised</span>
              {data.keywords.positive.slice(0, 5).map((k) => (
                <span key={k.word} className="sent-kw sent-kw-pos">{k.word} ({k.count})</span>
              ))}
            </div>
          )}
          {data.keywords.negative.length > 0 && (
            <div className="sent-kw-group">
              <span className="sent-kw-label">Criticized</span>
              {data.keywords.negative.slice(0, 5).map((k) => (
                <span key={k.word} className="sent-kw sent-kw-neg">{k.word} ({k.count})</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SentimentSummary;
