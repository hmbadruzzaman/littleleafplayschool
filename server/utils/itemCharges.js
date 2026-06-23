/**
 * Group a student's OTHER ('item charge') FEES rows by itemId.
 * paid = sum of PAID amounts; pending = sum of PENDING amounts (the live owed balance).
 * Returns items sorted by itemName for stable display/tests.
 */
function groupItemCharges(fees) {
  const map = new Map();
  for (const fee of fees) {
    if (fee.feeType !== 'OTHER') continue;
    const key = fee.itemId;
    const g = map.get(key) || { itemId: fee.itemId, itemName: fee.itemName, paid: 0, pending: 0 };
    const amount = parseFloat(fee.amount) || 0;
    if (fee.paymentStatus === 'PAID') g.paid += amount;
    else if (fee.paymentStatus === 'PENDING') g.pending += amount;
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => String(a.itemName).localeCompare(String(b.itemName)));
}

module.exports = { groupItemCharges };
