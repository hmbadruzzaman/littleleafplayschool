# Item Charges — Design

**Date:** 2026-06-22
**Status:** Approved (pending spec review)

## Problem

Admins need to bill students for ad-hoc items (books, dress/uniform, etc.) that have
**no common price** — the amount varies by class and size. Each item charge, per student,
needs a tracked **amount paid** and **amount pending**. These charges must be **fully
integrated** with the existing fee system: their pending amounts roll into the student's
overall pending (Pending families list, students-page pending column, fee-details total)
and are payable via Quick Pay alongside monthly/transport/admission dues.

## Background

- Pending is computed by `server/utils/feeCalculations.js` `computePendingUnits`, which
  walks the `FEE_STRUCTURE` table (ONE_TIME / MONTHLY) against the student's FEES rows.
  Ad-hoc items have **no fee structure**, so they are invisible to it today.
- `allocate` (`server/utils/allocatePayment.js`) greedily applies a lump sum across the
  ordered pending units Quick Pay gets from the engine.
- A `PAID` FEES row means a fee is fully settled (never shown in pending). A `PENDING` row
  reduces the outstanding balance. Earnings (`server/models/Fee.js` `getEarningsReport`)
  count every fee with a `paymentDate` in range whose status is `PAID` or `PENDING`;
  unpaid dues have no `paymentDate` and are excluded. (See the Quick Pay design.)
- `feeType` already includes a `MISC` value; we introduce a distinct `OTHER` value for
  these item charges so they are easy to identify and never collide with structured fees.

## Decisions (from brainstorming)

1. **Fully integrated** — item pending rolls into the student's total pending everywhere
   and is payable via Quick Pay.
2. **Managed in the Student details modal** — a new "Other charges" section.
3. **Item names are free text** (no preset list).
4. **No in-place edit in v1** — delete and re-add instead.
5. **Items sort last** in Quick Pay's allocation order (after admission/monthly/transport).

## Design

### Data model (reuse the FEES table, `feeType: 'OTHER'`)

Each charge is an "item" identified by a generated `itemId` (uuid) and a free-text
`itemName`. It comprises:

- **One PENDING row** — the live outstanding balance: `{ feeType:'OTHER', itemId,
  itemName, amount: <pending>, paymentStatus:'PENDING', studentId, rollNumber,
  dueDate: <today> }`. Created only if pending > 0. It carries **no `paymentDate`**.
  Payments shrink this row's `amount`; when it reaches 0 the row is deleted.
- **PAID rows** — income events: `{ feeType:'OTHER', itemId, itemName, amount: <paid>,
  paymentStatus:'PAID', paymentDate, paymentMethod }`. The "amount paid" entered at
  creation makes the first one; each later payment adds another (dated).

Example — "Books — paid ₹200 / pending ₹100" = one PAID row (200, dated) + one PENDING
row (100). Pending = the PENDING row's amount; income = the PAID rows. This nets cleanly
because the original paid amount is separate income, never offset against the pending row.

### Pending engine (`computePendingUnits`)

After emitting the structured units, also emit a unit for every `OTHER` PENDING row
(amount > 0):

```js
{ kind: 'ITEM', feeId, itemId, itemName, feeType: 'OTHER', frequency: 'ITEM',
  remaining: amount, label: itemName }
```

Structured units are tagged `kind: 'STRUCTURE'`. Item units are appended **after** all
structured units (so they sort last). They flow automatically into `totalPending`, the
grouped breakdown, the Pending families list, and the students-page pending column.

`groupUnitsToBreakdown` adds item units to the breakdown as their own entries
(`feeType:'OTHER'`, `frequency:'ITEM'`, `pendingAmount`, `itemName`) so they render in
`ViewFeeDetailsModal`. The breakdown table treats an `ITEM` frequency as a plain "Item"
badge.

### Quick Pay (`allocate` + commit)

- `allocate` walks units in order; item units come last. Each allocation carries `kind`
  (and, for items, `feeId`/`itemId`/`itemName`). Structured allocations keep their
  PAID/partial-PENDING behavior unchanged.
- Commit (`quickPay` controller):
  - `STRUCTURE` allocation → create a FEES row as today (PAID, or PENDING for a partial
    last line).
  - `ITEM` allocation → create a dated PAID `OTHER` income row for the pay amount **and**
    reduce the linked PENDING row: `newAmount = oldAmount − pay`; if `newAmount <= 0`
    delete the PENDING row, else `FeeModel.update(feeId, { amount: newAmount })`.

### Earnings

No formula change. `OTHER` PAID rows count as income and bucket under "Miscellaneous"
(the existing `default` branch of `getEarningsReport`). The owed PENDING rows have no
`paymentDate`, so they are excluded.

### UI — Student details modal

A new **"Other charges"** section in `StudentDetailsModal`:

- Lists the student's items (name · paid · pending) fetched from
  `GET /admin/students/:id/item-charges`.
- **+ Add charge** opens an inline form with three inputs — **item name**, **amount
  paid**, **amount pending** — plus a **payment method** for the paid part. Submit calls
  `POST /admin/students/:id/item-charges`.
- A delete (×) per item calls `DELETE /admin/students/:id/item-charges/:itemId`.

After add/delete/pay, the section and the student's pending refresh.

### Server endpoints (composed with `verifyToken, isAdmin`)

- `GET /admin/students/:id/item-charges` → `{ items: [{ itemId, itemName, paid, pending }] }`,
  grouped from the student's `OTHER` FEES rows (paid = sum of PAID amounts for the itemId;
  pending = the PENDING row's amount, or 0).
- `POST /admin/students/:id/item-charges` → body `{ itemName, amountPaid, amountPending,
  paymentMethod }`. Validates `itemName` non-empty and at least one of the amounts > 0.
  Generates `itemId`; creates the PAID row (if `amountPaid > 0`) and the PENDING row
  (if `amountPending > 0`).
- `DELETE /admin/students/:id/item-charges/:itemId` → deletes all FEES rows for that
  `itemId`.

New controllers live in `adminController.js`; new `adminAPI` methods in
`client/src/services/api.js`.

## Testing

Pure-function unit tests (`node --test`):
- `computePendingUnits` emits an `ITEM` unit (with `feeId`, `remaining = amount`,
  `kind: 'ITEM'`) for each `OTHER` PENDING row, ordered after all structured units.
- `allocate` produces `ITEM` allocations carrying `feeId`, pays them after structured
  dues, and supports a partial item payment as the last touched unit.
- The item-grouping helper computes `paid`/`pending` per `itemId`.

Local-DB integration test: create an item via the endpoint, confirm its paid counts as
income (`getEarningsReport`) and its pending counts toward the student's total; Quick Pay
the student and confirm the item's pending is cleared (PENDING row reduced/deleted) and a
new dated PAID row exists.

## Out of scope

- In-place editing of an item's amounts (delete + re-add instead).
- Preset item catalogs or per-class price templates.
- A dedicated "pay a specific item" flow separate from Quick Pay.
- Changes to the student portal / non-admin roles.
