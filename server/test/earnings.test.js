// Runs against the in-memory local DB shim (node --test isolates each file in its
// own process, so this env var does not leak to other test files).
process.env.USE_LOCAL_DB = 'true';

const test = require('node:test');
const assert = require('node:assert');
const { docClient, TABLES } = require('../config/dynamodb');
const FeeModel = require('../models/Fee');

async function seed(fees) {
  for (const f of fees) {
    await docClient.put({ TableName: TABLES.FEES, Item: { feeId: `FEE#${Math.random()}`, ...f } }).promise();
  }
}

test('earnings count PAID and partial PENDING (with paymentDate) but not unpaid dues', async () => {
  await seed([
    { feeType: 'MONTHLY_FEE', amount: 3000, paymentStatus: 'PAID',    paymentDate: '2026-03-10' }, // counts
    { feeType: 'MONTHLY_FEE', amount: 500,  paymentStatus: 'PENDING', paymentDate: '2026-03-12' }, // partial payment -> counts
    { feeType: 'MONTHLY_FEE', amount: 2000, paymentStatus: 'PENDING' },                            // unpaid due, no paymentDate -> excluded
    { feeType: 'MONTHLY_FEE', amount: 1000, paymentStatus: 'OVERDUE' },                            // unpaid -> excluded
    { feeType: 'MONTHLY_FEE', amount: 9999, paymentStatus: 'PAID',    paymentDate: '2026-01-05' }, // out of range -> excluded
  ]);

  const report = await FeeModel.getEarningsReport('2026-03-01', '2026-03-31');

  assert.strictEqual(report.totalEarnings, 3500);
  assert.strictEqual(report.transactionCount, 2);
  assert.strictEqual(report.monthlyFees, 3500);
});
