/**
 * Greedily apply `amount` across ordered pending `units`.
 * The last unit touched may receive a partial amount.
 * Returns { totalPending, allocated, leftover, allocations } where each allocation
 * is a ready-to-write FEES row. A line that fully covers its unit is 'PAID'; a line
 * that only partially covers its unit (the last touched unit) is 'PENDING' — a PAID
 * record settles a fee fully, so a partial must stay PENDING to keep its balance
 * visible. Partial PENDING rows still carry a paymentDate, so they count as income.
 */
function allocate(units, amount, meta = {}) {
  const totalPending = units.reduce((s, u) => s + (u.remaining || 0), 0);
  let left = Math.max(0, parseFloat(amount) || 0);
  const allocations = [];

  for (const u of units) {
    if (left <= 0) break;
    const pay = Math.min(left, u.remaining);
    if (pay <= 0) continue;

    const dueDate = u.frequency === 'MONTHLY'
      ? `${u.year}-${String(monthNumber(u.month)).padStart(2, '0')}-01`
      : (meta.paymentDate || new Date().toISOString().split('T')[0]);

    const paymentStatus = pay < u.remaining ? 'PENDING' : 'PAID';

    allocations.push({
      feeType: u.feeType,
      frequency: u.frequency,
      month: u.month,
      year: u.year,
      academicYear: u.academicYear,
      label: u.label,
      amount: pay,
      dueDate,
      paymentStatus,
      paymentDate: meta.paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod: meta.paymentMethod || 'CASH',
      remarks: meta.remarks || '',
      rollNumber: meta.rollNumber,
    });
    left -= pay;
  }

  const allocated = (parseFloat(amount) || 0) - left;
  return { totalPending, allocated, leftover: left, allocations };
}

const MONTH_NUMBERS = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
};
function monthNumber(monthName) {
  return MONTH_NUMBERS[monthName] || 1;
}

module.exports = { allocate };
