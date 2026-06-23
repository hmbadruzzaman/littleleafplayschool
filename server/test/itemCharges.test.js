const test = require('node:test');
const assert = require('node:assert');
const { groupItemCharges } = require('../utils/itemCharges');

test('groups OTHER rows by itemId into paid/pending, ignores non-OTHER', () => {
  const fees = [
    { feeId: 'F1', feeType: 'OTHER', itemId: 'I1', itemName: 'Books', amount: 200, paymentStatus: 'PAID' },
    { feeId: 'F2', feeType: 'OTHER', itemId: 'I1', itemName: 'Books', amount: 100, paymentStatus: 'PENDING' },
    { feeId: 'F3', feeType: 'OTHER', itemId: 'I2', itemName: 'Dress', amount: 450, paymentStatus: 'PENDING' },
    { feeId: 'F4', feeType: 'MONTHLY_FEE', amount: 3000, paymentStatus: 'PAID' },
  ];
  assert.deepStrictEqual(groupItemCharges(fees), [
    { itemId: 'I1', itemName: 'Books', paid: 200, pending: 100 },
    { itemId: 'I2', itemName: 'Dress', paid: 0, pending: 450 },
  ]);
});

test('returns empty array when there are no OTHER rows', () => {
  assert.deepStrictEqual(groupItemCharges([{ feeType: 'MONTHLY_FEE', amount: 1 }]), []);
});
