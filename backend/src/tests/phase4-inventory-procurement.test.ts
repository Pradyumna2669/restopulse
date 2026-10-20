import { store } from '../data/store';
import { InventoryCostingService } from '../services/inventoryCosting.service';
import { Supplier, PurchaseOrder, InventoryUnit, OrderItem } from '../types';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`, details || '');
    failCount++;
  }
}

async function runPhase4InventoryTests() {
  console.log('\n======================================================');
  console.log('📦 PHASE 4: INVENTORY, PROCUREMENT & RECIPE COSTING HARNESS');
  console.log('======================================================\n');

  // ---------------------------------------------------------
  // TEST 1: Unit Conversion Engine
  // ---------------------------------------------------------
  console.log('--- Test 1: Unit Conversion Engine Accuracy ---');
  assert(InventoryCostingService.convertUnits(5, 'kg', 'grams') === 5000, '5 kg converts to 5000 grams');
  assert(InventoryCostingService.convertUnits(750, 'grams', 'kg') === 0.75, '750 grams converts to 0.75 kg');
  assert(InventoryCostingService.convertUnits(2.5, 'litres', 'ml') === 2500, '2.5 litres converts to 2500 ml');
  assert(InventoryCostingService.convertUnits(400, 'ml', 'litres') === 0.4, '400 ml converts to 0.4 litres');
  assert(InventoryCostingService.convertUnits(12, 'pcs', 'pcs') === 12, 'Same unit (pcs) preserves exact value');

  // ---------------------------------------------------------
  // TEST 2: Recipe Theoretical Food Cost Calculation
  // ---------------------------------------------------------
  console.log('\n--- Test 2: Recipe Theoretical Food Cost Calculation ---');
  const inventory = store.getInventory();
  const chicken = inventory.find(m => m.id === 'raw_chicken')!;
  const butter = inventory.find(m => m.id === 'raw_butter')!;
  assert(!!chicken && !!butter, 'Base ingredients (chicken & butter) exist in stock');

  // Recipe requiring 300g chicken (stocking unit: kg @ 220/kg) and 50g butter (stocking unit: kg @ 480/kg)
  const testRecipe = [
    { rawMaterialId: 'raw_chicken', rawMaterialName: 'Chicken', quantityRequired: 300, unit: 'grams' as InventoryUnit },
    { rawMaterialId: 'raw_butter', rawMaterialName: 'Butter', quantityRequired: 50, unit: 'grams' as InventoryUnit }
  ];

  // Expected: (0.3 * 220) + (0.05 * 480) = 66 + 24 = 90
  const computedCost = InventoryCostingService.calculateRecipeCost(testRecipe);
  assert(computedCost === 90, `Theoretical recipe cost precisely calculated: Expected 90, got ${computedCost}`);

  // ---------------------------------------------------------
  // TEST 3: Supplier Master Directory
  // ---------------------------------------------------------
  console.log('\n--- Test 3: Supplier Directory CRUD Operations ---');
  const initialSuppliers = store.getSuppliers();
  assert(initialSuppliers.length >= 3, 'Initial suppliers directory loaded with approved vendors');

  const newSupplier: Supplier = {
    id: `sup_test_${Date.now()}`,
    name: 'Godrej Agrovet Farms',
    contactPerson: 'Arun Kulkarni',
    phone: '+91 98220 55443',
    email: 'arun@godrejagrovet.com',
    gstin: '27AABCG9988H1Z4',
    address: 'Pune Highway, Hadapsar, Pune',
    categoriesSupplied: ['Poultry', 'Dairy'],
    paymentTerms: 'net_15',
    rating: 4.9,
    active: true,
    createdAt: new Date().toISOString()
  };

  const createdSup = store.createSupplier(newSupplier);
  assert(createdSup.id === newSupplier.id, 'Supplier successfully created in master directory');
  assert(store.getSupplierById(newSupplier.id)?.name === 'Godrej Agrovet Farms', 'Supplier retrieved by ID');

  const updatedSup = store.updateSupplier(newSupplier.id, { paymentTerms: 'net_30' });
  assert(updatedSup?.paymentTerms === 'net_30', 'Supplier credit terms successfully updated');

  // ---------------------------------------------------------
  // TEST 4: Purchase Order Lifecycle & 1-Click Stock Inwarding
  // ---------------------------------------------------------
  console.log('\n--- Test 4: Purchase Order Lifecycle & Automatic Stock Inwarding ---');
  const paneerBefore = store.getInventory().find(m => m.id === 'raw_paneer')!;
  const stockBefore = paneerBefore.currentStock;

  const testPo: PurchaseOrder = {
    id: `po_test_${Date.now()}`,
    poNumber: `PO-TEST-909`,
    supplierId: createdSup.id,
    supplierName: createdSup.name,
    status: 'ordered',
    items: [
      {
        rawMaterialId: 'raw_paneer',
        rawMaterialName: 'Fresh Malai Paneer',
        quantity: 15,
        unit: 'kg',
        unitCost: 310,
        totalCost: 4650
      }
    ],
    subtotal: 4650,
    tax: 232.5,
    totalAmount: 4882.5,
    expectedDeliveryDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.createPurchaseOrder(testPo);
  const fetchedPo = store.getPurchaseOrderById(testPo.id);
  assert(fetchedPo?.status === 'ordered', 'Purchase Order created with status="ordered"');

  // Inward goods to stock
  const receiveResult = InventoryCostingService.processGoodsReceived(testPo.id, 'Chef Sanjeev');
  assert(receiveResult.success === true, 'Goods received processed successfully');
  assert(receiveResult.po?.status === 'received', 'PO status transitioned to "received"');

  const paneerAfter = store.getInventory().find(m => m.id === 'raw_paneer')!;
  assert(
    Math.abs(paneerAfter.currentStock - (stockBefore + 15)) < 0.01,
    `Raw material stock increased by ordered quantity (Before: ${stockBefore}, After: ${paneerAfter.currentStock})`
  );

  // Check inward log generated
  const inwardLogs = store.getStockInwardLogs();
  const linkedInward = inwardLogs.find(l => l.purchaseOrderId === testPo.id);
  assert(!!linkedInward && linkedInward.quantityAdded === 15, 'Stock Inward log created referencing PO ID');

  // Check cannot receive twice
  const doubleReceive = InventoryCostingService.processGoodsReceived(testPo.id, 'Chef Sanjeev');
  assert(doubleReceive.success === false, 'Cannot re-receive an already completed Purchase Order');

  // ---------------------------------------------------------
  // TEST 5: Stock Wastage & Spoilage with Manager PIN Guard
  // ---------------------------------------------------------
  console.log('\n--- Test 5: Stock Wastage Logging & Manager PIN Guard ---');
  store.updateRawMaterial('raw_tomato', { currentStock: 10.0 });
  const tomatoBefore = store.getInventory().find(m => m.id === 'raw_tomato')!;
  const tomatoStockBefore = tomatoBefore.currentStock;

  // Invalid Manager PIN
  const invalidWastage = InventoryCostingService.logWastage({
    rawMaterialId: 'raw_tomato',
    quantity: 2.5,
    reason: 'spoilage',
    notes: 'Rotten batch from vegetable crate',
    loggedBy: 'Line Cook',
    managerPin: '0000'
  });
  assert(invalidWastage.success === false, 'Invalid Manager PIN is rejected for wastage authorization');

  // Valid Manager PIN (2222)
  const validWastage = InventoryCostingService.logWastage({
    rawMaterialId: 'raw_tomato',
    quantity: 2.5,
    reason: 'spoilage',
    notes: 'Rotten batch from vegetable crate',
    loggedBy: 'Line Cook',
    managerPin: '2222'
  });
  assert(validWastage.success === true, 'Valid Manager PIN authorizes wastage recording');
  assert(Boolean(validWastage.wastage?.managerApproval?.userName?.includes('Vikram')), 'Wastage entry records Manager sign-off');

  const tomatoAfter = store.getInventory().find(m => m.id === 'raw_tomato')!;
  assert(
    Math.abs(tomatoAfter.currentStock - (tomatoStockBefore - 2.5)) < 0.01,
    `Physical stock decremented by wastage amount (Before: ${tomatoStockBefore}, After: ${tomatoAfter.currentStock})`
  );

  // ---------------------------------------------------------
  // TEST 6: Recipe BOM Stock Deduction Upon Order Fulfillment
  // ---------------------------------------------------------
  console.log('\n--- Test 6: Recipe BOM Auto-Deduction On Order Fulfillment ---');
  // Ensure stock is available for deduction test
  store.updateRawMaterial('raw_chicken', { currentStock: 10.0 });
  store.updateRawMaterial('raw_butter', { currentStock: 5.0 });

  // Assign recipe to butter chicken
  store.updateMenuItemRecipe('item_butter_chicken', testRecipe);

  const chickenBeforeDeduction = store.getInventory().find(m => m.id === 'raw_chicken')!.currentStock;
  const butterBeforeDeduction = store.getInventory().find(m => m.id === 'raw_butter')!.currentStock;

  // Order with 2 Butter Chickens (requires 600g chicken = 0.6kg, 100g butter = 0.1kg)
  const orderItems: OrderItem[] = [
    {
      id: 'oi_1',
      menuItemId: 'item_butter_chicken',
      name: 'Classic Butter Chicken',
      quantity: 2,
      unitPrice: 380,
      station: 'kitchen',
      kotStatus: 'prepared'
    }
  ];

  const deductionResult = InventoryCostingService.deductRecipeStockOnOrder(orderItems);
  assert(deductionResult.success === true, 'BOM stock deduction executed');

  const chickenAfterDeduction = store.getInventory().find(m => m.id === 'raw_chicken')!.currentStock;
  const butterAfterDeduction = store.getInventory().find(m => m.id === 'raw_butter')!.currentStock;

  assert(
    Math.abs(chickenAfterDeduction - (chickenBeforeDeduction - 0.6)) < 0.01,
    `Chicken stock decremented by 0.6kg for 2 orders (Before: ${chickenBeforeDeduction}, After: ${chickenAfterDeduction})`
  );
  assert(
    Math.abs(butterAfterDeduction - (butterBeforeDeduction - 0.1)) < 0.01,
    `Butter stock decremented by 0.1kg for 2 orders (Before: ${butterBeforeDeduction}, After: ${butterAfterDeduction})`
  );

  // Summary
  console.log('\n======================================================');
  console.log(`📊 PHASE 4 TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('======================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase4InventoryTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
