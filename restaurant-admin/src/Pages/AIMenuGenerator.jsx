import { useState } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";

export default function AIMenuGenerator() {
  const [category, setCategory] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [dietary, setDietary] = useState("");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState([]);
  const [saved, setSaved] = useState([]);

  const categories = ["Appetizers", "Main Course", "Desserts", "Beverages", "Salads", "Soups", "Pasta", "Pizza", "Seafood", "Grill"];
  const cuisines = ["Italian", "Chinese", "Indian", "Mexican", "American", "Mediterranean", "Japanese", "Thai", "French", "Arabic"];
  const dietaryOptions = ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Keto", "Halal", "None"];

  const generateMenu = async () => {
    if (!category || !cuisine) return;
    
    setLoading(true);
    try {
      const res = await api.post("/api/ai/restaurant/generate-menu", {
        category,
        cuisine,
        dietary: dietary || "None",
        count: 5
      });
      
      if (res.data.success) {
        setGenerated(res.data.items || []);
      }
    } catch (error) {
      console.error("Failed to generate menu:", error);
    }
    setLoading(false);
  };

  const saveToMenu = async (item) => {
    try {
      const res = await api.post("/api/food", {
        name: item.name,
        category: item.category,
        price: item.suggestedPrice,
        description: item.description,
        ingredients: item.ingredients,
        dietary: item.dietary,
        image: item.image || "",
        inStock: true
      });

      if (res.data.success) {
        setSaved([...saved, item.name]);
        setGenerated(generated.filter(g => g.name !== item.name));
      }
    } catch (error) {
      console.error("Failed to save item:", error);
    }
  };

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 1200 }}>
        <h2 style={{ fontSize: 32, fontWeight: 900, margin: "0 0 8px" }}>🤖 AI Menu Generator</h2>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "0 0 32px" }}>
          Generate creative menu items with AI-powered descriptions and pricing suggestions
        </p>

        {/* Configuration */}
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 20px" }}>Menu Configuration</h3>
          
          <div className="form-grid" style={{ marginBottom: 20 }}>
            <div className="field">
              <label className="label">Category *</label>
              <select 
                className="select" 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="label">Cuisine Type *</label>
              <select 
                className="select" 
                value={cuisine} 
                onChange={(e) => setCuisine(e.target.value)}
              >
                <option value="">Select cuisine</option>
                {cuisines.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="label">Dietary Preference</label>
              <select 
                className="select" 
                value={dietary} 
                onChange={(e) => setDietary(e.target.value)}
              >
                <option value="">No preference</option>
                {dietaryOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="label">&nbsp;</label>
              <button 
                className="btn" 
                onClick={generateMenu}
                disabled={!category || !cuisine || loading}
                style={{ width: "100%" }}
              >
                {loading ? "🔄 Generating..." : "✨ Generate Menu Items"}
              </button>
            </div>
          </div>
        </div>

        {/* Generated Items */}
        {generated.length > 0 && (
          <div className="card" style={{ padding: 24, marginBottom: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 20px" }}>
              🎉 Generated Menu Items ({generated.length})
            </h3>
            
            <div style={{ display: "grid", gap: 16 }}>
              {generated.map((item, index) => (
                <div 
                  key={index}
                  style={{
                    background: "rgba(255, 255, 255, 0.9)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    padding: 20,
                    display: "grid",
                    gridTemplateColumns: "120px 1fr auto",
                    gap: 20,
                    alignItems: "start"
                  }}
                >
                  {/* Image */}
                  <div style={{
                    width: 120,
                    height: 120,
                    borderRadius: 12,
                    background: `linear-gradient(135deg, ${item.color || "#667eea"}, ${item.color2 || "#764ba2"})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 48,
                    flexShrink: 0
                  }}>
                    {item.emoji || "🍽️"}
                  </div>

                  {/* Content */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <h4 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{item.name}</h4>
                      {item.dietary !== "None" && (
                        <span className="badge badge-success" style={{ fontSize: 10 }}>
                          {item.dietary}
                        </span>
                      )}
                    </div>
                    
                    <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "0 0 12px", lineHeight: 1.5 }}>
                      {item.description}
                    </p>

                    <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                      <div>
                        <span style={{ fontSize: 11, color: "var(--text-light)", fontWeight: 600 }}>CATEGORY</span>
                        <p style={{ fontSize: 13, fontWeight: 700, margin: "2px 0 0" }}>{item.category}</p>
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: "var(--text-light)", fontWeight: 600 }}>CUISINE</span>
                        <p style={{ fontSize: 13, fontWeight: 700, margin: "2px 0 0" }}>{item.cuisine}</p>
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: "var(--text-light)", fontWeight: 600 }}>PREP TIME</span>
                        <p style={{ fontSize: 13, fontWeight: 700, margin: "2px 0 0" }}>{item.prepTime}</p>
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: 11, color: "var(--text-light)", fontWeight: 600 }}>INGREDIENTS</span>
                      <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 0 0" }}>
                        {item.ingredients?.join(", ")}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "end" }}>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 11, color: "var(--text-light)", fontWeight: 600 }}>SUGGESTED PRICE</span>
                      <p style={{ fontSize: 24, fontWeight: 900, color: "var(--primary)", margin: "2px 0 0" }}>
                        AED {item.suggestedPrice}
                      </p>
                    </div>
                    
                    <button 
                      className="btn btn-success"
                      onClick={() => saveToMenu(item)}
                      style={{ fontSize: 12, padding: "8px 16px" }}
                    >
                      ➕ Add to Menu
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Saved Items */}
        {saved.length > 0 && (
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 16px" }}>
              ✅ Added to Menu ({saved.length})
            </h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {saved.map((name, index) => (
                <span key={index} className="badge badge-success">
                  ✓ {name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </RestaurantLayout>
  );
}
