# Add Student: Admission Discount + Other Fees Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the Add Student form, add an Admission Fee discount and let admins capture "Other Fees" (ad-hoc item charges like books/dress) at creation time; also fix that monthly/transport discounts entered on the form aren't currently saved.

**Architecture:** Apply a flat per-student `admissionFeeDiscount` to the one-time admission fee in the pure pending engine (mirroring the existing monthly/transport discounts). Extend `createStudent` to persist all three discounts and to create item-charge rows from an `items` array (reusing the item-charge storage we already built). Add an Admission Fee discount field and an "Other Fees" repeatable item section to the Add Student form.

**Tech Stack:** Node 18+ (CommonJS, Express, DocumentClient via `config/dynamodb.js`), React 18 (CRA), Node built-in test runner (`node --test`). No new dependencies.

---

## Background (verified in code)

- `server/utils/feeCalculations.js` `computePendingUnits` already builds each ONE_TIME unit with `discount: 0` and `effectiveAmount: structure.amount`; the one-time `remaining` currently ignores the discount. Monthly/transport discounts already work via `student.monthlyFeeDiscount` / `student.transportFeeDiscount`.
- `groupUnitsToBreakdown` one-time entries currently omit `discount`/`effectiveAmount`. `client/src/components/modals/ViewFeeDetailsModal.js` already renders a strikethrough + discount + effective amount for ANY breakdown row where `item.discount > 0`, so adding those fields makes the admission discount display automatically.
- `server/controllers/adminController.js` `createStudent` builds `studentData` from a fixed whitelist that **omits** `monthlyFeeDiscount`/`transportFeeDiscount`, so those are silently dropped at creation today. `StudentModel.create` spreads `studentData`, generates `studentId`, and returns the student (so `studentId` is available to create items in the same request).
- `createItemCharge` already creates item rows (a dated PAID income row if `amountPaid > 0` + a PENDING owed row if `amountPending > 0`, sharing a generated `itemId`). We will extract that into a reusable helper.

---

## File Structure

- Modify `server/utils/feeCalculations.js` — apply `admissionFeeDiscount` to the one-time admission fee; include `discount`/`effectiveAmount` in one-time breakdown entries.
- Modify `server/test/computePendingUnits.test.js` — admission-discount tests.
- Modify `server/controllers/adminController.js` — extract `createItemChargeRows` helper; persist the three discounts in `createStudent`; create `items` in `createStudent`.
- Modify `client/src/components/forms/AddStudentForm.js` — Admission Fee discount field + "Other Fees" repeatable item rows + send `admissionFeeDiscount` and `items` in the payload.

---

### Task 1: Apply admission-fee discount in the pending engine

**Files:**
- Modify: `server/utils/feeCalculations.js`
- Test: `server/test/computePendingUnits.test.js`

- [ ] **Step 1: Write the failing tests**

Append to `server/test/computePendingUnits.test.js`:
```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npm test`
Expected: FAIL — admission `remaining`/`discount` not adjusted.

- [ ] **Step 3: Apply the discount in `computePendingUnits`**

In `server/utils/feeCalculations.js`, in the `ONE_TIME` branch of `computePendingUnits`, replace:
```js
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
```
with:
```js
      const typeFees = studentFees.filter(f => f.feeType === structure.feeType);
      const hasPaid = typeFees.some(f => f.paymentStatus === 'PAID');
      const paid = typeFees.filter(f => f.paymentStatus === 'PAID')
        .reduce((s, f) => s + (parseFloat(f.amount) || 0), 0);
      const pending = typeFees.filter(f => f.paymentStatus === 'PENDING')
        .reduce((s, f) => s + (parseFloat(f.amount) || 0), 0);
      // Flat per-student discount on the admission fee (other one-time fees take none).
      const oneTimeDiscount = structure.feeType === 'ADMISSION_FEE'
        ? (parseFloat(student.admissionFeeDiscount) || 0)
        : 0;
      const oneTimeEffective = Math.max(0, structure.amount - oneTimeDiscount);
      const remaining = hasPaid ? 0 : Math.max(0, oneTimeEffective - pending);

      if (remaining > 0) {
        oneTimeUnits.push({
          feeType: structure.feeType,
          frequency: 'ONE_TIME',
          month: null,
          year: null,
          academicYear: null,
          structureAmount: structure.amount,
          discount: oneTimeDiscount,
          effectiveAmount: oneTimeEffective,
          paidAmount: paid,
          remaining,
          label: prettyFeeType(structure.feeType),
        });
      }
      continue;
```

- [ ] **Step 4: Surface the discount in the breakdown**

In `server/utils/feeCalculations.js`, in `groupUnitsToBreakdown`, replace the ONE_TIME push:
```js
    } else if (u.frequency === 'ONE_TIME') {
      oneTime.push({
        feeType: u.feeType,
        structureAmount: u.structureAmount,
        pendingAmount: u.remaining,
        paidAmount: u.paidAmount,
        frequency: 'ONE_TIME',
      });
```
with:
```js
    } else if (u.frequency === 'ONE_TIME') {
      oneTime.push({
        feeType: u.feeType,
        structureAmount: u.structureAmount,
        discount: u.discount,
        effectiveAmount: u.effectiveAmount,
        pendingAmount: u.remaining,
        paidAmount: u.paidAmount,
        frequency: 'ONE_TIME',
      });
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd server && npm test`
Expected: PASS — new admission tests green; all prior tests still green.

- [ ] **Step 6: Commit**

```bash
git add server/utils/feeCalculations.js server/test/computePendingUnits.test.js
git commit -m "feat: apply admission fee discount in pending engine"
```

---

### Task 2: Persist discounts and create items in `createStudent`

**Files:**
- Modify: `server/controllers/adminController.js`

- [ ] **Step 1: Extract a reusable item-row creator**

In `server/controllers/adminController.js`, immediately ABOVE `exports.getItemCharges = async (req, res) => {`, add a module-level helper:
```js
// Create the FEES rows for one ad-hoc item charge: a dated PAID income row (if any
// amount was paid) and a PENDING owed row (if any amount is still owed), sharing one
// itemId. Returns the itemId.
async function createItemChargeRows(student, { itemName, amountPaid = 0, amountPending = 0, paymentMethod = 'CASH' }) {
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
    return itemId;
}
```

- [ ] **Step 2: Use the helper in `createItemCharge`**

In `server/controllers/adminController.js`, in `exports.createItemCharge`, replace the inline creation block:
```js
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
```
with:
```js
        const itemId = await createItemChargeRows(student, { itemName, amountPaid, amountPending, paymentMethod });

        res.status(201).json(successResponse({ itemId, itemName }, 'Item charge added'));
```

- [ ] **Step 3: Persist discounts + create items in `createStudent`**

In `server/controllers/adminController.js`, in `exports.createStudent`, replace the destructure line:
```js
        const { fullName, dateOfBirth, parentName, parentPhone, parentEmail, address, class: className, password, transportEnabled, transportStartMonth, admissionDate } = req.body;
```
with:
```js
        const { fullName, dateOfBirth, parentName, parentPhone, parentEmail, address, class: className, password, transportEnabled, transportStartMonth, admissionDate, items } = req.body;
```

Then replace:
```js
        // Add excludeAdmissionFee field
        studentData.excludeAdmissionFee = req.body.excludeAdmissionFee || false;

        // Store plain password for admin reference
        studentData.plainPassword = password;

        const student = await StudentModel.create(studentData);

        res.status(201).json(successResponse({ user, student, rollNumber }, `Student created successfully with roll number: ${rollNumber}`));
```
with:
```js
        // Add excludeAdmissionFee field
        studentData.excludeAdmissionFee = req.body.excludeAdmissionFee || false;

        // Persist per-student fee discounts (flat ₹). Previously dropped at creation.
        studentData.monthlyFeeDiscount = parseFloat(req.body.monthlyFeeDiscount) || 0;
        studentData.transportFeeDiscount = parseFloat(req.body.transportFeeDiscount) || 0;
        studentData.admissionFeeDiscount = parseFloat(req.body.admissionFeeDiscount) || 0;

        // Store plain password for admin reference
        studentData.plainPassword = password;

        const student = await StudentModel.create(studentData);

        // Capture "Other Fees" (ad-hoc item charges) supplied at creation time.
        if (Array.isArray(items)) {
            for (const it of items) {
                const itemName = (it.itemName || '').trim();
                const amountPaid = parseFloat(it.amountPaid) || 0;
                const amountPending = parseFloat(it.amountPending) || 0;
                if (itemName && (amountPaid > 0 || amountPending > 0)) {
                    await createItemChargeRows(student, { itemName, amountPaid, amountPending });
                }
            }
        }

        res.status(201).json(successResponse({ user, student, rollNumber }, `Student created successfully with roll number: ${rollNumber}`));
```

- [ ] **Step 4: Smoke-test the module loads**

Run: `cd server && node -e "require('./controllers/adminController'); console.log('OK')"`
Expected: prints `OK`.

- [ ] **Step 5: Run tests**

Run: `cd server && npm test`
Expected: all tests still pass (unchanged count).

- [ ] **Step 6: Commit**

```bash
git add server/controllers/adminController.js
git commit -m "feat: createStudent persists discounts and creates item charges"
```

---

### Task 3: Add Student form — Admission discount + Other Fees

**Files:**
- Modify: `client/src/components/forms/AddStudentForm.js`

- [ ] **Step 1: Add form state for the discount and items**

In `client/src/components/forms/AddStudentForm.js`, add `admissionFeeDiscount: 0` to the initial `formData` object (after `transportFeeDiscount: 0`, adding a comma):
```js
        monthlyFeeDiscount: 0,
        transportFeeDiscount: 0,
        admissionFeeDiscount: 0
```
Then, directly after the `const [generatedRollNumber, setGeneratedRollNumber] = useState('');` line, add:
```js
    const [items, setItems] = useState([]);

    const addItemRow = () => setItems(prev => [...prev, { itemName: '', amountPaid: '', amountPending: '' }]);
    const updateItemRow = (index, field, value) =>
        setItems(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
    const removeItemRow = (index) => setItems(prev => prev.filter((_, i) => i !== index));
```

- [ ] **Step 2: Send the discount + items in the request body**

In `client/src/components/forms/AddStudentForm.js`, in `handleSubmit`, replace:
```js
                body: JSON.stringify(formData)
```
with:
```js
                body: JSON.stringify({
                    ...formData,
                    items: items
                        .map(it => ({
                            itemName: (it.itemName || '').trim(),
                            amountPaid: parseFloat(it.amountPaid) || 0,
                            amountPending: parseFloat(it.amountPending) || 0,
                        }))
                        .filter(it => it.itemName && (it.amountPaid > 0 || it.amountPending > 0)),
                })
```

- [ ] **Step 3: Add the Admission Fee discount field**

In `client/src/components/forms/AddStudentForm.js`, find the Monthly Fee Discount group:
```jsx
                    <div className="form-group">
                        <label>Monthly Fee Discount (₹)</label>
```
Immediately BEFORE that `<div className="form-group">`, insert (the admission discount is irrelevant when admission is excluded, so it is hidden in that case):
```jsx
                    {!formData.excludeAdmissionFee && (
                        <div className="form-group">
                            <label>Admission Fee Discount (₹)</label>
                            <input
                                type="number"
                                name="admissionFeeDiscount"
                                min="0"
                                value={formData.admissionFeeDiscount}
                                onChange={handleChange}
                            />
                            <small style={{color: '#6b7280', fontSize: '0.85rem'}}>
                                Flat amount subtracted from the one-time admission fee (default 0)
                            </small>
                        </div>
                    )}

```

- [ ] **Step 4: Add the "Other Fees" item section**

In `client/src/components/forms/AddStudentForm.js`, find the `<div className="form-actions">` block at the end of the form. Immediately BEFORE it, insert:
```jsx
                    <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <label style={{ margin: 0, fontWeight: 500 }}>Other Fees (books, dress, etc.)</label>
                            <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={addItemRow}>
                                + Add item
                            </button>
                        </div>
                        <small style={{ color: '#6b7280', fontSize: '0.85rem', display: 'block', marginBottom: 10 }}>
                            Optional one-off charges. Pending amounts roll into the student’s dues and are payable via Quick Pay.
                        </small>
                        {items.map((row, index) => (
                            <div key={index} className="form-row" style={{ alignItems: 'flex-end', gap: 8, marginBottom: 8 }}>
                                <div className="form-group" style={{ flex: 2 }}>
                                    <label>Item Name</label>
                                    <input type="text" value={row.itemName}
                                        onChange={e => updateItemRow(index, 'itemName', e.target.value)}
                                        placeholder="e.g., Books, Dress" />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Paid (₹)</label>
                                    <input type="number" min="0" step="0.01" value={row.amountPaid}
                                        onChange={e => updateItemRow(index, 'amountPaid', e.target.value)}
                                        placeholder="0" />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Pending (₹)</label>
                                    <input type="number" min="0" step="0.01" value={row.amountPending}
                                        onChange={e => updateItemRow(index, 'amountPending', e.target.value)}
                                        placeholder="0" />
                                </div>
                                <button type="button" onClick={() => removeItemRow(index)}
                                    className="btn btn-danger"
                                    style={{ background: '#ef4444', color: 'white', border: 'none', marginBottom: 16 }}>
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>

```

- [ ] **Step 5: Verify the client builds**

Run: `cd client && npm run build`
Expected: build succeeds with no new warnings (pre-existing warnings like `ROLE_LABELS` in TeachersSection are fine).

- [ ] **Step 6: Commit**

```bash
git add client/src/components/forms/AddStudentForm.js
git commit -m "feat: admission discount and other-fee items on Add Student form"
```

---

### Task 4: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Start both apps**

Run: `cd server && npm run local` and `cd client && npm start`; log in as admin.

- [ ] **Step 2: Create a student with discounts + items**

Add a student. Set Monthly Fee Discount, Transport Fee Discount (enable transport), and Admission Fee Discount to non-zero. Add two "Other Fees" rows (e.g., Books paid 0 / pending 450; Dress paid 200 / pending 100). Create.

- [ ] **Step 3: Confirm integration**

Open the new student's **View Fee Details**:
- The admission row shows the discounted (effective) amount and reduced pending.
- Monthly/transport pending reflect their discounts (confirming discounts now persist at creation).
- The breakdown lists "Books" and "Dress" as Item rows with the right pending.
- The student's total pending equals the discounted structure dues + item pending.
- Open the student details modal → **Other Charges** lists Books and Dress with the entered paid/pending.

- [ ] **Step 4: Final checks**

Run: `cd server && npm test` (all green) and `cd client && npm run build` (succeeds).

---

## Self-Review Notes

- **Spec coverage:** admission discount field + engine application (Tasks 1, 3) ✓; "Other Fees" items captured at creation (Tasks 2, 3) ✓; items have no discount (form only collects name/paid/pending) ✓; Add Student form only, Edit untouched ✓; admission discount displays in fee details (Task 1 Step 4 + existing modal logic) ✓.
- **Bonus fix:** monthly/transport discounts are now actually persisted at creation (Task 2 Step 3) — they were being dropped.
- **Reuse:** item creation goes through the shared `createItemChargeRows` helper used by both `createItemCharge` and `createStudent`; the admission discount flows through the same `computePendingUnits` used by per-student and batch (`computePendingForStudents`) paths, so it shows everywhere automatically.
- **Type consistency:** `admissionFeeDiscount` (student field) → `computePendingUnits` one-time `discount`/`effectiveAmount` → breakdown entry fields → `ViewFeeDetailsModal` discount rendering; `items` payload shape `{ itemName, amountPaid, amountPending }` matches `createItemChargeRows`'s expected argument.
- **Testing note:** per the user's standing direction, end-to-end is manual (Task 4); the local-DB shim is not used as a test substitute. Pure engine logic is unit-tested (Task 1).
