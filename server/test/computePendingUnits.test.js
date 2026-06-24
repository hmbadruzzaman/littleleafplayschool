const test = require('node:test');
const assert = require('node:assert');
const { computePendingUnits } = require('../utils/feeCalculations');

// today fixed so the month walk is deterministic: March 2026.
const TODAY = new Date(2026, 2, 15); // monthIndex 2 = March

const STRUCTURES = [
  { feeStructureId: 'FEE_STRUCTURE#ADMISSION_FEE', feeType: 'ADMISSION_FEE', amount: 2000, frequency: 'ONE_TIME' },
  { feeStructureId: 'FEE_STRUCTURE#MONTHLY_FEE',   feeType: 'MONTHLY_FEE',   amount: 3000, frequency: 'MONTHLY' },
  { feeStructureId: 'FEE_STRUCTURE#TRANSPORT_FEE', feeType: 'TRANSPORT_FEE', amount: 500,  frequency: 'MONTHLY' },
];

function baseStudent(extra = {}) {
  return {
    studentId: 'STU2026001',
    rollNumber: 'R1',
    admissionDate: '2026-01-10', // Jan 2026 onward
    transportEnabled: true,
    transportStartMonth: '2026-01',
    ...extra,
  };
}

test('orders one-time first, then months oldest->newest, MONTHLY_FEE before TRANSPORT_FEE', () => {
  const units = computePendingUnits({
    student: baseStudent(),
    feeStructures: STRUCTURES,
    studentFees: [],
    today: TODAY,
  });
  const order = units.map(u => `${u.feeType}:${u.month || ''}${u.year || ''}`);
  assert.deepStrictEqual(order, [
    'ADMISSION_FEE:',
    'MONTHLY_FEE:January2026',
    'TRANSPORT_FEE:January2026',
    'MONTHLY_FEE:February2026',
    'TRANSPORT_FEE:February2026',
    'MONTHLY_FEE:March2026',
    'TRANSPORT_FEE:March2026',
  ]);
});

test('partial PENDING payment reduces remaining without clearing the month', () => {
  const units = computePendingUnits({
    student: baseStudent(),
    feeStructures: STRUCTURES,
    studentFees: [
      { feeType: 'MONTHLY_FEE', month: 'January', academicYear: '2026', amount: 1000, paymentStatus: 'PENDING', paymentDate: '2026-03-01' },
    ],
    today: TODAY,
  });
  const jan = units.find(u => u.feeType === 'MONTHLY_FEE' && u.month === 'January');
  assert.strictEqual(jan.remaining, 2000);
});

test('any PAID record settles the month fully, even if amount < due', () => {
  const units = computePendingUnits({
    student: baseStudent(),
    feeStructures: STRUCTURES,
    studentFees: [
      // A PAID record below the due amount still fully settles the month — intentional.
      { feeType: 'MONTHLY_FEE', month: 'January', academicYear: '2026', amount: 1000, paymentStatus: 'PAID' },
    ],
    today: TODAY,
  });
  assert.ok(!units.some(u => u.feeType === 'MONTHLY_FEE' && u.month === 'January'));
});

test('monthly discount lowers effectiveAmount and remaining', () => {
  const units = computePendingUnits({
    student: baseStudent({ monthlyFeeDiscount: 500 }),
    feeStructures: STRUCTURES,
    studentFees: [],
    today: TODAY,
  });
  const jan = units.find(u => u.feeType === 'MONTHLY_FEE' && u.month === 'January');
  assert.strictEqual(jan.effectiveAmount, 2500);
  assert.strictEqual(jan.remaining, 2500);
});

test('transport excluded when not enabled', () => {
  const units = computePendingUnits({
    student: baseStudent({ transportEnabled: false }),
    feeStructures: STRUCTURES,
    studentFees: [],
    today: TODAY,
  });
  assert.ok(!units.some(u => u.feeType === 'TRANSPORT_FEE'));
});

test('excludeAdmissionFee drops the admission unit', () => {
  const units = computePendingUnits({
    student: baseStudent({ excludeAdmissionFee: true }),
    feeStructures: STRUCTURES,
    studentFees: [],
    today: TODAY,
  });
  assert.ok(!units.some(u => u.feeType === 'ADMISSION_FEE'));
});

test('one-time partial PENDING payment leaves a reduced remaining unit', () => {
  const units = computePendingUnits({
    student: baseStudent(),
    feeStructures: STRUCTURES,
    studentFees: [
      { feeType: 'ADMISSION_FEE', amount: 500, paymentStatus: 'PENDING', paymentDate: '2026-03-01' },
    ],
    today: TODAY,
  });
  const adm = units.find(u => u.feeType === 'ADMISSION_FEE');
  assert.strictEqual(adm.remaining, 1500);
});

test('one-time PAID record settles the fee fully (not returned)', () => {
  const units = computePendingUnits({
    student: baseStudent(),
    feeStructures: STRUCTURES,
    studentFees: [
      { feeType: 'ADMISSION_FEE', amount: 500, paymentStatus: 'PAID' },
    ],
    today: TODAY,
  });
  assert.ok(!units.some(u => u.feeType === 'ADMISSION_FEE'));
});

test('emits an ITEM unit per OTHER PENDING row, ordered after structured units', () => {
  const units = computePendingUnits({
    student: baseStudent(),
    feeStructures: STRUCTURES,
    studentFees: [
      { feeId: 'F1', feeType: 'OTHER', itemId: 'I2', itemName: 'Dress', amount: 450, paymentStatus: 'PENDING' },
      { feeId: 'F2', feeType: 'OTHER', itemId: 'I1', itemName: 'Books', amount: 100, paymentStatus: 'PENDING' },
      { feeId: 'F3', feeType: 'OTHER', itemId: 'I1', itemName: 'Books', amount: 200, paymentStatus: 'PAID' },
    ],
    today: TODAY,
  });
  const items = units.filter(u => u.kind === 'ITEM');
  // Both pending item rows become units; the PAID OTHER row does not.
  assert.deepStrictEqual(items.map(u => [u.itemName, u.remaining, u.feeId]), [
    ['Books', 100, 'F2'],
    ['Dress', 450, 'F1'],
  ]);
  // Items come after every structured (non-ITEM) unit.
  const lastStructuredIdx = units.map(u => u.kind).lastIndexOf('STRUCTURE');
  const firstItemIdx = units.findIndex(u => u.kind === 'ITEM');
  assert.ok(firstItemIdx > lastStructuredIdx);
});

test('ITEM unit carries kind, feeId and label', () => {
  const units = computePendingUnits({
    student: baseStudent(),
    feeStructures: STRUCTURES,
    studentFees: [
      { feeId: 'F9', feeType: 'OTHER', itemId: 'I9', itemName: 'Lab kit', amount: 700, paymentStatus: 'PENDING' },
    ],
    today: TODAY,
  });
  const item = units.find(u => u.kind === 'ITEM');
  assert.strictEqual(item.feeId, 'F9');
  assert.strictEqual(item.frequency, 'ITEM');
  assert.strictEqual(item.feeType, 'OTHER');
  assert.strictEqual(item.label, 'Lab kit');
  assert.strictEqual(item.remaining, 700);
});

test('admission fee discount lowers the one-time admission remaining', () => {
  const units = computePendingUnits({
    student: baseStudent({ admissionFeeDiscount: 500 }),
    feeStructures: STRUCTURES,
    studentFees: [],
    today: TODAY,
  });
  const adm = units.find(u => u.feeType === 'ADMISSION_FEE');
  assert.strictEqual(adm.discount, 500);
  assert.strictEqual(adm.effectiveAmount, 1500);
  assert.strictEqual(adm.remaining, 1500);
});

test('admission discount does not affect other one-time fees and never goes negative', () => {
  const units = computePendingUnits({
    student: baseStudent({ admissionFeeDiscount: 99999 }),
    feeStructures: [
      ...STRUCTURES,
      { feeStructureId: 'FEE_STRUCTURE#ANNUAL_FEE', feeType: 'ANNUAL_FEE', amount: 1200, frequency: 'ONE_TIME' },
    ],
    studentFees: [],
    today: TODAY,
  });
  const adm = units.find(u => u.feeType === 'ADMISSION_FEE');
  const annual = units.find(u => u.feeType === 'ANNUAL_FEE');
  assert.strictEqual(adm, undefined); // discount >= amount -> nothing pending
  assert.strictEqual(annual.discount, 0);
  assert.strictEqual(annual.remaining, 1200);
});
