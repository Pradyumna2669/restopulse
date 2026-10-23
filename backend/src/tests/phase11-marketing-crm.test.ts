import { store } from '../data/store';
import { MarketingEngineService } from '../services/marketingEngine.service';
import { CustomerProfile, MarketingCampaign, CustomerFeedback } from '../types';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

async function runPhase11Tests() {
  console.log('\n======================================================');
  console.log('📢 PHASE 11: REELO MARKETING CAMPAIGNS & SMART FEEDBACK');
  console.log('======================================================\n');

  // --- Test 1: RFM Customer Segmentation Engine ---
  console.log('--- Test 1: RFM Customer Segmentation & Recency ---');
  
  // Seed test customers with varying recency and frequency
  const now = Date.now();
  const testCustomers: CustomerProfile[] = [
    {
      id: 'cust_rfm_champ',
      name: 'Priya Sharma',
      phone: '9811001122',
      visitsCount: 8,
      totalSpend: 4200,
      loyaltyPoints: 120,
      tier: 'Gold',
      lastVisit: new Date(now - 5 * 86400000).toISOString(), // 5 days ago
      favoriteItems: ['Paneer Tikka']
    },
    {
      id: 'cust_rfm_loyal',
      name: 'Aditya Roy',
      phone: '9822002233',
      visitsCount: 3,
      totalSpend: 1500,
      loyaltyPoints: 30,
      tier: 'Silver',
      lastVisit: new Date(now - 12 * 86400000).toISOString(), // 12 days ago
      favoriteItems: ['Cold Brew']
    },
    {
      id: 'cust_rfm_atrisk',
      name: 'Kavita Patel',
      phone: '9833003344',
      visitsCount: 4,
      totalSpend: 2800,
      loyaltyPoints: 70,
      tier: 'Silver',
      lastVisit: new Date(now - 40 * 86400000).toISOString(), // 40 days ago
      favoriteItems: ['Butter Chicken']
    },
    {
      id: 'cust_rfm_dormant',
      name: 'Suresh Raina',
      phone: '9844004455',
      visitsCount: 2,
      totalSpend: 800,
      loyaltyPoints: 10,
      tier: 'Bronze',
      lastVisit: new Date(now - 75 * 86400000).toISOString(), // 75 days ago
      favoriteItems: ['Espresso']
    },
    {
      id: 'cust_rfm_new',
      name: 'Deepak Hooda',
      phone: '9855005566',
      visitsCount: 1,
      totalSpend: 350,
      loyaltyPoints: 5,
      tier: 'Bronze',
      lastVisit: new Date(now - 2 * 86400000).toISOString(), // 2 days ago
      favoriteItems: ['Croissant']
    }
  ];

  for (const c of testCustomers) {
    store.upsertCustomer(c);
  }

  const rfmResult = MarketingEngineService.calculateRfmSegments();
  assert(rfmResult.summary.all >= 5, 'RFM calculated total customers count');
  
  const champ = rfmResult.customers.find(c => c.id === 'cust_rfm_champ');
  assert(champ?.rfmSegment === 'champions', 'Priya (8 visits, 5 days ago) categorized as "champions"');
  assert(champ?.daysSinceLastVisit === 5, 'Days since last visit accurately computed (5 days)');
  assert(champ?.averageOrderValue === 525, 'Average Order Value accurately computed (₹525)');

  const loyal = rfmResult.customers.find(c => c.id === 'cust_rfm_loyal');
  assert(loyal?.rfmSegment === 'loyal', 'Aditya (3 visits, 12 days ago) categorized as "loyal"');

  const atRisk = rfmResult.customers.find(c => c.id === 'cust_rfm_atrisk');
  assert(atRisk?.rfmSegment === 'at_risk', 'Kavita (40 days ago) categorized as "at_risk"');

  const dormant = rfmResult.customers.find(c => c.id === 'cust_rfm_dormant');
  assert(dormant?.rfmSegment === 'dormant', 'Suresh (75 days ago) categorized as "dormant"');

  const newGuest = rfmResult.customers.find(c => c.id === 'cust_rfm_new');
  assert(newGuest?.rfmSegment === 'new', 'Deepak (1 visit, 2 days ago) categorized as "new"');

  // --- Test 2: Marketing Campaign Creation & Segmentation Targeting ---
  console.log('\n--- Test 2: Campaign Creation & Target Segment Filtering ---');
  const campaign: MarketingCampaign = {
    id: 'cmp_test_winback',
    title: 'Win-Back Exclusive 20% Off',
    type: 'whatsapp',
    targetSegment: 'at_risk',
    templateMessage: 'Hey {{name}}, we miss you at {{restaurantName}}! Use code {{offerCode}} for {{discount}}% off your next visit.',
    offerCode: 'MISSYOU20',
    discountPercent: 20,
    status: 'draft',
    recipientCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    createdAt: new Date().toISOString()
  };

  const createdCampaign = store.createMarketingCampaign(campaign);
  assert(createdCampaign.id === 'cmp_test_winback', 'Campaign created in store');
  
  const fetchedCampaign = store.getMarketingCampaignById('cmp_test_winback');
  assert(fetchedCampaign?.title === 'Win-Back Exclusive 20% Off', 'Campaign retrievable by ID');
  assert(fetchedCampaign?.targetSegment === 'at_risk', 'Campaign targets "at_risk" customer segment');

  // --- Test 3: Campaign Broadcast & Variable Token Substitution ---
  console.log('\n--- Test 3: Broadcast Campaign Execution & Delivery Tracking ---');
  const broadcastResult = await MarketingEngineService.broadcastCampaign('cmp_test_winback');
  assert(broadcastResult.success === true, 'Campaign broadcast executed');
  assert(broadcastResult.recipientCount >= 1, `Targeted at_risk recipients identified (${broadcastResult.recipientCount})`);
  assert(broadcastResult.campaign.status === 'completed' || broadcastResult.campaign.status === 'failed', 'Campaign status updated post-broadcast');
  
  const auditLogs = store.getAuditLogs();
  const campaignAudit = auditLogs.find(a => a.action === 'MARKETING_CAMPAIGN_BROADCAST' && a.entityId === 'cmp_test_winback');
  assert(campaignAudit !== undefined, 'Immutable audit log recorded for MARKETING_CAMPAIGN_BROADCAST');
  assert(campaignAudit?.details?.campaignTitle === 'Win-Back Exclusive 20% Off', 'Audit log captures campaign title and parameters');

  // --- Test 4: Smart Customer Feedback & Review Routing Funnel ---
  console.log('\n--- Test 4: Smart Customer Feedback & Review Routing ---');
  // 5-Star Rating (Promoter -> Google Review redirect)
  const promoterFeedback = MarketingEngineService.submitCustomerFeedback({
    customerPhone: '9811001122',
    customerName: 'Priya Sharma',
    rating: 5,
    feedbackText: 'Loved the butter chicken and amazing ambiance! Will visit again.',
    tags: ['food', 'service']
  });

  assert(promoterFeedback.isPromoter === true, '5-Star rating classified as "promoter"');
  assert(promoterFeedback.feedback.npsCategory === 'promoter', 'NPS category is promoter');
  assert(promoterFeedback.googleReviewUrl !== undefined, 'Promoter is routed to Google Review URL');
  assert(promoterFeedback.managerAlertTriggered === false, 'No manager detractor alert for promoter');

  // 1-Star Rating (Detractor -> Private Manager Alert & Service Recovery)
  const detractorFeedback = MarketingEngineService.submitCustomerFeedback({
    customerPhone: '9899887766',
    customerName: 'Rahul Verma',
    rating: 1,
    feedbackText: 'Order arrived cold and the server was inattentive.',
    tags: ['food_cold', 'service_delay']
  });

  assert(detractorFeedback.isPromoter === false, '1-Star rating classified as detractor');
  assert(detractorFeedback.feedback.npsCategory === 'detractor', 'NPS category is detractor');
  assert(detractorFeedback.managerAlertTriggered === true, 'Manager alert triggered for service recovery');
  assert(detractorFeedback.googleReviewUrl === undefined, 'Detractor is shielded from Google Review link');

  const detractorAudit = store.getAuditLogs().find(a => a.action === 'GUEST_DETRACTOR_ALERT' && a.entityId === detractorFeedback.feedback.id);
  assert(detractorAudit !== undefined, 'Audit trail recorded GUEST_DETRACTOR_ALERT for manager intervention');

  // --- Test 5: Net Promoter Score (NPS) Intelligence Summary ---
  console.log('\n--- Test 5: Net Promoter Score (NPS) Summary Calculation ---');
  const npsReport = MarketingEngineService.getNpsSummary();
  assert(npsReport.totalResponses >= 2, `Total feedback responses counted (${npsReport.totalResponses})`);
  assert(npsReport.promoterCount >= 1, `Promoter responses tracked (${npsReport.promoterCount})`);
  assert(npsReport.detractorCount >= 1, `Detractor responses tracked (${npsReport.detractorCount})`);
  assert(typeof npsReport.overallNps === 'number', `Overall NPS computed: ${npsReport.overallNps}`);
  assert(npsReport.averageRating >= 1 && npsReport.averageRating <= 5, `Average rating computed: ${npsReport.averageRating} / 5.0`);

  // --- Test 6: Manager Service Recovery Resolution ---
  console.log('\n--- Test 6: Manager Feedback Resolution Workflow ---');
  const resolvedFeedback = store.updateCustomerFeedback(detractorFeedback.feedback.id, {
    managerStatus: 'resolved',
    managerNotes: 'Called guest directly, offered complimentary dessert voucher on next visit.',
    resolvedAt: new Date().toISOString()
  });

  assert(resolvedFeedback?.managerStatus === 'resolved', 'Detractor feedback marked as resolved');
  assert(resolvedFeedback?.managerNotes?.includes('complimentary dessert') === true, 'Resolution notes preserved');

  // --- Test 7: Automated Lifecycle Journeys (Birthdays & Win-Back) ---
  console.log('\n--- Test 7: Automated Lifecycle Journeys (Birthdays & Win-Back) ---');
  // Configure customer birthday to today
  const todayMMDD = new Date().toISOString().slice(5, 10);
  store.upsertCustomer({
    ...testCustomers[0],
    birthday: `1995-${todayMMDD}`
  });

  const automations = store.getMarketingAutomations();
  assert(automations.birthdayPerk.enabled === true, 'Birthday perk automated trigger is enabled');
  assert(automations.winbackTrigger.enabled === true, 'Winback automated trigger is enabled');

  const automationRun = await MarketingEngineService.runDailyAutomations();
  assert(automationRun.birthdaysTriggered >= 1, `Birthday perk triggered for today's birthday guests (${automationRun.birthdaysTriggered})`);

  console.log('\n======================================================');
  console.log(`📊 PHASE 11 TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase11Tests().catch(err => {
  console.error('Phase 11 test runner error:', err);
  process.exit(1);
});
