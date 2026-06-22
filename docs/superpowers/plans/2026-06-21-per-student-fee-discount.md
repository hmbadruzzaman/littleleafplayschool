# Per-Student Monthly & Transport Fee Discounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each student an admin-editable flat ₹ discount on their monthly fee and transport fee that reduces the calculated pending amount per month.

**Architecture:** Two new optional numeric fields (`monthlyFeeDiscount`, `transportFeeDiscount`) on the student record, both defaulting to `0`. `server/utils/feeCalculations.js` subtracts the matching discount from the per-month fee amount (floored at 0) for `MONTHLY_FEE`/`TRANSPORT_FEE` structures. The two admin student forms gain inputs that flow through `req.body` to the existing create/update controllers (no controller change). `ViewFeeDetailsModal` surfaces the discount in the breakdown.

**Tech Stack:** Node.js/Express + AWS DynamoDB DocumentClient (with in-memory local shim), React 18 (CRA). No test framework exists; the core calculation is verified by a standalone Node assertion script run with `node` against the local in-memory DB (`USE_LOCAL_DB=true`).

---

## File Structure

- **Modify** `server/utils/feeCalculations.js` — apply per-fee-type discount in the `MONTHLY` branch; add `discount`/`effectiveAmount` to the breakdown entry.
- **Create** `server/test/feeDiscount.test.js` — standalone Node assertion script seeding the local DB and asserting discounted pending math.
- **Modify** `client/src/components/forms/EditStudentForm.js` — two discount inputs + `formData` init.
- **Modify** `client/src/components/forms/AddStudentForm.js` — two discount inputs + `formData` init.
- **Modify** `client/src/components/modals/ViewFeeDetailsModal.js` — show discount/effective amount in the pending breakdown table.

No DB migration: DynamoDB and the local shim are schemaless; absent fields are read as `0`.

---

## Task 1: Apply discount in pending calculation (with Node test)

**Files:**
- Create: `server/test/feeDiscount.test.js`
- Modify: `server/utils/feeCalculations.js` (the `MONTHLY` branch, currently around lines 70–185)

- [ ] **Step 1: Write the failing test**

Create `server/test/feeDiscount.test.js`. It sets `USE_LOCAL_DB` before requiring the config so it runs fully in-memory, seeds two monthly fee structures and one student whose `admissionDate` is the first of the current month (so exactly one month — the current month — is due), then asserts the discounted totals.

```js
// Run with: node server/test/feeDiscount.test.js
process.env.USE_LOCAL_DB = 'true';

const assert = require('assert');
const { docClient, TABLES } = require('../config/dynamodb');
const { calculatePendingFeesForStudent } = require('../utils/feeCalculations');

// First day of the current month, formatted YYYY-MM-DD, so the month loop
// produces exactly one due month (the current one).
function firstOfThisMonth() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
}

function thisMonthYYYYMM() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

async function seedStructures() {
    await docClient.put({
        TableName: TABLES.FEE_STRUCTURE,
        Item: { feeStructureId: 'FEE_STRUCTURE#MONTHLY_FEE', feeType: 'MONTHLY_FEE', frequency: 'MONTHLY', amount: 1000 }
    }).promise();
    await docClient.put({
        TableName: TABLES.FEE_STRUCTURE,
        Item: { feeStructureId: 'FEE_STRUCTURE#TRANSPORT_FEE', feeType: 'TRANSPORT_FEE', frequency: 'MONTHLY', amount: 500 }
    }).promise();
}

async function run() {
    await seedStructures();
    const admissionDate = firstOfThisMonth();

    // Case A: normal discounts. Monthly 1000 - 200 = 800, transport 500 - 100 = 400.
    const studentA = {
        studentId: 'STU#test-A',
        admissionDate,
        transportEnabled: true,
        transportStartMonth: thisMonthYYYYMM(),
        monthlyFeeDiscount: 200,
        transportFeeDiscount: 100
    };
    const resultA = await calculatePendingFeesForStudent(studentA);
    assert.strictEqual(resultA.totalPending, 1200, `Case A expected 1200, got ${resultA.totalPending}`);
    const monthlyA = resultA.breakdown.find(b => b.feeType === 'MONTHLY_FEE');
    assert.strictEqual(monthlyA.discount, 200, 'Case A monthly discount should be 200');
    assert.strictEqual(monthlyA.effectiveAmount, 800, 'Case A monthly effective should be 800');
    assert.strictEqual(monthlyA.pendingAmount, 800, 'Case A monthly pending should be 800');

    // Case B: discount >= fee floors at 0 and does not go negative.
    const studentB = {
        studentId: 'STU#test-B',
        admissionDate,
        transportEnabled: false,
        monthlyFeeDiscount: 2000, // greater than the 1000 fee
        transportFeeDiscount: 0
    };
    const resultB = await calculatePendingFeesForStudent(studentB);
    assert.strictEqual(resultB.totalPending, 0, `Case B expected 0, got ${resultB.totalPending}`);

    // Case C: default (no discount fields) behaves as before — full amount due.
    const studentC = {
        studentId: 'STU#test-C',
        admissionDate,
        transportEnabled: false
    };
    const resultC = await calculatePendingFeesForStudent(studentC);
    assert.strictEqual(resultC.totalPending, 1000, `Case C expected 1000, got ${resultC.totalPending}`);

    console.log('All fee discount assertions passed.');
}

run().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node server/test/feeDiscount.test.js`
Expected: FAIL — an `AssertionError` on Case A (`expected 1200, got 1500`) because the discount is not yet applied. (Case A monthly pending is 1000 and transport 500 → 1500.)

- [ ] **Step 3: Apply the discount in the MONTHLY branch**

In `server/utils/feeCalculations.js`, inside the `else if (structure.frequency === 'MONTHLY')` branch, find this block that sets the per-month due amount inside the month loop:

```js
                    const amountDue = structure.amount;
```

Replace it with a reference to a discounted amount computed once per structure:

```js
                    const amountDue = effectiveAmount;
```

Then, immediately after the line `const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);` (just before `let monthPending = 0;`), add the discount resolution:

```js
            // Resolve the per-student discount for this fee type (flat ₹/month).
            let feeDiscount = 0;
            if (structure.feeType === 'MONTHLY_FEE') {
                feeDiscount = parseFloat(student.monthlyFeeDiscount) || 0;
            } else if (structure.feeType === 'TRANSPORT_FEE') {
                feeDiscount = parseFloat(student.transportFeeDiscount) || 0;
            }
            const effectiveAmount = Math.max(0, structure.amount - feeDiscount);
```

- [ ] **Step 4: Add discount + effectiveAmount to the breakdown entry**

Still in the `MONTHLY` branch, find the `pendingBreakdown.push({ ... })` call (the one with `frequency: 'MONTHLY'`) and add the two new fields:

```js
                pendingBreakdown.push({
                    feeType: structure.feeType,
                    structureAmount: structure.amount,
                    discount: feeDiscount,
                    effectiveAmount,
                    pendingAmount: monthPending,
                    frequency: 'MONTHLY',
                    months
                });
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node server/test/feeDiscount.test.js`
Expected: PASS — prints `All fee discount assertions passed.`

- [ ] **Step 6: Commit**

```bash
git add server/utils/feeCalculations.js server/test/feeDiscount.test.js
git commit -m "feat(fees): apply per-student monthly & transport discounts to pending calculation"
```

---

## Task 2: Add discount inputs to EditStudentForm

**Files:**
- Modify: `client/src/components/forms/EditStudentForm.js`

- [ ] **Step 1: Initialize the two fields in formData**

In `client/src/components/forms/EditStudentForm.js`, find the `useState` initializer (ends around line 18) and add the two fields after `excludeAdmissionFee`:

```js
        transportEnabled: student.transportEnabled || false,
        transportStartMonth: student.transportStartMonth || '',
        excludeAdmissionFee: student.excludeAdmissionFee || false,
        monthlyFeeDiscount: student.monthlyFeeDiscount || 0,
        transportFeeDiscount: student.transportFeeDiscount || 0
```

- [ ] **Step 2: Add the input fields to the form**

In the same file, locate the `excludeAdmissionFee` `form-group` block (around lines 259–276) and insert this new block immediately **before** it (so the discounts sit with the other fee controls):

```jsx
                    <div className="form-group">
                        <label>Monthly Fee Discount (₹)</label>
                        <input
                            type="number"
                            name="monthlyFeeDiscount"
                            min="0"
                            value={formData.monthlyFeeDiscount}
                            onChange={handleChange}
                        />
                        <small style={{color: '#6b7280', fontSize: '0.85rem'}}>
                            Flat amount subtracted from the monthly fee each month (default 0)
                        </small>
                    </div>

                    {formData.transportEnabled && (
                        <div className="form-group">
                            <label>Transport Fee Discount (₹)</label>
                            <input
                                type="number"
                                name="transportFeeDiscount"
                                min="0"
                                value={formData.transportFeeDiscount}
                                onChange={handleChange}
                            />
                            <small style={{color: '#6b7280', fontSize: '0.85rem'}}>
                                Flat amount subtracted from the transport fee each month (default 0)
                            </small>
                        </div>
                    )}
```

Note: `handleChange` already stores the raw input value; the server coerces with `parseFloat(...) || 0`, so an empty field is safely treated as 0.

- [ ] **Step 3: Verify the form renders and saves**

Run the client (`cd client && npm start`) and server (`cd server && npm run local`), open an existing student's Edit form as admin. Expected: "Monthly Fee Discount (₹)" input is visible and pre-filled (0 for students without the field); the transport discount input appears only when transport is enabled. Set monthly discount to a value, save, reopen Edit — the value persists.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/forms/EditStudentForm.js
git commit -m "feat(students): add monthly & transport fee discount inputs to edit form"
```

---

## Task 3: Add discount inputs to AddStudentForm

**Files:**
- Modify: `client/src/components/forms/AddStudentForm.js`

- [ ] **Step 1: Initialize the two fields in formData**

In `client/src/components/forms/AddStudentForm.js`, find the `useState` initializer (ends around line 26) and add the two fields after `excludeAdmissionFee`:

```js
        transportEnabled: false,
        transportStartMonth: '',
        excludeAdmissionFee: false,
        monthlyFeeDiscount: 0,
        transportFeeDiscount: 0
```

- [ ] **Step 2: Add the input fields to the form**

In the same file, locate the transport block — the `{formData.transportEnabled && ( ... )}` group that ends around line 322, immediately before `<div className="form-actions">`. Insert this **after** that transport block and **before** `form-actions`:

```jsx
                    <div className="form-group">
                        <label>Monthly Fee Discount (₹)</label>
                        <input
                            type="number"
                            name="monthlyFeeDiscount"
                            min="0"
                            value={formData.monthlyFeeDiscount}
                            onChange={handleChange}
                        />
                        <small style={{color: '#6b7280', fontSize: '0.85rem'}}>
                            Flat amount subtracted from the monthly fee each month (default 0)
                        </small>
                    </div>

                    {formData.transportEnabled && (
                        <div className="form-group">
                            <label>Transport Fee Discount (₹)</label>
                            <input
                                type="number"
                                name="transportFeeDiscount"
                                min="0"
                                value={formData.transportFeeDiscount}
                                onChange={handleChange}
                            />
                            <small style={{color: '#6b7280', fontSize: '0.85rem'}}>
                                Flat amount subtracted from the transport fee each month (default 0)
                            </small>
                        </div>
                    )}
```

- [ ] **Step 3: Verify the form creates a student with discounts**

With client + server running, open Add Student as admin, fill required fields, set a monthly discount, create. Then open that student's Edit form (Task 2) and confirm the discount value round-trips.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/forms/AddStudentForm.js
git commit -m "feat(students): add monthly & transport fee discount inputs to add form"
```

---

## Task 4: Surface discount in the pending breakdown

**Files:**
- Modify: `client/src/components/modals/ViewFeeDetailsModal.js`

- [ ] **Step 1: Show discount and effective amount in the Structure Amount cell**

In `client/src/components/modals/ViewFeeDetailsModal.js`, find the structure-amount cell (around line 161):

```jsx
                                                        <td>₹{parseFloat(item.structureAmount || 0).toFixed(2)}</td>
```

Replace it with a version that, when a discount is present, shows the original amount struck through plus the discount and the effective amount:

```jsx
                                                        <td>
                                                            {item.discount > 0 ? (
                                                                <>
                                                                    <span style={{ textDecoration: 'line-through', color: '#9ca3af' }}>
                                                                        ₹{parseFloat(item.structureAmount || 0).toFixed(2)}
                                                                    </span>
                                                                    <br />
                                                                    <span style={{ color: '#059669', fontSize: '0.85rem' }}>
                                                                        − ₹{parseFloat(item.discount || 0).toFixed(2)} discount
                                                                    </span>
                                                                    <br />
                                                                    <strong>₹{parseFloat(item.effectiveAmount || 0).toFixed(2)}</strong>
                                                                </>
                                                            ) : (
                                                                <>₹{parseFloat(item.structureAmount || 0).toFixed(2)}</>
                                                            )}
                                                        </td>
```

`ONE_TIME` rows have no `discount` field, so `item.discount > 0` is false and they render unchanged.

- [ ] **Step 2: Verify the breakdown displays the discount**

With client + server running, open a student who has a monthly discount and pending months (View Fee Details). Expected: the monthly/transport row shows the original amount struck through, the discount, and the reduced effective amount; the Pending Amount column reflects the discounted total. A student with no discount shows the plain amount as before.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/modals/ViewFeeDetailsModal.js
git commit -m "feat(fees): show per-student discount in pending breakdown"
```

---

## Self-Review Notes

- **Spec coverage:** data model (Tasks 2/3 inputs + schemaless persistence), per-month floored discount in calculation (Task 1), admin-only edit (forms are admin-gated), default 0 (`|| 0` on both ends), breakdown transparency (Task 1 fields + Task 4 display), out-of-scope items untouched (ONE_TIME branch, earnings report, recorded Fee records all unchanged). All covered.
- **Type consistency:** breakdown fields `discount` and `effectiveAmount` are produced in Task 1 and consumed by the same names in Task 4; student fields `monthlyFeeDiscount`/`transportFeeDiscount` are written by Tasks 2/3 and read in Task 1.
- **No placeholders:** every code step contains complete code.
