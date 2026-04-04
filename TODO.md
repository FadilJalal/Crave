# Fix Menu Toggle Not Reflecting in Frontend (Individual Food Toggles)

**User confirmed: (a) toggle individual foods** - Issue is food item toggles in restaurant-admin/Menu.jsx not immediately updating frontend UI.

## Steps from Approved Plan

### 1. [x] Confirm Current Individual Food Toggle Works
✅ Backend /toggle-availability exists
✅ Admin Menu.jsx calls API + ?refresh= hack
✅ Frontend polls food_list 15s (StoreContext), 5s extra (Menu), filter inStock !== false

### 2. [x] Improve Frontend Refresh Reliability
✅ Added useEffect in RestaurantMenu.jsx: detects ?refresh= → fetchFoodList() + refetch restaurant + clean URL
✅ Logs [MENU REFRESH] Admin food toggle detected

### 3. [ ] Test End-to-End
- Edit frontend/src/pages/RestaurantMenu/RestaurantMenu.jsx: Listen to URL refresh param, force re-fetch restaurant + food_list immediately
- Ensure `food_list` filter uses `inStock !== false`

### 3. [ ] Add Real-time Updates (Optional WebSocket/Poll)
- Backend: Add food toggle broadcast? (if time)
- Frontend: Use URLSearchParams to detect refresh param

### 4. [ ] Test End-to-End
- Toggle food ON/OFF in restaurant-admin → Verify frontend hides/shows within 5s
- Check logs for any errors

### 5. [ ] Cleanup Hack (if polling reliable)
- Remove `window.location.href` hack in Menu.jsx

**Current Progress:** Planning complete. Next: Edit frontend RestaurantMenu.jsx to handle refresh param.

**Commands to Test:**
```bash
# Backend (cwd)
node backend/server.js

# Frontend
cd frontend && npm run dev

# Restaurant-admin
cd restaurant-admin && npm run dev
```

