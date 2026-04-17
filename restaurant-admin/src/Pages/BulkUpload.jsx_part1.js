import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { useTheme } from "../ThemeContext";

// ─── Load SheetJS from CDN (no npm install required) ─────────────────────────
let _XLSX = null;
const loadXLSX = () =>
  new Promise((res, rej) => {
    if (_XLSX) return res(_XLSX);
    if (window.XLSX) { _XLSX = window.XLSX; return res(_XLSX); }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = () => { _XLSX = window.XLSX; res(_XLSX); };
    s.onerror = () => rej(new Error("Failed to load SheetJS"));
    document.head.appendChild(s);
  });

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMPLATE_COLS = [
  { key: "name",                label: "name",                required: true,  hint: "e.g. Margherita Pizza" },
  { key: "category",            label: "category",            required: true,  hint: "e.g. pizza, burger, pasta" },
  { key: "price",               label: "price",               required: true,  hint: "e.g. 12.99" },
  { key: "description",         label: "description",         required: true,  hint: "Detailed description" },
  { key: "image_filename",      label: "image_filename",      required: false, hint: "e.g. pizza.jpg" },
  { key: "customizations_json", label: "customizations_json", required: false, hint: "JSON array (optional)" },
  { key: "ingredients",         label: "ingredients",         required: false, hint: "e.g. Chicken:2, Oil:0.5" },
];

const CONCURRENCY = 3;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

const parseSpreadsheet = async (file) => {
  const XLSX = await loadXLSX();
  const buf  = await file.arrayBuffer();
  const wb   = XLSX.read(buf, { type: "array" });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
};

const normaliseRow = (r) => {
  // Find key by inclusive matching (to handle cut-off headers like "descriptio")
  const findValue = (keys) => {
    const rowKeys = Object.keys(r);
    for (const k of keys) {
      if (r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== "") return r[k];
      const foundKey = rowKeys.find(rk => {
        const normalizedRK = rk.toLowerCase().replace(/[^a-z]/g, "");
        const normalizedK = k.toLowerCase().replace(/[^a-z]/g, "");
        return normalizedRK.includes(normalizedK) || normalizedK.includes(normalizedRK);
      });
      if (foundKey) return r[foundKey];
    }
    return "";
  };

  return {
    id:                  uid(),
    name:                String(findValue(["name", "itemname", "product"]) || "").trim(),
    category:            String(findValue(["category", "cat", "type"]) || "").trim(),
    price:               String(findValue(["price", "cost", "amt"]) || "").trim(),
    description:         String(findValue(["description", "desc", "about"]) || "").trim(),
    image_filename:      String(findValue(["image_filename", "image", "filename", "img"]) || "").trim(),
    customizations_json: String(findValue(["customizations_json", "customizations", "mizations", "options"]) || "").trim(),
    ingredients:         String(findValue(["ingredients", "ngredients", "recipe", "items"]) || "").trim(),

    inventory_unit:       String(findValue(["inventory_unit", "unit", "uom"]) || "").trim(),
    inventory_currentStock: String(findValue(["inventory_currentStock", "currentStock", "stock", "qty"]) || "").trim(),
    inventory_minimumStock: String(findValue(["inventory_minimumStock", "minimumStock", "minstock"]) || "").trim(),
    inventory_maximumStock: String(findValue(["inventory_maximumStock", "maximumStock", "maxstock"]) || "").trim(),
    inventory_unitCost:   String(findValue(["inventory_unitCost", "unitCost", "cost", "price"]) || "").trim(),
    inventory_supplier:   String(findValue(["inventory_supplier", "supplier", "vendor"]) || "").trim(),

    imageFile:      null,
    imagePreview:   null,
    customizations: [],
    warnings:    [],
    errors:      [],
    valid:       false,
    status:      "idle",
    uploadError: "",
  };
};

const buildImageMap = (imageFiles) => {
  const map = {};
  for (const f of imageFiles) {
    const lower = f.name.toLowerCase();
    map[lower] = f;
    map[lower.replace(/\.[^.]+$/, "")] = f;
  }
  return map;
};
