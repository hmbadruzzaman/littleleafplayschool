const test = require('node:test');
const assert = require('node:assert');
const { groupUnitsToBreakdown } = require('../utils/feeCalculations');

test('breakdown includes ITEM units as their own entries', () => {
  const { totalPending, breakdown } = groupUnitsToBreakdown([
    { kind: 'STRUCTURE', feeType: 'ADMISSION_FEE', frequency: 'ONE_TIME', structureAmount: 2000, paidAmount: 0, remaining: 2000 },
    { kind: 'ITEM', feeType: 'OTHER', frequency: 'ITEM', itemId: 'I1', itemName: 'Books', remaining: 100 },
  ]);
  assert.strictEqual(totalPending, 2100);
  const item = breakdown.find(b => b.frequency === 'ITEM');
  assert.deepStrictEqual(item, { feeType: 'OTHER', frequency: 'ITEM', itemName: 'Books', pendingAmount: 100 });
});
