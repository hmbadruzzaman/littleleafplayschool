# Quick Pay — Design

**Date:** 2026-06-22
**Status:** Approved (pending spec review)

## Problem

Every admin surface that shows a student's pending dues (Fees section, fee-details
modal, student-details modal, reports) only lets the admin record fees one line at a
time via `RecordFeePaymentForm`. The admin wants to enter a **single lump-sum amount**
and have the system automatically map it across the student's pending items (admission,
monthly tuition, transport, etc.), generating the correct `FEES` records — including a
partial payment when the amount doesn't fully cover the next item.

## Background — how fees work today

- **Pending is computed, not stored.** `server/utils/feeCalculations.js`
  (`calculatePendingFeesForStudent`) derives pending per student by walking the
  `FEE_STRUCTURE` table (each entry is `ONE_TIME` or `MONTHLY`) against the student's
  existing `FEES` records, honoring admission date, transport start month
  (`transportEnabled` / `transportStartMonth`), and per-student discounts
  (`monthlyFeeDiscount`, `transportFeeDiscount`, `excludeAdmissionFee`).
- **Recording a payment = creating `FEES` rows** with `paymentStatus: 'PAID'` (one row
  per month for monthly fees). `FeeModel.create` writes the row.
- **Current monthly logic treats a month as fully paid if it has *any* `PAID` record.**
  A partial amount can today only be represented as a `PENDING` record, which would not
  count as collected income in earnings reports.
- **Month matching** in the calc uses `feeType` + month name + `academicYear.includes(year)`.

### Admin pending surfaces

| Surface | File | Today |
|---|---|---|
| Fees section "Pending families" list | `client/src/pages/admin/FeesSection.js` | shows per-family totals; generic Record Payment button |
| Fee details modal (per-category breakdown) | `client/src/components/modals/ViewFeeDetailsModal.js` | breakdown table; no pay action |
| Student details modal | `client/src/components/modals/StudentDetailsModal.js` | has Record Payment (preselected) + opens fee details |
| Reports | `client/src/pages/admin/ReportsSection.js` | pending list (read-only report) |

## Decisions (from brainstorming)

1. **Allocation order:** one-time fees first, then monthly dues **oldest → newest**.
   Within a month, `MONTHLY_FEE` before `TRANSPORT_FEE`. The last item touched may be partial.
2. **Partial handling (revised):** a `PAID` record always means a fee/month is **fully
   settled** and is never shown in pending, regardless of amount — this is an intentional
   business rule. So a leftover that only partially covers the next item is recorded as a
   **`PENDING`** row (which keeps that month's outstanding balance visible). Because the
   partial row carries a `paymentDate`, it **still counts as collected income**. Full
   Quick-Pay lines are written `PAID`; only the partial last line is `PENDING`. Earnings
   are computed as "every fee with a `paymentDate` in range whose status is `PAID` or
   `PENDING`" — unpaid `PENDING`/`OVERDUE` dues have no `paymentDate` and are excluded.
3. **Leftover/overpayment:** if the amount exceeds total pending, the excess is shown to
   the admin but **not stored** (no credit balance).
4. **`RecordFeePaymentForm` is kept** for manual itemized entry; Quick Pay is the fast path.
5. **Admin-only.** The student portal is untouched.

## Design

### Server

**a. Refactor `feeCalculations.js` — extract `getPendingUnits(student)`.**
Returns an ordered, atomic list of pending units:

```js
[{ feeType, frequency, month?, academicYear?, structureAmount, effectiveAmount, remaining }, …]
// order: all ONE_TIME units first, then MONTHLY units by month oldest→newest
//        (MONTHLY_FEE before TRANSPORT_FEE within the same month)
```

`calculatePendingFeesForStudent` is rewritten to **group** these units into its existing
breakdown shape, so the `/pending-fees` and `/students/:id/pending-fees` API responses
are unchanged.

**b. Make the calc partial-aware.** A unit's `remaining` =
`effectiveAmount − sum(PAID amounts for that unit) − sum(PENDING amounts for that unit)`,
replacing the current "any `PAID` ⇒ fully paid" rule for monthly fees and the
"skip if any `PAID`" rule for one-time fees.
- Backward-compatible for the normal full-payment case (a single `PAID` row at the due
  amount ⇒ `remaining = 0`).
- Behavior change: a row previously `PAID` for *less* than the due amount was hidden as
  fully paid; it is now correctly shown as partly due. Acceptable for this app.

**c. New allocation module** (e.g. `server/utils/allocatePayment.js`),
`allocatePayment(student, amount)`:
- Calls `getPendingUnits(student)`.
- Greedily consumes units in order until `amount` is exhausted; the last consumed unit
  may receive a partial amount.
- Produces the `FEES` rows to write — each `paymentStatus: 'PAID'`, with correct
  `feeType`, `amount`, `month`, `academicYear`, `paymentDate`, `paymentMethod`.
- Returns `{ allocations: [...rowsToWrite], allocated, leftover, totalPending }`.
- If `amount > totalPending`, `leftover = amount − totalPending` and the excess is not
  recorded.

**d. Two admin endpoints** (composed with `verifyToken, isAdmin`), both calling the same
allocation module:
- `POST /admin/students/:id/quick-pay/preview` — body `{ amount }` → returns the proposed
  allocation; **writes nothing.**
- `POST /admin/students/:id/quick-pay` — body `{ amount, paymentMethod, paymentDate, remarks? }`
  → **recomputes authoritatively** (ignores any client-sent line items), writes the rows,
  returns `{ allocations, allocated, leftover }`.

Both follow the project's `{ success, message?, data? }` response shape. New methods live
in `adminController.js`; new `*API` methods added to `client/src/services/api.js` rather
than ad-hoc `fetch`/`axios` where the host already uses `adminAPI`.

### `academicYear` detail

Generated monthly rows must be recognized by the same calc that produced the pending
(matched on `feeType` + month name + `academicYear.includes(calendarYear)`). The allocator
derives each month's `academicYear` exactly as the calc enumerates months, so a
Quick-Paid month is seen as settled and never double-counted. The exact string format
(e.g. `"2025-2026"` range vs. plain year) is finalized in the implementation plan against
how existing records and the matcher behave.

### Client

A new shared `QuickPayModal` in `client/src/components/modals/`:
- Amount input → debounced call to the preview endpoint.
- Allocation table: fee type / month / amount, plus a "leftover (not recorded)" note when
  applicable.
- Payment method + payment date inputs.
- Confirm → calls the commit endpoint → on success calls `onSuccess` so the host refreshes.

Wired into each pending surface:
- `ViewFeeDetailsModal` — "Pay" button by the pending total.
- `StudentDetailsModal` — alongside the existing Record Payment button.
- `FeesSection` — "Pay" action on each Pending-families row (preselects that student).
- `ReportsSection` — "Pay" on each pending row (secondary, since it's a report).

## Testing

No existing server tests. Add focused **unit tests** for the pure functions:
`getPendingUnits`, the partial-aware calc, and `allocatePayment`. Cases: full coverage,
exact fit, partial last item, overpayment/leftover, transport disabled, discounts applied,
`excludeAdmissionFee`. No DB required (functions take a student + fee data).

## Out of scope

- Storing credit balances / overpayments.
- Changes to the student portal or non-admin roles.
- Replacing or removing `RecordFeePaymentForm`.
