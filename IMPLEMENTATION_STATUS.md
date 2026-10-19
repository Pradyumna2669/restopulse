# 🍽️ RestoPulse — Implementation Status & Architecture Blueprint
> **Enterprise Petpooja-Grade Restaurant POS, Kitchen Display System (KDS), Customer CRM & OpenWA WhatsApp Automation Engine**

---

## 📌 Executive Overview
**RestoPulse** is an enterprise restaurant management and point-of-sale ecosystem engineered as a modern, high-speed alternative to legacy platforms like Petpooja, Posist, and UrbanPiper. It seamlessly bridges dining floor operations, kitchen production, guest loyalty, stock management, self-hosted WhatsApp communication, and online food delivery aggregators.

---

## 🚀 Part 1: All Currently Implemented Modules & Capabilities

### 1. 🛵 Food Delivery Partner Integration (Zomato, Swiggy, ONDC, Magicpin)
* **Partner Hub in CRM**: Dedicated tab to manage online delivery channels with Store IDs, Webhook URLs, copy-to-clipboard secrets, commission percentages, and auto-accept toggles.
* **1-Click Live Inbound Order Simulator**: Staff can simulate realistic inbound orders with 1 tap (`⚡ Simulate Inbound Order`), allowing testing of the entire aggregator order lifecycle without live webhook dependencies.
* **Live Inbound Webhook Endpoints**: Backend endpoint `POST /api/webhooks/aggregators/:partner` processes live webhook payloads from Zomato, Swiggy, ONDC, and Magicpin.
* **Aggregator Badges & Codes**:
  - 🔴 **Zomato** (`#ZOM-8821`, `OTP 4821`)
  - 🟠 **Swiggy** (`#SWG-4512`, `OTP 9124`)
  - 🔵 **ONDC** (`#ONDC-1094`, `OTP 3418`)
  - 🟣 **Magicpin** (`#MGC-2031`, `OTP 5560`)
* **Kitchen Display System (KDS) Live Sync**: Aggregator orders appear immediately with prominent partner emblems, rider pickup OTPs, and special cooking instructions.
* **Rider Dispatch Board with Partner Filters**: Filter delivery orders by aggregator (`All`, `🔴 Zomato`, `🟠 Swiggy`, `🔵 ONDC`, `🟣 Magicpin`, `🟢 In-House`), inspect aggregator commission deductions vs net restaurant payout, and verify rider OTP before handover.
* **Aggregator Customer Acquisition Logging**: Guests ordering through Zomato or Swiggy are automatically enrolled into CRM and tagged with their acquisition channel.
* **Header Live Indicator**: Real-time pulsing badge in header shows the count of active aggregator orders.

### 2. 📲 Self-Hosted OpenWA WhatsApp Engine
* **Integration Port**: Port 2785 (`U:\auto-wa\OpenWA`) with fallback and auto-reconnection.
* **Formatted Digital Tax Invoices**: Dispatched via WhatsApp with bold typography, itemized lines, GST breakups, payment mode, and order timestamps.
* **Automated Google 5-Star Review Prompt**: Automatically dispatched after bill settlement with direct review URL to boost restaurant ratings.
* **Table Ready Alert Dispatch**: Automated notification to waiting walk-in guests when their table is ready.
* **Reservation Confirmation Dispatch**: Instant booking confirmation message with date, time, pax, and special instructions.
* **Rider Dispatch Ping**: Notifies delivery customers when their order has been handed over to the courier.

### 3. 🔐 Strict Table QR Ordering & Security Architecture
* **Cryptographic Token Protection**: Table QR URLs use hardened tokens (`sec_...` / `tbl_...`) preventing diners from tampering with URLs or switching table numbers manually.
* **Dual-Layer ID System**: Internal transactions operate on secure hashes while the UI displays clean human-friendly identifiers (e.g. `Table T-02`, `AC-01`).
* **Session Lockdown**: Customer portal locks orders to the physically assigned table.
* **QR Rotation Engine**: 1-click token rotation in Table Master invalidates old printed QR codes for security.

### 4. 🍲 Menu Master, Categories & Default Category Grouping
* **Default Category Wise Display**: Menu presents dishes grouped category-by-category with prominent section headers by default; filtering applies only on category pill selection.
* **Rich Dish Management**: CRUD for dish name, description, category, base price, prep time, station routing, food category (Veg, Non-Veg, Egg, Vegan), and image URLs.
* **Dynamic Variations & Add-ons**: Multi-size pricing (Regular, Large) and optional toppings/extras.
* **Category Master with 24+ Preset Emojis**: Quick emoji selection for visual categorization.

### 5. ⚡ High-Speed Staff POS Terminal & Unified Cart
* **Multi-Channel Order Modes**: 1-tap switching between **Dine-In**, **Takeaway**, and **Delivery**.
* **Live Running Cart**: Real-time CGST (2.5%), SGST (2.5%), auto-roundoff, and subtotal calculation.
* **1-Tap Quick Discount Chips**: Rapid discount application (`5%`, `10%`, `15%`, `20%`, `₹50`, `₹100`) with audit reason codes (`Loyalty Reward`, `Manager Comp`, `Happy Hours`, `Promotional Voucher`).
* **Thermal KOT Dispatch**: 1-click fire to Kitchen Display Screen.

### 6. 🍳 Kitchen Display System (KDS) & Station Routing
* **Station Filtering**: Route orders dynamically to specific kitchen lines (`All`, `Curry`, `Tandoor`, `Biryani & Rice`, `Beverages`).
* **Live Elapsed Timers**: Real-time `MM:SS` timer counter on each active order ticket.
* **Delay Warning System**: Visual alert styling and delay warning badge when preparation exceeds 12 minutes.
* **Audio Chimes**: Web Audio API synthesized ding when new tickets arrive.
* **Status Stepper**: Transition items from `KOT Printed` $\rightarrow$ `Preparing` $\rightarrow$ `Ready` $\rightarrow$ `Served`.

### 7. 🗺️ Floor Plan Matrix & Table Shift / Transfer
* **Section Separation**: Filter by floor section (`AC Hall`, `Rooftop Garden`, `Family Dining`).
* **Real-Time Occupancy Indicators**: Color-coded badges for Vacant, Running KOT, and Bill Generated.
* **Table Transfer / Shift Modal**: Move running orders and active guests between tables with automatic occupancy reassignment.
* **Force Vacate**: 1-click table clearance with confirmation safeguards.

### 8. 🛵 Takeaway Sequential Tokens & Rider Dispatch Board
* **Sequential Token Engine**: Automatically issues `#TK-01`, `#TK-02` tokens for counter and takeaway orders.
* **Delivery Rider Assignment**: Assign in-house delivery boys or aggregator fleets (Swiggy Direct, Zomato Direct, Dunzo, Porter).
* **Delivery Destination Address**: Captures street/landmark details with customer phone contact.
* **Rider Status Stepper**: `Unassigned` $\rightarrow$ `Assigned` $\rightarrow$ `Out for Delivery` $\rightarrow$ `Delivered`.

### 9. 📦 Live Inventory Control, Stock Inward & Recipe Costing
* **Raw Materials Stock Master**: Tracks units (`kg`, `g`, `ltr`, `ml`, `pcs`), current stock, and safety reorder levels.
* **Low-Stock Alert Badging**: Header badge flags items nearing depletion.
* **Stock Inward Purchase Logs**: Logs vendor supplies with supplier names, date stamps, and cost prices.
* **Recipe Food Costing**: Links menu items to raw materials; automatically deducts stock upon order placement and calculates gross margin %.

### 10. 💵 Cash Register & Shift Drawer Management
* **Shift Lifecycle**: Open shift with initial cash float and close shift with discrepancy calculation.
* **Petty Cash Disbursals**: Log mid-day store expenses (e.g. ice purchase, cleaning supplies, milk procurement).
* **Live Cash Sales Accumulation**: Automatically tallies only the cash portions of settled bills.
* **Discrepancy Audit**: Calculates `Actual Cash Counted - Expected Cash` for transparency.

### 11. 👥 Customer CRM & Loyalty Points Wallet
* **VIP Member Tiers**:
  * 🥉 **Bronze** (New Diners)
  * 🥈 **Silver** ($\ge$ ₹2,000 spend)
  * 🥇 **Gold** ($\ge$ ₹5,000 spend)
  * 💎 **VIP Platinum** ($\ge$ ₹15,000 spend)
* **Points Ledger**: Automatically awards **1 Point per ₹100 spent**.
* **1-Tap Checkout Redemption**: 1 Point = ₹1.00 instant bill discount.
* **Taste Profiling**: Automatically tracks and stores guests' favorite dishes.
* **Customer Directory**: Search by phone or name, filter by channel & loyalty tier, view lifetime spend, and log dietary notes.

### 12. 📅 Table Reservations & Advance Bookings
* **Date Horizons**: Filter by Today, Tomorrow, or All Dates.
* **Advance Deposit Logging**: Track advance tokens (e.g. ₹500, ₹1,000).
* **Special Occasion Notes**: Birthdays, anniversaries, quiet corner booth requests.
* **1-Click Seating**: Moves guests directly from confirmed reservation to dining table.
* **WhatsApp Booking Confirmation**: Dispatched automatically to guest.

### 13. ⏳ Live Guest Waitlist Queue Board
* **Queue Management**: Party size, preferred section, and estimated wait minutes.
* **Live Wait Timer**: Tracks waiting duration in real time.
* **1-Click "Ping WhatsApp: Table Ready"**: Direct alert ping to customer phone.
* **One-Click Seating**: Assigns table and removes party from queue.

### 14. 💳 Multi-Mode Split Payment Tender
* **Split Modes**: Divide a single invoice across **Cash**, **UPI**, and **Card**.
* **Live Remainder Tally**: Immediate visual indicator ensuring total tendered equals the exact invoice total.
* **Quick-Balance Autofill**: 1-click button to allocate remaining amount to any payment mode.

### 15. 📊 Day-End (EOD) Sales Analytics & GSTR-1 Tax Ledger
* **Daily Performance KPIs**: Net Sales, Order Count, Average Order Value (AOV), Total Discounts.
* **Channel Distribution**: Sales split by Dine-In, Takeaway, and Delivery.
* **Payment Mode Breakdown**: Cash vs UPI vs Card vs Split distribution.
* **Top 5 Best-Selling Dishes**: Ranked by units ordered and revenue contribution.
* **GSTR-1 Tax Summary**: Net Taxable Value, CGST (2.5%), SGST (2.5%), Total Tax.
* **Printable Day-End Z-Report**: Formatted thermal summary for cashier end-of-day sign-off.

### 16. 🛡️ Resilient Offline & Instant-Load Architecture
* **No Infinite Buffering**: Guaranteed instant load using baked-in fallback states if the backend takes time to initialize.
* **Zero TypeScript Compilation Errors**: Strict TypeScript compliance across both backend and frontend.

---

## 🔮 Part 2: What is Left to be Implemented (Future Roadmap)

While RestoPulse covers the complete single-location POS, Kitchen Display, CRM, WhatsApp automation, aggregator integration, and inventory lifecycle, the following enterprise capabilities are planned for future scale:

### 1. Native ESC/POS Thermal Printer Driver (Raw Byte Streaming)
- Direct USB/Ethernet/Bluetooth raw printer communication bypassing the OS browser print dialog.
- Automatic cutter trigger (`GS V 66 0`) and cash drawer kick pulse (`ESC p 0 25 250`).
- Configurable paper widths (58mm vs 80mm).

### 2. Multi-Store / Multi-Chain Franchise Master
- Central headquarters dashboard for managing multiple restaurant branches.
- Centralized recipe masters, store-to-store stock transfers, and consolidated multi-store P&L reports.
- Role-based access control (Store Cashier, Store Manager, Area Executive, Brand Owner).

### 3. Waiter Staff Mobile Companion App (Handheld Captain POS)
- Dedicated lightweight progressive web app (PWA) for floor captains.
- Fast table-side order punching, KOT re-printing, and guest note modification.
- Notification push when KDS marks a dish as "Ready to Serve".

### 4. Barcode Scanner & Digital Weighing Scale Interface
- Web Serial / Web HID API support to read weights directly from digital scales (ideal for bakery, deli, or sweet shop models).
- Barcode scanning for pre-packaged retail items.

### 5. Multi-Lingual KOT & Guest Menu Localization
- Regional language display for KOT slips (e.g. Hindi, Marathi, Gujarati, Tamil, Kannada) so kitchen prep staff can read tickets in their native language.
- Multi-lingual customer digital menu.

---

## 🏗️ Technology Stack

| Component | Technology |
|---|---|
| **Frontend Framework** | React 18, TypeScript, Vite |
| **Styling & UI** | Tailwind CSS, Lucide React Icons |
| **Backend Framework** | Node.js, Express, TypeScript |
| **Persistence** | File-backed JSON Engine (`store.ts`) with atomic write buffers |
| **Aggregator Integration** | Webhooks & Inbound Simulation Engine (Zomato, Swiggy, ONDC, Magicpin) |
| **WhatsApp Gateway** | Self-hosted OpenWA (`http://localhost:2785`) |
| **Build & Tooling** | Concurrently, TypeScript compiler (`tsc`) |

---

*Authored by Antigravity for RestoPulse / @Pradyumna2669*
