# Per-Student Monthly & Transport Fee Discounts

**Date:** 2026-06-21
**Status:** Approved (design)

## Problem

Each student should have an admin-editable discount (a flat ₹ amount) on their
**monthly fee** and on their **transport fee**. Both default to `0`. When the
system calculates a student's pending amount, the discount must be subtracted so
the discounted portion is never counted as pending.

## Requirements

- Per student, two independent discount amounts:
  - Monthly fee discount
  - Transport fee discount
- Each defaults to `0`.
- Only the admin can edit them (they live on the admin-managed student record).
- Discounts apply **per month, recurring**: each unpaid month contributes
  `feeAmount - discount` to pending, not a one-time lump sum.
- The effective amount is floored at `0` — a discount greater than or equal to
  the fee yields `0` for that month, never a negative that reduces other pending.
- Discounts affect the **calculated pending** amount only. They do not alter
  already-recorded `Fee` payment records and do not change earnings reports.

## Design

### 1. Data model

Two new optional fields on the student record (`server/models/Student.js` items):

- `monthlyFeeDiscount` (number, default `0`) — ₹ subtracted from the `MONTHLY_FEE`
  amount each month.
- `transportFeeDiscount` (number, default `0`) — ₹ subtracted from the
  `TRANSPORT_FEE` amount each month.

No migration required. DynamoDB (and the local in-memory shim) are schemaless;
students saved before this change have no such field and are read as `0` via
`parseFloat(student.<field>) || 0`. New/edited students get the fields through
`req.body`, which `updateStudent`/`createStudent` already pass straight to
`StudentModel`.

### 2. Pending calculation — `server/utils/feeCalculations.js`

In the `MONTHLY` frequency branch, before the per-month loop, resolve the
discount for the current structure by fee type:

- `TRANSPORT_FEE` → `transportFeeDiscount`
- `MONTHLY_FEE` → `monthlyFeeDiscount`
- any other monthly structure → `0`

Compute once per structure:

```js
const discount = parseFloat(/* field by feeType */) || 0;
const effectiveAmount = Math.max(0, structure.amount - discount);
```

Use `effectiveAmount` as `amountDue` for every month in the loop (replacing the
current `const amountDue = structure.amount;`). All existing per-month logic
(checking for `PAID` status, summing `PENDING` records, flooring at 0) stays the
same, just driven by the discounted amount.

Add `discount` and `effectiveAmount` to the `pendingBreakdown` entry pushed for
monthly structures so the reduced amount is traceable:

```js
pendingBreakdown.push({
    feeType: structure.feeType,
    structureAmount: structure.amount,
    discount,            // new
    effectiveAmount,     // new
    pendingAmount: monthPending,
    frequency: 'MONTHLY',
    months
});
```

The `ONE_TIME` branch is unchanged.

### 3. Admin UI — `client/src/components/forms/AddStudentForm.js` and `EditStudentForm.js`

Add two number inputs (`min=0`, default `0`) in the existing fees/transport
section of each form:

- "Monthly Fee Discount (₹)" → `monthlyFeeDiscount`
- "Transport Fee Discount (₹)" → `transportFeeDiscount`

Initialize in `formData` like the existing fee-related fields
(`EditStudentForm`: `student.monthlyFeeDiscount || 0`; `AddStudentForm`: `0`).
No controller change — values flow through `req.body` to
`StudentModel.update`/`create`.

### 4. Display

Where the pending breakdown is already rendered (e.g.
`StudentDetailsModal` / fee-details view), surface the `discount` and
`effectiveAmount` for monthly structures so the admin can see why a monthly
amount is reduced. Display-only; no behavioral change.

## Out of scope

- Percentage-based discounts (only flat ₹ amounts).
- Discounts on one-time fees (admission, annual, exam, misc).
- Retroactive edits to recorded `Fee` payments.
- Changes to earnings/collection reports.
