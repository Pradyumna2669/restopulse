import { MultiOutletService } from '../services/multiOutlet.service';
import { store, DEFAULT_OUTLET_ID } from '../data/store';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (details) console.error(`     Details: ${details}`);
    failedTests++;
  }
}

async function runPhase8Tests() {
  console.log('\n======================================================');
  console.log('🏢 PHASE 8: MULTI-OUTLET & FRANCHISE MASTER HARNESS');
  console.log('======================================================\n');

  // ----------------------------------------------------
  // Test 1: Organization & Multi-Store Directory
  // ----------------------------------------------------
  console.log('--- Test 1: Organization & Multi-Store Directory ---');
  const org = MultiOutletService.getOrganization();
  assert(org.id === 'org_pulse_01', 'Organization profile retrieved with valid master ID');
  assert(org.name === 'RestoPulse Hospitality Group', 'Master organization name verified');
  assert(org.defaultFranchiseRoyaltyPercent === 5.0, 'Default franchise royalty rate is 5.0%');
  assert(org.defaultMarketingLevyPercent === 2.0, 'Default marketing levy rate is 2.0%');

  const initialOutlets = MultiOutletService.getOutlets();
  assert(initialOutlets.length >= 4, `Multi-store directory contains ${initialOutlets.length} initialized outlets (>=4)`);

  const flagship = initialOutlets.find(o => o.tier === 'flagship');
  assert(!!flagship && flagship.id === 'outlet_delhi_01', 'Delhi Flagship store correctly identified as flagship tier');
  assert(flagship?.isFranchise === false, 'Delhi Flagship is company owned (isFranchise=false)');

  const franchises = MultiOutletService.getOutlets({ isFranchise: true });
  assert(franchises.length >= 2, `Directory successfully filters franchise stores (found ${franchises.length})`);
  assert(franchises.some(f => f.code === 'TDG-BLR-01'), 'Bengaluru Indiranagar franchise present');
  assert(franchises.some(f => f.code === 'TDG-MUM-01'), 'Mumbai Bandra franchise present');

  // Create new outlet: Pune Cloud Kitchen
  const newOutlet = MultiOutletService.createOutlet({
    code: 'TDG-PUN-01',
    name: 'The Daily Grind - Koregaon Park (Cloud Kitchen)',
    tier: 'cloud_kitchen',
    isFranchise: true,
    franchiseOwnerName: 'Aditi Kulkarni',
    franchiseContactPhone: '+91 98220 54321',
    franchiseRoyaltyPercent: 5.5,
    marketingLevyPercent: 2.0,
    gstin: '27EEEEE4444E1Z7',
    fssaiNumber: '12721005000999',
    phone: '+91 20 2615 8899',
    email: 'pune.koregaon@restopulse.com',
    address: {
      street: 'Lane 7, Koregaon Park',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      stateCode: '27'
    },
    posTerminalCount: 1
  });

  assert(newOutlet.id.startsWith('outlet_'), 'New outlet generated with valid ID');
  assert(newOutlet.code === 'TDG-PUN-01', 'Store code formatted in uppercase');
  assert(newOutlet.franchiseRoyaltyPercent === 5.5, 'Custom franchise royalty of 5.5% assigned');

  // Update outlet
  const updatedOutlet = MultiOutletService.updateOutlet(newOutlet.id, {
    posTerminalCount: 2,
    franchiseOwnerName: 'Aditi & Rohan Kulkarni'
  });
  assert(updatedOutlet.posTerminalCount === 2, 'POS terminal count updated');
  assert(updatedOutlet.franchiseOwnerName === 'Aditi & Rohan Kulkarni', 'Owner name updated');

  // ----------------------------------------------------
  // Test 2: Central Menu Master & Regional Overrides
  // ----------------------------------------------------
  console.log('\n--- Test 2: Central Menu Master & Regional Overrides ---');
  const delhiMenu = MultiOutletService.getEffectiveMenu('outlet_delhi_01');
  const blrMenu = MultiOutletService.getEffectiveMenu('outlet_blr_01');

  assert(delhiMenu.length > 0 && blrMenu.length > 0, 'Outlets successfully inherit master menu catalog');
  assert(delhiMenu.length === blrMenu.length, 'Outlet menu size matches master catalog size');

  const delhiPaneer = delhiMenu.find(m => m.id === 'item_paneer_tikka');
  const blrPaneer = blrMenu.find(m => m.id === 'item_paneer_tikka');

  assert(delhiPaneer?.basePrice === 280, 'Delhi Flagship retains base catalog price of ₹280 for Paneer Tikka');
  assert(delhiPaneer?.hasPriceOverride === false, 'Delhi Flagship has no price override');
  assert(blrPaneer?.effectivePrice === 310, 'Bengaluru outlet reflects regional price override of ₹310');
  assert(blrPaneer?.hasPriceOverride === true, 'Bengaluru item marked with hasPriceOverride=true');
  assert(blrPaneer?.originalBasePrice === 280, 'Original base price preserved for franchise auditing');

  // Regional 86 / Out-of-Stock Override
  const blrGarlicNaan = blrMenu.find(m => m.id === 'item_garlic_naan');
  assert(blrGarlicNaan?.inStock === false, 'Garlic Naan in Bengaluru outlet is marked out-of-stock via override');
  assert(blrGarlicNaan?.hasStockOverride === true, 'Stock override flagged on effective item');

  // Set new price & tax override dynamically on Dal Makhani
  const overrideResult = MultiOutletService.setMenuOverride('outlet_blr_01', 'item_dal_makhani', {
    priceOverride: 295,
    gstRateOverride: 12,
    updatedBy: 'Vikram (Regional Manager)'
  });
  assert(overrideResult.priceOverride === 295, 'Dynamic price override set to ₹295');
  assert(overrideResult.gstRateOverride === 12, 'Regional GST rate override set to 12%');

  const refreshedBlrMenu = MultiOutletService.getEffectiveMenu('outlet_blr_01');
  const blrDal = refreshedBlrMenu.find(m => m.id === 'item_dal_makhani');
  assert(blrDal?.effectivePrice === 295, 'Effective price updated to ₹295');
  assert(blrDal?.gstRate === 12, 'Effective GST rate updated to 12%');

  // Remove override and verify reversion
  const removed = MultiOutletService.removeMenuOverride('outlet_blr_01', 'item_dal_makhani');
  assert(removed === true, 'Menu override successfully removed');
  const revertedBlrMenu = MultiOutletService.getEffectiveMenu('outlet_blr_01');
  const revertedDal = revertedBlrMenu.find(m => m.id === 'item_dal_makhani');
  assert(revertedDal?.effectivePrice === 260, 'Item reverted back to global catalog base price of ₹260');
  assert(revertedDal?.hasPriceOverride === false, 'Item no longer flagged with price override');

  // ----------------------------------------------------
  // Test 3: Inter-Store Stock Transfers (IST) Workflow
  // ----------------------------------------------------
  console.log('\n--- Test 3: Inter-Store Stock Transfers (IST) Lifecycle ---');

  // Prevent transfer between same outlet
  let sameOutletErrorCaught = false;
  try {
    MultiOutletService.createTransfer({
      sourceOutletId: 'outlet_delhi_01',
      destinationOutletId: 'outlet_delhi_01',
      items: [{ rawMaterialId: 'raw_paneer', quantityRequested: 5 }],
      requestedBy: { userId: 'usr_01', userName: 'Store Mgr', role: 'manager' }
    });
  } catch (err: any) {
    sameOutletErrorCaught = true;
  }
  assert(sameOutletErrorCaught, 'Rejected transfer when source and destination are identical');

  // Create valid transfer request
  const transfer = MultiOutletService.createTransfer({
    sourceOutletId: 'outlet_delhi_01',
    destinationOutletId: 'outlet_blr_01',
    items: [
      { rawMaterialId: 'raw_paneer', quantityRequested: 10 }
    ],
    notes: 'Urgent weekend stock transfer for Indiranagar peak service',
    requestedBy: { userId: 'staff_mgr_blr', userName: 'Naveen Gowda', role: 'Franchise Partner' }
  });

  assert(transfer.status === 'requested', 'New transfer starts in "requested" status');
  assert(transfer.transferNumber.startsWith('IST-'), `Transfer number formatted: ${transfer.transferNumber}`);
  assert(transfer.items[0].quantityRequested === 10, 'Requested 10kg paneer');
  assert(transfer.subtotalCost === Number((10 * transfer.items[0].unitCost).toFixed(2)), `Subtotal cost computed: ₹${transfer.subtotalCost}`);

  // Approve transfer
  const approved = MultiOutletService.approveTransfer(transfer.id, {
    userId: 'usr_mgr_01',
    userName: 'Vikram Malhotra',
    role: 'Central Ops Head'
  });
  assert(approved.status === 'approved', 'Transfer transitioned to "approved"');
  assert(approved.approvedBy?.userName === 'Vikram Malhotra', 'Approved manager recorded');

  // Dispatch transfer and verify physical stock deduction from Delhi Flagship
  const delhiStockBeforeDispatch = store.getMaterialStockForOutlet('raw_paneer', 'outlet_delhi_01');
  const dispatched = MultiOutletService.dispatchTransfer(
    transfer.id,
    { userId: 'usr_wh_01', userName: 'Ramesh Verma', role: 'Central Warehouse Keeper' },
    { carrierName: 'Blue Dart Cold Express', trackingReference: 'BD-EXP-9921', vehicleNumber: 'DL-01-XY-5544' }
  );

  assert(dispatched.status === 'dispatched', 'Transfer transitioned to "dispatched"');
  assert(dispatched.carrierName === 'Blue Dart Cold Express', 'Cold chain carrier recorded');
  assert(dispatched.trackingReference === 'BD-EXP-9921', 'Tracking reference attached');

  const delhiStockAfterDispatch = store.getMaterialStockForOutlet('raw_paneer', 'outlet_delhi_01');
  assert(
    delhiStockAfterDispatch === Number((delhiStockBeforeDispatch - 10).toFixed(2)),
    `Stock deducted from source outlet on dispatch (Before: ${delhiStockBeforeDispatch}, After: ${delhiStockAfterDispatch})`
  );

  // Receive transfer at Bengaluru and verify physical stock increment
  const blrStockBeforeReceive = store.getMaterialStockForOutlet('raw_paneer', 'outlet_blr_01');
  const received = MultiOutletService.receiveTransfer(
    transfer.id,
    { userId: 'staff_blr_02', userName: 'Deepak Rao', role: 'Storekeeper' },
    [{ rawMaterialId: 'raw_paneer', quantityReceived: 10 }]
  );

  assert(received.status === 'received', 'Transfer transitioned to "received"');
  assert(received.receivedBy?.userName === 'Deepak Rao', 'Receiving staff recorded');

  const blrStockAfterReceive = store.getMaterialStockForOutlet('raw_paneer', 'outlet_blr_01');
  assert(
    blrStockAfterReceive === Number((blrStockBeforeReceive + 10).toFixed(2)),
    `Stock incremented at destination outlet on receipt (Before: ${blrStockBeforeReceive}, After: ${blrStockAfterReceive})`
  );

  // Cannot re-receive
  let duplicateReceiveErrorCaught = false;
  try {
    MultiOutletService.receiveTransfer(transfer.id, { userId: 'usr_01', userName: 'User', role: 'staff' });
  } catch {
    duplicateReceiveErrorCaught = true;
  }
  assert(duplicateReceiveErrorCaught, 'Cannot receive an already completed transfer');

  // Cancellation and stock restoration test
  const cancelTestTransfer = MultiOutletService.createTransfer({
    sourceOutletId: 'outlet_delhi_01',
    destinationOutletId: 'outlet_mum_01',
    items: [{ rawMaterialId: 'raw_butter', quantityRequested: 5 }],
    requestedBy: { userId: 'staff_mum', userName: 'Zubin Mehta', role: 'Franchise Partner' }
  });
  MultiOutletService.approveTransfer(cancelTestTransfer.id, { userId: 'usr_mgr', userName: 'Mgr', role: 'manager' });
  
  const delhiButterBefore = store.getMaterialStockForOutlet('raw_butter', 'outlet_delhi_01');
  MultiOutletService.dispatchTransfer(cancelTestTransfer.id, { userId: 'wh', userName: 'WH', role: 'inventory' });
  const delhiButterDispatched = store.getMaterialStockForOutlet('raw_butter', 'outlet_delhi_01');
  assert(Number(delhiButterDispatched.toFixed(2)) === Number((delhiButterBefore - 5).toFixed(2)), 'Butter stock deducted on dispatch');

  MultiOutletService.cancelTransfer(cancelTestTransfer.id, {
    userId: 'usr_mgr',
    userName: 'Vikram',
    role: 'manager',
    reason: 'Vehicle breakdown, shipment recalled'
  });
  const delhiButterRestored = store.getMaterialStockForOutlet('raw_butter', 'outlet_delhi_01');
  assert(Number(delhiButterRestored.toFixed(2)) === Number(delhiButterBefore.toFixed(2)), 'Cancelled dispatched transfer safely returned stock to source outlet');

  // ----------------------------------------------------
  // Test 4: System-Wide Inventory Matrix
  // ----------------------------------------------------
  console.log('\n--- Test 4: System-Wide Inventory Matrix ---');
  const matrix = MultiOutletService.getInventoryMatrix();
  assert(matrix.length > 0, `Inventory matrix returned ${matrix.length} tracked raw materials`);

  const paneerMatrix = matrix.find(m => m.rawMaterialId === 'raw_paneer');
  assert(!!paneerMatrix, 'Fresh Malai Paneer found in matrix');
  assert(paneerMatrix!.outlets.length >= 4, `Paneer stock broken down across ${paneerMatrix!.outlets.length} outlets`);

  const delhiPaneerStock = paneerMatrix!.outlets.find(o => o.outletId === 'outlet_delhi_01');
  const blrPaneerStock = paneerMatrix!.outlets.find(o => o.outletId === 'outlet_blr_01');
  assert(delhiPaneerStock !== undefined, 'Delhi outlet stock level tracked');
  assert(blrPaneerStock !== undefined, 'Bengaluru outlet stock level tracked');
  assert(paneerMatrix!.totalNetworkStock > 0, `Total network stock calculated: ${paneerMatrix!.totalNetworkStock} kg`);

  // ----------------------------------------------------
  // Test 5: Consolidated Headquarters & Royalty Dashboard
  // ----------------------------------------------------
  console.log('\n--- Test 5: Consolidated Headquarters & Royalty Dashboard ---');
  const hqReport = MultiOutletService.getConsolidatedHqReport();

  assert(hqReport.organization.name === 'RestoPulse Hospitality Group', 'Report tied to master organization');
  assert(hqReport.totalOutletsCount >= 4, `Consolidates network of ${hqReport.totalOutletsCount} total outlets`);
  assert(hqReport.franchiseOutletsCount >= 2, `Identifies ${hqReport.franchiseOutletsCount} franchise nodes`);
  assert(hqReport.networkSummary.totalGrossRevenue > 0, `Total network gross revenue: ₹${hqReport.networkSummary.totalGrossRevenue.toLocaleString()}`);
  assert(hqReport.networkSummary.totalOrdersCount > 0, `Total network orders count: ${hqReport.networkSummary.totalOrdersCount}`);
  assert(hqReport.networkSummary.averageOrderValue > 0, `Network Average Order Value (AOV): ₹${hqReport.networkSummary.averageOrderValue}`);
  assert(hqReport.networkSummary.networkGrossMarginPercent > 50, `Healthy gross margin: ${hqReport.networkSummary.networkGrossMarginPercent}%`);

  // Outlet Rankings
  assert(hqReport.outletRankings.byRevenue.length >= 3, 'Outlet rankings by revenue computed');
  assert(hqReport.outletRankings.byOrderVolume.length >= 3, 'Outlet rankings by order volume computed');
  assert(hqReport.outletRankings.byGrossMargin.length >= 3, 'Outlet rankings by gross margin computed');

  // Franchise Brand Royalty & Marketing Levy Attribution
  const blrSummary = hqReport.outletBreakdown.find(o => o.outletId === 'outlet_blr_01');
  assert(!!blrSummary, 'Bengaluru franchise breakdown present');
  assert(blrSummary!.isFranchise === true, 'Bengaluru marked as franchise');
  assert(blrSummary!.royaltyPercent === 5.0, 'Bengaluru royalty rate is 5.0%');
  assert(blrSummary!.marketingLevyPercent === 2.0, 'Bengaluru marketing levy is 2.0%');
  assert(blrSummary!.royaltyFee === Number((blrSummary!.netSales * 0.05).toFixed(2)), 'Royalty fee precisely equals 5% of net sales');
  assert(blrSummary!.marketingLevyFee === Number((blrSummary!.netSales * 0.02).toFixed(2)), 'Marketing levy precisely equals 2% of net sales');
  assert(blrSummary!.totalFranchisePayable === Number((blrSummary!.royaltyFee + blrSummary!.marketingLevyFee).toFixed(2)), 'Total franchise payable equals royalty + marketing fee');

  const mumSummary = hqReport.outletBreakdown.find(o => o.outletId === 'outlet_mum_01');
  assert(!!mumSummary, 'Mumbai franchise breakdown present');
  assert(mumSummary!.royaltyPercent === 6.0, 'Mumbai royalty rate is 6.0%');
  assert(mumSummary!.royaltyFee === Number((mumSummary!.netSales * 0.06).toFixed(2)), 'Mumbai royalty fee precisely equals 6% of net sales');

  const delhiSummary = hqReport.outletBreakdown.find(o => o.outletId === 'outlet_delhi_01');
  assert(!!delhiSummary, 'Delhi flagship breakdown present');
  assert(delhiSummary!.royaltyFee === 0, 'Company-owned flagship pays ₹0 franchise royalty');
  assert(delhiSummary!.marketingLevyFee === 0, 'Company-owned flagship pays ₹0 franchise marketing levy');

  assert(
    hqReport.networkSummary.combinedEnterpriseFee ===
    Number((hqReport.networkSummary.totalFranchiseRoyaltiesEarned + hqReport.networkSummary.totalMarketingLevyCollected).toFixed(2)),
    `Total enterprise fees collected: ₹${hqReport.networkSummary.combinedEnterpriseFee.toLocaleString()}`
  );

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log('\n======================================================');
  console.log(`📊 PHASE 8 TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase8Tests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
