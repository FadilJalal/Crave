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
      const res = await api.get("/api/food/list?limit=100");
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

      return {
        id: index,
        itemName,
        category: normalizeCategory(normalizedRow.category || normalizedRow.cat || normalizedRow.type || ""),
        unit: String(normalizedRow.unit || normalizedRow.uom || normalizedRow.measure || "pieces").trim(),
        currentStock: parseFloat(normalizedRow.currentstock || normalizedRow.stock || normalizedRow.qty || normalizedRow.quantity || 0) || 0,
        minimumStock: parseFloat(normalizedRow.minimumstock || normalizedRow.minstock || normalizedRow.alertStock || 10) || 10,
        maximumStock: parseFloat(normalizedRow.maximumstock || normalizedRow.maxstock || 100) || 100,
        unitCost: parseFloat(normalizedRow.unitcost || normalizedRow.cost || normalizedRow.price || 0) || 0,
        supplier: { 
          name: String(normalizedRow.suppliername || normalizedRow.supplier || normalizedRow.vendor || "").trim(), 
          contact: String(normalizedRow.suppliercontact || normalizedRow.contact || "").trim()
        },
        notes: String(normalizedRow.notes || normalizedRow.description || normalizedRow.memo || "").trim(),
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
            gap: 24px;
            margin-top: 16px;
            padding-bottom: 60px;
          }
          @media (max-width: 1100px) { .inventory-grid { grid-template-columns: repeat(2, 1fr); } }
          @media (max-width: 700px) { .inventory-grid { grid-template-columns: 1fr; } }
          
          .action-navbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(249, 250, 251, 0.8);
            backdrop-filter: blur(8px);
            padding: 12px 20px;
            border-radius: 16px;
            border: 1px solid #e5e7eb;
            margin-top: 24px;
            position: sticky;
            top: 0;
            z-index: 100;
          }

          .inv-card {
            background: white;
            border-radius: 20px;
            padding: 24px;
            border: 1.5px solid #f3f4f6;
            transition: all 0.2s ease;
            position: relative;
          }
          .inv-card.selected { border-color: #ff4e2a; background: #fffafa; }
          .inv-card:hover { transform: translateY(-4px); box-shadow: 0 12px 20px -5px rgba(0,0,0,0.1); }
          .inv-card.low-stock { border-color: #fee2e2; background: #fff8f8; }
          
          .stock-ctrl {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #f9fafb;
            padding: 12px 16px;
            border-radius: 12px;
            margin: 16px 0;
          }
          .progress-bar { height: 6px; background: #f3f4f6; border-radius: 100px; overflow: hidden; margin-top: 8px; }
          .progress-fill { height: 100%; transition: width 0.3s ease; }
          
          .card-action-btn {
            padding: 8px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            background: white;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            flex: 1;
          }
          .card-action-btn:hover { background: #f9fafb; }
          .status-tag { padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; }
          .card-checkbox { position: absolute; top: 18px; left: 18px; width: 18px; height: 18px; accent-color: #ff4e2a; z-index: 10; cursor: pointer; }
          
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
        `}
      </style>

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.6px', margin: 0 }}>Inventory Management</h1>
          <p className="muted" style={{ fontSize: 14, marginTop: 4 }}>Control and manage your storage and ingredients.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-outline" onClick={downloadTemplate}>📥 Template</button>
          <button className="btn btn-outline" style={{ borderColor: '#ff4e2a', color: '#ff4e2a' }} onClick={() => setShowImportModal(true)}>Bulk Upload</button>
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
              <div style={{ marginLeft: 30 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div><div style={{ fontSize: 18, fontWeight: 900 }}>{item.itemName}</div><div style={{ fontSize: 10, fontWeight: 800, color: '#2563eb' }}>{item.category.replace('_', ' ')}</div></div>
                    {isOut ? <span className="status-tag" style={{ background: '#fef2f2', color: '#dc2626' }}>OUT</span> : isLow ? <span className="status-tag" style={{ background: '#fff7ed', color: '#ea580c' }}>LOW</span> : null}
                </div>
                <div className="stock-ctrl">
                    <button onClick={() => updateStock(item._id, -1)} style={{ width: 28, height: 28, border: 'none', background: 'white', fontWeight: 900, borderRadius: 6 }}>-</button>
                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 900 }}>{item.currentStock}</div><div style={{ fontSize: 10 }}>{item.unit}</div></div>
                    <button onClick={() => updateStock(item._id, 1)} style={{ width: 28, height: 28, border: 'none', background: 'white', fontWeight: 900, borderRadius: 6 }}>+</button>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${stockPercentage}%`, background: isOut ? '#ef4444' : isLow ? '#f97316' : '#22c55e' }} /></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                    <div><div style={{ fontSize: 10, color: '#9ca3af' }}>Cost</div><div style={{ fontSize: 13, fontWeight: 800 }}>AED {item.unitCost}</div></div>
                    <div 
                        onClick={() => handleManageLinks(item)}
                        style={{ textAlign: 'right', cursor: 'pointer', padding: '4px 8px', borderRadius: 8, transition: 'background 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#f3f4f6'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <div style={{ fontSize: 10, color: '#9ca3af' }}>Links</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#2563eb' }}>🔗 {item.linkedMenuItems?.length || 0}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button className="card-action-btn" onClick={() => handleEdit(item)}>Edit</button>
                    <button className="card-action-btn card-delete-btn" onClick={() => confirmDelete(item)}>Delete</button>
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
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>Upload your ingredients using CSV or Excel</p>
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