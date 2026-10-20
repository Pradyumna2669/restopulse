import assert from 'assert';
import { store } from '../data/store';
import { LoyaltyEngineService } from '../services/loyaltyEngine.service';
import { MultilingualKotService } from '../services/multilingualKot.service';
import { BusinessType, CustomerProfile } from '../types';

async function runPhase6CrmConceptTests() {
  console.log('\n======================================================');
  console.log('🌟 PHASE 6: CUSTOMER LOYALTY, MULTI-CONCEPT & TOKEN HARNESS');
  console.log('======================================================\n');

  let passCount = 0;
  let failCount = 0;

  function runTest(description: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✅ PASS: ${description}`);
      passCount++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${description}`);
      console.error(`     ${err.message}`);
      failCount++;
    }
  }

  // ---------------------------------------------------------
  // TEST 1: Hospitality Concept Presets Engine
  // ---------------------------------------------------------
  console.log('--- Test 1: Hospitality Concept Presets Engine ---');
  const concepts: BusinessType[] = ['cafe', 'bakery', 'qsr', 'casual_dining', 'fine_dining', 'bar'];

  for (const c of concepts) {
    const preset = LoyaltyEngineService.getConceptPreset(c);
    runTest(`Concept preset "${c}" resolves with valid configuration`, () => {
      assert(preset !== undefined, `Preset for ${c} exists`);
      assert(typeof preset.displayName === 'string' && preset.displayName.length > 0, `Display name valid for ${c}`);
      assert(['table', 'token', 'seat'].includes(preset.tableTerminology), `Terminology valid for ${c}`);
      assert(Array.isArray(preset.recommendedStations), `Stations array valid for ${c}`);
    });
  }

  runTest('QSR concept configures token terminology and enables token display', () => {
    const qsr = LoyaltyEngineService.getConceptPreset('qsr');
    assert.strictEqual(qsr.tableTerminology, 'token');
    assert.strictEqual(qsr.enableTokenDisplay, true);
    assert.strictEqual(qsr.defaultOrderType, 'takeaway');
  });

  runTest('Fine Dining concept enables course sequencing and table reservations', () => {
    const fineDining = LoyaltyEngineService.getConceptPreset('fine_dining');
    assert.strictEqual(fineDining.enableCourseSequencing, true);
    assert.strictEqual(fineDining.enableTableReservations, true);
    assert.strictEqual(fineDining.tableTerminology, 'table');
  });

  runTest('Bakery concept enables digital weighing scale support', () => {
    const bakery = LoyaltyEngineService.getConceptPreset('bakery');
    assert.strictEqual(bakery.enableWeighingScale, true);
  });

  // ---------------------------------------------------------
  // TEST 2: Customer Loyalty Tier Evaluation
  // ---------------------------------------------------------
  console.log('\n--- Test 2: Customer Loyalty Tier Progression ---');

  runTest('Spend ₹0 to ₹2,499 qualifies as Bronze tier', () => {
    assert.strictEqual(LoyaltyEngineService.evaluateCustomerTier(0), 'Bronze');
    assert.strictEqual(LoyaltyEngineService.evaluateCustomerTier(1500), 'Bronze');
  });

  runTest('Spend ₹2,500 to ₹7,499 advances to Silver tier', () => {
    assert.strictEqual(LoyaltyEngineService.evaluateCustomerTier(2500), 'Silver');
    assert.strictEqual(LoyaltyEngineService.evaluateCustomerTier(5000), 'Silver');
  });

  runTest('Spend ₹7,500 to ₹14,999 advances to Gold tier', () => {
    assert.strictEqual(LoyaltyEngineService.evaluateCustomerTier(7500), 'Gold');
    assert.strictEqual(LoyaltyEngineService.evaluateCustomerTier(12000), 'Gold');
  });

  runTest('Spend ₹15,000+ unlocks VIP Platinum tier', () => {
    assert.strictEqual(LoyaltyEngineService.evaluateCustomerTier(15000), 'VIP Platinum');
    assert.strictEqual(LoyaltyEngineService.evaluateCustomerTier(50000), 'VIP Platinum');
  });

  // ---------------------------------------------------------
  // TEST 3: Points Earning Multipliers Across Tiers
  // ---------------------------------------------------------
  console.log('\n--- Test 3: Points Earning Multipliers ---');

  runTest('Bronze tier earns 1 point per ₹100 spend (1%)', () => {
    const pts = LoyaltyEngineService.calculatePointsEarned(1200, 'Bronze');
    assert.strictEqual(pts, 12);
  });

  runTest('Silver tier earns 2 points per ₹100 spend (2%)', () => {
    const pts = LoyaltyEngineService.calculatePointsEarned(1200, 'Silver');
    assert.strictEqual(pts, 24);
  });

  runTest('Gold tier earns 3 points per ₹100 spend (3%)', () => {
    const pts = LoyaltyEngineService.calculatePointsEarned(1200, 'Gold');
    assert.strictEqual(pts, 36);
  });

  runTest('VIP Platinum earns 5 points per ₹100 spend (5%)', () => {
    const pts = LoyaltyEngineService.calculatePointsEarned(1200, 'VIP Platinum');
    assert.strictEqual(pts, 60);
  });

  // ---------------------------------------------------------
  // TEST 4: Loyalty Points Redemption Guard & Execution
  // ---------------------------------------------------------
  console.log('\n--- Test 4: Loyalty Points Redemption Guard & Execution ---');

  // Seed or retrieve test customer
  const testPhone = '9999888877';
  let cust = store.getCustomerByPhone(testPhone);
  if (!cust) {
    cust = store.upsertCustomer({
      name: 'Rohan Sharma (Loyalty VIP)',
      phone: testPhone,
      email: 'rohan.loyalty@example.com',
      loyaltyPoints: 200,
      notes: 'VIP customer'
    });
  } else {
    store.updateCustomer(cust.id, { loyaltyPoints: 200 });
  }

  runTest('Redemption rejected if points requested < minimum threshold (25 pts)', () => {
    const res = LoyaltyEngineService.validateAndRedeemPoints(cust!.id, 10, 1000);
    assert.strictEqual(res.success, false);
    assert(Boolean(res.error?.includes('Minimum 25 points')));
  });

  runTest('Redemption rejected if customer has insufficient points balance', () => {
    const res = LoyaltyEngineService.validateAndRedeemPoints(cust!.id, 500, 2000);
    assert.strictEqual(res.success, false);
    assert(Boolean(res.error?.includes('Insufficient points')));
  });

  runTest('Redemption capped at maximum percent of bill total (50% max cap)', () => {
    // 200 pts = ₹200 discount. On a ₹300 bill, max allowed is ₹150 (50%).
    const res = LoyaltyEngineService.validateAndRedeemPoints(cust!.id, 200, 300);
    assert.strictEqual(res.success, false);
    assert(Boolean(res.error?.includes('maximum 50% cap')));
  });

  runTest('Valid redemption succeeds, decrements points and logs audit record', () => {
    // Bill of ₹1,000; redeeming 100 points = ₹100 (10% of bill, below 50% cap)
    const initialBalance = store.getCustomerByPhone(testPhone)!.loyaltyPoints;
    const res = LoyaltyEngineService.validateAndRedeemPoints(cust!.id, 100, 1000);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.discountAmount, 100);
    assert.strictEqual(res.pointsRedeemed, 100);
    assert.strictEqual(res.newBalance, initialBalance - 100);

    const updated = store.getCustomerByPhone(testPhone);
    assert.strictEqual(updated?.loyaltyPoints, initialBalance - 100);

    const logs = store.getAuditLogs();
    const redemptionLog = logs.find(l => l.action === 'LOYALTY_POINTS_REDEEMED' && l.entityId === cust!.id);
    assert(redemptionLog !== undefined, 'Audit log created for loyalty redemption');
  });

  // ---------------------------------------------------------
  // TEST 5: Public Order Token Feed for Counter TV Screens
  // ---------------------------------------------------------
  console.log('\n--- Test 5: Public Order Token Feed for TV Displays ---');

  const tokenFeed = LoyaltyEngineService.getPublicOrderTokens();
  runTest('Token feed returns categorized preparing and ready collections', () => {
    assert(tokenFeed !== undefined);
    assert(Array.isArray(tokenFeed.preparing), 'Preparing tokens is an array');
    assert(Array.isArray(tokenFeed.ready), 'Ready tokens is an array');
  });

  // ---------------------------------------------------------
  // TEST 6: Multi-Lingual KOT Translation Engine
  // ---------------------------------------------------------
  console.log('\n--- Test 6: Multi-Lingual Kitchen Ticket Translations ---');

  runTest('English language retains standard dish name', () => {
    const en = MultilingualKotService.getLocalizedDishName('item_butter_chicken', 'Classic Butter Chicken', 'en');
    assert.strictEqual(en, 'Classic Butter Chicken');
  });

  runTest('Hindi kitchen language renders bilingual dish name', () => {
    const hi = MultilingualKotService.getLocalizedDishName('item_butter_chicken', 'Classic Butter Chicken', 'hi');
    assert.strictEqual(hi, 'Classic Butter Chicken (बटर चिकन)');
  });

  runTest('Marathi kitchen language renders Marathi script translation', () => {
    const mr = MultilingualKotService.getLocalizedDishName('item_biryani', 'Dum Hyderabadi Biryani', 'mr');
    assert.strictEqual(mr, 'Dum Hyderabadi Biryani (दम हैदराबादी बिर्याणी)');
  });

  runTest('Cooking instructions translated into Hindi/Marathi scripts', () => {
    const note = MultilingualKotService.getLocalizedInstruction('Extra Spicy less oil', 'hi');
    assert(note.includes('ज्यादा तीखा'), 'Includes Hindi for extra spicy');
  });

  // Summary
  console.log('\n======================================================');
  console.log(`📊 PHASE 6 TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('======================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase6CrmConceptTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
