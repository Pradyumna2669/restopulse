# 🍽️ RestroPlus (RestoPulse) — Implementation Status & Architecture Blueprint
> **Authoritative Single Source of Truth for RestroPlus Restaurant Management SaaS**
> Benchmark: Petpooja | Target: Enterprise-grade hospitality OS for Cafés, Bakeries, QSRs, Casual Dining & Multi-Outlet Chains

---

## 1. Project Overview & Objectives
**RestroPlus** is an enterprise restaurant & café SaaS operating system engineered as a high-speed, modern alternative to legacy platforms (Petpooja, Posist, UrbanPiper). It seamlessly bridges dining floor operations, kitchen production, guest loyalty, stock management, self-hosted WhatsApp communication, online food delivery aggregators (Zomato, Swiggy, ONDC, Magicpin), and multi-concept hospitality workflows.

### Primary Objectives:
1. **Operational Reliability**: Eliminate single-point failures, race conditions, unhandled exceptions, and data corruption in POS, KDS, inventory, and billing workflows.
2. **Strict Verification**: Every feature status is evidence-based (`Verified` requires automated passing tests, clean builds, and end-to-end confirmation).
3. **Enterprise Hospitality Governance**: Granular staff RBAC, manager approval PINs for high-risk operations, and tamper-resistant audit logging.
4. **Resilient Persistence & Offline Tolerance**: Atomic file-backed transactions, client-side cart recovery across page reloads, and offline queueing with reconnect auto-sync.
5. **Native Hardware Readiness**: Raw ESC/POS byte streaming for 58mm and 80mm thermal receipt printers with cutter triggers and cash drawer kick codes.
6. **Financial Integrity & Multi-Channel Reconciliation**: Cryptographic HMAC-SHA256 signature verification for aggregators, event deduplication, statutory 18% GST and 1% TCS calculation, and payment intent lifecycle.
7. **Comprehensive Procurement & Inventory Control**: Supplier master directory, Purchase Order (PO) workflow with 1-click stock inwarding, multi-unit conversions (kg/g, l/ml), manager-guarded wastage logging, and real-time recipe BOM stock deductions.
8. **Service Excellence & Kitchen Production**: Handheld Waiter Companion for table-side ordering and seat tagging, progressive course sequencing (Appetizers -> Mains -> Desserts with Hold & Fire), ticket aging thresholds (>15m warning, >25m overdue alert), live guest assistance calls, and station KPI metrics.
9. **Multi-Concept Hospitality Adaptability**: Dynamic concept preset engine tailored for Cafés, Bakeries, QSRs, Casual Dining, Fine Dining, and Cocktail Bars; customizable customer loyalty engine with 4 tiers and safety redemption caps; public order token TV wall display; and multi-lingual kitchen ticket translations.
10. **Modern Visual Experience**: Warm hospitality palette (dark olive `#161E16`, warm off-white `#FBF9F5`, terracotta `#D85836`), responsive desktop/tablet layouts, and native full-page SaaS views for all major modules.

---

## 2. Technology Stack & System Architecture

### Core Stack
| Layer | Technologies | Current Version |
|---|---|---|
| **Frontend Framework** | React, TypeScript, Vite | React 19.0.0, Vite 6.2.0, TS 5.7.3 |
| **Styling & UI Tokens** | Tailwind CSS, Lucide Icons, Custom Design Tokens | Tailwind 3.4.17, Lucide React 1.16.0 |
| **Backend Framework** | Node.js, Express, TypeScript | Express 4.21.2, Node 22+, TS 5.7.3 |
| **Persistence Engine** | Atomic File-Backed JSON Store (`store.ts` + atomic write tempfile rename) | `restopulse-db.json` with mutex queue |
| **Offline Sync Engine** | Client-side sync queue + Idempotent Ingestion Endpoint | `localStorage` queue with `clientTxId` deduplication |
| **Thermal Printer Driver** | Native ESC/POS Binary Protocol Generator | 58mm/80mm, `ESC @`, `GS V 66 0`, `ESC p 0 25 250` |
| **Aggregator Integration** | Webhook Ingestion + HMAC-SHA256 Verifier + Simulator | Zomato, Swiggy, ONDC, Magicpin |
| **Reconciliation Engine**| Statutory GST (18%) + TCS (1%) + Commission Calculator | In-memory ledger with channel distribution |
| **Procurement & BOM Engine**| Multi-Unit Conversion + PO Inwarding + Wastage Logger | Standardized conversions (`kg`, `g`, `l`, `ml`, `pcs`) |
| **KDS & Service Engine** | Multi-Course Hold/Fire + Waiter Assistance + Station Metrics | Real-time timers, Web Audio Chimes, KPI reports |
| **Concept & Loyalty Engine**| Preset Reconfigurator + Tier Multipliers + TV Token Feed | 6 Concept Presets, 4 Tiers, Public Token Feed |
| **WhatsApp Automation** | OpenWA Gateway (`http://localhost:2785`) | Offline fallback + auto-reconnect |
| **Automated Verification** | TypeScript Compiler (`tsc`), Node/ts-node Test Runner | Strict TypeCheck + 402 Automated Tests (10 Phases) |

### Visual Architecture & Theme Tokens
- **Navigation Sidebar**: Deep Dark Olive / Charcoal (`#161E16`, `#1B241A`)
- **Workspace Canvas**: Warm Off-White (`#FBF9F5`, `#F7F5F0`)
- **Primary Actions**: Terracotta / Warm Orange (`#D85836`, `#C84B29`)
- **Surface Cards**: Crisp White (`#FFFFFF`) with subtle border (`#E8E3D9`) and ambient elevation
- **Status Accents**: Sage Green (`#4D7C55`), Warm Amber (`#D97706`), Rose Red (`#DC2626`)
- **Shared Component Suite**: Standardized `Button`, `Card`, `Badge`, `ToggleSwitch`, `Modal` in `frontend/src/components/ui/`

---

## 3. Existing Implemented Modules & Current Verification Status

Status Vocabulary:
- **Verified**: Relevant acceptance tests have passed with automated evidence.
- **Implemented — Untested**: Code exists in codebase but full test coverage has not yet been executed in the current session.
- **Existing — Needs Verification**: Described in prior blueprint; requires baseline audit confirmation.
- **In Progress**: Work is actively underway.
- **Not Started**: Scheduled in subsequent phases.
- **Blocked**: Progress requires explicit external dependency.
- **Deferred**: Postponed with documented rationale.

| # | Module / Capability | Status | Frontend File | Backend Route / Store | Test Evidence |
|---|---|---|---|---|---|
| 1 | **Staff RBAC & Identity Engine** | Verified | `TopHeader.tsx`, `StaffSwitchModal.tsx` | `GET /api/staff`, `POST /api/auth/*` | 21/21 Unit tests + HTTP end-to-end passing |
| 2 | **Immutable Audit Log Engine** | Verified | `frontend/src/services/api.ts` | `GET /api/audit-logs` | Logs login, voids, discounts & stock adjustments |
| 3 | **Bill Cancellation & Void Guard** | Verified | `backend/src/routes/api.routes.ts` | `POST /api/bills/:id/void` | Reverses cash/loyalty with Manager PIN |
| 4 | **POS Cart Persistence** | Verified | `App.tsx` | `localStorage: restopulse_active_cart` | State restored on browser reload |
| 5 | **Offline Billing & Sync Queue** | Verified | `offlineQueue.service.ts`, `App.tsx` | `POST /api/bills/sync-offline` | Idempotent sync; prevents double billing |
| 6 | **Native ESC/POS Thermal Engine** | Verified | `ThermalReceiptModal.tsx`, `escpos.service.ts` | `POST /api/printer/escpos/*` | 58mm/80mm byte streams, drawer kick, cut verified |
| 7 | **Webhook HMAC Verification** | Verified | `CustomerCrmView.tsx` (Reconciliation) | `POST /api/webhooks/aggregators/:partner` | HMAC-SHA256 with timing-safe comparison |
| 8 | **Webhook Event Idempotency** | Verified | `CustomerCrmView.tsx` | `backend/src/data/store.ts` | Skips duplicate `eventId`s safely |
| 9 | **Partner Order Cancellation** | Verified | `DispatchRidersView.tsx` | `POST /api/webhooks/aggregators/:partner` | Updates status, notes & audit logs |
| 10 | **Payment Gateway Lifecycle** | Verified | `frontend/src/services/api.ts` | `POST /api/payments/*` | Initiate, Confirm, and Manager PIN Refund |
| 11 | **Financial Reconciliation Ledger**| Verified | `CustomerCrmView.tsx` (Recon Tab) | `GET /api/reports/reconciliation` | Gross, 18% GST on Fee, 1% TCS, Net Payout |
| 12 | **Supplier Master Directory** | Verified | `InventoryRecipeView.tsx` (Procurement) | `GET/POST /api/inventory/suppliers` | Full CRUD with GSTIN and credit terms |
| 13 | **Purchase Orders (PO) Workflow** | Verified | `InventoryRecipeView.tsx` (Procurement) | `GET/POST /api/inventory/purchase-orders` | Draft -> Ordered -> 1-Click Receive to Stock |
| 14 | **Wastage & Spoilage Logging** | Verified | `InventoryRecipeView.tsx` (Wastage Tab) | `GET/POST /api/inventory/wastage` | Stock deduction with optional Manager PIN guard |
| 15 | **Multi-Unit Conversion Engine** | Verified | `inventoryCosting.service.ts` | `convertUnits()` utility | Exact weight (kg/g) and volume (l/ml) conversion |
| 16 | **Recipe BOM Auto-Stock Deduction**| Verified | `inventoryCosting.service.ts` | Auto-triggered on `POST /api/bills` | Real-time stock decrement on dish fulfillment |
| 17 | **Course Sequencing & Fire Engine**| Verified | `KitchenDisplayView.tsx`, `WaiterCompanionView.tsx` | `POST /api/orders/:id/courses/:course/fire` | Hold & Fire for appetizers, mains, desserts |
| 18 | **Single Item KDS Fire** | Verified | `KitchenDisplayView.tsx`, `WaiterCompanionView.tsx` | `POST /api/orders/:id/items/:itemId/fire` | Transitions individual item from hold to fired |
| 19 | **KDS Station Performance KPI** | Verified | `KitchenDisplayView.tsx` | `GET /api/reports/kds-performance` | Station avg prep, throughput & delayed count |
| 20 | **Waiter Assistance Call Lifecycle**| Verified | `WaiterCompanionView.tsx`, `KitchenDisplayView.tsx` | `GET/POST /api/waiter-calls/*` | Pending -> Acknowledged -> Resolved with attribution |
| 21 | **Handheld Waiter Companion** | Verified | `frontend/src/views/WaiterCompanionView.tsx` | Full-page navigation tab | Table-side punch, seat allocation, course tagging |
| 22 | **Hospitality Concept Presets** | Verified | `RestaurantSettingsView.tsx` | `GET /api/concepts/preset/:type` | 6 tailored concept configs verified |
| 23 | **Customer Loyalty Tier Engine** | Verified | `CustomerCrmView.tsx` | `loyaltyEngine.service.ts` | 4 tiers with spend progression verified |
| 24 | **Loyalty Points Redemption Guard**| Verified | `frontend/src/services/api.ts` | `POST /api/loyalty/redeem` | Cap enforcement (max 50%) & audit logging |
| 25 | **Public Order Token TV Screen** | Verified | `frontend/src/views/TokenDisplayView.tsx` | `GET /api/public/tokens` | Live preparing vs ready split screen |
| 26 | **Multi-Lingual KOT Generator** | Verified | `multilingualKot.service.ts` | Kitchen translations | Hindi, Marathi, Gujarati script translations |
| 27 | **Executive Overview Dashboard** | Implemented — Untested | `App.tsx` | `GET /api/profile`, `GET /api/menu`, `GET /api/orders` | Manual UI render confirmed |
| 28 | **Menu Management & Pricing** | Implemented — Untested | `App.tsx` (Menu Tab) | `GET /api/menu`, `POST /api/menu/items` | Verified in previous sessions |
| 29 | **Floor Plan Matrix & Tables** | Implemented — Untested | `App.tsx` (Floor Plan Tab) | `GET /api/tables`, `POST /api/tables/transfer` | Cryptographic QR token generator active |
| 30 | **Reports, Tax Ledger & Z-Report**| Verified | `ReportsAnalyticsView.tsx` | `GET /api/reports/*`, `POST /api/printer/escpos/z-report` | 27/27 Unit & integration tests passing |
| 31 | **Restaurant Profile & Settings** | Implemented — Untested | `App.tsx` (Settings Tab) | `GET /api/profile`, `PUT /api/profile` | Multi-concept switch active |
| 32 | **Aggregator Inbound & Simulator** | Verified | `CustomerCrmView.tsx` | `POST /api/webhooks/aggregators/:partner` | Simulator fires Zomato/Swiggy orders |
| 33 | **OpenWA WhatsApp Engine** | Implemented — Untested | Status indicator in header | `backend/src/services/openwa.service.ts` | Graceful fallback when port 2785 offline |
| 34 | **Customer QR Menu & Order** | Implemented — Untested | `frontend/src/views/CustomerMenuView.tsx` | `POST /api/orders` with token validation | Token validation logic active |
| 35 | **Staff POS Terminal & Cart** | Verified | `App.tsx` (POS View) | `POST /api/orders`, `POST /api/bills` | Precision GST, roundoff, and cart persistence verified |
| 36 | **Kitchen Display System (KDS)** | Verified | `frontend/src/components/KitchenDisplayView.tsx` | `GET /api/orders`, `PATCH /api/orders/:id/status` | Ticket aging (>15m amber, >25m red), chimes, course fire |
| 37 | **Dispatch & Riders (Full Page)** | Verified | `frontend/src/views/DispatchRidersView.tsx` | `backend/src/data/store.ts` | Converted from modal to full page, verified |
| 38 | **Inventory & Recipe (Full Page)** | Verified | `frontend/src/views/InventoryRecipeView.tsx` | `GET/POST /api/inventory/*` | Converted from modal to full page, verified |
| 39 | **Cash Register Shift (Full Page)**| Verified | `frontend/src/views/CashRegisterView.tsx` | `GET/POST /api/cash-register/*` | Converted from modal to full page, verified |
| 40 | **Customer CRM & Hub (Full Page)** | Verified | `frontend/src/views/CustomerCrmView.tsx` | `GET/POST /api/customers/*` | Converted from modal to full page, verified |
| 41 | **Reservations & Waitlist (Full)**| Verified | `frontend/src/views/ReservationsWaitlistView.tsx`| `GET/POST /api/reservations/*` | Converted from modal to full page, verified |
| 42 | **Split Payment Tender** | Implemented — Untested | `App.tsx` (Payment Modal) | `POST /api/bills` (`splitPayments`) | Supports cash/card/upi breakdown |

---

## 4. Known Technical Debt & Production Risks

1. **Multi-Store Database Scaling**: The atomic file-backed store (`restopulse-db.json`) provides serialized atomic writes and tempfile rename safety for single-store setups. Multi-store enterprise expansion requires a migration adapter to PostgreSQL with tenant schemas.
2. **Production Gateway Webhook Credentials**: Payment gateway (Razorpay/PineLabs) live secrets and live Aggregator merchant keys require dynamic injection from environment variables or vault storage before production launch.
3. **OpenWA External Process Dependency**: WhatsApp dispatch relies on a local NodeJS OpenWA server. If the external process terminates, messages are safely queued locally with offline fallback.

---

## 5. Phase-Wise Implementation Roadmap

### PHASE 0 — Codebase Audit & Canonical Markdown Governance (`Verified`)
- [x] Comprehensive inspection of existing frontend components, backend routes, and JSON store.
- [x] Verification of full-page views (`InventoryRecipeView`, `CustomerCrmView`, `DispatchRidersView`, `ReservationsWaitlistView`, `CashRegisterView`).
- [x] Establish canonical 11-section `IMPLEMENTATION_STATUS.md` in repository root and brain artifact directory.
- [x] Baseline build and typecheck confirmation (`tsc` passing on frontend and backend).

### PHASE 1 — Security, Staff Permissions, Audit Logs & Data Integrity (`Verified`)
- [x] Define Staff Data Model & Roles (`owner`, `manager`, `cashier`, `waiter`, `kitchen`, `inventory`) in backend and frontend types.
- [x] Define Immutable Audit Log Data Model (`AuditLog`) capturing actor, action, timestamp, entity, before/after details, and manager approval.
- [x] Add Seed Staff Accounts with secure PIN verification (Owner: 1111, Manager: 2222, Cashier: 3333, Waiter: 4444, Kitchen: 5555, Store: 6666).
- [x] Implement Auth & Permission Endpoints (`GET /api/staff`, `POST /api/auth/login`, `POST /api/auth/verify-pin`).
- [x] Implement Manager Approval requirement for high-risk operations: `POST /api/bills/:id/void` enforces Manager PIN authorization.
- [x] Audit high discounts (> ₹200) into immutable `auditLogs` with actor attribution.
- [x] Implement Atomic File-Backed Write Queue with tempfile rename to eliminate JSON corruption risks during concurrent updates.
- [x] Implement Staff Switcher & Active Role UI in frontend header (`TopHeader.tsx`) with quick PIN keypad modal (`StaffSwitchModal.tsx`).
- [x] Create Automated Test Suite (`backend/src/tests/phase1-security.test.ts`) and verify passing results (21/21 passed).

### PHASE 2 — Reliable POS, Offline Operation & Printing (`Verified`)
- [x] Cart persistence in `localStorage` (`restopulse_active_cart`) restoring cart state, selected table, and discounts across browser reloads.
- [x] Genuine offline order & bill queueing via `OfflineQueueService` with auto-sync on reconnect and manual sync controls.
- [x] Idempotent backend offline synchronization endpoints (`POST /api/orders/sync-offline`, `POST /api/bills/sync-offline`) preventing duplicate billing and double stock deductions.
- [x] Raw ESC/POS thermal printing binary engine supporting 58mm and 80mm paper widths, `ESC @` initialization, bold, centering, cash drawer kick pulse (`ESC p 0 25 250`), and auto-cutter trigger (`GS V 66 0`).
- [x] Client-side `.bin` raw ESC/POS file download and endpoint streaming (`POST /api/printer/escpos/bill`, `POST /api/printer/escpos/kot`).
- [x] Automated test suite (`backend/src/tests/phase2-pos-offline-printer.test.ts`) verifying precision GST, roundoff, idempotency, and ESC/POS command sequences (17/17 passed).

### PHASE 3 — Payments, Delivery Aggregators & Financial Reconciliation (`Verified`)
- [x] Webhook signature verification (HMAC-SHA256) with timing-safe comparison for Zomato, Swiggy, ONDC, and Magicpin.
- [x] Idempotency key tracking in `store.ts` (`isWebhookEventProcessed`) to prevent duplicate order ingestion from aggregator retries.
- [x] Inbound webhook cancellation workflow (`ORDER_CANCELLED`) with automatic order status update, notes annotation, and manager audit logging.
- [x] Payment gateway transaction lifecycle (`initiate`, `confirm`, `refund`) with idempotency key guard and Manager PIN authorization on refunds.
- [x] Aggregator payout reconciliation ledger engine calculating gross sales, platform commissions, 18% GST on aggregator commission, 1% TCS under CGST Section 52, and net receivable payout.
- [x] Full-page financial reconciliation UI tab in `CustomerCrmView.tsx` with KPI ribbon, channel sales distribution, settlement breakdown table, and live HMAC webhook security audit log.
- [x] Automated test suite (`backend/src/tests/phase3-payments-aggregators.test.ts`) verifying HMAC verification, deduplication, cancellation, payment lifecycle, and reconciliation calculation (24/24 passed).

### PHASE 4 — Inventory, Procurement & Advanced Recipe Costing (`Verified`)
- [x] Supplier master directory data model (`Supplier` with contact, email, GSTIN, payment terms) and API endpoints.
- [x] Purchase Order (PO) workflow (`draft` -> `ordered` -> `received` -> `cancelled`) with 1-click automatic stock inwarding on delivery acceptance.
- [x] Wastage & spoilage logging (`WastageLog` with ingredient, quantity, reason, cost impact, and optional Manager PIN sign-off).
- [x] Unit conversion engine (`convertUnits` supporting `kg` <-> `grams`, `litres` <-> `ml`, and `pcs`) for recipe calculations and inventory adjustments.
- [x] Real-time recipe BOM auto-stock deduction when bills/orders are fulfilled.
- [x] Enhanced full-page `InventoryRecipeView.tsx` with dedicated Procurement & Suppliers tab, Purchase Orders ledger, and Wastage & Spoilage audit tab.
- [x] Automated test suite (`backend/src/tests/phase4-inventory-procurement.test.ts`) verifying unit conversions, theoretical recipe costing, supplier CRUD, PO receiving, wastage logging, and BOM stock deductions (24/24 passed).

### PHASE 5 — Service Operations, Waiter Companion & Advanced KDS (`Verified`)
- [x] Handheld Waiter Companion view (`WaiterCompanionView.tsx`): Table-side punch, seat allocation (`Seat 1-4`, `Shared`), course hold/fire, and active order tracking.
- [x] Advanced KDS course sequencing: Course hold/fire pills for `appetizer`, `main`, `dessert`, and `beverage` with individual item fire support.
- [x] Kitchen performance metrics: Station throughput calculation, overall average prep time tracking, and late ticket metrics (`GET /api/reports/kds-performance`).
- [x] High-visibility ticket aging indicators: amber alert warning (>15m) and pulsing red overdue alert (>25m).
- [x] Guest assistance request lifecycle: Table-side service call creation, live alerts on KDS & Waiter Companion, and 1-click waiter resolution.
- [x] Web Audio API synthesized kitchen chimes for new incoming tickets.
- [x] Automated test suite (`backend/src/tests/phase5-service-kds.test.ts`) verifying course hold/fire, item fire, KDS metrics, and waiter call lifecycles (19/19 passed).

### PHASE 6 — Customer Experience, CRM & Multi-Concept Configuration (`Verified`)
- [x] Business profile configuration presets engine covering 6 concepts (`cafe`, `bakery`, `qsr`, `fast_food`, `casual_dining`, `fine_dining`, `bar`).
- [x] Enhanced Customer Loyalty Engine: 4 tiers (`Bronze`, `Silver`, `Gold`, `VIP Platinum`) with progression thresholds and earn multipliers (1% to 5%).
- [x] Loyalty Points Redemption Safety Guard: Minimum threshold validation (25 pts), maximum bill cap guard (50%), and audit trail recording.
- [x] Public Order Token TV Wall Screen (`TokenDisplayView.tsx`): Live preparing vs ready split screen with real-time clock and audio chime toggle.
- [x] Multi-Lingual KOT Generation: Hindi, Marathi, and Gujarati translations for popular restaurant dishes and kitchen cooking instructions.
- [x] Automated test suite (`backend/src/tests/phase6-crm-concepts.test.ts`) verifying concepts, loyalty progression, redemption, token feeds, and multi-lingual KOT (26/26 passed).

---

### PHASE 7 — Reporting, Tax & Business Intelligence (`Verified`)
Comprehensive revenue intelligence, sales velocity analytics, server attribution, statutory tax compliance, and daily cash closing reconciliation.

- [x] **Part 7.1: Category-Wise & Hourly Sales Heatmap Analytics**
  - [x] Implement `GET /api/reports/sales-hourly`: 24-hour order distribution curve tracking order count, gross sales, average ticket size, and intensity levels.
  - [x] Implement `GET /api/reports/category-performance`: Category contribution breakdown (volume percentage, gross revenue, food cost margin).
  - [x] Add visual interactive hourly heatmap and category contribution bars in `ReportsAnalyticsView.tsx`.
- [x] **Part 7.2: Staff Sales Contribution & Discount Attribution**
  - [x] Implement `GET /api/reports/staff-sales`: Per-server sales volume, table turns, and payment tender collections.
  - [x] Implement `GET /api/reports/discount-audit`: Comprehensive audit ledger of discounts given, high discount manager sign-offs (> ₹200), and top discount reasons.
  - [x] Render staff performance leaderboard and discount audit log in `ReportsAnalyticsView.tsx`.
- [x] **Part 7.3: Statutory GSTR-1 Tax Ledger & HSN/SAC Breakdown**
  - [x] Implement `GET /api/reports/gstr-1`: Statutory GST compliance ledger breaking down CGST (2.5%), SGST (2.5%), IGST (5%), and taxable turnover.
  - [x] Classify turnover under SAC 996331 (Restaurant dining services) vs SAC 996332 (Takeaway / delivery food sales).
  - [x] Provide 1-click exportable GSTR-1 JSON and CSV formats for Indian GST portal filing (`GET /api/reports/gstr-1/export`).
- [x] **Part 7.4: End-of-Day (EOD) Z-Report & Cash Closing Audit**
  - [x] Implement `GET /api/reports/eod-z-report`: Daily closing summary consolidating opening cash float, total cash collected, UPI/card sales, petty expenses, voided bills, and net cash drawer discrepancy.
  - [x] Generate binary ESC/POS 80mm Z-Report receipt slip (`POST /api/printer/escpos/z-report`) for hardware thermal printing.
  - [x] Automated verification suite: Create `backend/src/tests/phase7-reporting-tax.test.ts` and verify (27/27 passed).

---

### PHASE 8 — Multi-Outlet & Franchise Master Architecture (`Verified`)
Enterprise multi-store governance, centralized catalog management, inter-outlet stock movement, and brand royalty analytics.

- [x] **Part 8.1: Central Organization & Multi-Tenant Outlet Isolation**
  - [x] Data models for `Organization`, `Brand`, and `Outlet` with unique store codes (e.g. `TDG-DEL-01`, `TDG-BLR-01`, `TDG-MUM-01`, `TDG-GUR-01`).
  - [x] Tenant context middleware extracting `x-outlet-id` and isolating orders, inventory, and staff per outlet (fallback to flagship `outlet_delhi_01`).
- [x] **Part 8.2: Central Menu Master with Outlet Overrides**
  - [x] Central catalog synchronization: Outlets inherit global menu items with capability to override base price and active stock status (`inStockOverride`).
  - [x] Regional tax slab overrides (e.g. state-specific GST or special cess).
- [x] **Part 8.3: Inter-Store Stock Transfers (IST) & In-Transit Tracking**
  - [x] Stock transfer workflow: `draft` -> `requested` -> `approved` -> `dispatched` -> `received` -> `reconciled` / `cancelled`.
  - [x] Automated source store physical deduction on dispatch and destination store stock inwarding on delivery acceptance.
- [x] **Part 8.4: Consolidated Headquarters & Royalty Dashboard**
  - [x] Enterprise analytics: Top performing outlets, comparative gross margins, and automated franchise brand royalty (5%-6%) and marketing levy (2%) fee calculations.
  - [x] Multi-store live raw material stock matrix across network.
  - [x] Automated verification suite: Created `backend/src/tests/phase8-multi-outlet.test.ts` and verified (78/78 passed; 236/236 total suite passing).

---

### PHASE 9 — Hardware Peripherals & Barcode/Scale Integrations (`Verified`)
Native retail and deli peripheral integration supporting rapid counter checkout and weighing accuracy.

- [x] **Part 9.1: Web Serial API for Digital Weighing Scales**
  - [x] Web Serial API connection manager for RS232 / USB digital weighing scales (CAS, Essae, Toledo, Generic continuous ASCII).
  - [x] Weight stabilization detection, zero/tare latching, and live tare/gross gram-to-price computation for bakeries and deli counters.
- [x] **Part 9.2: USB Barcode / QR Scanner Global Listener & Catalog Resolver**
  - [x] Global keystroke buffer capturing rapid HID scanner input (< 60ms gap) without requiring manual input field focus.
  - [x] Standard EAN-13/Code-128 barcode/SKU resolution and in-store GS1 retail weight-embedded barcode decoding (`20` prefix with gram weight extraction).
  - [x] Synthesized audio cash-register checkout beep using Web Audio API `AudioContext` with zero external media files.
- [x] **Part 9.3: Customer-Facing Pole Display (VFD)**
  - [x] 2-line serial VFD pole display protocol (`ESC / POS` commands: `ESC @`, clear `0x0C`, cursor positioning `ESC Q A/B`) showing current item, price, running total, and thank you message.
  - [x] Interactive VFD hardware preview with retro-green glowing matrix font and raw ESC/POS hex byte stream inspector.
  - [x] Automated verification suite: Created `backend/src/tests/phase9-hardware-peripherals.test.ts` and verified (92/92 passed; 328/328 total suite passing).

---

### PHASE 10 — System-Wide Verification & Production Hardening (`Verified`)
End-to-end stress testing across all hospitality business models, security hardening, automated hot backups, and zero-downtime operations.

- [x] **Part 10.1: Full End-to-End Multi-Concept Verification Matrix**
  - [x] Automated end-to-end test matrix verifying live operations across 6 concepts: Specialty Café, Artisan Deli & Bakery, QSR / Fast Food, Cloud Kitchen / Delivery Hub, Casual Dining, and Fine Dining.
  - [x] Concept presets, token display queues, weight-based calculations, aggregator order simulations, course sequencing (Hold & Fire), reservations, waiter calls, and GSTR-1 ledgers verified.
- [x] **Part 10.2: Security Pentest, Rate-Limiting & Helmet Hardening**
  - [x] Sliding-window rate limiting on public webhook and token endpoints (`general: 120/m`, `publicTokens: 3/m`, `webhooks: 100/m`, `payments: 30/m`, `auth: 10/m`) with HTTP 429 response handling and `Retry-After` headers.
  - [x] Strict Helmet HTTP security headers (CSP, HSTS 1 year, X-Frame-Options SAMEORIGIN, X-Content-Type nosniff, Referrer-Policy, and stripping `X-Powered-By`).
- [x] **Part 10.3: Automated Hot Backup & Disaster Recovery**
  - [x] Scheduled database snapshot rotation with gzip compression (`.json.gz`), SHA-256 integrity hash verification, and retention policy pruning (keeps latest 20 snapshots).
  - [x] 1-command atomic disaster recovery restore CLI (`npm run db:restore [backup_id]`) and Web GUI Hot Backup & Restore hub with SHA-256 pre-verification.
- [x] **Part 10.4: Zero-Downtime Deployment & Health Checks**
  - [x] Deep `/health` and `/api/system/health` endpoints checking DB writability canary test, V8 heap usage, memory RSS, outlet count, and peripheral telemetry.
  - [x] Production runbook documentation ([`PRODUCTION_RUNBOOK.md`](file:///d:/New%20folder/restopulse/PRODUCTION_RUNBOOK.md)) detailing architecture, concept matrix, security hardening, and disaster recovery SOPs.
  - [x] Automated verification suite: Created `backend/src/tests/phase10-production-hardening.test.ts` and verified (74/74 passed; **402/402 total suite passing across all 10 phases**).

---

## 6. API, Database & Integration Changes

### New Types & Entities Added (Phases 1 through 7)
- `HourlySalesEntry` & `HourlySalesDistribution`: 24-hour revenue, order counts, average ticket, and intensity heat classification.
- `CategoryPerformanceEntry` & `CategoryPerformanceReport`: Category volume, gross revenue, percentage contribution, and theoretical food cost margins.
- `StaffSalesEntry` & `StaffSalesReport`: Server and cashier sales attribution, table turns, AOV, and tender collections.
- `DiscountAuditRecord` & `DiscountAuditReport`: Immutable ledger of discounts given, high discount categorization (> ₹200), and manager approval sign-offs.
- `Gstr1SacEntry`, `Gstr1B2cEntry` & `Gstr1TaxLedger`: Indian GST return data structures with SAC 996331 vs SAC 996332 classification, CGST, SGST, IGST, and taxable turnover.
- `EodZReportData`: End-of-Day financial closing summary consolidating opening float, cash sales, petty expenses, expected cash in drawer, actual cash counted, and discrepancy.
- `ConceptConfig`: Presets for hospitality concepts (`type`, `displayName`, `tableTerminology`, `defaultOrderType`, `enableCourseSequencing`, `enableTokenDisplay`, `enableWeighingScale`, `recommendedStations`, `primaryAccentColor`).
- `LoyaltySettings` & `LoyaltyTierConfig`: Customer loyalty program configuration with 4 tiers, points earn multipliers, minimum redeem threshold, and max percentage redemption cap.
- `PublicOrderToken`: Token data feed for TV counter displays (`orderId`, `orderNumber`, `takeawayToken`, `status`, `elapsedMinutes`, `readyAt`).
- `CourseType`: `'appetizer' | 'main' | 'dessert' | 'beverage'`
- `CourseStatus`: `'hold' | 'fired' | 'preparing' | 'ready'`
- `OrderItem.seatNumber` & `OrderItem.course`: Seat attribution and course sequencing tags.
- `WaiterCallRequest`: Table assistance calls (`type: 'service' | 'bill' | 'water' | 'clean' | 'custom'`, `status: 'pending' | 'acknowledged' | 'resolved'`).
- `KdsPerformanceReport`: Station-wise breakdown of average prep times, active tickets, and delayed orders.
- `Supplier`: Master supplier record with contact, email, GSTIN, payment credit terms (`immediate`, `net_7`, `net_15`, `net_30`), and rating.
- `PurchaseOrder` & `PurchaseOrderItem`: Formalized procurement purchase orders with status (`draft`, `ordered`, `received`, `cancelled`), line items, subtotal, 5% tax, and total amount.
- `WastageLog`: Itemized ingredient spoilage/shrinkage entries with reason code, financial cost impact, and manager approval attribution.
- `RecipeVarianceReport`: Analytical comparison of stock on hand, historical usage, and recorded shrinkage.
- `PaymentTransaction`: Represents gateway payment intent with status (`pending`, `success`, `failed`, `refunded`), `idempotencyKey`, provider, and `refundDetails`.
- `WebhookDeliveryLog`: Inbound aggregator event tracking with `signatureValid`, `eventId`, partner, and processing status.
- `PartnerReconciliationEntry`: Aggregator financial breakdown (`grossSales`, `commissionAmount`, `gstOnCommission`, `tcsAmount`, `netPayout`).
- `EscPosOptions`: Configuration options (`paperWidth: '58mm' | '80mm'`, `cutPaper: boolean`, `kickDrawer: boolean`).
- `clientTxId`: Idempotent client transaction UUID attached to offline orders and bills.

### New API Endpoints (Phases 1 through 7)
- `GET /api/reports/sales-hourly`: 24-hour distribution curve tracking hourly order volume, gross sales, AOV, and heat intensity levels.
- `GET /api/reports/category-performance`: Category revenue contribution, item volume, and theoretical food cost margins.
- `GET /api/reports/staff-sales`: Per-server sales volume, table turns, AOV, and payment tender collections.
- `GET /api/reports/discount-audit`: Audit ledger of all discounts given, high discounts (> ₹200), and manager approval attribution.
- `GET /api/reports/gstr-1`: Statutory Indian GST compliance ledger classifying SAC 996331 vs SAC 996332 with CGST, SGST, and IGST breakdown.
- `GET /api/reports/gstr-1/export`: 1-click JSON and CSV formats matching official Indian GST portal filing schemas.
- `GET /api/reports/eod-z-report`: Daily closing summary consolidating opening float, cash sales, petty expenses, expected cash, and discrepancy.
- `POST /api/printer/escpos/z-report`: Generates raw 80mm ESC/POS binary byte stream for hardware thermal printing of Day-End Z-Report.
- `GET /api/loyalty/settings`: Returns loyalty program settings and tier rules.
- `PUT /api/loyalty/settings`: Updates loyalty settings and redemption caps.
- `POST /api/loyalty/redeem`: Executes points redemption with balance & maximum cap validation.
- `GET /api/concepts/preset/:type`: Returns concept preset configuration for requested business type.
- `GET /api/public/tokens`: Returns public pickup tokens feed (`preparing` vs `ready`) for counter TV screens.
- `POST /api/orders/:orderId/courses/:course/fire`: Fires all items in the specified course to the kitchen with audit logging.
- `POST /api/orders/:orderId/items/:itemId/fire`: Fires a single on-hold item to its designated kitchen station.
- `GET /api/reports/kds-performance`: Computes overall and per-station average prep times and delayed ticket counts.
- `GET /api/waiter-calls`: Returns active or historical table assistance calls.
- `POST /api/waiter-calls`: Creates a table-side guest assistance call.
- `POST /api/waiter-calls/:id/resolve`: Resolves a waiter call with staff attribution.
- `GET /api/inventory/suppliers`: Returns approved supplier directory.
- `POST /api/inventory/suppliers`: Registers a new supplier in the master directory.
- `PUT /api/inventory/suppliers/:id`: Updates supplier contact details or credit terms.
- `DELETE /api/inventory/suppliers/:id`: Removes a supplier from the directory.
- `GET /api/inventory/purchase-orders`: Returns historical and open purchase orders.
- `POST /api/inventory/purchase-orders`: Creates and raises a new Purchase Order.
- `POST /api/inventory/purchase-orders/:id/receive`: 1-click delivery acceptance that automatically inwards line items into inventory stock.
- `POST /api/inventory/purchase-orders/:id/cancel`: Cancels an active purchase order.
- `GET /api/inventory/wastage`: Returns recorded stock wastage logs.
- `POST /api/inventory/wastage`: Records spoilage/damage with stock deduction and optional Manager PIN authorization.
- `GET /api/inventory/recipe-variance`: Returns theoretical vs actual stock variance report.
- `POST /api/webhooks/aggregators/:partner`: Secure inbound webhook receiver with HMAC-SHA256 signature verification and event deduplication.
- `POST /api/payments/initiate`: Creates payment transaction intent with idempotency guard.
- `POST /api/payments/:id/confirm`: Confirms successful gateway settlement and reconciles associated unpaid bill.
- `POST /api/payments/:id/refund`: Refunds payment transaction with mandatory Manager PIN authorization and audit logging.
- `GET /api/reports/reconciliation`: Computes real-time aggregator commission, GST, TCS, and net payout distribution.
- `POST /api/orders/sync-offline`: Idempotently synchronizes offline-queued orders.
- `POST /api/bills/sync-offline`: Idempotently synchronizes offline-queued bills.
- `POST /api/printer/escpos/bill`: Generates raw ESC/POS binary buffer for a customer tax invoice.
- `POST /api/printer/escpos/kot`: Generates raw ESC/POS binary buffer for a Kitchen Order Ticket.

---

## 7. Testing & Verification Results

### Baseline & Automated Test Suite Results (Verified: 2026-10-21)
| Test Suite | Total Tests | Passed | Failed | Status |
|---|---|---|---|---|
| **Phase 1: Security & RBAC Test Harness** (`phase1-security.test.ts`) | 21 | 21 | 0 | **Verified** |
| **Phase 2: POS, Offline & ESC/POS Test Harness** (`phase2-pos-offline-printer.test.ts`) | 17 | 17 | 0 | **Verified** |
| **Phase 3: Payments, Aggregators & Reconciliation** (`phase3-payments-aggregators.test.ts`) | 24 | 24 | 0 | **Verified** |
| **Phase 4: Inventory, Procurement & Recipe Costing** (`phase4-inventory-procurement.test.ts`) | 24 | 24 | 0 | **Verified** |
| **Phase 5: Advanced KDS, Course Sequencing & Waiter** (`phase5-service-kds.test.ts`) | 19 | 19 | 0 | **Verified** |
| **Phase 6: Customer Loyalty, Concepts & Token TV** (`phase6-crm-concepts.test.ts`) | 26 | 26 | 0 | **Verified** |
| **Phase 7: Reporting, Tax & Business Intelligence** (`phase7-reporting-tax.test.ts`) | 27 | 27 | 0 | **Verified** |
| **Combined Backend Test Suite** (`npm test`) | 158 | 158 | 0 | **Verified** |

### Detailed Phase 7 Acceptance Verification
| Test Case | Expected Result | Actual Result | Status |
|---|---|---|---|
| 1. 24-Hour Velocity Heatmap | Returns 24 distinct hours with order count, sales, and intensity labels | 24 hours verified; intensity categorized accurately | **Verified** |
| 2. Peak Hour & Busiest Window | Identifies peak revenue hour and contiguous 3-hour operational rush | Peak hour & busiest window computed | **Verified** |
| 3. Category Sales & Food Cost | Computes volume, revenue %, theoretical food cost, and margins | All categories & items calculated | **Verified** |
| 4. Staff Contribution & Leaderboard | Per-server sales, table turns, AOV, and payment tender collection breakdown | Staff stats & leaderboard verified | **Verified** |
| 5. High Discount Attribution | Discounts > ₹200 flagged; captures Manager PIN authorization | High discounts & manager sign-off verified | **Verified** |
| 6. GSTR-1 SAC 996331 Dining | Dine-In revenue classified under SAC 996331 (CGST 2.5%, SGST 2.5%) | SAC 996331 tax ledger verified | **Verified** |
| 7. GSTR-1 SAC 996332 Takeaway | Takeaway/delivery classified under SAC 996332 | SAC 996332 tax ledger verified | **Verified** |
| 8. GSTR-1 Portal Exports | 1-click JSON matches portal schema; CSV matches offline utility | JSON and CSV exports verified | **Verified** |
| 9. EOD Z-Report Reconciliation | Cash drawer opening float, cash sales, petty expenses, and discrepancy | Cash audit balanced & tallied | **Verified** |
| 10. Hardware 80mm ESC/POS Z-Report | Binary buffer with `ESC @`, double border, financial breakdown, and cut | Valid byte stream & cut sequence verified | **Verified** |
| 11. Full Frontend & Backend Builds | `npm run build` succeeds on both without errors | Backend tsc: 0 errors; Frontend Vite: built in 5.25s | **Verified** |

---

## 8. External Dependencies & Blockers

| Dependency | Purpose | Status | Workaround / Mitigation |
|---|---|---|---|
| OpenWA WhatsApp Server | Customer invoice & review prompt dispatch | Optional / Local | Graceful offline fallback implemented; app functions 100% when offline |
| Real Aggregator APIs (Zomato/Swiggy) | Production online delivery ingestion | Blocked on Partner Credentials | Built-in Inbound Webhook Simulator engine provides full lifecycle testing |
| Physical ESC/POS Printer Hardware | Direct raw thermal printing | Blocked on physical device | Browser print dialog + ESC/POS raw byte formatting emulator |
| Payment Gateway (Razorpay/PineLabs)| Card machine / online payments | Blocked on merchant credentials | Payment lifecycle engine + split payment tender simulation active |

---

## 9. Change Log

- **2026-10-20 (Phase 0 Complete)**: Audited entire repository, verified full-page view migrations (`InventoryRecipeView`, `CustomerCrmView`, `DispatchRidersView`, `ReservationsWaitlistView`, `CashRegisterView`), and established canonical 11-section `IMPLEMENTATION_STATUS.md`.
- **2026-10-20 (Phase 1 Complete)**: Implemented Staff RBAC, seed staff accounts, Manager PIN approval workflow, immutable `auditLogs` collection, atomic write queue in `store.ts`, frontend Staff Switcher header component, and verified all criteria via automated test script (21/21 passed) and live HTTP endpoints.
- **2026-10-20 (Phase 2 Complete)**: Implemented POS cart persistence in `localStorage`, client-side offline sync queue (`OfflineQueueService`), idempotent backend offline sync endpoints (`/api/orders/sync-offline`, `/api/bills/sync-offline`), native raw ESC/POS binary generator (`EscPosService` & `EscPosClientService`) supporting 58mm/80mm, cash drawer kick, paper cut, and KOT generation, verified with 17 automated tests and clean Vite build.
- **2026-10-20 (Phase 3 Complete)**: Implemented HMAC-SHA256 signature verification with timing-safe comparison, webhook event deduplication (`store.isWebhookEventProcessed`), partner order cancellation handling, payment transaction lifecycle (`PaymentTransaction`, initiate, confirm, manager-authorized refund), financial reconciliation engine with 18% GST and 1% TCS calculation, and full-page reconciliation tab in `CustomerCrmView.tsx`. Verified with 24 automated tests (62 total tests passing) and clean builds.
- **2026-10-20 (Phase 4 Complete)**: Implemented Supplier Master Directory, Purchase Order workflow with 1-click stock inwarding, multi-unit conversions (kg/g, l/ml, pcs), theoretical recipe costing, wastage & spoilage logging with Manager PIN authorization, real-time recipe BOM stock deduction on bill creation, and full-page tabs for Procurement and Wastage in `InventoryRecipeView.tsx`. Verified with 24 automated tests (86 total tests passing) and clean builds.
- **2026-10-21 (Phase 5 Complete)**: Implemented advanced KDS course sequencing (`CourseType`, `CourseStatus`, Hold & Fire), KDS station performance reporting (`/api/reports/kds-performance`), waiter assistance call lifecycle (`/api/waiter-calls`), ticket aging indicators (>15m amber, >25m red), and handheld Waiter Companion view (`WaiterCompanionView.tsx`) with table-side ordering, seat allocation, and 1-tap course firing. Verified with 19 automated tests (105 total tests passing) and clean production builds.
- **2026-10-21 (Phase 6 Complete)**: Implemented hospitality concept preset configuration engine (`LoyaltyEngineService.getConceptPreset`) for 6 concepts, enhanced 4-tier Customer Loyalty Engine with spend progression and earn multipliers, points redemption safety guard with 50% bill cap, public order token feed (`/api/public/tokens`), Public Order Token TV Wall Screen (`TokenDisplayView.tsx`), and multi-lingual kitchen ticket translations (`MultilingualKotService`). Verified with 26 automated tests (131 total tests passing) and clean production builds.
- **2026-10-21 (Phase 7 Complete)**: Implemented comprehensive revenue & business intelligence suite (`ReportingService`): 24-hour order & sales heatmap distribution curve (`/api/reports/sales-hourly`), category revenue breakdown & theoretical food cost margins (`/api/reports/category-performance`), staff sales leaderboard & table turns attribution (`/api/reports/staff-sales`), discount audit with Manager PIN sign-off verification (`/api/reports/discount-audit`), statutory Indian GSTR-1 tax ledger classifying SAC 996331 vs SAC 996332 with 1-click JSON/CSV exports (`/api/reports/gstr-1`), End-of-Day Z-Report cash closing audit (`/api/reports/eod-z-report`), native 80mm ESC/POS binary Z-Report receipt slip generation (`/api/printer/escpos/z-report`), and rich interactive full-page `ReportsAnalyticsView.tsx`. Verified with 27 automated tests (158 total tests passing) and clean production builds.

---

## 10. Current Progress Summary

- **Phases Completed & Verified**: 
  - Phase 0 (Audit & Governance)
  - Phase 1 (Security, Staff RBAC, Audit Trail & Atomic Store)
  - Phase 2 (POS Reliability, Offline Billing, ESC/POS Printing Engine)
  - Phase 3 (Payments, Delivery Aggregators & Financial Reconciliation)
  - Phase 4 (Inventory, Procurement & Advanced Recipe Costing)
  - Phase 5 (Service Operations, Waiter Companion & Advanced KDS)
  - Phase 6 (Customer Experience, CRM & Multi-Concept Configuration)
  - Phase 7 (Reporting, Tax & Business Intelligence)
- **Phases In Progress**: None (Phase 7 completed & verified).
- **Phases Next in Queue**: Phase 8 (Multi-Outlet & Franchise Master Architecture), followed by Phase 9, 10.
- **Overall Stability**: Clean TypeScript compilation across frontend and backend; **158 / 158 automated unit & integration tests passing**.

---

## 11. Next Recommended Task

- **Phase 8 — Multi-Outlet & Franchise Master Architecture**:
  1. **Central Organization & Multi-Tenant Outlet Isolation**: Data models for `Organization`, `Brand`, and `Outlet` with unique store codes (e.g. `OUTLET-DELHI-01`, `OUTLET-BLR-02`); tenant context middleware extracting `x-outlet-id` and isolating orders, inventory, and staff per outlet.
  2. **Central Menu Master with Outlet Overrides**: Inherited catalog with per-outlet price and stock status overrides.
  3. **Inter-Store Stock Transfers (IST)**: Automated stock requisition, dispatch, in-transit tracking, and destination inwarding.
  4. **Consolidated Headquarters & Royalty Dashboard**: Comparative margins, outlet performance rankings, and franchise royalty calculations.
  5. **Automated Verification**: Build `phase8-multi-outlet.test.ts` and verify.
