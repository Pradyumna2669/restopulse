import os
import sys
import shutil
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#78716C"))

        # Header (Pages > 1)
        if self._pageNumber > 1:
            self.drawString(45, letter[1] - 30, "RESTROPLUS — STAFF OPERATIONS & HOW-TO GUIDE")
            self.drawRightString(letter[0] - 45, letter[1] - 30, "RESTAURANT & CAFÉ OS")
            self.setStrokeColor(colors.HexColor("#E7E5E4"))
            self.setLineWidth(0.6)
            self.line(45, letter[1] - 34, letter[0] - 45, letter[1] - 34)

        # Footer (All Pages)
        self.setStrokeColor(colors.HexColor("#E7E5E4"))
        self.setLineWidth(0.6)
        self.line(45, 36, letter[0] - 45, 36)
        self.setFont("Helvetica", 8)
        self.drawString(45, 24, "CONFIDENTIAL & INTERNAL USE ONLY — RestroPlus Restaurant Hospitality Operating System")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 45, 24, page_str)
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=45,
        rightMargin=45,
        topMargin=42,
        bottomMargin=42
    )

    styles = getSampleStyleSheet()

    c_dark = colors.HexColor("#1C1917")
    c_terracotta = colors.HexColor("#D85836")
    c_sage = colors.HexColor("#15803D")
    c_amber = colors.HexColor("#B45309")
    c_border = colors.HexColor("#E7E5E4")
    c_row_alt = colors.HexColor("#FBF9F5")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=21,
        leading=25,
        textColor=c_dark,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#78716C"),
        spaceAfter=10
    )

    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12.5,
        leading=16,
        textColor=c_dark,
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=c_terracotta,
        spaceBefore=6,
        spaceAfter=3,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#292524"),
        spaceAfter=4
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=2
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=c_dark
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#44403C")
    )

    badge_style = ParagraphStyle(
        'Badge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7,
        leading=9,
        textColor=colors.HexColor("#047857")
    )

    story = []

    # ==========================================
    # HEADER BANNER
    # ==========================================
    banner_data = [[
        Paragraph("<font color='#D85836'><b>RESTROPLUS</b></font> &nbsp;|&nbsp; <b>RESTAURANT &amp; CAFÉ OS</b>", ParagraphStyle('B1', fontName='Helvetica-Bold', fontSize=9.5, textColor=c_dark)),
        Paragraph("<b>STAFF HOW-TO MANUAL &amp; NAVIGATION GUIDE</b>", ParagraphStyle('B2', fontName='Helvetica-Bold', fontSize=8.5, alignment=2, textColor=colors.HexColor("#78716C")))
    ]]
    t_banner = Table(banner_data, colWidths=[330, 192])
    t_banner.setStyle(TableStyle([
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_banner)
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_terracotta, spaceBefore=3, spaceAfter=8))

    story.append(Paragraph("Staff Operations &amp; Navigation Manual", title_style))
    story.append(Paragraph("Essential reference guide for Front-of-House (Captains, Cashiers, Servers), Kitchen (Chefs, Line Cooks), and Store Managers explaining which screen manages what and how everyday workflows are performed.", subtitle_style))

    # Core Daily Highlights Callout
    box_data = [[
        Paragraph(
            "<b>Quick Service Rules for All Staff:</b><br/>"
            "• <b>Store Availability</b>: Toggle Open vs Paused using the status pill in the top header (15m rush pause, 30m meal break, or resume).<br/>"
            "• <b>Orders &amp; POS</b>: Has 2 tabs — <i>Punch Bill</i> for taking counter/table orders and <i>Live Orders Pipeline</i> to accept online/QR orders.<br/>"
            "• <b>Kitchen Tickets (KOT)</b>: Routed to KDS tablets &amp; 80mm printers with automatic Starters &gt; Mains &gt; Desserts Hold &amp; Fire sequencing.<br/>"
            "• <b>Manager Overrides</b>: Bill voids, discounts over ₹200, inventory write-offs, and payment refunds require Manager PIN (Default: <b>2222</b>).",
            body_style
        )
    ]]
    t_box = Table(box_data, colWidths=[522])
    t_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F7F5F0")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#E2DDD2")),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(t_box)
    story.append(Spacer(1, 8))

    # ==========================================
    # SECTION 1: MASTER NAVIGATION TABLE
    # ==========================================
    story.append(Paragraph("1. Fast Lookup: Which Page Helps in What?", h1_style))

    nav_table_data = [
        [
            Paragraph("What You Want to Do", table_header_style),
            Paragraph("Page / Screen", table_header_style),
            Paragraph("Who Uses It", table_header_style),
            Paragraph("What Can Be Managed Here", table_header_style)
        ],
        [
            Paragraph("Punch new orders, select tables, add modifiers, take payments", table_cell_bold),
            Paragraph("<b>Orders &amp; POS</b><br/>(Punch Bill)", table_cell_style),
            Paragraph("Cashier, Captain", badge_style),
            Paragraph("Fast touch menu grid, cart, table selector, discounts, split payment (Cash/UPI/Card), print bill.", table_cell_style)
        ],
        [
            Paragraph("Accept new QR / Zomato / Swiggy orders, track cooking, mark ready", table_cell_bold),
            Paragraph("<b>Orders &amp; POS</b><br/>(Live Pipeline)", table_cell_style),
            Paragraph("Cashier, Supervisor", badge_style),
            Paragraph("1-click <i>Accept Order</i>, <i>Mark Ready</i>, <i>Settle Bill</i>, reprint KOT chits, elapsed cooking timer.", table_cell_style)
        ],
        [
            Paragraph("Pause online ordering, staff lunch break, kitchen rush hold", table_cell_bold),
            Paragraph("<b>Top Header</b><br/>(Store Status Pill)", table_cell_style),
            Paragraph("Manager, Cashier", badge_style),
            Paragraph("Toggle <i>Open</i> vs <i>Paused</i>, 15m rush pause, 30m break, 1hr restock, toggle QR table ordering.", table_cell_style)
        ],
        [
            Paragraph("Cook food in kitchen, view course timers, fire courses", table_cell_bold),
            Paragraph("<b>Kitchen Display (KDS)</b>", table_cell_style),
            Paragraph("Head Chef, Line Cooks", badge_style),
            Paragraph("Digital KDS chits by station (Kitchen, Tandoor, Bar), course Hold/Fire, audio chimes, station metrics.", table_cell_style)
        ],
        [
            Paragraph("View dining tables, transfer guest tables, generate QR codes", table_cell_bold),
            Paragraph("<b>Tables &amp; QR Codes</b>", table_cell_style),
            Paragraph("Host, Captain, Server", badge_style),
            Paragraph("Visual floor map, occupancy status (Vacant, Running, Billed), 1-tap table transfer, print table QRs.", table_cell_style)
        ],
        [
            Paragraph("Table-side ordering on mobile/tablet, seat tags, call assistance", table_cell_bold),
            Paragraph("<b>Waiter Companion</b>", table_cell_style),
            Paragraph("Waiter, Captain", badge_style),
            Paragraph("Mobile handheld order taking, seat allocation (Seat 1, Seat 2), progressive course firing, guest call chimes.", table_cell_style)
        ],
        [
            Paragraph("Takeaway counter tokens, delivery rider assignment &amp; OTPs", table_cell_bold),
            Paragraph("<b>Dispatch &amp; Riders</b>", table_cell_style),
            Paragraph("Packing Staff, Rider Host", badge_style),
            Paragraph("Takeaway token call numbers, Zomato/Swiggy direct fleet handover, rider assignment, delivery status.", table_cell_style)
        ],
        [
            Paragraph("Table reservations, advance bookings, walk-in waitlist queue", table_cell_bold),
            Paragraph("<b>Bookings &amp; Queue</b>", table_cell_style),
            Paragraph("Hostess, Manager", badge_style),
            Paragraph("Advance booking calendar, party size allocation, live walk-in waitlist with WhatsApp table-ready pings.", table_cell_style)
        ],
        [
            Paragraph("Shift opening float, petty cash expenses, cash drawer balance", table_cell_bold),
            Paragraph("<b>Cash Drawer</b>", table_cell_style),
            Paragraph("Cashier, Manager", badge_style),
            Paragraph("Morning cash float, mid-day petty expenses, cash sales audit, physical count reconciliation, Z-Report.", table_cell_style)
        ],
        [
            Paragraph("Edit dish prices, mark items sold-out (86), add modifiers", table_cell_bold),
            Paragraph("<b>Menu &amp; Pricing</b>", table_cell_style),
            Paragraph("Manager, Owner", badge_style),
            Paragraph("Dish pricing, tax slabs, category order, 1-click in-stock/sold-out toggle across POS &amp; QR menus.", table_cell_style)
        ],
        [
            Paragraph("Track ingredient stock, Purchase Orders, wastage &amp; loss logs", table_cell_bold),
            Paragraph("<b>Inventory &amp; Recipes</b>", table_cell_style),
            Paragraph("Storekeeper, Chef", badge_style),
            Paragraph("Raw ingredient levels, auto BOM deduction on billing, vendor PO inwarding, wastage log with PIN.", table_cell_style)
        ],
        [
            Paragraph("Customer CRM, loyalty tiers, WhatsApp campaigns &amp; Google Reviews", table_cell_bold),
            Paragraph("<b>Customers &amp; CRM</b>", table_cell_style),
            Paragraph("Manager, Marketer", badge_style),
            Paragraph("RFM guest segments (Champions, Loyal, At-Risk, Dormant), ₹0 WhatsApp broadcasts, NPS review routing.", table_cell_style)
        ],
        [
            Paragraph("Sales reports, hourly heatmap, staff leaderboard, GSTR-1, Z-Report", table_cell_bold),
            Paragraph("<b>Reports &amp; Analytics</b>", table_cell_style),
            Paragraph("Owner, Accountant", badge_style),
            Paragraph("Turnover, category margins, staff sales stats, GSTR-1 SAC 996331/996332 export, 80mm Z-Report print.", table_cell_style)
        ],
        [
            Paragraph("Multi-outlet network, central menu overrides, stock transfers", table_cell_bold),
            Paragraph("<b>Multi-Outlet HQ</b>", table_cell_style),
            Paragraph("Franchise Owner, Area Head", badge_style),
            Paragraph("Multi-store dashboard, Inter-Store Transfers (IST), outlet price overrides, brand royalty reports.", table_cell_style)
        ],
        [
            Paragraph("Weighing scales, barcode scanners, thermal receipt printers", table_cell_bold),
            Paragraph("<b>Hardware Peripherals</b>", table_cell_style),
            Paragraph("Technician, Manager", badge_style),
            Paragraph("RS-232 serial scale (gram-to-price), ESC/POS 58/80mm raw thermal printers, customer pole displays.", table_cell_style)
        ],
        [
            Paragraph("Outlet branding, concept presets, WhatsApp OpenWA gateway config", table_cell_bold),
            Paragraph("<b>Settings</b>", table_cell_style),
            Paragraph("Owner, Administrator", badge_style),
            Paragraph("Concept presets (Café, QSR, Dining), OpenWA WhatsApp URL &amp; API Key, billing feature flags.", table_cell_style)
        ],
    ]

    t_nav = Table(nav_table_data, colWidths=[136, 100, 86, 200])
    t_nav.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_dark),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_row_alt]),
    ]))
    story.append(t_nav)

    # ==========================================
    # SECTION 2: STEP-BY-STEP OPERATIONAL GUIDE
    # ==========================================
    story.append(PageBreak())
    story.append(Paragraph("2. Step-by-Step Staff Workflows", h1_style))

    # A. Store Open/Pause
    story.append(Paragraph("A. How to Open the Store &amp; Manage Peak Rush Pauses", h2_style))
    story.append(Paragraph("1. Look at the top right header pill showing <b>Store: Open</b> (green) or <b>Store: Paused</b> (amber).", bullet_style))
    story.append(Paragraph("2. Click the pill to open the <b>Store Ordering Status</b> control window.", bullet_style))
    story.append(Paragraph("3. When the kitchen is overloaded or taking a staff break, click <b>15 Mins (Kitchen Rush)</b> or <b>30 Mins (Staff Break)</b>. Inbound online &amp; QR orders pause automatically while active dining room billing continues without interruption.", bullet_style))
    story.append(Paragraph("4. When ready to take orders again, click <b>Resume Store Now</b>. A global banner will confirm ordering is live.", bullet_style))

    # B. POS Billing
    story.append(Paragraph("B. How to Take an Order &amp; Generate a Bill (Staff POS)", h2_style))
    story.append(Paragraph("1. Open <b>Orders &amp; POS</b> on the left sidebar. Ensure top mode is set to <b>Punch Bill (New Order)</b>.", bullet_style))
    story.append(Paragraph("2. Choose Order Type: <b>Dine-In</b> (select dining table), <b>Takeaway</b>, or <b>Delivery</b>.", bullet_style))
    story.append(Paragraph("3. Click menu items to add to the cart. If an item has variations (Regular/Large) or addons, the option dialog prompts automatically.", bullet_style))
    story.append(Paragraph("4. <b>Kitchen Ticket (KOT)</b>: Click <i>Print KOT</i> to send items to the kitchen display and thermal chit printer.", bullet_style))
    story.append(Paragraph("5. <b>Payment Settlement</b>: Click <i>Pay / Checkout</i>. Choose tender: <b>Cash</b>, <b>UPI QR</b>, <b>Card</b>, or <b>Split Payment</b>.", bullet_style))
    story.append(Paragraph("6. Enter the guest's mobile number. RestroPlus automatically dispatches a zero-cost digital tax invoice via WhatsApp.", bullet_style))
    story.append(Paragraph("7. Confirm payment. The receipt prints, the table is cleared, and customer loyalty points are added automatically.", bullet_style))

    # C. Live Pipeline
    story.append(Paragraph("C. How to Accept &amp; Process Online &amp; QR Orders (Live Pipeline)", h2_style))
    story.append(Paragraph("1. When a table QR self-order or online delivery order arrives, you will hear a <b>cheerful chime</b> and see a bottom-right alert toast.", bullet_style))
    story.append(Paragraph("2. Click <b>Accept Order</b> on the toast, or switch to <b>Orders &amp; POS &gt; Live Orders Pipeline</b>.", bullet_style))
    story.append(Paragraph("3. Follow the 4 visual pipeline stages:", bullet_style))
    story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• <b>🔔 Inbound / Pending (Blue)</b>: Click <i>Accept Order</i> to confirm and send items to the kitchen.", bullet_style))
    story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• <b>🍳 Kitchen Cooking (Amber)</b>: Food is being cooked. Color changes to red if delayed past 25 minutes.", bullet_style))
    story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• <b>✨ Ready (Green)</b>: Food plated at pass. Click <i>Mark Served</i> (dine-in) or <i>Handover &amp; Close</i> (takeaway).", bullet_style))
    story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• <b>💳 Settle Bill</b>: Collect cash/UPI and complete transaction with 1 click.", bullet_style))

    # D. KDS
    story.append(Paragraph("D. How Kitchen Staff Uses the Kitchen Display System (KDS)", h2_style))
    story.append(Paragraph("1. On kitchen tablets/monitors, open <b>Kitchen Display</b> from the sidebar.", bullet_style))
    story.append(Paragraph("2. Station line cooks can filter by their station: <b>Kitchen / Hot Line</b>, <b>Tandoor</b>, <b>Bar</b>, or <b>Dessert</b>.", bullet_style))
    story.append(Paragraph("3. <b>Course Sequencing (Hold &amp; Fire)</b>: Appetizers appear Active immediately. Mains and Desserts show on Hold until Captains fire them.", bullet_style))
    story.append(Paragraph("4. When dishes are cooked and plated, tap <b>Mark Ready</b>. The front counter receives an instant alert.", bullet_style))

    # E. Waiter Companion
    story.append(Paragraph("E. How Captains Use the Handheld Waiter Companion", h2_style))
    story.append(Paragraph("1. Open <b>Waiter Companion</b> on mobile phones or handheld POS terminals.", bullet_style))
    story.append(Paragraph("2. Tap an occupied table to view running orders, or tap a vacant table to seat guests and start taking orders.", bullet_style))
    story.append(Paragraph("3. Tag items by <b>Seat Number (Seat 1, Seat 2)</b> so food runners know exactly who gets what.", bullet_style))
    story.append(Paragraph("4. If a guest presses the digital call bell on their table QR, an assistance notification sounds on the Waiter Companion with table number and request type (Water, Bill, Captain). Tap <i>Acknowledge</i> and resolve it.", bullet_style))

    # F. Cash Drawer
    story.append(Paragraph("F. How to Open &amp; Balance the Cash Register (Shift Balancing)", h2_style))
    story.append(Paragraph("1. <b>Shift Opening</b>: Go to <b>Cash Drawer</b>. Record the opening cash float (e.g. ₹2,000 for change).", bullet_style))
    story.append(Paragraph("2. <b>Petty Expenses</b>: Record any mid-day petty cash payouts (e.g. ₹150 for emergency milk) with mandatory reason.", bullet_style))
    story.append(Paragraph("3. <b>Shift End Close</b>: Count physical currency in the cash drawer. Enter note breakdown.", bullet_style))
    story.append(Paragraph("4. System computes: <code>Expected Cash = Opening Float + Cash Sales - Petty Expenses</code>. Any discrepancy is logged in the audit trail.", bullet_style))
    story.append(Paragraph("5. Print the <b>End-of-Day (EOD) Z-Report</b> on the 80mm thermal receipt printer for management sign-off.", bullet_style))

    # ==========================================
    # SECTION 3: INVENTORY, CRM & ADMIN
    # ==========================================
    story.append(PageBreak())
    story.append(Paragraph("3. Back-Office, Inventory &amp; Customer CRM Guide", h1_style))

    # Inventory
    story.append(Paragraph("A. Recipe Costing, Auto-Deductions &amp; Purchase Orders (Inventory)", h2_style))
    story.append(Paragraph("• <b>Live Stock Levels</b>: View real-time raw ingredient quantities under <b>Inventory &amp; Recipes</b>. Ingredients below safety threshold appear in amber.", bullet_style))
    story.append(Paragraph("• <b>Automatic Recipe Deductions (BOM)</b>: Every dish billed deducts exact recipe quantities (e.g. Butter Chicken deducts 200g Chicken, 30g Butter, 50ml Cream) automatically.", bullet_style))
    story.append(Paragraph("• <b>Purchase Orders (Procurement)</b>: Create POs for suppliers under the <i>Procurement</i> tab. Click <i>Receive &amp; Inward</i> to update inventory with 1 click.", bullet_style))
    story.append(Paragraph("• <b>Wastage &amp; Spoilage</b>: Enter damaged or expired stock under the <i>Wastage</i> tab. Requires Manager PIN authorization to prevent stock leakage.", bullet_style))

    # CRM & Marketing
    story.append(Paragraph("B. Customer CRM, Loyalty &amp; Smart Review Hub (Reelo Parity)", h2_style))
    story.append(Paragraph("• <b>RFM Segments</b>: Diners are classified automatically under <b>Customers &amp; CRM</b> into <i>Champions</i>, <i>Loyal</i>, <i>At-Risk</i>, <i>Dormant</i>, and <i>New</i> based on visit recency and spending.", bullet_style))
    story.append(Paragraph("• <b>Zero-Cost WhatsApp Campaigns</b>: Under the <i>Campaigns</i> tab, create broadcast promotions using template tags (<code>{{name}}</code>, <code>{{points}}</code>, <code>{{discount}}</code>). Sends via your self-hosted OpenWA gateway at ₹0 cost.", bullet_style))
    story.append(Paragraph("• <b>Smart Review Routing &amp; Google Reviews</b>: Under the <i>Feedback &amp; NPS</i> tab:<br/>"
                           "&nbsp;&nbsp;&nbsp;&nbsp;<b>4 &amp; 5 Stars (Promoters)</b>: Routed directly to your Google Maps listing to boost your public rating.<br/>"
                           "&nbsp;&nbsp;&nbsp;&nbsp;<b>1 &amp; 2 Stars (Detractors)</b>: Public link is hidden, and an immediate manager alert is created for rapid recovery.", bullet_style))
    story.append(Paragraph("• <b>Automated Birthday &amp; Win-Back Journeys</b>: Automated daily triggers under the <i>Automations</i> tab send birthday perks and 30-day dormant vouchers automatically.", bullet_style))

    # Tax & Reports
    story.append(Paragraph("C. Statutory Indian Tax Reports &amp; GSTR-1 Ledger", h2_style))
    story.append(Paragraph("• Go to <b>Reports &amp; Analytics</b> to view hourly sales heatmaps, category gross margins, and staff productivity leaderboards.", bullet_style))
    story.append(Paragraph("• <b>GSTR-1 Portal Export</b>: Revenue is classified into <b>SAC 996331</b> (Dine-in: 2.5% CGST + 2.5% SGST) and <b>SAC 996332</b> (Takeaway/Delivery: 5% GST). Click <i>Export GSTR-1 JSON</i> or <i>CSV</i> for direct upload to the GST portal.", bullet_style))

    # Multi-Outlet
    story.append(Paragraph("D. Multi-Outlet HQ &amp; Inter-Store Transfers (IST)", h2_style))
    story.append(Paragraph("• Go to <b>Multi-Outlet HQ</b> to manage branch networks, central menus, and outlet price overrides (e.g. Airport branch +15%).", bullet_style))
    story.append(Paragraph("• Requisition and transfer raw ingredients between outlets with automated dispatch tracking and inwarding verification.", bullet_style))

    # ==========================================
    # SECTION 4: STAFF ROLES & SECURITY PINS
    # ==========================================
    story.append(Spacer(1, 8))
    story.append(Paragraph("4. Staff Roles &amp; Manager Security PINs", h1_style))

    role_table_data = [
        [
            Paragraph("Staff Role", table_header_style),
            Paragraph("Default User", table_header_style),
            Paragraph("PIN", table_header_style),
            Paragraph("Operational Permissions &amp; Responsibilities", table_header_style)
        ],
        [
            Paragraph("<b>Store Owner</b>", table_cell_bold),
            Paragraph("Rajesh Sharma", table_cell_style),
            Paragraph("<b>1111</b>", table_cell_bold),
            Paragraph("Full unrestricted system control, multi-outlet management, financial audits, settings.", table_cell_style)
        ],
        [
            Paragraph("<b>Restaurant Manager</b>", table_cell_bold),
            Paragraph("Pooja Nair", table_cell_style),
            Paragraph("<b>2222</b>", table_cell_bold),
            Paragraph("Floor management, bill void overrides, discounts &gt; ₹200, stock write-off authorization.", table_cell_style)
        ],
        [
            Paragraph("<b>Head Cashier</b>", table_cell_bold),
            Paragraph("Sunil Verma", table_cell_style),
            Paragraph("<b>3333</b>", table_cell_bold),
            Paragraph("POS register billing, split payment collection, cash drawer float &amp; shift closing reconciliations.", table_cell_style)
        ],
        [
            Paragraph("<b>Floor Captain / Waiter</b>", table_cell_bold),
            Paragraph("Arun Kumar", table_cell_style),
            Paragraph("<b>4444</b>", table_cell_bold),
            Paragraph("Table-side ordering, seat allocation, course hold/fire, guest call assistance resolution.", table_cell_style)
        ],
        [
            Paragraph("<b>Head Chef / Kitchen</b>", table_cell_bold),
            Paragraph("Chef Manpreet", table_cell_style),
            Paragraph("<b>5555</b>", table_cell_bold),
            Paragraph("Kitchen Display System (KDS), course preparation timing, ticket completion chimes.", table_cell_style)
        ],
        [
            Paragraph("<b>Inventory Storekeeper</b>", table_cell_bold),
            Paragraph("Deepak Soni", table_cell_style),
            Paragraph("<b>6666</b>", table_cell_bold),
            Paragraph("Raw ingredient inwarding, vendor Purchase Orders, digital weighing scale calibrations.", table_cell_style)
        ],
    ]

    t_roles = Table(role_table_data, colWidths=[105, 95, 60, 262])
    t_roles.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_dark),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_row_alt]),
    ]))
    story.append(t_roles)
    story.append(Spacer(1, 10))

    # Support Callout
    supp_data = [[
        Paragraph(
            "<b>Need Hardware or Technical Assistance?</b><br/>"
            "• <b>Thermal Printers &amp; Scales</b>: Go to <i>Hardware Peripherals</i> to test ESC/POS byte streaming or scale serial ports.<br/>"
            "• <b>WhatsApp Gateway Status</b>: Check OpenWA server at <code>http://192.168.1.9:2785</code>. Status is verified in <i>Settings</i>.<br/>"
            "• <b>Offline Billing</b>: If the internet drops, RestroPlus continues billing without disruption and auto-syncs when online.",
            body_style
        )
    ]]
    t_supp = Table(supp_data, colWidths=[522])
    t_supp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EFF6FF")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#BFDBFE")),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_supp)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully built: {filename}")

if __name__ == "__main__":
    out_dir = r"C:\Users\user\.gemini\antigravity\scratch\restopulse"
    out_file = os.path.join(out_dir, "RestroPlus_Staff_How_To_Use_Manual.pdf")
    build_pdf(out_file)

    # Also copy to frontend public directory for instant 1-click in-app download!
    public_dir = os.path.join(out_dir, "frontend", "public")
    if os.path.exists(public_dir):
        pub_file = os.path.join(public_dir, "RestroPlus_Staff_How_To_Use_Manual.pdf")
        shutil.copyfile(out_file, pub_file)
        print(f"Copied to frontend/public: {pub_file}")

    # Also copy to brain artifacts directory
    brain_dir = r"C:\Users\user\.gemini\antigravity\brain\d83e2c20-2a06-413a-9f0e-300fd67fd2ef"
    if os.path.exists(brain_dir):
        brain_file = os.path.join(brain_dir, "RestroPlus_Staff_How_To_Use_Manual.pdf")
        shutil.copyfile(out_file, brain_file)
        print(f"Copied to brain artifacts: {brain_file}")
