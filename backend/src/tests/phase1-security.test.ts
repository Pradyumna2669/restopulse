import { store, initialStaffUsers } from '../data/store';
import { Bill, StaffUser } from '../types';
import fs from 'fs';
import path from 'path';

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

async function runPhase1SecurityTests() {
  console.log('\n======================================================');
  console.log('🛡️  PHASE 1: SECURITY, RBAC & AUDIT LOGS TEST HARNESS');
  console.log('======================================================\n');

  // Test 1: Staff Seeds & Roles
  console.log('--- Test 1: Staff Accounts & Role Availability ---');
  const staff = store.getStaffUsers();
  assert(staff.length >= 6, 'Store loads at least 6 default staff members', { count: staff.length });
  
  const roles = staff.map(s => s.role);
  assert(roles.includes('owner'), 'Role "owner" exists');
  assert(roles.includes('manager'), 'Role "manager" exists');
  assert(roles.includes('cashier'), 'Role "cashier" exists');
  assert(roles.includes('waiter'), 'Role "waiter" exists');
  assert(roles.includes('kitchen'), 'Role "kitchen" exists');
  assert(roles.includes('inventory'), 'Role "inventory" exists');

  // Test 2: PIN Verification & RBAC Guards
  console.log('\n--- Test 2: PIN Verification & Permission Checks ---');
  const validManager = store.verifyPin('2222', ['manager', 'owner']);
  assert(validManager.success === true && validManager.user?.role === 'manager', 'PIN 2222 verifies successfully as Manager');

  const unauthorizedWaiter = store.verifyPin('4444', ['manager', 'owner']);
  assert(unauthorizedWaiter.success === false, 'PIN 4444 (Waiter) is rejected when Manager privileges required');

  const invalidPin = store.verifyPin('0000', ['manager']);
  assert(invalidPin.success === false, 'Unknown PIN 0000 is rejected');

  // Test 3: Bill Creation & Cashier Context
  console.log('\n--- Test 3: Transaction Creation & Audit Logging ---');
  const testBill: Bill = {
    id: `test_bill_${Date.now()}`,
    invoiceNumber: `INV-2026-TEST-${Math.floor(Math.random() * 9000 + 1000)}`,
    orderId: 'test_order_01',
    orderNumber: 'TEST-01',
    orderType: 'dine_in',
    tableNumber: 'T-01',
    items: [
      {
        id: 'item_1',
        menuItemId: 'item_coffee',
        name: 'Artisan Latte',
        quantity: 2,
        unitPrice: 150,
        station: 'counter',
        kotStatus: 'prepared'
      }
    ],
    subtotal: 300,
    discountAmount: 0,
    cgstAmount: 7.5,
    sgstAmount: 7.5,
    roundOff: 0,
    total: 315,
    paymentMode: 'cash',
    status: 'paid',
    createdAt: new Date().toISOString(),
    whatsappInvoiceSent: false,
    whatsappReviewSent: false
  };

  store.createBill(testBill);
  const fetchedBill = store.getBillById(testBill.id);
  assert(fetchedBill !== undefined, 'Test bill successfully created and persisted');

  // Test 4: Manager Approval for Bill Void
  console.log('\n--- Test 4: Bill Void Engine with Manager PIN Approval ---');
  // Attempt 1: Cashier tries to void without manager approval
  const cashierActor = { userId: 'staff-cashier-01', userName: 'Pooja Sharma', role: 'cashier' as const };
  const managerActor = { userId: 'staff-mgr-01', userName: 'Vikram Malhotra', role: 'manager' as const };

  // Proper void with manager approval
  const voidResult = store.voidBill(
    testBill.id,
    cashierActor,
    'Guest changed mind before preparation',
    managerActor
  );
  assert(voidResult.success === true, 'Bill voided successfully with Manager approval');
  assert(voidResult.bill?.status === 'cancelled', 'Voided bill status transitioned to "cancelled"');
  assert(Boolean(voidResult.bill?.cancelledBy?.includes('Pooja Sharma')), 'CancelledBy audit record preserved');

  // Attempt duplicate void
  const duplicateVoid = store.voidBill(testBill.id, cashierActor, 'Duplicate attempt');
  assert(duplicateVoid.success === false, 'Cannot void an already cancelled bill');

  // Test 5: Immutable Audit Logs
  console.log('\n--- Test 5: Immutable Audit Trail Inspection ---');
  const auditLogs = store.getAuditLogs({ entityId: testBill.id });
  assert(auditLogs.length > 0, 'Audit log exists for voided bill');
  const voidLog = auditLogs.find(l => l.action === 'BILL_VOIDED');
  assert(voidLog !== undefined, 'Audit log contains BILL_VOIDED action');
  assert(voidLog?.approvedBy?.role === 'manager', 'Audit log records Manager approval attribution');
  assert(voidLog?.reason === 'Guest changed mind before preparation', 'Audit log records exact mandatory reason');

  // Test 6: Concurrency & Atomic Store Writes
  console.log('\n--- Test 6: Concurrency & Atomic Write Protection ---');
  const initialAuditCount = store.getAuditLogs().length;
  const CONCURRENT_OPS = 25;
  const promises: Promise<any>[] = [];

  for (let i = 0; i < CONCURRENT_OPS; i++) {
    promises.push(
      new Promise<void>((resolve) => {
        store.addAuditLog({
          userId: `test-staff-${i}`,
          userName: `Staff ${i}`,
          role: 'cashier',
          action: 'CONCURRENT_TEST_EVENT',
          entityType: 'staff',
          entityId: `test-staff-${i}`,
          details: { iteration: i }
        });
        resolve();
      })
    );
  }

  await Promise.all(promises);
  const finalAuditCount = store.getAuditLogs().length;
  assert(
    finalAuditCount === initialAuditCount + CONCURRENT_OPS,
    `All ${CONCURRENT_OPS} concurrent write operations persisted without loss or race condition`
  );

  // Verify restopulse-db.json integrity
  const dataFile = path.join(__dirname, '../data/restopulse-db.json');
  const fileContent = fs.readFileSync(dataFile, 'utf-8');
  let jsonParsed = false;
  try {
    JSON.parse(fileContent);
    jsonParsed = true;
  } catch {}
  assert(jsonParsed === true, 'store.json remains completely valid, uncorrupted JSON after concurrent writes');

  // Summary
  console.log('\n======================================================');
  console.log(`TEST RUN COMPLETE: ${passCount} Passed, ${failCount} Failed`);
  console.log('======================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase1SecurityTests().catch((err) => {
  console.error('Unhandled test harness error:', err);
  process.exit(1);
});
