// Run with: node server/test/feeDiscount.test.js
process.env.USE_LOCAL_DB = 'true';

const assert = require('assert');
const { docClient, TABLES } = require('../config/dynamodb');
const { calculatePendingFeesForStudent } = require('../utils/feeCalculations');

// First day of the current month, formatted YYYY-MM-DD, so the month loop
// produces exactly one due month (the current one).
function firstOfThisMonth() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
}

function thisMonthYYYYMM() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

async function seedStructures() {
    await docClient.put({
        TableName: TABLES.FEE_STRUCTURE,
        Item: { feeStructureId: 'FEE_STRUCTURE#MONTHLY_FEE', feeType: 'MONTHLY_FEE', frequency: 'MONTHLY', amount: 1000 }
    }).promise();
    await docClient.put({
        TableName: TABLES.FEE_STRUCTURE,
        Item: { feeStructureId: 'FEE_STRUCTURE#TRANSPORT_FEE', feeType: 'TRANSPORT_FEE', frequency: 'MONTHLY', amount: 500 }
    }).promise();
}

async function run() {
    await seedStructures();
    const admissionDate = firstOfThisMonth();

    // Case A: normal discounts. Monthly 1000 - 200 = 800, transport 500 - 100 = 400.
    const studentA = {
        studentId: 'STU#test-A',
        admissionDate,
        transportEnabled: true,
        transportStartMonth: thisMonthYYYYMM(),
        monthlyFeeDiscount: 200,
        transportFeeDiscount: 100
    };
    const resultA = await calculatePendingFeesForStudent(studentA);
    assert.strictEqual(resultA.totalPending, 1200, `Case A expected 1200, got ${resultA.totalPending}`);
    const monthlyA = resultA.breakdown.find(b => b.feeType === 'MONTHLY_FEE');
    assert.strictEqual(monthlyA.discount, 200, 'Case A monthly discount should be 200');
    assert.strictEqual(monthlyA.effectiveAmount, 800, 'Case A monthly effective should be 800');
    assert.strictEqual(monthlyA.pendingAmount, 800, 'Case A monthly pending should be 800');

    // Case B: discount >= fee floors at 0 and does not go negative.
    const studentB = {
        studentId: 'STU#test-B',
        admissionDate,
        transportEnabled: false,
        monthlyFeeDiscount: 2000, // greater than the 1000 fee
        transportFeeDiscount: 0
    };
    const resultB = await calculatePendingFeesForStudent(studentB);
    assert.strictEqual(resultB.totalPending, 0, `Case B expected 0, got ${resultB.totalPending}`);

    // Case C: default (no discount fields) behaves as before — full amount due.
    const studentC = {
        studentId: 'STU#test-C',
        admissionDate,
        transportEnabled: false
    };
    const resultC = await calculatePendingFeesForStudent(studentC);
    assert.strictEqual(resultC.totalPending, 1000, `Case C expected 1000, got ${resultC.totalPending}`);

    console.log('All fee discount assertions passed.');
}

run().catch(err => { console.error(err); process.exit(1); });
