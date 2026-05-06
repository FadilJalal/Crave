import { useEffect, useState, useRef } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import { useTheme } from "../ThemeContext";
import ConfirmationModal from "../components/ConfirmationModal";

const extractQuantityFromName = (name, description = "") => {
    if (!name) return 1;
    const searchArea = `${name} ${description}`;
    const patterns = [
        /(\d+)\s*(?:-?\s*piece|pc|pcs|pce|wing|strip)/i,
        /(?:pack|bucket|deal)\s*(?:of|for)?\s*(\d+)/i,
        /(?:^|\s)(\d+)\s*(?:x|qty|quantity)/i,
        /(\d+)\s*x\s*(?:^|\s)/i
    ];
    for (const pattern of patterns) {
        const match = searchArea.match(pattern);
        if (match && match[1]) {
            const val = parseInt(match[1]);
            if (val > 0 && val < 500) return val;
        }
    }
    return 1;
};

export default function Inventory() {
  const { dark } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const [confirmConfig, setConfirmConfig] = useState({ open: false, onConfirm: () => {}, title: "", message: "", type: "danger" });
  
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
  const [showLogModal, setShowLogModal] = useState(false);
  const [loggingItem, setLoggingItem] = useState(null);
  const [linkSearch, setLinkSearch] = useState("");
  
  // Bulk Selection & Filtering States
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // all, low, out, high
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
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

  const updateStock = async (id, delta, silent = true) => {
    try {
      if (!silent) setLoading(true);
      await api.patch(`/api/inventory/${id}/stock`, { adjustment: delta });
      
      // Update local state without full reload or global spinner
      const res = await api.get("/api/inventory");
      if (res.data?.success) setItems(res.data.data);
    } catch (err) {
      toast.error("Update failed");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // --- Bulk Selection & Filtering ---
  const filteredItems = items.filter(item => {
    const name = item.itemName || item.name || "Unnamed Item";
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'low' && item.currentStock <= item.minimumStock && item.currentStock > 0) ||
      (statusFilter === 'out' && item.currentStock === 0) ||
      (statusFilter === 'unlinked' && (!item.linkedMenuItems || item.linkedMenuItems.length === 0));
    
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAll = (checked) => {
    if (checked) setSelectedIds(filteredItems.map(i => i._id));
    else setSelectedIds([]);
  };

  const handleBulkDelete = async () => {
    setConfirmConfig({
      open: true,
      title: "Delete Items",
      message: `Are you sure you want to delete ${selectedIds.length} items? This cannot be undone.`,
      type: "danger",
      onConfirm: async () => {
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
          setConfirmConfig({ ...confirmConfig, open: false });
        }
      }
    });
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
        // Clean key but KEEP numbers for things like "AED 50" or "Unit 1"
        const cleanKey = key.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
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
      
      const findMatches = () => {
        if (!menuItems || menuItems.length === 0) return [];
        
        const search = itemName.toLowerCase().trim();
        // Normalization for common typos and variations
        const normalizedSearch = search
          .replace(/potatoe|potos|potat/gi, "potato") // Handle the "potos" typo
          .replace(/[0-9]|ml|kg|l|g|btl|can|pieces|pcs|bottle|box|pkt|packets/gi, "")
          .replace(/s\b|es\b/gi, "") 
          .replace(/[^a-z0-9\s]/gi, "")
          .trim();
        
        const keywords = normalizedSearch.split(/\s+/).filter(w => w.length > 2);

        const matchedIds = new Set();
        const results = [];

        menuItems.forEach(f => {
            const fNameRaw = (f.name || "").toLowerCase().trim();
            const fName = fNameRaw.replace(/\(.*\)/g, "").replace(/[^a-z0-9\s]/gi, "").trim();
            
            // Check Ingredients list (Recipe column in your CSV)
            const fIngsRaw = (f.ingredients || "").toLowerCase();
            const fIngs = fIngsRaw.replace(/[^a-z0-9\s,:]/gi, "").trim();
            const fDesc = (f.description || "").toLowerCase().replace(/[^a-z0-9\s]/gi, "").trim();
            
            // Normalize recipe text for comparison
            const normalizedIngs = fIngsRaw.replace(/potatoe|potos|potat/gi, "potato");

            const combinedSearchArea = `${fName} ${fIngs} ${fDesc}`;

            // 1. Direct Recipe Match (The most important one for your sheet)
            const recipeMatch = 
                normalizedIngs.includes(normalizedSearch) || 
                fIngsRaw.includes(search);

            // 2. Direct Name Match
            const directMatch = 
                fNameRaw.includes(search) || 
                search.includes(fNameRaw) || 
                fName.includes(normalizedSearch);

            // 3. Keyword Overlap
            const keywordMatch = keywords.length > 0 && keywords.some(word => combinedSearchArea.includes(word));

            if ((recipeMatch || directMatch || keywordMatch) && !matchedIds.has(f._id)) {
                matchedIds.add(f._id);
                
                // SMART QUANTITY: Only use the number from the food name (e.g. 15 from "15 PC Strips")
                // if the inventory item name itself is mentioned in the food name.
                const fallbackQty = extractQuantityFromName(f.name, f.description);
                const isMainIngredient = 
                    fNameRaw.includes(search) || 
                    search.includes(fNameRaw) ||
                    (search.includes("chicken") && (fNameRaw.includes("strip") || fNameRaw.includes("wing") || fNameRaw.includes("nugget") || fNameRaw.includes("piece") || fNameRaw.includes("pc")));

                results.push({ 
                    foodId: f._id, 
                    foodName: f.name, 
                    quantityPerOrder: isMainIngredient ? fallbackQty : 1 
                });
            }
        });

        return results;
      };

      const suggestedLinks = findMatches();

      // Headers like "Unit Cost (AED)" normalize to "unitcostaed"
      const unitCost = parseFloat(
          normalizedRow.unitcostaed || 
          normalizedRow.unitcost || 
          normalizedRow.costaed ||
          normalizedRow.cost || 
          normalizedRow.price || 
          normalizedRow.unitprice || 
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
        const lid = typeof l.foodId === 'object' ? String(l.foodId._id) : String(l.foodId);
        if (lid === String(foodId)) {
            return { ...l, quantityPerOrder: qty };
        }
        return l;
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

  const handleSyncAllLinks = async () => {
    setLoading(true);
    try {
      const res = await api.post("/api/inventory/sync-all-links");
      if (res.data.success) {
        toast.success(res.data.message);
        loadInventory();
      }
    } catch (err) {
      toast.error("Sync failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RestaurantLayout>
      <style>
        {`
          .inventory-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            justify-content: center;
            gap: 16px;
            margin-top: 24px;
            padding-bottom: 60px;
          }

          .inv-row {
            background: ${dark ? 'rgba(15, 23, 42, 0.4)' : '#fff'};
            border: 1px solid ${dark ? 'rgba(255,255,255,0.04)' : '#f1f5f9'};
            border-radius: 8px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.02);
            overflow: hidden;
          }

          .inv-row:hover {
            background: ${dark ? 'rgba(30, 41, 59, 0.6)' : '#f8fafc'};
            border-color: #ff4e2a;
            transform: translateY(-4px);
            box-shadow: 0 20px 40px -12px rgba(0,0,0,0.15);
            z-index: 2;
          }

          .inv-row.selected {
            background: ${dark ? 'rgba(255, 78, 42, 0.08)' : '#fff5f4'};
            border-color: #ff4e2a;
            box-shadow: 0 0 0 1px #ff4e2a30, 0 10px 25px -10px rgba(255,78,42,0.1);
          }

          .inv-row.low-stock::after {
            content: '';
            position: absolute;
            top: 0; left: 0; width: 4px; height: 100%;
            background: #f97316;
          }

          .inv-row.out-of-stock::after {
            content: '';
            position: absolute;
            top: 0; left: 0; width: 4px; height: 100%;
            background: #ef4444;
          }

          .mono-num {
            font-family: 'JetBrains Mono', 'Roboto Mono', monospace;
            font-variant-numeric: tabular-nums;
          }
            letter-spacing: -0.5px;
            font-variant-numeric: tabular-nums;
          }

          .badge {
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
          }

          .badge::before {
            content: '';
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: currentColor;
          }

          .badge-blue { background: rgba(59, 130, 246, 0.08); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.15); }
          .badge-purple { background: rgba(139, 92, 246, 0.08); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.15); }
          .badge-orange { background: rgba(249, 115, 22, 0.08); color: #fb923c; border: 1px solid rgba(249, 115, 22, 0.15); }
          .badge-red { background: rgba(239, 68, 68, 0.08); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.15); }

          .stock-progress-track {
            height: 6px;
            width: 100%;
            background: ${dark ? 'rgba(255,255,255,0.03)' : '#f1f5f9'};
            border-radius: 100px;
            overflow: hidden;
            margin-top: 6px;
            position: relative;
          }

          .stock-progress-fill {
            height: 100%;
            border-radius: 100px;
            transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .action-btn-circle {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
            background: ${dark ? 'rgba(255,255,255,0.02)' : '#fff'};
            cursor: pointer;
            transition: all 0.2s;
            color: var(--muted);
          }

          .action-btn-circle:hover {
            background: #ff4e2a;
            color: #fff;
            border-color: #ff4e2a;
            transform: scale(1.1);
          }

          @keyframes pulse-glow {
            0% { box-shadow: 0 0 5px rgba(255, 78, 42, 0.2); }
            50% { box-shadow: 0 0 20px rgba(255, 78, 42, 0.4); }
            100% { box-shadow: 0 0 5px rgba(255, 78, 42, 0.2); }
          }

          @keyframes scanline {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
          }

          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.5); opacity: 0.5; }
            100% { transform: scale(1); opacity: 1; }
          }

          .scanline {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100px;
            background: linear-gradient(to bottom, transparent 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%);
            pointer-events: none;
            animation: scanline 4s linear infinite;
            z-index: 10;
          }
        `}
      </style>

      <div className="page-header" style={{ marginBottom: 40 }}>
        {/* Top Command Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, marginBottom: 32, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, position: 'relative', maxWidth: 500 }}>
             <span style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', opacity: 0.4, fontSize: 16 }}>🔍</span>
             <input 
               type="text" 
               placeholder="Search assets or linked recipes..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               style={{
                 width: '100%',
                 padding: '14px 20px 14px 52px',
                 borderRadius: 16,
                 border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
                 background: dark ? 'rgba(15, 23, 42, 0.4)' : '#fff',
                 color: dark ? '#fff' : '#0f172a',
                 fontSize: 14,
                 fontWeight: 700,
                 outline: 'none',
                 transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                 boxShadow: dark ? '0 4px 12px rgba(0,0,0,0.1)' : '0 1px 4px rgba(0,0,0,0.02)'
               }}
             />
             <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: dark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 900, color: 'var(--muted)', pointerEvents: 'none', border: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : '#e2e8f0'}` }}>⌘ K</div>
          </div>
          
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', background: dark ? 'rgba(255,255,255,0.03)' : '#f8fafc', padding: 4, borderRadius: 14, border: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : '#e2e8f0'}` }}>
              <button onClick={downloadTemplate} style={{ padding: '10px 18px', borderRadius: 11, border: 'none', background: 'transparent', color: 'inherit', fontSize: 12, fontWeight: 900, cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Template
              </button>
              <button onClick={() => setConfirmConfig({ open: true, onConfirm: handleSyncAllLinks, title: "Sync Inventory", message: "Scan and synchronize all stock links?", type: "info" })} style={{ padding: '10px 18px', borderRadius: 11, border: 'none', background: 'transparent', color: 'inherit', fontSize: 12, fontWeight: 900, cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                Sync
              </button>
              <button onClick={() => { fetchMenuItems(); setShowImportModal(true); }} style={{ padding: '10px 18px', borderRadius: 11, border: 'none', background: 'transparent', color: 'inherit', fontSize: 12, fontWeight: 900, cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Import
              </button>
            </div>
            <button className="btn" style={{ padding: '14px 28px', borderRadius: 16, fontSize: 13, fontWeight: 950, background: '#ff4e2a', boxShadow: '0 10px 25px rgba(255,78,42,0.3)' }} onClick={() => { setEditingItem(null); setShowAddModal(true); }}>
               + New Ingredient
            </button>
          </div>
        </div>

        {/* Tactical Intelligence Command Strip */}
        <div style={{ 
          background: dark ? 'rgba(11, 18, 32, 0.4)' : '#fff', 
          border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
          borderRadius: 24,
          padding: '24px 32px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 24,
          boxShadow: dark ? '0 25px 60px rgba(0,0,0,0.4), inset 0 0 20px rgba(255,255,255,0.02)' : '0 10px 30px rgba(0,0,0,0.02)',
          backdropFilter: 'blur(40px)',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: 32
        }}>
          {/* Neon Pulse Overlay */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(${dark ? 'rgba(168, 85, 247, 0.05)' : 'rgba(0,0,0,0.01)'} 1px, transparent 1px)`, backgroundSize: '32px 32px' }} />

          {[
            { 
              label: 'VIBE CHECK', 
              value: stats.total, 
              color: '#a855f7', 
              trend: '+12%', 
              subtext: 'TOTAL VECTORS',
              icon: '✨',
              status: 'W'
            },
            { 
              label: 'LOWKEY LOW', 
              value: stats.lowStock, 
              color: '#3b82f6', 
              trend: '-2%', 
              subtext: 'STOCK STABLE',
              icon: '🔋',
              status: 'STABLE'
            },
            { 
              label: 'TOTAL L\'S', 
              value: stats.outOfStock, 
              color: '#ff4e2a', 
              trend: 'ZERO', 
              subtext: 'ZERO VACANCY',
              icon: '🚨',
              status: 'CRITICAL',
              alert: stats.outOfStock > 0 
            },
            { 
              label: 'MAJOR BAGS', 
              value: stats.value, 
              isCurrency: true,
              color: '#10b981', 
              trend: '+5.4%', 
              subtext: 'TOTAL LIQUID ASSETS',
              icon: '💰',
              status: 'SECURED'
            }
          ].map((s, i) => (
            <div key={i} style={{ 
              padding: '24px', 
              borderRadius: 24, 
              background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.8)',
              border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`,
              position: 'relative',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              zIndex: 1,
              flex: 1
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ 
                  width: 36, height: 36, borderRadius: 12, 
                  background: s.alert ? `${s.color}20` : (dark ? 'rgba(255,255,255,0.03)' : '#f8fafc'), 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  color: s.alert ? s.color : 'var(--muted)',
                  border: `1px solid ${s.alert ? `${s.color}40` : (dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0')}`,
                  boxShadow: s.alert ? `0 0 15px ${s.color}30` : 'none'
                }}>
                  {s.icon}
                </div>
                <div style={{ 
                   fontSize: 8, fontWeight: 950, color: s.color, 
                   background: `${s.color}15`, padding: '4px 10px', 
                   borderRadius: 20, letterSpacing: '1.2px' 
                }}>
                  {s.status}
                </div>
              <div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontSize: 9, fontWeight: 950, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>{s.label}</div>
                    {s.alert && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff4e2a', animation: 'pulse 1.5s infinite' }} />}
                 </div>
                         <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 6 }}>
                    <div className="mono-num" style={{ 
                      fontSize: s.isCurrency ? 24 : 36, 
                      fontWeight: 950, 
                      color: s.alert ? s.color : (dark ? '#fff' : '#0f172a'),
                      letterSpacing: '-1.5px',
                      lineHeight: 1
                    }}>
                      {s.isCurrency && <span style={{ fontSize: 12, marginRight: 4, verticalAlign: 'middle', opacity: 0.6 }}>AED</span>}
                      {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
                    </div>
                    <div style={{ 
                      fontSize: 10, 
                      fontWeight: 950, 
                      color: s.trend.startsWith('+') ? '#10b981' : (s.trend === 'ZERO' ? '#64748b' : '#ef4444'),
                      background: s.trend.startsWith('+') ? '#10b98115' : (s.trend === 'ZERO' ? '#f1f5f9' : '#ef444415'),
                      padding: '4px 8px',
                      borderRadius: 6,
                      marginBottom: 2
                    }}>
                      {s.trend}
                    </div>
                 </div>
        </div>

              {s.alert && (
                 <div style={{ 
                   position: 'absolute', top: 0, right: 32, width: 6, height: 6, 
                   borderRadius: '50%', background: s.color, 
                   boxShadow: `0 0 12px ${s.color}`,
                   animation: 'pulse 1.5s infinite' 
                 }} />
              )}
            </div>
          ))}
        </div>
      <div style={{ 
          marginTop: 40, 
          padding: '14px 24px', 
          borderRadius: 16, 
          background: dark ? 'rgba(15, 23, 42, 0.4)' : '#fff',
          border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
          backdropFilter: 'blur(40px)',
          boxShadow: dark ? '0 25px 60px rgba(0,0,0,0.4), inset 0 0 20px rgba(255,255,255,0.02)' : '0 10px 30px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          position: 'relative',
          zIndex: 10,
          width: '100%'
      }}>
        {/* OPERATIONAL VECTOR: Selection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
           <label style={{ 
              display: 'flex', alignItems: 'center', gap: 10, 
              fontSize: 9, fontWeight: 950, cursor: 'pointer', 
              color: selectedIds.length > 0 ? '#ff4e2a' : 'var(--muted)',
              letterSpacing: '1px',
              padding: '10px 16px',
              borderRadius: 10,
              background: dark ? (selectedIds.length > 0 ? 'rgba(255,78,42,0.1)' : 'rgba(255,255,255,0.03)') : '#f8fafc',
              border: `1px solid ${selectedIds.length > 0 ? '#ff4e2a' : (dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0')}`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              whiteSpace: 'nowrap'
            }}>
               <input 
                 type="checkbox" 
                 style={{ width: 15, height: 15, accentColor: '#ff4e2a', cursor: 'pointer' }} 
                 checked={filteredItems.length > 0 && selectedIds.length === filteredItems.length} 
                 onChange={(e) => handleSelectAll(e.target.checked)} 
               />
               {selectedIds.length > 0 ? `${selectedIds.length} SELECTED` : 'SELECT ALL'}
            </label>

            {selectedIds.length > 0 && (
              <button 
                className="btn" 
                style={{ 
                  background: '#ef4444', color: 'white', border: 'none', 
                  padding: '10px 16px', borderRadius: 8, fontSize: 9, fontWeight: 950,
                  cursor: 'pointer', boxShadow: '0 8px 25px rgba(239,68,68,0.3)',
                  letterSpacing: '0.5px'
                }} 
                disabled={isBulkDeleting} 
                onClick={handleBulkDelete}
              >
                TERMINATE
              </button>
            )}
        </div>

        {/* DIAGNOSTIC MATRIX: Status Sorting */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center', minWidth: 0 }}>
             <div style={{ fontSize: 8, fontWeight: 950, color: 'var(--muted)', letterSpacing: '1.5px', textTransform: 'uppercase', opacity: 0.5, whiteSpace: 'nowrap' }}>Diagnostic</div>
             <div style={{ display: 'flex', gap: 2, background: dark ? 'rgba(0,0,0,0.3)' : '#f1f5f9', padding: 3, borderRadius: 10, border: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : '#e2e8f0'}` }}>
                 {[
                   { id: 'all', label: 'All' },
                   { id: 'low', label: 'Low' },
                   { id: 'out', label: 'Out' },
                   { id: 'unlinked', label: 'Link' }
                 ].map((f) => (
                     <button 
                      key={f.id} 
                      onClick={() => setStatusFilter(f.id)}
                      style={{
                          padding: '8px 14px', borderRadius: 7, fontSize: 9, fontWeight: 950,
                          background: statusFilter === f.id ? (dark ? '#fff' : '#0f172a') : 'transparent',
                          color: statusFilter === f.id ? (dark ? '#0f172a' : '#fff') : 'var(--muted)',
                          border: 'none', 
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          letterSpacing: '0.5px'
                      }}
                     >
                         {f.label.toUpperCase()}
                     </button>
                 ))}
             </div>
        </div>

        {/* CLASSIFICATION STRIP: Category Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
           <div style={{ fontSize: 8, fontWeight: 950, color: 'var(--muted)', letterSpacing: '1.5px', textTransform: 'uppercase', opacity: 0.5, whiteSpace: 'nowrap' }}>Taxonomy</div>
           <div style={{ display: 'flex', gap: 4 }}>
                {[
                    { id: 'all', label: 'All', icon: '✨' },
                    { id: 'beverage', label: 'Bev', icon: '🥤' },
                    { id: 'food_ingredient', label: 'Ing', icon: '🍅' },
                    { id: 'packaging', label: 'Pkg', icon: '📦' }
                ].map((c) => (
                    <button 
                        key={c.id} 
                        onClick={() => setCategoryFilter(c.id)}
                        style={{
                            padding: '8px 12px', borderRadius: 8, fontSize: 9, fontWeight: 950,
                            background: categoryFilter === c.id ? '#ff4e2a' : (dark ? 'rgba(255,255,255,0.02)' : '#fff'),
                            color: categoryFilter === c.id ? '#fff' : 'var(--muted)',
                            border: `1px solid ${categoryFilter === c.id ? '#ff4e2a' : (dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0')}`,
                            cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
                            boxShadow: categoryFilter === c.id ? '0 8px 20px rgba(255,78,42,0.2)' : 'none',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <span style={{ fontSize: 11 }}>{c.icon}</span>
                        {c.label.toUpperCase()}
                    </button>
                ))}
           </div>
        </div>
      </div>


      <div className="inventory-list" style={{ minHeight: '400px' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--muted)', fontWeight: 800 }}>⚡ SYNCHRONIZING ENGINE...</div>
        ) : filteredItems && filteredItems.length > 0 ? (
          filteredItems.map(item => {
            const isLow = item.currentStock <= item.minimumStock && item.currentStock > 0;
            const isOut = item.currentStock === 0;
            const stockPercentage = Math.min((item.currentStock / (item.maximumStock || 100)) * 100, 100);
            const isSelected = selectedIds.includes(item._id);
            const displayName = item.itemName || item.name || "Unnamed Item";

            return (
              <div 
                key={item._id} 
                className={`inv-row ${isSelected ? 'selected' : ''} ${isOut ? 'out-of-stock' : isLow ? 'low-stock' : ''}`}
                onClick={() => toggleSelect(item._id)}
              >
                {/* Card Top: Status & Selection */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                   <div style={{ 
                     padding: '4px 8px', borderRadius: 6, fontSize: 9, fontWeight: 900, letterSpacing: 1,
                     background: item.category === 'food_ingredient' ? (dark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff') : (dark ? 'rgba(139, 92, 246, 0.15)' : '#f5f3ff'),
                     color: item.category === 'food_ingredient' ? (dark ? '#60a5fa' : '#2563eb') : (dark ? '#a78bfa' : '#7c3aed'),
                     textTransform: 'uppercase', border: `1px solid ${item.category === 'food_ingredient' ? (dark ? '#3b82f640' : '#bfdbfe') : (dark ? '#8b5cf640' : '#ddd6fe')}`
                   }}>
                     {item.category.replace('_', ' ')}
                   </div>
                   <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 8 }}>
                     <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(item._id)} style={{ width: 16, height: 16, accentColor: '#ff4e2a', cursor: 'pointer' }} />
                   </div>
                </div>

                {/* Card Main: Identification */}
                <div style={{ height: 44, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                   <div style={{ fontWeight: 950, fontSize: 16, color: dark ? '#fff' : '#0f172a', letterSpacing: '-0.5px', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
                   <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700 }}>SKU: {item._id.slice(-8).toUpperCase()}</div>
                </div>

                {/* Card Center: Stock Visualization */}
                <div style={{ background: dark ? 'rgba(0,0,0,0.2)' : '#f8fafc', padding: '12px 16px', borderRadius: 12, border: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : '#f1f5f9'}` }} onClick={(e) => e.stopPropagation()}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                      <div className="mono-num" style={{ fontSize: 20, fontWeight: 950, color: isOut ? '#ef4444' : isLow ? '#f97316' : (dark ? '#f8fafc' : '#0f172a') }}>
                         {Number(item.currentStock).toLocaleString()}
                         <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 4, fontWeight: 800 }}>{item.unit}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                         <button onClick={() => updateStock(item._id, 1)} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${dark ? 'rgba(16, 185, 129, 0.2)' : '#bcf0da'}`, background: dark ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5', cursor: 'pointer', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, transition: 'all 0.2s' }}>▲</button>
                         <button onClick={() => updateStock(item._id, -1)} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${dark ? 'rgba(239, 68, 68, 0.2)' : '#fecaca'}`, background: dark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, transition: 'all 0.2s' }}>▼</button>
                      </div>
                   </div>
                   <div className="stock-progress-track" style={{ height: 6, background: dark ? 'rgba(255,255,255,0.05)' : '#e2e8f0' }}>
                      <div className="stock-progress-fill" style={{ 
                         width: `${stockPercentage}%`, 
                         background: isOut ? '#ef4444' : isLow ? '#f97316' : '#10b981',
                         boxShadow: `0 0 10px ${isOut ? '#ef444450' : isLow ? '#f9731650' : '#10b98150'}`
                      }} />
                   </div>
                   <div style={{ marginTop: 8, fontSize: 9, fontWeight: 900, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>MIN: {item.minimumStock}</span>
                      <span style={{ color: '#ff4e2a', opacity: 0.8 }}>{item.linkedMenuItems?.length || 0} DEPLOYMENTS</span>
                   </div>
                </div>

                {/* Card Bottom: Valuation & Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
                   <div>
                      <div style={{ fontSize: 8, color: 'var(--muted)', fontWeight: 900, textTransform: 'uppercase', marginBottom: 2 }}>Current Valuation</div>
                      <div className="mono-num" style={{ fontSize: 16, fontWeight: 950, color: '#ff4e2a' }}>
                         <span style={{ fontSize: 10, opacity: 0.8 }}>AED</span> {(item.unitCost * item.currentStock).toLocaleString()}
                      </div>
                   </div>
                   <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                      <button className="action-btn-circle" onClick={() => { setLoggingItem(item); setShowLogModal(true); }} title="Audit Trail"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></button>
                      <button className="action-btn-circle" onClick={() => handleManageLinks(item)} title="Deployments"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button>
                      <button className="action-btn-circle" onClick={() => { setEditingItem(item); setFormData({ ...item }); setShowAddModal(true); }} title="Edit"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                      <button className="action-btn-circle" style={{ borderColor: '#ef444430', color: '#ef4444' }} onClick={() => { setDeletingItem(item); setShowDeleteModal(true); }} title="Terminate"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
                   </div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: 100, border: `1px dashed ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`, borderRadius: 24, opacity: 0.5 }}>
            <h2 style={{ fontWeight: 900, color: 'var(--muted)' }}>NO DATA VECTORS FOUND</h2>
          </div>
        )}
      </div>

      {showImportModal && (
          <div style={{ position: 'fixed', top: 0, left: 260, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
              <div className="card" style={{ width: '100%', maxWidth: 900, padding: 32, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexShrink: 0 }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>Bulk Upload</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Populate your storage via CSV or Excel.</p>
                            <span style={{ fontSize: 11, fontWeight: 900, background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: 50, border: '1px solid #e2e8f0' }}>
                                {menuItems.length} Recipes Ready
                            </span>
                        </div>
                    </div>
                    <button 
                      onClick={() => { setShowImportModal(false); setImportPreview([]); setImportSummary(null); }}
                      style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }}
                      onMouseOver={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#1e293b'; }}
                      onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
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
                                <div className="drop-icon" style={{ fontSize: 40 }}>📂</div>
                                <h3 style={{ margin: 0, fontWeight: 900, color: dark ? '#f1f5f9' : 'inherit' }}>Click or drag file here</h3>
                                <p style={{ margin: 0, fontSize: 13, color: dark ? '#94a3b8' : '#6b7280' }}>Supports .csv, .xlsx, or .xls</p>
                                <input type="file" id="bulk-file" hidden accept=".csv,.xlsx,.xls" onChange={(e) => handleFileUpload(e)} />
                            </div>
                            
                            <div style={{ background: dark ? 'rgba(255,255,255,0.03)' : '#f8fafc', padding: 20, borderRadius: 16, border: '1px solid', borderColor: dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }}>
                                <h4 style={{ margin: '0 0 12px', fontWeight: 900, fontSize: 14, color: dark ? '#f1f5f9' : 'inherit' }}>Tips for a successful import:</h4>
                                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: dark ? '#94a3b8' : '#4b5563', lineHeight: 1.6 }}>
                                    <li>Ensure your columns match: <strong>itemName, category, unit, currentStock, unitCost</strong></li>
                                    <li>If the <strong>itemName</strong> already exists, we will update the existing stock.</li>
                                    <li>Categories should be: <strong>food_ingredient, beverage, packaging, equipment</strong>.</li>
                                </ul>
                                <button onClick={downloadTemplate} className="btn btn-sm btn-outline" style={{ marginTop: 20, width: '100%', background: dark ? 'transparent' : 'white', color: dark ? '#f1f5f9' : 'inherit', borderColor: dark ? 'rgba(255,255,255,0.2)' : '#e5e7eb' }}>
                                    📥 Download Blank Template
                                </button>
                            </div>
                        </div>
                    )}
                  </div>
              </div>
          </div>
      )}

      {showLogModal && loggingItem && (
        <div style={{ position: 'fixed', top: 0, left: 260, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 750, padding: 32, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Deduction History</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Tracking stock usage for <strong>{loggingItem.itemName}</strong></p>
              </div>
              <button onClick={() => setShowLogModal(false)} className="btn btn-sm btn-outline" style={{ borderRadius: '50%', width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            <div className="custom-scrollbar" style={{ overflowY: 'auto', flex: 1, paddingRight: 10, minHeight: 0 }}>
              {(!loggingItem.deductionLog || loggingItem.deductionLog.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: dark ? 'rgba(255,255,255,0.02)' : '#f8fafc', borderRadius: 16, border: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : '#e2e8f0'}` }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📜</div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>No deductions recorded</h3>
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>History will appear here after orders are placed.</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 900 }}>
                      <th style={{ padding: '0 12px 8px' }}>Order</th>
                      <th style={{ padding: '0 12px 8px' }}>Trigger</th>
                      <th style={{ padding: '0 12px 8px' }}>Date</th>
                      <th style={{ padding: '0 12px 8px', textAlign: 'right' }}>Deducted</th>
                      <th style={{ padding: '0 12px 8px', textAlign: 'right' }}>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...loggingItem.deductionLog].reverse().map((log, idx) => (
                      <tr key={idx} style={{ background: dark ? 'rgba(255,255,255,0.03)' : '#f9fafb', borderRadius: 12 }}>
                        <td style={{ padding: '14px 12px', borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 900, color: '#ff4e2a' }}>#{log.orderId?.slice(-6).toUpperCase() || 'MANUAL'}</div>
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{log.foodName || 'Inventory Adj.'}</div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>Qty Ordered: {log.qtyOrdered || 1}</div>
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <div style={{ fontSize: 12 }}>{new Date(log.date).toLocaleDateString()}</div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>{new Date(log.date).toLocaleTimeString()}</div>
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: 'right', color: '#dc2626', fontWeight: 900 }}>
                          -{log.qtyDeducted} <span style={{ fontSize: 10 }}>{loggingItem.unit}</span>
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: 'right', borderTopRightRadius: 12, borderBottomRightRadius: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 800 }}>{log.stockAfter} {loggingItem.unit}</div>
                          <div style={{ fontSize: 9, opacity: 0.5 }}>From {log.stockBefore}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && deletingItem && (
          <div style={{ position: 'fixed', top: 0, left: 260, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
             <div className="card" style={{ width: 400, padding: 32, textAlign: 'center' }}><h2>Delete?</h2><p>Delete <strong>{deletingItem.itemName}</strong>?</p><button className="btn" style={{ background: '#dc2626', color: 'white' }} onClick={handleDelete}>Delete</button></div>
          </div>
      )}

      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 260, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
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
                  <input 
                    className="input" 
                    list="unit-suggestions"
                    required 
                    value={formData.unit} 
                    onChange={e => setFormData({...formData, unit: e.target.value})} 
                    placeholder="e.g. kg, pieces, liters" 
                  />
                  <datalist id="unit-suggestions">
                    <option value="kg" />
                    <option value="grams" />
                    <option value="liters" />
                    <option value="ml" />
                    <option value="pieces" />
                    <option value="box" />
                    <option value="packet" />
                    <option value="portion" />
                    <option value="dozen" />
                  </datalist>
                </div>
                <div className="field">
                  <label className="label">CURRENT STOCK</label>
                  <input className="input" type="number" step="0.01" required value={formData.currentStock} onChange={e => setFormData({...formData, currentStock: e.target.value})} />
                </div>
                <div className="field">
                  <label className="label">MINIMUM STOCK (ALERT)</label>
                  <input className="input" type="number" step="0.01" required value={formData.minimumStock} onChange={e => setFormData({...formData, minimumStock: e.target.value})} />
                </div>
                <div className="field">
                  <label className="label">MAXIMUM STOCK</label>
                  <input className="input" type="number" step="0.01" required value={formData.maximumStock} onChange={e => setFormData({...formData, maximumStock: e.target.value})} />
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
          <div style={{ position: 'fixed', top: 0, left: 260, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
              <div className="card" style={{ width: '100%', maxWidth: 700, padding: 32, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                   <div style={{ marginBottom: 24, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                          <h2 style={{ margin: 0, fontWeight: 900, color: dark ? '#f1f5f9' : '#0f172a' }}>Recipe Linking: {linkingItem.itemName}</h2>
                          <p style={{ margin: '4px 0 0', fontSize: 13, color: dark ? '#94a3b8' : '#64748b', fontWeight: 500 }}>
                             Manage how much <strong>{linkingItem.itemName}</strong> is deducted per menu item.
                          </p>
                      </div>
                  </div>

                  <div style={{ marginBottom: 16, flexShrink: 0, display: 'flex', gap: 12 }}>
                      <input 
                        type="text" 
                        placeholder="Search menu items..." 
                        className="input" 
                        value={linkSearch} 
                        onChange={(e) => setLinkSearch(e.target.value)}
                        style={{ background: dark ? 'rgba(255,255,255,0.05)' : '#f9fafb', flex: 1, borderColor: dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb', color: dark ? 'white' : 'inherit' }}
                      />
                  </div>

                  <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', paddingRight: 8, marginBottom: 24 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {menuItems.filter(f => f.name.toLowerCase().includes(linkSearch.toLowerCase())).map(food => {
                              const foodIdStr = String(food._id);
                              const link = selectedLinks.find(l => {
                                  const lid = typeof l.foodId === 'object' ? String(l.foodId._id) : String(l.foodId);
                                  return lid === foodIdStr;
                              });
                              const isLinked = !!link;

                              return (
                                  <div key={foodIdStr} style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between', 
                                    padding: '12px 16px', 
                                    background: isLinked ? (dark ? 'rgba(255, 78, 42, 0.1)' : '#f0f9ff') : (dark ? 'rgba(255,255,255,0.03)' : '#f9fafb'), 
                                    border: '1px solid', 
                                    borderColor: isLinked ? '#ff4e2a' : (dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'), 
                                    borderRadius: 12 
                                  }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                                          <input type="checkbox" checked={isLinked} onChange={() => toggleLink(foodIdStr)} style={{ width: 18, height: 18, accentColor: '#ff4e2a' }} />
                                          <div>
                                              <div style={{ fontWeight: 800, fontSize: 14, color: dark ? '#f1f5f9' : '#1e293b' }}>{food.name}</div>
                                              <div style={{ fontSize: 11, color: dark ? '#94a3b8' : '#6b7280' }}>AED {food.price}</div>
                                          </div>
                                      </div>
                                      {isLinked && (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                              <span style={{ fontSize: 11, fontWeight: 700, color: dark ? '#94a3b8' : '#6b7280' }}>Qty / Order:</span>
                                              <input 
                                                type="number" 
                                                step="0.001"
                                                value={link.quantityPerOrder}
                                                onChange={(e) => updateLinkQuantity(foodIdStr, e.target.value)}
                                                style={{ 
                                                  width: 80, 
                                                  padding: '6px 10px', 
                                                  borderRadius: 8, 
                                                  border: '1px solid',
                                                  borderColor: dark ? 'rgba(255,255,255,0.1)' : '#bae6fd', 
                                                  background: dark ? 'rgba(0,0,0,0.2)' : 'white',
                                                  color: dark ? 'white' : 'black',
                                                  fontSize: 13, 
                                                  fontWeight: 800 
                                                }}
                                              />
                                              <span style={{ fontSize: 11, fontWeight: 700 }}>{linkingItem.unit}</span>
                                          </div>
                                      )}
                                  </div>
                              );
                          })}
                          {menuItems.filter(f => f.name.toLowerCase().includes(linkSearch.toLowerCase())).length === 0 && (
                              <div style={{ textAlign: 'center', padding: 20, color: dark ? '#94a3b8' : '#6b7280' }}>No menu items found matching "{linkSearch}"</div>
                          )}
                      </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                      <button className="btn" style={{ flex: 1 }} onClick={saveLinks}>Save All Links</button>
                      <button className="btn btn-outline" style={{ flex: 1, borderColor: dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb' }} onClick={() => { setShowLinkModal(false); setLinkSearch(""); }}>Cancel</button>
                  </div>
              </div>
          </div>
      )}
      <ConfirmationModal 
        isOpen={confirmConfig.open}
        onClose={() => setConfirmConfig({ ...confirmConfig, open: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
      />
    </RestaurantLayout>
  );
}