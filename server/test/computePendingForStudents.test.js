const test = require('node:test');
const assert = require('node:assert');
const { computePendingForStudents } = require('../utils/feeCalculations');

const TODAY = new Date(2026, 2, 15); // March 2026

const STRUCTURES = [
  { feeStructureId: 'FEE_STRUCTURE#ADMISSION_FEE', feeType: 'ADMISSION_FEE', amount: 2000, frequency: 'ONE_TIME' },
  { feeStructureId: 'FEE_STRUCTURE#MONTHLY_FEE',   feeType: 'MONTHLY_FEE',   amount: 3000, frequency: 'MONTHLY' },
];

const STUDENTS = [
  { studentId: 'S1', admissionDate: '2026-03-01' }, // nothing paid -> admission 2000 + March 3000 = 5000
  { studentId: 'S2', admissionDate: '2026-03-01' }, // fully paid -> 0
];

const ALL_FEES = [
  { studentId: 'S2', feeType: 'ADMISSION_FEE', amount: 2000, paymentStatus: 'PAID' },
  { studentId: 'S2', feeType: 'MONTHLY_FEE', month: 'March', academicYear: '2026', amount: 3000, paymentStatus: 'PAID' },
];

test('computes pending per student from batched data, grouping fees by studentId', () => {
  const map = computePendingForStudents({ students: STUDENTS, feeStructures: STRUCTURES, allFees: ALL_FEES, today: TODAY });
  assert.strictEqual(map.get('S1').totalPending, 5000);
  assert.strictEqual(map.get('S2').totalPending, 0);
});

test('a student with no fee rows still gets a result with a breakdown', () => {
  const map = computePendingForStudents({
    students: [{ studentId: 'S9', admissionDate: '2026-03-01' }],
    feeStructures: STRUCTURES,
    allFees: [],
    today: TODAY,
  });
  assert.strictEqual(map.get('S9').totalPending, 5000);
  assert.ok(Array.isArray(map.get('S9').breakdown));
});

test("does not leak one student's fees into another", () => {
  const map = computePendingForStudents({
    students: [{ studentId: 'S1', admissionDate: '2026-03-01' }, { studentId: 'S2', admissionDate: '2026-03-01' }],
    feeStructures: STRUCTURES,
    allFees: [{ studentId: 'S1', feeType: 'ADMISSION_FEE', amount: 2000, paymentStatus: 'PAID' }],
    today: TODAY,
  });
  assert.strictEqual(map.get('S1').totalPending, 3000); // admission paid, March monthly owed
  assert.strictEqual(map.get('S2').totalPending, 5000); // nothing paid
});
