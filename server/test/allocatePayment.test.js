const test = require('node:test');
const assert = require('node:assert');
const { allocate } = require('../utils/allocatePayment');

function units() {
  return [
    { feeType: 'ADMISSION_FEE', frequency: 'ONE_TIME', month: null, year: null, academicYear: null, remaining: 2000, label: 'Admission Fee' },
    { feeType: 'MONTHLY_FEE',   frequency: 'MONTHLY',  month: 'January', year: 2026, academicYear: '2026', remaining: 3000, label: 'Monthly Fee — January 2026' },
    { feeType: 'TRANSPORT_FEE', frequency: 'MONTHLY',  month: 'January', year: 2026, academicYear: '2026', remaining: 500,  label: 'Transport Fee — January 2026' },
    { feeType: 'MONTHLY_FEE',   frequency: 'MONTHLY',  month: 'February', year: 2026, academicYear: '2026', remaining: 3000, label: 'Monthly Fee — February 2026' },
  ];
}

const META = { paymentDate: '2026-03-15', paymentMethod: 'CASH', rollNumber: 'R1', remarks: '' };

test('partial last item: 6000 fills admission + jan monthly + jan transport + 500 of feb', () => {
  const r = allocate(units(), 6000, META);
  assert.strictEqual(r.totalPending, 8500);
  assert.strictEqual(r.allocated, 6000);
  assert.strictEqual(r.leftover, 0);
  assert.deepStrictEqual(r.allocations.map(a => [a.feeType, a.month, a.amount]), [
    ['ADMISSION_FEE', null, 2000],
    ['MONTHLY_FEE', 'January', 3000],
    ['TRANSPORT_FEE', 'January', 500],
    ['MONTHLY_FEE', 'February', 500],
  ]);
});

test('fully covered lines are PAID; the partial last line is PENDING', () => {
  const r = allocate(units(), 6000, META);
  // First three lines fully cover their units -> PAID.
  assert.deepStrictEqual(r.allocations.slice(0, 3).map(a => a.paymentStatus), ['PAID', 'PAID', 'PAID']);
  // Last line (₹500 of a ₹3000 month) is partial -> PENDING, so its balance stays visible.
  const last = r.allocations[r.allocations.length - 1];
  assert.strictEqual(last.paymentStatus, 'PENDING');
  // Partial PENDING still carries a paymentDate so it counts as income.
  assert.strictEqual(last.paymentDate, '2026-03-15');
});

test('exact fit consumes all units, all PAID, no partial', () => {
  const r = allocate(units(), 8500, META);
  assert.strictEqual(r.allocated, 8500);
  assert.strictEqual(r.leftover, 0);
  assert.strictEqual(r.allocations.length, 4);
  assert.ok(r.allocations.every(a => a.paymentStatus === 'PAID'));
});

test('overpayment reports leftover and does not over-allocate', () => {
  const r = allocate(units(), 10000, META);
  assert.strictEqual(r.allocated, 8500);
  assert.strictEqual(r.leftover, 1500);
  assert.strictEqual(r.allocations.length, 4);
});

test('zero pending: nothing allocated', () => {
  const r = allocate([], 5000, META);
  assert.strictEqual(r.totalPending, 0);
  assert.strictEqual(r.allocated, 0);
  assert.strictEqual(r.leftover, 5000);
  assert.deepStrictEqual(r.allocations, []);
});

test('allocations carry PAID status and payment metadata', () => {
  const r = allocate(units(), 2000, META);
  const row = r.allocations[0];
  assert.strictEqual(row.paymentStatus, 'PAID');
  assert.strictEqual(row.paymentMethod, 'CASH');
  assert.strictEqual(row.paymentDate, '2026-03-15');
  assert.strictEqual(row.rollNumber, 'R1');
});

test('item units are paid after structured dues with kind ITEM and itemRemainingAfter', () => {
  const u = [
    { kind: 'STRUCTURE', feeType: 'MONTHLY_FEE', frequency: 'MONTHLY', month: 'January', year: 2026, academicYear: '2026', remaining: 3000, label: 'Monthly Fee — January 2026' },
    { kind: 'ITEM', feeType: 'OTHER', frequency: 'ITEM', feeId: 'F1', itemId: 'I1', itemName: 'Books', remaining: 500, label: 'Books' },
  ];
  // 3200 fully pays the month (3000) and partially pays the item (200 of 500).
  const r = allocate(u, 3200, META);
  assert.strictEqual(r.allocations.length, 2);
  assert.strictEqual(r.allocations[0].kind, 'STRUCTURE');
  const item = r.allocations[1];
  assert.strictEqual(item.kind, 'ITEM');
  assert.strictEqual(item.feeId, 'F1');
  assert.strictEqual(item.itemId, 'I1');
  assert.strictEqual(item.amount, 200);
  assert.strictEqual(item.itemRemainingAfter, 300);
  // The dated income row for an item payment is always PAID.
  assert.strictEqual(item.paymentStatus, 'PAID');
});

test('fully paying an item sets itemRemainingAfter to 0', () => {
  const u = [{ kind: 'ITEM', feeType: 'OTHER', frequency: 'ITEM', feeId: 'F1', itemId: 'I1', itemName: 'Books', remaining: 500, label: 'Books' }];
  const r = allocate(u, 500, META);
  assert.strictEqual(r.allocations[0].itemRemainingAfter, 0);
  assert.strictEqual(r.allocations[0].paymentStatus, 'PAID');
});
