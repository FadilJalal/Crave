import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { StoreContext } from "../../Context/StoreContext";
import "./ReviewSummary.css";

const ReviewSummary = ({ restaurantId, refreshKey = 0 }) => {
  const { url } = useContext(StoreContext);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) return;
    
    const fetchSummary = async () => {
      try {
        const res = await axios.get(`${url}/api/ai/review-summary/${restaurantId}`);
        if (res.data.success) {
          setSummary(res.data.data);
        }
      } catch {
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [restaurantId, url, refreshKey]);

  if (loading) return <div className="rs-loading">✨ Loading insights...</div>;
  if (!summary) return null;

  return (
    <div className="rs-wrap">
      <div className="rs-header">
        <h3 className="rs-title">Customer Insights</h3>
        <div className="rs-rating">
          <span className="rs-stars">⭐⭐⭐⭐⭐</span>
          <span className="rs-number">{summary.avgRating}</span>
          <span className="rs-count">({summary.totalReviews} {summary.totalReviews === 1 ? "review" : "reviews"})</span>
        </div>
      </div>

      {summary.aiGenerated && (
        <>
          <p className="rs-summary">{summary.summary}</p>

          <div className="rs-content">
            {summary.positiveThemes.length > 0 && (
              <div className="rs-section">
                <p className="rs-section-label">✓ Customers Love</p>
                <div className="rs-themes">
                  {summary.positiveThemes.map((theme, i) => (
                    <span key={i} className="rs-theme rs-theme-positive">
                      👍 {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {summary.negativeThemes.length > 0 && (
              <div className="rs-section">
                <p className="rs-section-label">⚠ Common Concerns</p>
                <div className="rs-themes">
                  {summary.negativeThemes.map((theme, i) => (
                    <span key={i} className="rs-theme rs-theme-negative">
                      ⚠️ {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <p className="rs-ai-badge">🤖 AI-Generated Summary</p>
        </>
      )}
    </div>
  );
};

export default ReviewSummary;
