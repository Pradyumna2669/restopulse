import { store } from '../data/store';
import { KdsService } from '../services/kdsService';
import { Order, OrderItem, CourseType } from '../types';

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

async function runPhase5KdsAndServiceTests() {
  console.log('\n======================================================');
  console.log('🍳 PHASE 5: ADVANCED KDS, COURSE SEQUENCING & WAITER HARNESS');
  console.log('======================================================\n');

  // ---------------------------------------------------------
  // TEST 1: Course Sequencing (Hold & Fire by Course)
  // ---------------------------------------------------------
  console.log('--- Test 1: Course Sequencing (Hold & Fire by Course) ---');
  const testOrderId = `ord_course_test_${Date.now()}`;
  const courseOrder: Order = {
    id: testOrderId,
    orderNumber: 'TEST-CRS-101',
    type: 'dine_in',
    tableNumber: 'T-02',
    status: 'preparing',
    items: [
      {
        id: 'item_app_1',
        menuItemId: 'item_paneer_tikka',
        name: 'Paneer Tikka Angara',
        quantity: 1,
        unitPrice: 280,
        station: 'tandoor',
        kotStatus: 'printed',
        course: 'appetizer',
        courseStatus: 'fired'
      },
      {
        id: 'item_main_1',
        menuItemId: 'item_butter_chicken',
        name: 'Classic Butter Chicken',
        quantity: 2,
        unitPrice: 380,
        station: 'kitchen',
        kotStatus: 'pending',
        course: 'main',
        courseStatus: 'hold'
      },
      {
        id: 'item_des_1',
        menuItemId: 'item_gulab_jamun',
        name: 'Gulab Jamun with Rabri',
        quantity: 2,
        unitPrice: 160,
        station: 'dessert',
        kotStatus: 'pending',
        course: 'dessert',
        courseStatus: 'hold'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.createOrder(courseOrder);
  const createdOrder = store.getOrderById(testOrderId)!;
  assert(!!createdOrder, 'Order with multi-course items created');

  const mainItemBefore = createdOrder.items.find(i => i.course === 'main')!;
  const dessertItemBefore = createdOrder.items.find(i => i.course === 'dessert')!;
  assert(mainItemBefore.courseStatus === 'hold', 'Main course item starts in "hold" status');
  assert(dessertItemBefore.courseStatus === 'hold', 'Dessert course item starts in "hold" status');

  // Kitchen Captain fires "Mains"
  const fireMainsResult = KdsService.fireCourse(testOrderId, 'main');
  assert(fireMainsResult.success === true, 'KdsService.fireCourse successfully executed');
  assert(fireMainsResult.firedCount === 1, 'Exactly 1 main course item fired');

  const updatedOrder = store.getOrderById(testOrderId)!;
  const mainItemAfter = updatedOrder.items.find(i => i.course === 'main')!;
  const dessertItemAfter = updatedOrder.items.find(i => i.course === 'dessert')!;

  assert(mainItemAfter.courseStatus === 'fired', 'Main course item transitioned to "fired" status');
  assert(dessertItemAfter.courseStatus === 'hold', 'Dessert item safely remains on "hold"');

  // Verify Audit Log was generated
  const auditLogs = store.getAuditLogs({ limit: 10 });
  const fireAudit = auditLogs.find(l => l.action === 'KDS_COURSE_FIRED' && l.entityId === testOrderId);
  assert(!!fireAudit, 'Audit log created for KDS_COURSE_FIRED');

  // ---------------------------------------------------------
  // TEST 2: Individual Item Fire from Hold
  // ---------------------------------------------------------
  console.log('\n--- Test 2: Single Item Fire from Hold ---');
  const fireSingleItemResult = KdsService.fireItem(testOrderId, 'item_des_1');
  assert(fireSingleItemResult.success === true, 'KdsService.fireItem executed');

  const orderAfterSingleFire = store.getOrderById(testOrderId)!;
  const dessertAfterSingleFire = orderAfterSingleFire.items.find(i => i.id === 'item_des_1')!;
  assert(dessertAfterSingleFire.courseStatus === 'fired', 'Dessert item transitioned from "hold" to "fired"');

  // ---------------------------------------------------------
  // TEST 3: Kitchen Performance & Station Throughput Metrics
  // ---------------------------------------------------------
  console.log('\n--- Test 3: KDS Station Performance Metrics ---');
  const metrics = KdsService.getKdsPerformanceMetrics();
  assert(metrics.overallAvgPrepMinutes > 0, 'Overall average prep time computed');
  assert(metrics.stationMetrics.length === 4, 'Includes all 4 production stations (kitchen, tandoor, dessert, bar)');

  const tandoorMetric = metrics.stationMetrics.find(s => s.station === 'tandoor');
  assert(!!tandoorMetric && tandoorMetric.avgPrepMinutes > 0, 'Tandoor station throughput tracked');

  // ---------------------------------------------------------
  // TEST 4: Table-Side Waiter Assistance Calls Lifecycle
  // ---------------------------------------------------------
  console.log('\n--- Test 4: Waiter Assistance Call Request Lifecycle ---');
  const callRequest = KdsService.createWaiterCall({
    tableId: 'tbl_t3',
    tableNumber: 'T-03',
    type: 'bill',
    message: 'Guest requested final invoice with cash settlement'
  });
  assert(callRequest.status === 'pending', 'Waiter call created with status="pending"');
  assert(callRequest.tableNumber === 'T-03', 'Call linked to Table T-03');

  const activeCalls = store.getWaiterCalls();
  const foundCall = activeCalls.find(c => c.id === callRequest.id);
  assert(!!foundCall, 'Call request queryable from store');

  // Waiter resolves call
  const resolveResult = KdsService.resolveWaiterCall(callRequest.id, 'Captain Amit Kumar');
  assert(resolveResult.success === true, 'Waiter call resolved successfully');
  assert(resolveResult.call?.status === 'resolved', 'Call status updated to "resolved"');
  assert(resolveResult.call?.assignedWaiter === 'Captain Amit Kumar', 'Assigned waiter attributed on resolution');

  // Summary
  console.log('\n======================================================');
  console.log(`📊 PHASE 5 TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('======================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase5KdsAndServiceTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
