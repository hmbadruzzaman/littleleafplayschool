# Item Charges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins add ad-hoc per-student item charges (books, dress, etc.) with an amount paid and an amount pending, fully integrated into the existing pending total, Pending families list, fee-details breakdown, and Quick Pay.

**Architecture:** Store each item as FEES rows with `feeType: 'OTHER'` sharing a generated `itemId` — one PENDING row holding the live outstanding balance, plus dated PAID income rows. Extend the pure pending engine to emit an `ITEM` unit per `OTHER` PENDING row (ordered last), extend the allocator/commit so Quick Pay pays items by creating a dated PAID row and shrinking the owed PENDING row, and add a "Other charges" section to the student details modal.

**Tech Stack:** Node 18+ (CommonJS, Express, AWS SDK v2 DocumentClient via `config/dynamodb.js`), React 18 (CRA), Node built-in test runner (`node --test`). No new dependencies.

---

## File Structure

**Server**
- Create `server/utils/itemCharges.js` — pure `groupItemCharges(fees)` → grouped items.
- Modify `server/utils/feeCalculations.js` — emit `ITEM` units in `computePendingUnits`; handle `ITEM` in `groupUnitsToBreakdown` (and export it for testing).
- Modify `server/utils/allocatePayment.js` — tag allocations with `kind`; carry item fields for `ITEM` units.
- Modify `server/models/Fee.js` — add `delete(feeId)`.
- Modify `server/controllers/adminController.js` — item-charges controllers (list/create/delete); extend `quickPay` commit to handle `ITEM` allocations.
- Modify `server/routes/admin.js` — three item-charges routes.
- Tests: extend `server/test/computePendingUnits.test.js` and `server/test/allocatePayment.test.js`; create `server/test/itemCharges.test.js`, `server/test/groupBreakdown.test.js`, `server/test/itemChargesFlow.test.js`.

**Client**
- Modify `client/src/services/api.js` — `getItemCharges` / `createItemCharge` / `deleteItemCharge`.
- Modify `client/src/components/modals/StudentDetailsModal.js` — "Other charges" section + add form + delete.
- Modify `client/src/components/modals/ViewFeeDetailsModal.js` — render `ITEM` breakdown rows sensibly.

---

## Shared contracts

**Item FEES rows** (`feeType: 'OTHER'`):
- PENDING (live outstanding): `{ feeId, studentId, rollNumber, feeType:'OTHER', itemId, itemName, amount, paymentStatus:'PENDING', dueDate }` — never has `paymentDate`.
- PAID (income event): `{ feeId, studentId, rollNumber, feeType:'OTHER', itemId, itemName, amount, paymentStatus:'PAID', paymentDate, paymentMethod, dueDate }`.

**ITEM pending unit** (from `computePendingUnits`):
```js
{ kind:'ITEM', feeType:'OTHER', frequency:'ITEM', feeId, itemId, itemName, remaining, label }
```
Structured units are tagged `kind:'STRUCTURE'`. Item units sort **after** all structured units.

**ITEM allocation** (from `allocate`): a structured allocation plus
`{ kind:'ITEM', feeId, itemId, itemName, itemRemainingAfter }`. `paymentStatus` is always `'PAID'` for an item allocation (the new dated income row); the owed PENDING row is shrunk separately.

**Grouped item** (from `groupItemCharges` / the GET endpoint):
`{ itemId, itemName, paid, pending }`.

---

### Task 1: `groupItemCharges` pure helper

**Files:**
- Create: `server/utils/itemCharges.js`
- Test: `server/test/itemCharges.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/test/itemCharges.test.js`:
```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test`
Expected: FAIL — cannot find module `../utils/itemCharges`.

- [ ] **Step 3: Implement the helper**

Create `server/utils/itemCharges.js`:
```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/utils/itemCharges.js server/test/itemCharges.test.js
git commit -m "feat: groupItemCharges helper for OTHER fee rows"
```

---

### Task 2: Emit `ITEM` units + breakdown handling in `feeCalculations.js`

**Files:**
- Modify: `server/utils/feeCalculations.js`
- Test: `server/test/computePendingUnits.test.js` (extend), `server/test/groupBreakdown.test.js` (new)

- [ ] **Step 1: Write the failing tests**

Append to `server/test/computePendingUnits.test.js`:
```js
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
```

Create `server/test/groupBreakdown.test.js`:
```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npm test`
Expected: FAIL — `groupUnitsToBreakdown` not exported / no ITEM units emitted.

- [ ] **Step 3: Implement — emit item units**

In `server/utils/feeCalculations.js`, find the return of `computePendingUnits`:
```js
  // Strip the internal sort field before returning.
  return [...oneTimeUnits, ...monthlyUnits].map(({ monthIndex, ...u }) => u);
}
```
Replace it with:
```js
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
```

- [ ] **Step 4: Implement — breakdown handles ITEM, and export it**

In `server/utils/feeCalculations.js`, in `groupUnitsToBreakdown`, replace the `for` loop body:
```js
  for (const u of units) {
    totalPending += u.remaining;
    if (u.frequency === 'ONE_TIME') {
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

  return { totalPending, breakdown: [...oneTime, ...monthlyByType.values()] };
```
with:
```js
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
```

Then update the module exports at the bottom of the file:
```js
module.exports = {
  computePendingUnits,
  getPendingUnits,
  calculatePendingFeesForStudent,
};
```
to:
```js
module.exports = {
  computePendingUnits,
  getPendingUnits,
  calculatePendingFeesForStudent,
  groupUnitsToBreakdown,
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd server && npm test`
Expected: PASS — new tests green; all prior tests still green.

- [ ] **Step 6: Commit**

```bash
git add server/utils/feeCalculations.js server/test/computePendingUnits.test.js server/test/groupBreakdown.test.js
git commit -m "feat: pending engine emits ITEM units and breakdown entries"
```

---

### Task 3: `allocate` handles `ITEM` units

**Files:**
- Modify: `server/utils/allocatePayment.js`
- Test: `server/test/allocatePayment.test.js` (extend)

- [ ] **Step 1: Write the failing test**

Append to `server/test/allocatePayment.test.js`:
```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test`
Expected: FAIL — allocations lack `kind`/`itemRemainingAfter`.

- [ ] **Step 3: Implement**

In `server/utils/allocatePayment.js`, replace the body of the `for` loop:
```js
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
```
with:
```js
  for (const u of units) {
    if (left <= 0) break;
    const pay = Math.min(left, u.remaining);
    if (pay <= 0) continue;

    const isItem = u.kind === 'ITEM';
    const dueDate = u.frequency === 'MONTHLY'
      ? `${u.year}-${String(monthNumber(u.month)).padStart(2, '0')}-01`
      : (meta.paymentDate || new Date().toISOString().split('T')[0]);

    // A partial structured line stays PENDING to keep its balance visible. An item
    // payment is always a PAID income row; the owed PENDING row is shrunk on commit.
    const paymentStatus = isItem ? 'PAID' : (pay < u.remaining ? 'PENDING' : 'PAID');

    const allocation = {
      feeType: u.feeType,
      frequency: u.frequency,
      kind: isItem ? 'ITEM' : 'STRUCTURE',
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
    };
    if (isItem) {
      allocation.feeId = u.feeId;
      allocation.itemId = u.itemId;
      allocation.itemName = u.itemName;
      allocation.itemRemainingAfter = u.remaining - pay;
    }
    allocations.push(allocation);
    left -= pay;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npm test`
Expected: PASS — new tests green; prior allocate tests still green.

- [ ] **Step 5: Commit**

```bash
git add server/utils/allocatePayment.js server/test/allocatePayment.test.js
git commit -m "feat: allocate handles item-charge units"
```

---

### Task 4: `FeeModel.delete` + item-charges endpoints + Quick Pay commit

**Files:**
- Modify: `server/models/Fee.js`
- Modify: `server/controllers/adminController.js`
- Modify: `server/routes/admin.js`

- [ ] **Step 1: Add `FeeModel.delete`**

In `server/models/Fee.js`, immediately after the `update` method (before `getAll`), add:
```js
    // Delete a fee row by id
    static async delete(feeId) {
        await docClient.delete({
            TableName: TABLES.FEES,
            Key: { feeId }
        }).promise();
    }
```

- [ ] **Step 2: Add the require for the grouping helper**

In `server/controllers/adminController.js`, below the line
`const { allocate } = require('../utils/allocatePayment');`, add:
```js
const { groupItemCharges } = require('../utils/itemCharges');
```

- [ ] **Step 3: Update the Quick Pay commit loop to handle ITEM allocations**

In `server/controllers/adminController.js`, in `exports.quickPay`, replace the write loop:
```js
        for (const a of result.allocations) {
            await FeeModel.create({
                studentId: student.studentId,
                rollNumber: student.rollNumber,
                feeType: a.feeType,
                amount: a.amount,
                month: a.month || '',
                academicYear: a.academicYear || '',
                dueDate: a.dueDate,
                paymentStatus: a.paymentStatus,
                paymentMethod: a.paymentMethod,
                paymentDate: a.paymentDate,
                remarks: a.remarks
            });
        }
```
with:
```js
        for (const a of result.allocations) {
            if (a.kind === 'ITEM') {
                // Record a dated PAID income row for this item payment...
                await FeeModel.create({
                    studentId: student.studentId,
                    rollNumber: student.rollNumber,
                    feeType: 'OTHER',
                    itemId: a.itemId,
                    itemName: a.itemName,
                    amount: a.amount,
                    dueDate: a.dueDate,
                    paymentStatus: 'PAID',
                    paymentMethod: a.paymentMethod,
                    paymentDate: a.paymentDate,
                    remarks: a.remarks
                });
                // ...and shrink (or clear) the owed PENDING row.
                if (a.itemRemainingAfter > 0) {
                    await FeeModel.update(a.feeId, { amount: a.itemRemainingAfter });
                } else {
                    await FeeModel.delete(a.feeId);
                }
            } else {
                await FeeModel.create({
                    studentId: student.studentId,
                    rollNumber: student.rollNumber,
                    feeType: a.feeType,
                    amount: a.amount,
                    month: a.month || '',
                    academicYear: a.academicYear || '',
                    dueDate: a.dueDate,
                    paymentStatus: a.paymentStatus,
                    paymentMethod: a.paymentMethod,
                    paymentDate: a.paymentDate,
                    remarks: a.remarks
                });
            }
        }
```

- [ ] **Step 4: Add the item-charges controllers**

In `server/controllers/adminController.js`, immediately after `exports.quickPay = async (req, res) => { ... };` (ends ~line 566), add:
```js
// List a student's item charges (books, dress, etc.), grouped by itemId
exports.getItemCharges = async (req, res) => {
    try {
        const { studentId } = req.params;
        const student = await StudentModel.findById(studentId);
        if (!student) {
            return res.status(404).json(errorResponse('Student not found'));
        }
        const fees = await FeeModel.getByStudentId(studentId);
        res.status(200).json(successResponse({ items: groupItemCharges(fees) }, 'Item charges fetched'));
    } catch (error) {
        console.error('Get item charges error:', error);
        res.status(500).json(errorResponse('Failed to fetch item charges', error.message));
    }
};

// Add an item charge: optional dated PAID income row + optional owed PENDING row
exports.createItemCharge = async (req, res) => {
    try {
        const { studentId } = req.params;
        const itemName = (req.body.itemName || '').trim();
        const amountPaid = parseFloat(req.body.amountPaid) || 0;
        const amountPending = parseFloat(req.body.amountPending) || 0;
        const paymentMethod = req.body.paymentMethod || 'CASH';

        if (!itemName) {
            return res.status(400).json(errorResponse('Item name is required'));
        }
        if (amountPaid <= 0 && amountPending <= 0) {
            return res.status(400).json(errorResponse('Enter a paid and/or pending amount'));
        }

        const student = await StudentModel.findById(studentId);
        if (!student) {
            return res.status(404).json(errorResponse('Student not found'));
        }

        const itemId = `ITEM#${uuidv4()}`;
        const today = new Date().toISOString().split('T')[0];

        if (amountPaid > 0) {
            await FeeModel.create({
                studentId: student.studentId,
                rollNumber: student.rollNumber,
                feeType: 'OTHER',
                itemId,
                itemName,
                amount: amountPaid,
                dueDate: today,
                paymentStatus: 'PAID',
                paymentMethod,
                paymentDate: today
            });
        }
        if (amountPending > 0) {
            await FeeModel.create({
                studentId: student.studentId,
                rollNumber: student.rollNumber,
                feeType: 'OTHER',
                itemId,
                itemName,
                amount: amountPending,
                dueDate: today,
                paymentStatus: 'PENDING'
            });
        }

        res.status(201).json(successResponse({ itemId, itemName }, 'Item charge added'));
    } catch (error) {
        console.error('Create item charge error:', error);
        res.status(500).json(errorResponse('Failed to add item charge', error.message));
    }
};

// Delete an item charge (all rows sharing the itemId for this student)
exports.deleteItemCharge = async (req, res) => {
    try {
        const { studentId, itemId } = req.params;
        const fees = await FeeModel.getByStudentId(studentId);
        const rows = fees.filter(f => f.feeType === 'OTHER' && f.itemId === itemId);
        if (rows.length === 0) {
            return res.status(404).json(errorResponse('Item charge not found'));
        }
        for (const row of rows) {
            await FeeModel.delete(row.feeId);
        }
        res.status(200).json(successResponse({ itemId, deleted: rows.length }, 'Item charge deleted'));
    } catch (error) {
        console.error('Delete item charge error:', error);
        res.status(500).json(errorResponse('Failed to delete item charge', error.message));
    }
};
```

- [ ] **Step 5: Add the routes**

In `server/routes/admin.js`, after the two `quick-pay` routes, add:
```js
router.get('/students/:studentId/item-charges', adminController.getItemCharges);
router.post('/students/:studentId/item-charges', adminController.createItemCharge);
router.delete('/students/:studentId/item-charges/:itemId', adminController.deleteItemCharge);
```

- [ ] **Step 6: Smoke-test the server modules load**

Run: `cd server && node -e "require('./controllers/adminController'); require('./routes/admin'); require('./models/Fee'); console.log('OK')"`
Expected: prints `OK`.

- [ ] **Step 7: Run tests**

Run: `cd server && npm test`
Expected: all prior tests still pass.

- [ ] **Step 8: Commit**

```bash
git add server/models/Fee.js server/controllers/adminController.js server/routes/admin.js
git commit -m "feat: item-charge endpoints and Quick Pay item commit"
```

---

### Task 5: Client API methods

**Files:**
- Modify: `client/src/services/api.js`

- [ ] **Step 1: Add the methods**

In `client/src/services/api.js`, in the `adminAPI` object after `getFeeStructures: () => api.get('/admin/fee-structure'),`, add:
```js
    getItemCharges: (studentId) =>
        api.get(`/admin/students/${encodeURIComponent(studentId)}/item-charges`),
    createItemCharge: (studentId, payload) =>
        api.post(`/admin/students/${encodeURIComponent(studentId)}/item-charges`, payload),
    deleteItemCharge: (studentId, itemId) =>
        api.delete(`/admin/students/${encodeURIComponent(studentId)}/item-charges/${encodeURIComponent(itemId)}`),
```

- [ ] **Step 2: Verify the client builds**

Run: `cd client && npm run build`
Expected: build succeeds (only pre-existing warnings).

- [ ] **Step 3: Commit**

```bash
git add client/src/services/api.js
git commit -m "feat: item-charge client API methods"
```

---

### Task 6: "Other charges" section in `StudentDetailsModal`

**Files:**
- Modify: `client/src/components/modals/StudentDetailsModal.js`

- [ ] **Step 1: Import hooks, API, and add state**

In `client/src/components/modals/StudentDetailsModal.js`, change the React import on line 1:
```js
import React, { useState } from 'react';
```
to:
```js
import React, { useState, useEffect } from 'react';
```
Add the API import after line 1:
```js
import { adminAPI } from '../../services/api';
```
After the `isUpdatingStatus` state (line ~19), add:
```js
    const [items, setItems] = useState([]);
    const [itemsLoading, setItemsLoading] = useState(true);
    const [showAddItem, setShowAddItem] = useState(false);
    const [itemForm, setItemForm] = useState({ itemName: '', amountPaid: '', amountPending: '', paymentMethod: 'CASH' });
    const [itemError, setItemError] = useState('');
    const [savingItem, setSavingItem] = useState(false);
```

- [ ] **Step 2: Add the fetch + handlers**

In `client/src/components/modals/StudentDetailsModal.js`, after the `if (!student) return null;` line (~line 21), add:
```js
    const fmtItem = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

    const fetchItems = async () => {
        setItemsLoading(true);
        try {
            const res = await adminAPI.getItemCharges(student.studentId);
            if (res.data.success) setItems(res.data.data.items || []);
        } catch (err) {
            console.error('Error fetching item charges:', err);
        } finally {
            setItemsLoading(false);
        }
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        const paid = parseFloat(itemForm.amountPaid) || 0;
        const pending = parseFloat(itemForm.amountPending) || 0;
        if (!itemForm.itemName.trim()) { setItemError('Item name is required'); return; }
        if (paid <= 0 && pending <= 0) { setItemError('Enter a paid and/or pending amount'); return; }
        setSavingItem(true);
        setItemError('');
        try {
            const res = await adminAPI.createItemCharge(student.studentId, {
                itemName: itemForm.itemName.trim(),
                amountPaid: paid,
                amountPending: pending,
                paymentMethod: itemForm.paymentMethod,
            });
            if (res.data.success) {
                setItemForm({ itemName: '', amountPaid: '', amountPending: '', paymentMethod: 'CASH' });
                setShowAddItem(false);
                await fetchItems();
                if (onUpdate) onUpdate();
            } else {
                setItemError(res.data.message || 'Failed to add item charge');
            }
        } catch (err) {
            setItemError(err.response?.data?.message || 'Failed to add item charge');
        } finally {
            setSavingItem(false);
        }
    };

    const handleDeleteItem = async (itemId) => {
        try {
            await adminAPI.deleteItemCharge(student.studentId, itemId);
            await fetchItems();
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error('Error deleting item charge:', err);
        }
    };
```

- [ ] **Step 2b: Add the effect with the other hooks (before the `!student` guard)**

The component early-returns with `if (!student) return null;` after its `useState` calls. A `useEffect` must run on every render (Rules of Hooks — placing it after the conditional return is a build-breaking error in CRA), so add it **immediately after the `useState` block from Step 1 and BEFORE `if (!student) return null;`**, guarding the body so it is safe when `student` is absent:
```js
    useEffect(() => {
        if (student?.studentId) fetchItems();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [student?.studentId]);
```
`fetchItems` is defined below (Step 2) as a `const`; the effect closure only runs after render, by which point it is assigned, so the forward reference is fine. The `exhaustive-deps` disable matches the existing convention in this file (other modals here already omit fetch functions from deps).

- [ ] **Step 3: Render the Other charges section**

In `client/src/components/modals/StudentDetailsModal.js`, find the start of the Quick Actions section:
```jsx
                        <div className="details-section">
                            <h3>Quick Actions</h3>
```
Immediately BEFORE it, insert:
```jsx
                        <div className="details-section">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0 }}>Other Charges</h3>
                                <button className="btn btn-primary" style={{ fontSize: 13 }}
                                    onClick={() => { setShowAddItem(v => !v); setItemError(''); }}>
                                    {showAddItem ? 'Cancel' : '+ Add charge'}
                                </button>
                            </div>
                            <small style={{ color: '#6b7280', fontSize: '0.85rem', display: 'block', margin: '4px 0 12px' }}>
                                Ad-hoc items (books, dress, etc.). Pending amounts roll into the student’s dues and are payable via Quick Pay.
                            </small>

                            {showAddItem && (
                                <form onSubmit={handleAddItem} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                                    {itemError && <div className="error-message" style={{ marginBottom: 8 }}>{itemError}</div>}
                                    <div className="form-group">
                                        <label>Item Name *</label>
                                        <input type="text" value={itemForm.itemName}
                                            onChange={e => setItemForm(f => ({ ...f, itemName: e.target.value }))}
                                            placeholder="e.g., Books, Dress" />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Amount Paid (₹)</label>
                                            <input type="number" min="0" step="0.01" value={itemForm.amountPaid}
                                                onChange={e => setItemForm(f => ({ ...f, amountPaid: e.target.value }))}
                                                placeholder="0" />
                                        </div>
                                        <div className="form-group">
                                            <label>Amount Pending (₹)</label>
                                            <input type="number" min="0" step="0.01" value={itemForm.amountPending}
                                                onChange={e => setItemForm(f => ({ ...f, amountPending: e.target.value }))}
                                                placeholder="0" />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Payment Method (for paid part)</label>
                                        <select value={itemForm.paymentMethod}
                                            onChange={e => setItemForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                                            <option value="CASH">Cash</option>
                                            <option value="CARD">Card</option>
                                            <option value="UPI">UPI</option>
                                            <option value="NET_BANKING">Net Banking</option>
                                            <option value="CHEQUE">Cheque</option>
                                        </select>
                                    </div>
                                    <div className="form-actions">
                                        <button type="submit" className="btn btn-primary" disabled={savingItem}>
                                            {savingItem ? 'Saving…' : 'Add charge'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {itemsLoading ? (
                                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Loading…</p>
                            ) : items.length === 0 ? (
                                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>No item charges yet.</p>
                            ) : (
                                <table className="data-table">
                                    <thead>
                                        <tr><th>Item</th><th>Paid</th><th>Pending</th><th></th></tr>
                                    </thead>
                                    <tbody>
                                        {items.map(it => (
                                            <tr key={it.itemId}>
                                                <td><strong>{it.itemName}</strong></td>
                                                <td>{fmtItem(it.paid)}</td>
                                                <td style={{ color: it.pending > 0 ? '#dc2626' : 'inherit', fontWeight: it.pending > 0 ? 600 : 400 }}>
                                                    {fmtItem(it.pending)}
                                                </td>
                                                <td>
                                                    <button className="btn btn-danger btn-sm"
                                                        onClick={() => handleDeleteItem(it.itemId)}
                                                        style={{ background: '#ef4444', color: 'white', border: 'none' }}>
                                                        ×
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
```

- [ ] **Step 4: Verify the client builds**

Run: `cd client && npm run build`
Expected: build succeeds with no new errors. (A `rules-of-hooks` error means the `useEffect` is misplaced — it must be before `if (!student) return null;`.)

- [ ] **Step 5: Commit**

```bash
git add client/src/components/modals/StudentDetailsModal.js
git commit -m "feat: Other charges section in student details modal"
```

---

### Task 7: Render `ITEM` breakdown rows in `ViewFeeDetailsModal`

The breakdown table currently assumes `ONE_TIME`/`MONTHLY` rows. Item rows have `frequency:'ITEM'`, an `itemName`, and only `pendingAmount`. Make them render with the item name, an "Item" badge, and dashes for the structure-only columns.

**Files:**
- Modify: `client/src/components/modals/ViewFeeDetailsModal.js`

- [ ] **Step 1: Show the item name in the Fee Type cell**

In `client/src/components/modals/ViewFeeDetailsModal.js`, find:
```jsx
                                                        <td>
                                                            <strong>{item.feeType.replace(/_/g, ' ')}</strong>
                                                        </td>
```
Replace with:
```jsx
                                                        <td>
                                                            <strong>{item.frequency === 'ITEM' ? item.itemName : item.feeType.replace(/_/g, ' ')}</strong>
                                                        </td>
```

- [ ] **Step 2: Add an "Item" badge in the Frequency cell**

In the same file, find:
```jsx
                                                            <span className="status-badge" style={{
                                                                backgroundColor: item.frequency === 'ONE_TIME' ? '#dbeafe' : '#fef3c7',
                                                                color: item.frequency === 'ONE_TIME' ? '#1e40af' : '#92400e'
                                                            }}>
                                                                {item.frequency === 'ONE_TIME' ? 'One Time' : 'Monthly'}
                                                            </span>
```
Replace with:
```jsx
                                                            <span className="status-badge" style={{
                                                                backgroundColor: item.frequency === 'ITEM' ? '#ede9fe' : item.frequency === 'ONE_TIME' ? '#dbeafe' : '#fef3c7',
                                                                color: item.frequency === 'ITEM' ? '#5b21b6' : item.frequency === 'ONE_TIME' ? '#1e40af' : '#92400e'
                                                            }}>
                                                                {item.frequency === 'ITEM' ? 'Item' : item.frequency === 'ONE_TIME' ? 'One Time' : 'Monthly'}
                                                            </span>
```

- [ ] **Step 3: Show a dash for the Structure Amount column on item rows**

In the same file, find the Structure Amount cell:
```jsx
                                                            ) : (
                                                                <>₹{parseFloat(item.structureAmount || 0).toFixed(2)}</>
                                                            )}
```
Replace with:
```jsx
                                                            ) : item.frequency === 'ITEM' ? (
                                                                <>—</>
                                                            ) : (
                                                                <>₹{parseFloat(item.structureAmount || 0).toFixed(2)}</>
                                                            )}
```

- [ ] **Step 4: Verify the client builds**

Run: `cd client && npm run build`
Expected: build succeeds with no new warnings.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/modals/ViewFeeDetailsModal.js
git commit -m "feat: render item charges in fee details breakdown"
```

---

### Task 8: Local-DB integration test (income + pending + Quick Pay)

**Files:**
- Create: `server/test/itemChargesFlow.test.js`

- [ ] **Step 1: Write the test**

Create `server/test/itemChargesFlow.test.js`:
```js
// Runs against the in-memory local DB shim (node --test isolates each file's process).
process.env.USE_LOCAL_DB = 'true';

const test = require('node:test');
const assert = require('node:assert');
const { docClient, TABLES } = require('../config/dynamodb');
const FeeModel = require('../models/Fee');
const { calculatePendingFeesForStudent, getPendingUnits } = require('../utils/feeCalculations');
const { groupItemCharges } = require('../utils/itemCharges');
const { allocate } = require('../utils/allocatePayment');

const STUDENT = { studentId: 'STU2026900', rollNumber: 'R900', fullName: 'Item Kid', status: 'ACTIVE',
    admissionDate: '2026-06-01', transportEnabled: false };

async function putFee(item) {
    await docClient.put({ TableName: TABLES.FEES, Item: { feeId: `FEE#${Math.random()}`, studentId: STUDENT.studentId, ...item } }).promise();
}

// Mirror of the quickPay commit loop for ITEM + STRUCTURE allocations.
async function commitQuickPay(amount) {
    const units = await getPendingUnits(STUDENT);
    const result = allocate(units, amount, { rollNumber: STUDENT.rollNumber, paymentMethod: 'CASH', paymentDate: '2026-06-22' });
    for (const a of result.allocations) {
        if (a.kind === 'ITEM') {
            await FeeModel.create({ studentId: STUDENT.studentId, rollNumber: STUDENT.rollNumber, feeType: 'OTHER',
                itemId: a.itemId, itemName: a.itemName, amount: a.amount, dueDate: a.dueDate,
                paymentStatus: 'PAID', paymentMethod: a.paymentMethod, paymentDate: a.paymentDate });
            if (a.itemRemainingAfter > 0) await FeeModel.update(a.feeId, { amount: a.itemRemainingAfter });
            else await FeeModel.delete(a.feeId);
        } else {
            await FeeModel.create({ studentId: STUDENT.studentId, rollNumber: STUDENT.rollNumber, feeType: a.feeType,
                amount: a.amount, month: a.month || '', academicYear: a.academicYear || '', dueDate: a.dueDate,
                paymentStatus: a.paymentStatus, paymentMethod: a.paymentMethod, paymentDate: a.paymentDate });
        }
    }
    return result;
}

test('item charge: paid counts as income, pending counts toward dues, Quick Pay clears it', async () => {
    await docClient.put({ TableName: TABLES.STUDENTS, Item: STUDENT }).promise();
    // No fee structures -> only the item drives pending.
    // Add "Books": paid 200 (income, dated) + pending 100 (owed).
    await putFee({ feeType: 'OTHER', itemId: 'ITEM#books', itemName: 'Books', amount: 200, paymentStatus: 'PAID', paymentDate: '2026-06-10', dueDate: '2026-06-10' });
    await putFee({ feeType: 'OTHER', itemId: 'ITEM#books', itemName: 'Books', amount: 100, paymentStatus: 'PENDING', dueDate: '2026-06-10' });

    // Grouping shows paid 200 / pending 100.
    const grouped = groupItemCharges(await FeeModel.getByStudentId(STUDENT.studentId));
    assert.deepStrictEqual(grouped, [{ itemId: 'ITEM#books', itemName: 'Books', paid: 200, pending: 100 }]);

    // Income within June counts the 200, not the owed 100 (no paymentDate).
    const earnings = await FeeModel.getEarningsReport('2026-06-01', '2026-06-30');
    assert.strictEqual(earnings.totalEarnings, 200);

    // Pending total = the item's 100.
    const before = await calculatePendingFeesForStudent(STUDENT);
    assert.strictEqual(before.totalPending, 100);
    assert.ok(before.breakdown.some(b => b.frequency === 'ITEM' && b.itemName === 'Books' && b.pendingAmount === 100));

    // Quick Pay 100 clears the item: owed PENDING row deleted, a new dated PAID row added.
    const r = await commitQuickPay(100);
    assert.strictEqual(r.allocated, 100);
    const after = await calculatePendingFeesForStudent(STUDENT);
    assert.strictEqual(after.totalPending, 0);
    const groupedAfter = groupItemCharges(await FeeModel.getByStudentId(STUDENT.studentId));
    assert.deepStrictEqual(groupedAfter, [{ itemId: 'ITEM#books', itemName: 'Books', paid: 300, pending: 0 }]);
});
```

- [ ] **Step 2: Run the test**

Run: `cd server && npm test`
Expected: PASS — all tests green.

- [ ] **Step 3: Commit**

```bash
git add server/test/itemChargesFlow.test.js
git commit -m "test: item-charge end-to-end flow against local DB"
```

---

### Task 9: End-to-end manual verification

**Files:** none (verification only)

- [ ] **Step 1: Start both apps**

Run: `cd server && npm run local` (terminal 1) and `cd client && npm start` (terminal 2). Log in as admin (`ADM001 / password123`).

- [ ] **Step 2: Add an item charge**

Open a student → **Other Charges** → **+ Add charge**. Enter "Books", Amount Paid 200, Amount Pending 100, save. Confirm the row shows Paid ₹200.00 / Pending ₹100.00.

- [ ] **Step 3: Confirm integration**

- The student's pending (students-page Pending column, Pending families on the Fees page) increased by ₹100.
- Open **View Fee Details** → the breakdown shows a "Books" row with an **Item** badge and ₹100 pending.
- **Quick Pay** the student for an amount that covers the dues → the preview lists "Books" as a line; after recording, the item shows Pending ₹0.00 and the pending total dropped.
- The Fees page "Collected this month" reflects the paid amounts (income).

- [ ] **Step 4: Delete**

Add a throwaway item, then click its × → it disappears and pending drops accordingly.

- [ ] **Step 5: Final checks**

Run: `cd server && npm test` (all green) and `cd client && npm run build` (succeeds).

---

## Self-Review Notes

- **Spec coverage:** data model (Tasks 1, 4) ✓; pending-engine integration (Task 2) ✓; Quick Pay item commit (Tasks 3, 4) ✓; earnings unchanged but verified (Task 8) ✓; Student-details "Other charges" UI (Task 6) ✓; fee-details breakdown rendering (Task 7) ✓; three endpoints (Task 4) ✓; free-text names / no edit / items sort last (Tasks 2, 4, 6) ✓; tests for pure functions + integration (Tasks 1, 2, 3, 8) ✓.
- **Status semantics:** item payments create a dated PAID income row and shrink the owed PENDING row — preserving the rule that a PAID row never reduces another row's balance and that only `paymentDate`-bearing rows count as income.
- **Type consistency:** ITEM unit shape (`kind/feeId/itemId/itemName/remaining/frequency:'ITEM'`) → ITEM allocation (`kind/feeId/itemId/itemName/itemRemainingAfter`) → commit (`FeeModel.update`/`delete` by `feeId`) → grouped item (`itemId/itemName/paid/pending`) are consistent across tasks.
- **Hooks safety:** the new `useEffect` in `StudentDetailsModal` is placed with the other hooks, before the `!student` early return (Task 6 Step 2b), avoiding a rules-of-hooks build error.