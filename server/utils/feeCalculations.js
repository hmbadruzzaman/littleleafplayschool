const { docClient, TABLES } = require('../config/dynamodb');
const FeeModel = require('../models/Fee');

const FEE_TYPE_PRIORITY = { MONTHLY_FEE: 0, TRANSPORT_FEE: 1 };
const ONE_TIME_PRIORITY = { ADMISSION_FEE: 0, ANNUAL_FEE: 1, EXAM_FEE: 2, MISC: 3 };

function prettyFeeType(feeType) {
  return String(feeType || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function parseAdmissionDate(student) {
  const str = student.admissionDate || student.createdAt || new Date().toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(str);
}

/**
 * Pure pending engine. Returns an ordered, flat list of pending units.
 * Order: all ONE_TIME units (by ONE_TIME_PRIORITY), then MONTHLY units sorted by
 * (year, monthIndex) then FEE_TYPE_PRIORITY.
 *
 * A PAID record settles its fee/month fully — it is never shown in pending,
 * regardless of amount. Otherwise PENDING records reduce the remaining (this is how
 * a partial payment keeps its outstanding balance visible):
 *   remaining = hasPaid ? 0 : max(0, effectiveAmount - sum(PENDING))
 */
function computePendingUnits({ student, feeStructures, studentFees, today }) {
  const now = today || new Date();
  const admissionDate = parseAdmissionDate(student);

  const oneTimeUnits = [];
  const monthlyUnits = [];

  for (const structure of feeStructures) {
    if (structure.frequency === 'ONE_TIME') {
      if (student.excludeAdmissionFee && structure.feeType === 'ADMISSION_FEE') continue;

      const typeFees = studentFees.filter(f => f.feeType === structure.feeType);
      const hasPaid = typeFees.some(f => f.paymentStatus === 'PAID');
      const paid = typeFees.filter(f => f.paymentStatus === 'PAID')
        .reduce((s, f) => s + (parseFloat(f.amount) || 0), 0);
      const pending = typeFees.filter(f => f.paymentStatus === 'PENDING')
        .reduce((s, f) => s + (parseFloat(f.amount) || 0), 0);
      const remaining = hasPaid ? 0 : Math.max(0, structure.amount - pending);

      if (remaining > 0) {
        oneTimeUnits.push({
          feeType: structure.feeType,
          frequency: 'ONE_TIME',
          month: null,
          year: null,
          academicYear: null,
          structureAmount: structure.amount,
          discount: 0,
          effectiveAmount: structure.amount,
          paidAmount: paid,
          remaining,
          label: prettyFeeType(structure.feeType),
        });
      }
      continue;
    }

    if (structure.frequency !== 'MONTHLY') continue;

    // Resolve start month + discount per fee type.
    let startMonth;
    let discount = 0;
    if (structure.feeType === 'TRANSPORT_FEE') {
      if (!student.transportEnabled) continue;
      if (student.transportStartMonth) {
        const [y, m] = student.transportStartMonth.split('-').map(Number);
        startMonth = new Date(y, m - 1, 1);
      } else {
        startMonth = new Date(admissionDate.getFullYear(), admissionDate.getMonth(), 1);
      }
      discount = parseFloat(student.transportFeeDiscount) || 0;
    } else {
      startMonth = new Date(admissionDate.getFullYear(), admissionDate.getMonth(), 1);
      if (structure.feeType === 'MONTHLY_FEE') {
        discount = parseFloat(student.monthlyFeeDiscount) || 0;
      }
    }
    const effectiveAmount = Math.max(0, structure.amount - discount);
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    for (let d = new Date(startMonth); d <= currentMonth; d.setMonth(d.getMonth() + 1)) {
      const monthName = d.toLocaleString('default', { month: 'long' });
      const year = d.getFullYear();
      const monthIndex = d.getMonth();

      const monthPayments = studentFees.filter(f =>
        f.feeType === structure.feeType &&
        f.month === monthName &&
        f.academicYear && String(f.academicYear).includes(String(year))
      );
      const hasPaid = monthPayments.some(f => f.paymentStatus === 'PAID');
      const paid = monthPayments.filter(f => f.paymentStatus === 'PAID')
        .reduce((s, f) => s + (parseFloat(f.amount) || 0), 0);
      const pending = monthPayments.filter(f => f.paymentStatus === 'PENDING')
        .reduce((s, f) => s + (parseFloat(f.amount) || 0), 0);
      const remaining = hasPaid ? 0 : Math.max(0, effectiveAmount - pending);

      if (remaining > 0) {
        monthlyUnits.push({
          feeType: structure.feeType,
          frequency: 'MONTHLY',
          month: monthName,
          year,
          monthIndex,
          academicYear: String(year),
          structureAmount: structure.amount,
          discount,
          effectiveAmount,
          paidAmount: paid,
          remaining,
          label: `${prettyFeeType(structure.feeType)} — ${monthName} ${year}`,
        });
      }
    }
  }

  oneTimeUnits.sort((a, b) =>
    (ONE_TIME_PRIORITY[a.feeType] ?? 9) - (ONE_TIME_PRIORITY[b.feeType] ?? 9));

  monthlyUnits.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if (a.monthIndex !== b.monthIndex) return a.monthIndex - b.monthIndex;
    return (FEE_TYPE_PRIORITY[a.feeType] ?? 9) - (FEE_TYPE_PRIORITY[b.feeType] ?? 9);
  });

  // Ad-hoc item charges: one ITEM unit per OTHER PENDING row, sorted by name, last.
  const itemUnits = studentFees
    .filter(f => f.feeType === 'OTHER' && f.paymentStatus === 'PENDING' && (parseFloat(f.amount) || 0) > 0)
    .map(f => ({
      kind: 'ITEM',
      feeType: 'OTHER',
      frequency: 'ITEM',
      feeId: f.feeId,
      itemId: f.itemId,
      itemName: f.itemName,
      remaining: parseFloat(f.amount) || 0,
      label: f.itemName || 'Other charge',
    }))
    .sort((a, b) => String(a.itemName).localeCompare(String(b.itemName)));

  // Strip the internal sort field; tag structured units so consumers can branch on kind.
  const structured = [...oneTimeUnits, ...monthlyUnits].map(({ monthIndex, ...u }) => ({ kind: 'STRUCTURE', ...u }));
  return [...structured, ...itemUnits];
}

/** Async wrapper: fetch fee structures + student fees, then compute units. */
async function getPendingUnits(student) {
  const feeStructuresResult = await docClient.scan({ TableName: TABLES.FEE_STRUCTURE }).promise();
  const feeStructures = feeStructuresResult.Items || [];
  const studentFees = await FeeModel.getByStudentId(student.studentId);
  return computePendingUnits({ student, feeStructures, studentFees, today: new Date() });
}

/**
 * Group pending units into the legacy breakdown shape consumed by the client
 * (ViewFeeDetailsModal) and the reports endpoint. Response shape is unchanged.
 */
function groupUnitsToBreakdown(units) {
  let totalPending = 0;
  const oneTime = [];
  const monthlyByType = new Map();

  const items = [];
  for (const u of units) {
    totalPending += u.remaining;
    if (u.frequency === 'ITEM') {
      items.push({
        feeType: u.feeType,
        frequency: 'ITEM',
        itemName: u.itemName,
        pendingAmount: u.remaining,
      });
    } else if (u.frequency === 'ONE_TIME') {
      oneTime.push({
        feeType: u.feeType,
        structureAmount: u.structureAmount,
        pendingAmount: u.remaining,
        paidAmount: u.paidAmount,
        frequency: 'ONE_TIME',
      });
    } else {
      const g = monthlyByType.get(u.feeType) || {
        feeType: u.feeType,
        structureAmount: u.structureAmount,
        discount: u.discount,
        effectiveAmount: u.effectiveAmount,
        pendingAmount: 0,
        frequency: 'MONTHLY',
        months: [],
      };
      g.pendingAmount += u.remaining;
      g.months.push(`${u.month} ${u.year}: ₹${u.remaining}`);
      monthlyByType.set(u.feeType, g);
    }
  }

  return { totalPending, breakdown: [...oneTime, ...monthlyByType.values(), ...items] };
}

async function calculatePendingFeesForStudent(student) {
  const units = await getPendingUnits(student);
  const { totalPending, breakdown } = groupUnitsToBreakdown(units);
  return { studentId: student.studentId, totalPending, breakdown };
}

module.exports = {
  computePendingUnits,
  getPendingUnits,
  calculatePendingFeesForStudent,
  groupUnitsToBreakdown,
};
