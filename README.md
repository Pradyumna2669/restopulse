# RestoPulse POS 🍽️⚡
> **Enterprise Restaurant Management & Point-of-Sale with Cryptographic Table QR Ordering, Admin Menu Picture Management, Native OpenWA Invoicing & Google 5-Star Reviews.**

---

## 🌟 What's New in this Release

### 1. 🔐 Cryptographic Secure Table QR Codes (Anti-Tampering)
* **No Sequential / Guessable Table URLs**: Customers cannot change `?table=T-01` to `T-02` to tamper with other tables.
* **Unguessable Cryptographic Tokens**: Every table is issued a random, secure token (e.g., `?table=sec_8f93a2b1c4e7`).
* **Table Numbers Displayed Cleanly**: Diners and staff see clean friendly labels (*"Table T-01 (Ground Floor)"*), while internal routing relies strictly on secure tokens.
* **Instant Token Rotation**: If a table QR code was compromised or shared outside the restaurant, the admin can click **Rotate Token** to invalidate the old link and issue a fresh code immediately.

### 2. 📸 Full Menu & Dish Management with Pictures
* **Add / Edit Dishes**: Name, category, price, GST tax slab, food type (Pure Veg / Non-Veg / Egg), kitchen station routing, and descriptions.
* **High-Res Food Photography**: Support for dish picture URLs with real-time thumbnail preview. Pictures display across both POS item cards and customer contactless mobile menus.
* **Real-time Stock Toggle**: Instantly mark dishes as *In Stock* or *Sold Out* across all terminals and customer phones with one click.

### 3. 🛠️ Complete Admin Table Management
* Add new tables, edit floor sections (*Ground Floor, AC Hall, Rooftop Lounge*), and configure seating capacity.
* Print individual or bulk table tent stands with scannable QR graphics.
* 1-click **"Preview as Customer"** to experience any table's exact digital menu.

### 4. 📲 OpenWA WhatsApp Invoicing & 5-Star Reputation Engine
* Automatically generates itemized tax invoices on bill settlement.
* Dispatches digital invoice text/PDF via self-hosted **OpenWA** (`U:\auto-wa\OpenWA`) on `http://localhost:2785`.
* Sends a polite follow-up message asking for a 5-star Google Review directly linked to your Google Business profile.

---

## 🚀 How to Run

### 1. Start Core Backend (Port 5000)
```powershell
cd C:\Users\user\.gemini\antigravity\scratch\restopulse\backend
npm run dev
```

### 2. Start POS Frontend (Port 3000)
```powershell
cd C:\Users\user\.gemini\antigravity\scratch\restopulse\frontend
npm run dev
```

### 3. (Optional) Run your OpenWA Gateway (Port 2785)
```powershell
cd U:\auto-wa\OpenWA
npm run dev
```

---

## 🌐 How to Test Both Experiences

| Experience | URL | Key Features |
| :--- | :--- | :--- |
| **Admin & Staff POS Terminal** | `http://localhost:3000` | Full cashier billing, KOT printing, Menu manager, Tables & QR tokens manager, Feature flags. |
| **Customer QR Order (Table T-01)** | `http://localhost:3000/?table=sec_8f93a2b1c4e7` | Locked to Table T-01. No table switcher. Dish photos, add-ons, UPI/Cash/Card checkout, WhatsApp bill. |
| **Customer QR Order (Table T-02)** | `http://localhost:3000/?table=sec_3d8b19e4a7c2` | Locked to Table T-02. Unguessable token prevents tampering. |
