import { useEffect, useState, useRef } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // New States for Features
  const [showImportModal, setShowImportModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [linkingItem, setLinkingItem] = useState(null);
  const [selectedLinks, setSelectedLinks] = useState([]); // [{ foodId, quantityPerOrder }]
  const [linkSearch, setLinkSearch] = useState("");
  
  // Bulk Selection & Filtering States
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // all, low, out, high
  
  // Stats
  const stats = {
    total: items.length,
    lowStock: items.filter(i => i.currentStock <= i.minimumStock && i.currentStock > 0).length,
    outOfStock: items.filter(i => i.currentStock === 0).length,
    value: items.reduce((acc, i) => acc + (i.currentStock * i.unitCost), 0).toFixed(2)
  };

  const [formData, setFormData] = useState({
    itemName: "",
    category: "food_ingredient",
    unit: "pieces",
    currentStock: 0,
    minimumStock: 10,
    maximumStock: 100,
    unitCost: 0,
    supplier: { name: "", contact: "", email: "" },
    notes: ""
  });

  const loadInventory = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/inventory");
      if (res.data?.success) setItems(res.data.data);
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const res = await api.get("/api/restaurantadmin/foods");
      if (res.data?.success) setMenuItems(res.data.data);
    } catch (err) {
      console.error("Failed to fetch menu items:", err);
    }
  };

  useEffect(() => {
    loadInventory();
    fetchMenuItems();
  }, []);

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      itemName: item.itemName,
      category: item.category,
      unit: item.unit,
      currentStock: item.currentStock,
      minimumStock: item.minimumStock,
      maximumStock: item.maximumStock,
      unitCost: item.unitCost,
      supplier: item.supplier || { name: "", contact: "", email: "" },
      notes: item.notes || ""
    });
    setShowAddModal(true);
  };

  const confirmDelete = (item) => {
    setDeletingItem(item);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      await api.delete(`/api/inventory/${deletingItem._id}`);
      setShowDeleteModal(false);
      setDeletingItem(null);
      loadInventory();
      toast.success("Item deleted");
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const updateStock = async (id, delta) => {
    try {
      await api.patch(`/api/inventory/${id}/stock`, { delta });
      loadInventory();
    } catch (err) {
      toast.error("Update failed");
    }
  };

  // --- Bulk Selection & Filtering ---
  const filteredItems = items.filter(item => {
    if (statusFilter === "all") return true;
    if (statusFilter === "low") return item.currentStock <= item.minimumStock && item.currentStock > 0;
    if (statusFilter === "out") return item.currentStock === 0;
    if (statusFilter === "high") return item.currentStock >= item.maximumStock;
    return true;
  });

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAll = (checked) => {
    if (checked) setSelectedIds(filteredItems.map(i => i._id));
    else setSelectedIds([]);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} items? This cannot be undone.`)) return;
    setIsBulkDeleting(true);
    try {
      const res = await api.post("/api/inventory/bulk-delete", { ids: selectedIds });
      if (res.data?.success) {
        setSelectedIds([]);
        loadInventory();
        toast.success("Items deleted successfully");
      }
    } catch (err) {
      toast.error("Bulk delete failed");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // --- Bulk Import Logic ---
  const normalizeCategory = (cat) => {
    const c = String(cat || "").toLowerCase();
    if (c.includes("ingredient")) return "food_ingredient";
    if (c.includes("beverage") || c.includes("drink")) return "beverage";
    if (c.includes("packaging") || c.includes("box")) return "packaging";
    if (c.includes("equipment") || c.includes("tool")) return "equipment";
    return "other";
  };

  const downloadTemplate = () => {
    try {
      const templateData = [
        {
          itemName: "Chicken Thighs",
          category: "food_ingredient",
          unit: "kg",
          currentStock: 10,
          minimumStock: 5,
          maximumStock: 50,
          unitCost: 15.00,
          supplier: "Al Salam",
          notes: "Store at -18"
        }
      ];
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
      XLSX.writeFile(workbook, "Inventory_Template.xlsx");
      toast.info("Template download started");
    } catch (err) {
      toast.error("Template download failed");
    }
  };

  const processParsedRows = (data) => {
    if (!data || data.length === 0) {
        toast.error("The file is empty or unreadable");
        return;
    }

    const seenNames = new Set();
    const existingNames = new Set(items.map(i => i.itemName.toLowerCase().trim()));

    const processed = data.map((row, index) => {
      const normalizedRow = {};
      Object.keys(row).forEach(key => {
        // More robust fuzzy key matching
        const cleanKey = key.toLowerCase().trim().replace(/[^a-z]/g, '');
        normalizedRow[cleanKey] = row[key];
      });

      // Try multiple possible header titles for each field
      const itemName = String(
          normalizedRow.itemname || 
          normalizedRow.name || 
          normalizedRow.item || 
          normalizedRow.product || 
          normalizedRow.title || 
          ""
      ).trim();
      
      const lowerName = itemName.toLowerCase();
      let status = "New";
      let error = null;

      if (!itemName || itemName === "undefined" || itemName === "null") {
        status = "Invalid";
        error = "Missing item name";
      } else if (seenNames.has(lowerName)) {
        status = "Duplicate";
        error = "Repeated in file";
      } else if (existingNames.has(lowerName)) {
        status = "Update";
      }

      seenNames.add(lowerName);

      // --- Advanced Smart Linking Engine ---
      const suggestedLinks = [];
      const cleanName = itemName.toLowerCase().trim();
      const baseWords = cleanName.replace(/[0-9]|ml|kg|l|g|btl|can|pieces|pcs|bottle|box|pkt|packets/gi, "").split(/\s+/).filter(w => w.length > 2);
      
      const findBestMatch = () => {
        if (!menuItems || menuItems.length === 0) return null;
        
        const search = itemName.toLowerCase().trim();
        const cleanSearch = search.replace(/[0-9]|ml|kg|l|g|btl|can|pieces|pcs|bottle|box|pkt|packets/gi, "").trim();
        const keywords = cleanSearch.split(/\s+/).filter(w => w.length > 2);

        // 1. Precise Match
        let m = menuItems.find(f => f.name.toLowerCase().trim() === search || f.name.toLowerCase().trim() === cleanSearch);
        if (m) return m;

        // 2. Phrase Nesting
        m = menuItems.find(f => {
            const fName = f.name.toLowerCase();
            return fName.includes(search) || search.includes(fName) || fName.includes(cleanSearch);
        });
        if (m) return m;

        // 3. Keyword Presence (Very aggressive - matches if any significant word is found in dish name)
        if (keywords.length > 0) {
            m = menuItems.find(f => {
                const fName = f.name.toLowerCase();
                return keywords.some(word => fName.includes(word));
            });
            if (m) return m;
        }

        return null;
      };

      const match = findBestMatch();
      if (match) {
        suggestedLinks.push({ 
          foodId: match._id, 
          foodName: match.name, 
          quantityPerOrder: 1 
        });
      }
      const unitCost = parseFloat(
          normalizedRow.unitcost || 
          normalizedRow.cost || 
          normalizedRow.price || 
          normalizedRow.unitprice || 
          normalizedRow.rate || 
          normalizedRow.buyingprice || 
          0
      ) || 0;

      return {
        id: index,
        itemName,
        category: normalizeCategory(normalizedRow.category || normalizedRow.cat || normalizedRow.type || ""),
        unit: String(normalizedRow.unit || normalizedRow.uom || normalizedRow.measure || "pieces").trim(),
        currentStock: parseFloat(normalizedRow.currentstock || normalizedRow.stock || normalizedRow.qty || normalizedRow.quantity || 0) || 0,
        minimumStock: parseFloat(normalizedRow.minimumstock || normalizedRow.minstock || normalizedRow.alertStock || 10) || 10,
        maximumStock: parseFloat(normalizedRow.maximumstock || normalizedRow.maxstock || 100) || 100,
        unitCost,
        supplier: { 
          name: String(normalizedRow.suppliername || normalizedRow.supplier || normalizedRow.vendor || "").trim(), 
          contact: String(normalizedRow.suppliercontact || normalizedRow.contact || "").trim()
        },
        notes: String(normalizedRow.notes || normalizedRow.description || normalizedRow.memo || "").trim(),
        linkedMenuItems: suggestedLinks,
        status,
        error
      };
    });
    
    setImportPreview(processed);
    if (processed.length > 0) {
        toast.success(`Parsed ${processed.length} items. Please review below.`);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target?.files?.[0] || e;
    if (!(file instanceof File)) {
        console.error("Invalid file object received:", file);
        return;
    }

    console.log("Processing file:", file.name);
    
    if (file.name.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            console.log("CSV Parse Results:", results);
            processParsedRows(results.data);
        },
        error: (err) => {
            console.error("CSV Parse Error:", err);
            toast.error("Failed to parse CSV file");
        }
      });
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: "binary" });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);
            console.log("Excel Parse Results:", data);
            processParsedRows(data);
        } catch (err) {
            console.error("Excel Parse Error:", err);
            toast.error("Failed to parse Excel file");
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const submitBulkImport = async () => {
    const validRows = importPreview.filter(r => r.status !== "Invalid");
    if (validRows.length === 0) {
        toast.warning("No valid items to import");
        return;
    }

    setImportLoading(true);
    try {
      const res = await api.post("/api/inventory/bulk-import", { items: validRows });
      if (res.data?.success) {
        setImportSummary(res.data.stats);
        loadInventory();
        toast.success("Import completed successfully!");
        setTimeout(() => { setShowImportModal(false); setImportPreview([]); setImportSummary(null); }, 4000);
      }
    } catch (err) { 
        toast.error("Import failed on server");
    } finally { 
        setImportLoading(false); 
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.put(`/api/inventory/${editingItem._id}`, formData);
        toast.success("Item updated");
      } else {
        await api.post("/api/inventory", formData);
        toast.success("Item added");
      }
      setShowAddModal(false);
      setEditingItem(null);
      loadInventory();
      setFormData({
        itemName: "", category: "food_ingredient", unit: "pieces",
        currentStock: 0, minimumStock: 10, maximumStock: 100, unitCost: 0,
        supplier: { name: "", contact: "" }, notes: ""
      });
    } catch (err) {
      toast.error("Save failed");
    }
  };

  // --- Menu Linking Logic ---
  const handleManageLinks = (item) => {
    setLinkingItem(item);
    // Ensure we work with raw IDs for comparison
    const normalizedLinks = (item.linkedMenuItems || []).map(l => ({
      foodId: typeof l.foodId === 'object' ? String(l.foodId._id) : String(l.foodId),
      quantityPerOrder: Number(l.quantityPerOrder) || 1
    }));
    setSelectedLinks(normalizedLinks);
    setShowLinkModal(true);
  };

  const updateLinkQuantity = (foodId, qty) => {
    setSelectedLinks(prev => prev.map(l => {
        const currentId = typeof l.foodId === 'object' ? String(l.foodId._id) : String(l.foodId);
        return currentId === String(foodId) ? { ...l, quantityPerOrder: parseFloat(qty) || 0 } : l;
    }));
  };

  const toggleLink = (foodId) => {
    setSelectedLinks(prev => {
      const targetId = String(foodId);
      const exists = prev.find(l => (typeof l.foodId === 'object' ? String(l.foodId._id) : String(l.foodId)) === targetId);
      
      if (exists) return prev.filter(l => (typeof l.foodId === 'object' ? String(l.foodId._id) : String(l.foodId)) !== targetId);
      return [...prev, { foodId: targetId, quantityPerOrder: 1 }];
    });
  };

  const saveLinks = async () => {
    if (!linkingItem) return;
    try {
      // Clean links data before sending to backend
      const cleanLinks = selectedLinks.map(l => ({
        foodId: typeof l.foodId === 'object' ? l.foodId._id : l.foodId,
        quantityPerOrder: Number(l.quantityPerOrder)
      }));

      await api.put(`/api/inventory/${linkingItem._id}`, {
        linkedMenuItems: cleanLinks
      });
      toast.success("Links updated successfully");
      setShowLinkModal(false);
      loadInventory();
    } catch (err) {
      toast.error("Failed to save links");
    }
  };

  return (
    <RestaurantLayout>
      <style>
        {`
          .inventory-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 24px;
            padding-bottom: 60px;
          }
          @media (max-width: 1000px) { .inventory-grid { grid-template-columns: repeat(2, 1fr); } }
          @media (max-width: 700px) { .inventory-grid { grid-template-columns: 1fr; } }
          
          .action-navbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(12px);
            padding: 18px 24px;
            border-radius: 20px;
            border: 1px solid #e5e7eb;
            margin-top: 32px;
            position: sticky;
            top: 16px;
            z-index: 100;
            box-shadow: 0 4px 20px -5px rgba(0,0,0,0.05);
          }

          .inv-card {
            background: white;
            border-radius: 16px;
            padding: 18px;
            border: 1.5px solid #f3f4f6;
            transition: all 0.3s ease;
            position: relative;
            display: flex;
            flex-direction: column;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
          }
          .inv-card:hover { 
            transform: translateY(-4px); 
            box-shadow: 0 12px 24px -10px rgba(0,0,0,0.1);
            border-color: #ff4e2a;
          }
          .inv-card.selected { 
            border-color: #ff4e2a; 
            background: #fffafa;
          }
          .inv-card.low-stock { border-color: #fee2e2; background: #fffcfc; }
          
          .stock-ctrl {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #f8fafc;
            padding: 10px 14px;
            border-radius: 14px;
            margin: 12px 0;
            border: 1px solid #f1f5f9;
          }
          .progress-bar { height: 6px; background: #f1f5f9; border-radius: 100px; overflow: hidden; margin-top: 6px; }
          .progress-fill { height: 100%; transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
          
          .card-action-btn {
            padding: 12px 16px;
            border-radius: 14px;
            border: 1.5px solid #e5e7eb;
            background: white;
            cursor: pointer;
            font-size: 14px;
            font-weight: 700;
            flex: 1;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          .card-action-btn:hover { 
            background: #111827; 
            color: white; 
            border-color: #111827;
            transform: scale(1.02);
          }
          .status-tag { padding: 4px 12px; border-radius: 10px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
          .card-checkbox { 
            position: absolute; 
            top: 20px; 
            right: 20px; 
            width: 20px; 
            height: 20px; 
            accent-color: #ff4e2a; 
            z-index: 10; 
            cursor: pointer;
            border-radius: 6px;
          }
          
          .filter-pill {
            padding: 6px 14px;
            border-radius: 100px;
            border: 1px solid #e5e7eb;
            background: white;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
          }
          .filter-pill.active { background: #111827; color: white; border-color: #111827; }
          
          .drop-zone {
            border: 2px dashed #e5e7eb;
            border-radius: 16px;
            padding: 48px;
            text-align: center;
            background: #f9fafb;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
          }
          .drop-zone:hover, .drop-zone.active {
            border-color: #ff4e2a;
            background: #fffafa;
            transform: scale(1.01);
          }
          .drop-icon {
            font-size: 40px;
            margin-bottom: 8px;
          }
          
          .preview-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
            font-size: 13px;
          }
          .preview-table th {
            text-align: left;
            padding: 12px;
            background: #f3f4f6;
            color: #4b5563;
            font-weight: 700;
            border-bottom: 1px solid #e5e7eb;
          }
          .preview-table td {
            padding: 12px;
            border-bottom: 1px solid #f3f4f6;
          }
          .status-badge {
            padding: 4px 10px;
            border-radius: 99px;
            font-size: 11px;
            font-weight: 800;
          }
          .status-new { background: #dcfce7; color: #166534; }
          .status-update { background: #dbeafe; color: #1e40af; }
          .status-duplicate { background: #fef9c3; color: #854d0e; }
          .status-invalid { background: #fee2e2; color: #991b1b; }
          .select-sm, .input-sm {
            border: 1.5px solid #e5e7eb;
            border-radius: 8px;
            background: #f9fafb;
            font-family: inherit;
            outline: none;
            transition: all 0.2s;
          }
          .select-sm:focus, .input-sm:focus {
            border-color: #ff4e2a;
            background: white;
            box-shadow: 0 0 0 3px rgba(255, 78, 42, 0.1);
          }
        `}
      </style>

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.6px', margin: 0 }}>Inventory Management</h1>
          <p className="muted" style={{ fontSize: 14, marginTop: 4 }}>Control and manage your storage and ingredients.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-outline" onClick={downloadTemplate}>📥 Template</button>
          <button className="btn btn-outline" style={{ borderColor: '#ff4e2a', color: '#ff4e2a' }} onClick={() => { fetchMenuItems(); setShowImportModal(true); }}>Bulk Upload</button>
          <button className="btn" onClick={() => { setEditingItem(null); setShowAddModal(true); }}>+ Add Item</button>
        </div>
      </div>

      <div className="stats-grid" style={{ marginTop: 24 }}>
        <div className="stat-card"><div className="stat-label">Total Items</div><div className="stat-value">{stats.total}</div></div>
        <div className="stat-card"><div className="stat-label">Low Stock</div><div className="stat-value" style={{ color: stats.lowStock > 0 ? '#ea580c' : 'inherit' }}>{stats.lowStock}</div></div>
        <div className="stat-card"><div className="stat-label">Out of Stock</div><div className="stat-value" style={{ color: stats.outOfStock > 0 ? '#dc2626' : 'inherit' }}>{stats.outOfStock}</div></div>
        <div className="stat-card"><div className="stat-label">Value (AED)</div><div className="stat-value" style={{ color: '#16a34a' }}>{stats.value}</div></div>
      </div>

      <div className="action-navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
             <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                <input type="checkbox" style={{ width: 16, height: 16, accentColor: '#ff4e2a' }} checked={filteredItems.length > 0 && selectedIds.length === filteredItems.length} onChange={(e) => handleSelectAll(e.target.checked)} />
                Select ALL
             </label>
             {selectedIds.length > 0 && (
                 <>
                    <div style={{ width: 1, height: 20, background: '#e5e7eb' }} />
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#ff4e2a' }}>{selectedIds.length} Selected</div>
                    <button className="btn btn-sm" style={{ background: '#dc2626', color: 'white', borderColor: '#dc2626', padding: '6px 16px' }} disabled={isBulkDeleting} onClick={handleBulkDelete}>Delete Selected</button>
                 </>
             )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
             {['all', 'low', 'out', 'high'].map((f) => (
                 <button key={f} className={`filter-pill ${statusFilter === f ? 'active' : ''}`} onClick={() => setStatusFilter(f)}>
                     {f === 'all' ? 'All Items' : f === 'low' ? 'Low Stock' : f === 'out' ? 'Out of Stock' : 'High Stock'}
                 </button>
             ))}
        </div>
      </div>

      <div className="inventory-grid">
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 100 }}><h2>Updating...</h2></div>
        ) : filteredItems.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 100, border: '2px dashed #e5e7eb', borderRadius: 24, background: '#f9fafb' }}><h2>No items found</h2></div>
        ) : filteredItems.map(item => {
          const isLow = item.currentStock <= item.minimumStock;
          const isOut = item.currentStock === 0;
          const stockPercentage = Math.min((item.currentStock / (item.maximumStock || 100)) * 100, 100);
          const isSelected = selectedIds.includes(item._id);

          return (
            <div key={item._id} className={`inv-card ${isSelected ? 'selected' : ''} ${isOut ? 'low-stock' : isLow ? 'low-stock' : ''}`}>
              <input type="checkbox" className="card-checkbox" checked={isSelected} onChange={() => toggleSelect(item._id)} />
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, paddingRight: 10 }}>
                        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.3px', marginBottom: 2, lineHeight: 1.2 }}>{item.itemName}</div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', background: '#eff6ff', color: '#2563eb', borderRadius: 6, fontSize: 9, fontWeight: 800, textTransform: 'uppercase' }}>
                           {item.category.replace('_', ' ')}
                        </div>
                    </div>
                </div>

                <div className="stock-ctrl">
                    <button onClick={() => updateStock(item._id, -1)} style={{ width: 28, height: 28, border: '1px solid #e2e8f0', background: 'white', fontWeight: 900, borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>-</button>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{item.currentStock}</div>
                        <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b' }}>{item.unit}</div>
                    </div>
                    <button onClick={() => updateStock(item._id, 1)} style={{ width: 28, height: 28, border: '1px solid #e2e8f0', background: 'white', fontWeight: 900, borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>+</button>
                </div>

                <div style={{ marginBottom: 12 }}>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${stockPercentage}%`, background: isOut ? '#ef4444' : isLow ? '#f97316' : '#22c55e' }} /></div>
                </div>

                <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, marginBottom: 4 }}>Linked Recipes</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(item.linkedMenuItems || []).length > 0 ? (
                            item.linkedMenuItems.slice(0, 3).map((link, idx) => {
                                // link.foodId is populated by the backend, so we can access its name directly
                                const dishName = link.foodId?.name || 'Dish';
                                return (
                                    <span key={idx} style={{ fontSize: 10, fontWeight: 700, background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 6px', borderRadius: 6, color: '#475569', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {dishName}
                                    </span>
                                );
                            })
                        ) : (
                            <span style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>No links</span>
                        )}
                        {(item.linkedMenuItems || []).length > 3 && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#ff4e2a' }}>+{(item.linkedMenuItems || []).length - 3} more</span>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <div>
                        <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Unit Cost / Total Value</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            <div style={{ fontSize: 16, fontWeight: 900, color: '#1e293b' }}>AED {item.unitCost} <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>/ {item.unit}</span></div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#ff4e2a', background: '#fff1f0', padding: '1px 6px', borderRadius: 4 }}>
                                Total: AED {Number((item.unitCost * item.currentStock).toFixed(2))}
                            </div>
                        </div>
                    </div>
                    <button onClick={() => handleManageLinks(item)} style={{ cursor: 'pointer', border: 'none', background: '#ff4e2a', color: 'white', fontSize: 10, fontWeight: 900, padding: '4px 10px', borderRadius: 8 }}>
                        {item.linkedMenuItems?.length > 0 ? 'Edit Links' : 'Add Link'}
                    </button>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button className="card-action-btn" style={{ padding: '8px', fontSize: 12, flex: 1.5 }} onClick={() => handleEdit(item)}>Edit Item</button>
                    <button className="card-action-btn" style={{ padding: '8px', fontSize: 12, borderColor: '#fee2e2', color: '#dc2626' }} onClick={() => confirmDelete(item)}>Delete</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showImportModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
              <div className="card" style={{ width: '100%', maxWidth: 900, padding: 32, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, flexShrink: 0 }}>
                    <div>
                        <h2 style={{ margin: 0 }}>Bulk Upload</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Upload your ingredients using CSV or Excel</p>
                            <span style={{ fontSize: 11, fontWeight: 900, background: '#f3f4f6', color: '#4b5563', padding: '2px 8px', borderRadius: 6 }}>
                                {menuItems.length} Recipes Loaded
                            </span>
                        </div>
                    </div>
                    <button className="btn-sm btn-outline" onClick={() => { setShowImportModal(false); setImportPreview([]); setImportSummary(null); }}>✕</button>
                  </div>

                  <div style={{ overflowY: 'auto', flex: 1, paddingRight: 8 }}>
                    {importSummary ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                            <h3 style={{ fontSize: 24, fontWeight: 900 }}>Import Successful</h3>
                            <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 24 }}>
                                <div style={{ textAlign: 'center' }}><div style={{ fontSize: 24, fontWeight: 900, color: '#16a34a' }}>{importSummary.created}</div><div style={{ fontSize: 12, fontWeight: 800, color: '#6b7280' }}>NEW ITEMS</div></div>
                                <div style={{ textAlign: 'center' }}><div style={{ fontSize: 24, fontWeight: 900, color: '#2563eb' }}>{importSummary.updated}</div><div style={{ fontSize: 12, fontWeight: 800, color: '#6b7280' }}>UPDATED</div></div>
                            </div>
                        </div>
                    ) : importPreview.length > 0 ? (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div style={{ fontSize: 14, fontWeight: 700 }}>Previewing {importPreview.length} rows from file</div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-sm btn-outline" onClick={() => setImportPreview([])}>Clear</button>
                                    <button className="btn btn-sm" disabled={importLoading} onClick={submitBulkImport}>
                                        {importLoading ? "Processing..." : `Import ${importPreview.length} items`}
                                    </button>
                                </div>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="preview-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Category</th>
                                            <th>Stock</th>
                                            <th>Cost</th>
                                            <th>Suggested Link</th>
                                            <th>Qty/Order</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {importPreview.map((row, idx) => (
                                            <tr key={idx}>
                                                <td style={{ fontWeight: 800 }}>{row.itemName}</td>
                                                <td style={{ opacity: 0.7 }}>{row.category.replace('_',' ')}</td>
                                                <td style={{ fontWeight: 700 }}>{row.currentStock} {row.unit}</td>
                                                <td style={{ fontWeight: 700 }}>AED {row.unitCost}</td>
                                                <td>
                                                    <select 
                                                      className="select-sm" 
                                                      style={{ padding: '4px 8px', fontSize: 11, width: 140 }}
                                                      value={row.linkedMenuItems?.[0]?.foodId || ""}
                                                      onChange={(e) => {
                                                        const newVal = e.target.value;
                                                        const match = menuItems.find(m => m._id === newVal);
                                                        const updated = [...importPreview];
                                                        updated[idx].linkedMenuItems = newVal ? [{ foodId: newVal, foodName: match?.name, quantityPerOrder: 1 }] : [];
                                                        setImportPreview(updated);
                                                      }}
                                                    >
                                                      <option value="">No link</option>
                                                      {menuItems.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                                                    </select>
                                                </td>
                                                <td>
                                                    {row.linkedMenuItems?.length > 0 && (
                                                      <input 
                                                        type="number" 
                                                        className="input-sm" 
                                                        style={{ width: 50, padding: '4px' }}
                                                        value={row.linkedMenuItems[0].quantityPerOrder}
                                                        onChange={(e) => {
                                                          const updated = [...importPreview];
                                                          updated[idx].linkedMenuItems[0].quantityPerOrder = Number(e.target.value);
                                                          setImportPreview(updated);
                                                        }}
                                                      />
                                                    )}
                                                </td>
                                                <td>
                                                    <span className={`status-badge status-${row.status.toLowerCase()}`}>
                                                        {row.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div 
                                className="drop-zone" 
                                onClick={() => document.getElementById('bulk-file').click()}
                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('active'); }}
                                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('active'); }}
                                onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('active'); handleFileUpload(e.dataTransfer.files[0]); }}
                            >
                                <div className="drop-icon">📂</div>
                                <h3 style={{ margin: 0, fontWeight: 900 }}>Click or drag file here</h3>
                                <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Supports .csv, .xlsx, or .xls</p>
                                <input type="file" id="bulk-file" hidden accept=".csv,.xlsx,.xls" onChange={(e) => handleFileUpload(e)} />
                            </div>
                            
                            <div style={{ background: '#f8fafc', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                                <h4 style={{ margin: '0 0 12px', fontWeight: 900, fontSize: 14 }}>Tips for a successful import:</h4>
                                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#4b5563', lineHeight: 1.6 }}>
                                    <li>Ensure your columns match: <strong>itemName, category, unit, currentStock, unitCost</strong></li>
                                    <li>If the <strong>itemName</strong> already exists, we will update the existing stock.</li>
                                    <li>Categories should be: <strong>food_ingredient, beverage, packaging, equipment</strong>.</li>
                                </ul>
                                <button onClick={downloadTemplate} className="btn btn-sm btn-outline" style={{ marginTop: 20, width: '100%', background: 'white' }}>
                                    📥 Download Blank Template
                                </button>
                            </div>
                        </div>
                    )}
                  </div>
              </div>
          </div>
      )}

      {showDeleteModal && deletingItem && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
             <div className="card" style={{ width: 400, padding: 32, textAlign: 'center' }}><h2>Delete?</h2><p>Delete <strong>{deletingItem.itemName}</strong>?</p><button className="btn" style={{ background: '#dc2626', color: 'white' }} onClick={handleDelete}>Delete</button></div>
          </div>
      )}

      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ width: 600, padding: 32, maxWeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: 20, fontWeight: 900 }}>{editingItem ? 'Edit Ingredient' : 'Add New Ingredient'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="field" style={{ gridColumn: 'span 2' }}>
                  <label className="label">ITEM NAME</label>
                  <input className="input" required value={formData.itemName} onChange={e => setFormData({...formData, itemName: e.target.value})} placeholder="e.g. Chicken Strips" />
                </div>
                <div className="field">
                  <label className="label">CATEGORY</label>
                  <select className="select" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option value="food_ingredient">Food Ingredient</option>
                    <option value="beverage">Beverage</option>
                    <option value="packaging">Packaging</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="field">
                  <label className="label">UNIT</label>
                  <input className="input" required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} placeholder="e.g. kg, pieces, liters" />
                </div>
                <div className="field">
                  <label className="label">CURRENT STOCK</label>
                  <input className="input" type="number" step="0.01" required value={formData.currentStock} onChange={e => setFormData({...formData, currentStock: e.target.value})} />
                </div>
                <div className="field">
                  <label className="label">UNIT COST (AED)</label>
                  <input className="input" type="number" step="0.01" required value={formData.unitCost} onChange={e => setFormData({...formData, unitCost: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button type="submit" className="btn" style={{ flex: 1 }}>{editingItem ? 'Update Item' : 'Create Item'}</button>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLinkModal && linkingItem && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
              <div className="card" style={{ width: '100%', maxWidth: 700, padding: 32, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ marginBottom: 24, flexShrink: 0 }}>
                      <h2 style={{ margin: 0, fontWeight: 900 }}>Linking: {linkingItem.itemName}</h2>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>Select menu items that use this ingredient.</p>
                  </div>

                  <div style={{ marginBottom: 16, flexShrink: 0 }}>
                      <input 
                        type="text" 
                        placeholder="Search menu items..." 
                        className="input" 
                        value={linkSearch} 
                        onChange={(e) => setLinkSearch(e.target.value)}
                        style={{ background: '#f9fafb' }}
                      />
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8, marginBottom: 24 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {menuItems.filter(f => f.name.toLowerCase().includes(linkSearch.toLowerCase())).map(food => {
                              const foodIdStr = String(food._id);
                              const link = selectedLinks.find(l => String(l.foodId) === foodIdStr);
                              const isLinked = !!link;

                              return (
                                  <div key={foodIdStr} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: isLinked ? '#f0f9ff' : '#f9fafb', border: '1px solid', borderColor: isLinked ? '#bae6fd' : '#e5e7eb', borderRadius: 12 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                                          <input type="checkbox" checked={isLinked} onChange={() => toggleLink(foodIdStr)} style={{ width: 18, height: 18, accentColor: '#ff4e2a' }} />
                                          <div>
                                              <div style={{ fontWeight: 800, fontSize: 14 }}>{food.name}</div>
                                              <div style={{ fontSize: 11, color: '#6b7280' }}>AED {food.price}</div>
                                          </div>
                                      </div>
                                      {isLinked && (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                              <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280' }}>Qty / Order:</span>
                                              <input 
                                                type="number" 
                                                step="0.001"
                                                value={link.quantityPerOrder}
                                                onChange={(e) => updateLinkQuantity(foodIdStr, e.target.value)}
                                                style={{ width: 80, padding: '6px 10px', borderRadius: 8, border: '1px solid #bae6fd', fontSize: 13, fontWeight: 800 }}
                                              />
                                              <span style={{ fontSize: 11, fontWeight: 700 }}>{linkingItem.unit}</span>
                                          </div>
                                      )}
                                  </div>
                              );
                          })}
                          {menuItems.filter(f => f.name.toLowerCase().includes(linkSearch.toLowerCase())).length === 0 && (
                              <div style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>No menu items found matching "{linkSearch}"</div>
                          )}
                      </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                      <button className="btn" style={{ flex: 1 }} onClick={saveLinks}>Save All Links</button>
                      <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowLinkModal(false)}>Cancel</button>
                  </div>
              </div>
          </div>
      )}
    </RestaurantLayout>
  );
}