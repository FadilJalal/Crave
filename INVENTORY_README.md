# Restaurant Inventory Management System

A comprehensive inventory management system for restaurants to track stock levels, manage suppliers, and monitor expiry dates. **Features automatic inventory deduction when orders are placed.**

## 🎯 Key Features

### 📦 **Core Inventory Management**
- **Stock Tracking**: Monitor current stock levels with min/max thresholds
- **Categories**: Organize items by type (Food Ingredients, Beverages, Packaging, Equipment, Other)
- **Units**: Support for kg, g, l, ml, pieces, boxes, bottles, cans, packets
- **Supplier Management**: Store supplier contact information and details
- **Expiry Tracking**: Monitor expiry dates with automatic alerts

### 🚀 **Automatic Inventory Deduction**
- **Real-time Deduction**: Stock automatically reduces when orders are placed
- **Smart Matching**: System matches food names with inventory items
- **Order Integration**: Works with both COD and Stripe payment orders
- **Logging**: Complete audit trail of inventory deductions
- **No Manual Work**: Forget about manual stock updates after orders

### 🚨 **Smart Alerts System**
- **Low Stock Alerts**: Automatic notifications when stock falls below minimum levels
- **Expiry Alerts**: Warnings for items expiring soon (7 days) or already expired
- **Overstock Alerts**: Notifications when stock exceeds maximum recommended levels

### 📊 **Dashboard & Analytics**
- **Real-time Summary**: Total items, low stock count, expiry alerts, total inventory value
- **Status Indicators**: Visual badges for stock status (Normal, Low Stock, Expired, Overstock)
- **Quick Stock Updates**: Inline editing of stock levels
- **Category Breakdown**: Organize and filter inventory by categories

## API Endpoints

### Inventory Management
```
GET    /api/inventory           # Get all inventory items
POST   /api/inventory/add       # Add new inventory item
PUT    /api/inventory/:id       # Update inventory item
DELETE /api/inventory/:id       # Remove inventory item
PATCH  /api/inventory/:id/stock # Quick stock level update
GET    /api/inventory/alerts    # Get inventory alerts
```

### Data Structure
```javascript
{
  restaurantId: ObjectId,
  itemName: String,
  category: String, // "food_ingredient", "beverage", "packaging", "equipment", "other"
  unit: String,     // "kg", "g", "l", "ml", "pieces", "boxes", "bottles", "cans", "packets"
  currentStock: Number,
  minimumStock: Number,
  maximumStock: Number,
  unitCost: Number,
  supplier: {
    name: String,
    contact: String,
    email: String
  },
  expiryDate: Date,
  notes: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## ⚡ How Automatic Deduction Works

### 🔄 Order → Inventory Flow

When a customer places an order, the system **automatically deducts** items from inventory:

1. **Order Placed**: Customer confirms and pays for order (COD or Stripe)
2. **Inventory Deduction**: System matches food names with inventory items
3. **Stock Updated**: All inventory quantities are automatically reduced
4. **Alerts Triggered**: Low stock alerts fire if items fall below minimum
5. **Audit Logged**: Complete history of all deductions

### 📋 Smart Matching Example

```
Customer Orders:
  - Pepperoni Pizza (qty: 2)
  - Garlic Bread (qty: 1)
  - Coke (qty: 2)
        ↓
System Automatically Matches & Deducts:
  ✅ "Pepperoni Pizza" → Deducts from "Pepperoni Slices" inventory
  ✅ "Garlic Bread" → Deducts from "Garlic Bread" inventory
  ✅ "Coke" → Deducts from "Coke 330ml" inventory
        ↓
Inventory Updated Instantly
⚠️ Alerts sent if any item now below minimum stock
```

### 🎯 How Matching Works

- **Case-Insensitive**: "pizza" = "PIZZA" = "Pizza"
- **Partial Matching**: "cheese" matches "Mozzarella Cheese"
- **Quantity Aware**: Deducts exact order quantity
- **Safe**: Prevents negative stock (min = 0)
- **No Order Delay**: If no match found, order still processes

### 💡 Pro Tips for Best Results

**For accurate auto-deduction, name inventory items similar to food names:**
- ❌ "Ingredient 1" → ✅ "Mozzarella Cheese"
- ❌ "Item B" → ✅ "Pepperoni Slices"  
- ❌ "Stuff" → ✅ "Fresh Tomatoes"
- ❌ "Beverage" → ✅ "Coke 330ml"

---

## Usage

### Adding Inventory Items
1. Navigate to **Inventory** in the restaurant admin panel
2. Click **"+ Add Item"** button
3. Fill in item details:
   - Item name and category
   - Unit of measurement
   - Current stock quantity
   - Min/max stock thresholds
   - Unit cost and supplier info
   - Expiry date (if applicable)
   - Additional notes

### Managing Stock Levels
- **Quick Updates**: Click on stock numbers in the table to edit inline
- **Bulk Updates**: Use the edit form for complete item information updates
- **Automatic Alerts**: Monitor the dashboard for low stock and expiry warnings

### Monitoring & Alerts
- **Dashboard Summary**: View total items, alerts, and inventory value at a glance
- **Status Badges**: Visual indicators for item status
- **Alert Details**: Click alerts to see specific items needing attention

## Setup Instructions

### Backend Setup
1. The inventory system is already integrated into your existing backend
2. Models, controllers, and routes are automatically loaded

### Frontend Setup
1. The inventory page is accessible via the sidebar navigation
2. All necessary components and styles are included

### Seeding Sample Data
```bash
cd backend
node seedInventory.js
```

**Note**: Update the `sampleRestaurantId` in `seedInventory.js` with an actual restaurant ID from your database.

## Security & Permissions

- **Restaurant Isolation**: Each restaurant can only access their own inventory
- **Authentication Required**: All endpoints require valid restaurant authentication
- **Data Validation**: Input validation prevents invalid data entry
- **Soft Deletes**: Items are marked inactive rather than permanently deleted

## Future Enhancements

- **Barcode Scanning**: Mobile app integration for inventory scanning
- **Automatic Reordering**: Integration with supplier APIs for auto-restock
- **Cost Analytics**: Detailed cost tracking and margin analysis
- **Recipe Integration**: Link inventory to menu items for automatic stock deduction
- **Waste Tracking**: Monitor and analyze food waste patterns
- **Supplier Performance**: Track delivery times and quality metrics

## Technical Details

### Database Schema
- Uses MongoDB with Mongoose ODM
- Indexed on `restaurantId` and `category` for efficient queries
- Timestamps automatically managed

### Performance Optimizations
- Paginated responses for large inventories
- Efficient database queries with proper indexing
- Real-time stock updates without full page reloads

### Error Handling
- Comprehensive error messages
- Input validation on both client and server
- Graceful handling of network failures

---

**Built for Restaurant Operations Excellence** 🍽️