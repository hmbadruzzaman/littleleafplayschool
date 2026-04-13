# UI Modernization & Feature Additions — Design Spec

**Date:** 2026-04-12  
**Project:** Little Leaf Play School Admin Dashboard  
**Scope:** Admin dashboard only (`/admin/*`)

---

## Overview

Full rebuild of the admin dashboard shell with a modern left sidebar navigation, plus four functional feature additions. The existing `AdminDashboard.js` (700+ lines, monolithic) is split into a layout shell and per-section components.

---

## 1. Layout & Navigation

### Shell Structure

The admin dashboard uses a two-panel layout:

```
┌─────────┬──────────────────────────────────┐
│ Sidebar │ Top Bar                          │
│ (56px)  ├──────────────────────────────────┤
│         │                                  │
│         │  Page Content                    │
│         │                                  │
└─────────┴──────────────────────────────────┘
```

### Sidebar (Desktop — ≥1024px)

- **Width:** 56px collapsed, expands to 200px on hover
- **Background:** `#1e293b` (dark slate)
- **Active item highlight:** `rgba(74,222,128,0.15)` background, `#4ade80` text
- **Inactive item text:** `#94a3b8`
- **Logo area:** "LL" avatar in green (`#4ade80`) with "Little Leaf" label (visible on hover)
- **Transition:** `width 0.2s ease` on hover; labels fade in with `opacity 0.15s`

**Nav items (in order):**
1. Dashboard — 🏠
2. Students — 👨‍🎓
3. Teachers — 👩‍🏫
4. Fees — 💰
5. Reports — 📊
6. Expenditure — 🗓️
7. Inquiries — 📋 (with orange dot badge when pending count > 0)
8. Logout — 🚪 (pinned to bottom)

### Mobile & Tablet (< 1024px)

- Sidebar is **hidden** by default
- Top bar shows a **hamburger button (☰)** on the left
- Tapping ☰ slides the sidebar in as a **full overlay drawer** from the left (200px wide, dark background, same nav items with labels always visible)
- Tapping outside the drawer (dim overlay behind it) closes it
- Top bar always visible with page title and admin avatar

### Top Bar

- Height: 52px, white background, `border-bottom: 1px solid #e2e8f0`
- Left: current page title (bold) + section subtitle
- Right: admin avatar circle (green border, initials)

### File Structure

Split `AdminDashboard.js` into:

```
pages/
  AdminDashboard.js          ← layout shell only (sidebar + top bar + routing)
  admin/
    DashboardSection.js      ← overview stats + quick actions
    StudentsSection.js       ← student table + inactive toggle
    TeachersSection.js       ← teacher table
    FeesSection.js           ← record fee payment (replaces modal trigger)
    ReportsSection.js        ← financial reports
    ExpenditureSection.js    ← expenditure management
    InquiriesSection.js      ← inquiries list + conversion tracking
```

New CSS file: `pages/AdminSidebar.css` (sidebar + top bar styles)

---

## 2. Student Inactive Status

### Behaviour

- **Inactive students** are excluded from:
  - All financial reports (earnings, pending fees)
  - Student count stats on the dashboard
  - New fee types cannot be added to inactive students via the dashboard UI, but existing pending dues can be settled via the Record Fee Payment form
- Their **existing pending balance is frozen** — visible in the inactive students view but not added to active totals
- Inactive students are **hidden by default** in the Students section
- Inactive students **remain available in the Record Fee Payment form** so pending dues can be settled
- Once all pending dues are cleared, the admin can **Delete** the student permanently

### UI Changes

**Students section:**
- Default view shows only `ACTIVE` students
- Toggle button: **"Show Inactive Students"** (top right of the table) — switches to showing `INACTIVE` students with greyed-out rows and a red `INACTIVE` badge
- Inactive rows: text colour `#94a3b8`, name has `text-decoration: line-through`

**Student Details Modal:**
- Replaces the **Delete** button with two buttons: **"Mark Inactive"** and **"Delete"**
- "Mark Inactive" sets `status = INACTIVE` via `PUT /admin/students/:id` (existing update endpoint)
- "Mark Active" button shown instead when viewing an inactive student

### Backend

- No schema change — `status` field already exists on the Student model
- Fee generation logic (if any scheduled jobs exist) must filter out `status = INACTIVE` students
- Pending fees report: filter out inactive students from totals; show them separately if needed

---

## 3. Multi-Fee Recording Form

### Behaviour

- Single form submission can record multiple fee entries for one student
- Each "fee row" is independent: Fee Type + Amount (+ months if applicable)
- For `MONTHLY_FEE` or `TRANSPORT_FEE` rows: multi-select month checkboxes appear
- Amount entered is **per month** — total = amount × number of selected months
- A running **total amount** is shown at the bottom of the form
- On submit: one `Fee` record is created per month per fee type (existing DB model unchanged)

### UI — Fee Row

```
[ Fee Type ▼ ]  [ Amount ₹ ______ ]  [ × ]
  ↓ if MONTHLY_FEE or TRANSPORT_FEE:
  [ ] Jan  [ ] Feb  [ ] Mar  [ ] Apr  [ ] May  [ ] Jun
  [ ] Jul  [ ] Aug  [ ] Sep  [ ] Oct  [ ] Nov  [ ] Dec
  Academic Year: [ 2025-2026 ▼ ]
```

- **"+ Add Another Fee"** button appends a new row (max 6 rows)
- **"×"** button removes that row (minimum 1 row always present)
- Total line: `Total: ₹ [calculated]` shown below all rows

### API Change

- The existing `POST /admin/fees` endpoint accepts one fee record at a time
- Frontend sends **multiple sequential requests** (one per month per fee type) — no backend API change required
- On partial failure, show which records succeeded and which failed

---

## 4. Expenditure Categories

### Change

Add two new options to the `expenseType` dropdown in `AddExpenditureForm.js`:

| Value | Display Label |
|---|---|
| `CAB_DRIVER_SALARY` | Cab Driver's Salary |
| `PETROL` | Petrol |

These are appended after the existing options. No backend change needed — `expenseType` is stored as a free-form string in DynamoDB.

---

## 5. Inquiry Conversion Tracking

### Behaviour

- Each inquiry can be marked as **"Converted to Admission"**
- Doing so sets `status = ADMITTED` and records `admissionDate = today` (ISO date string)
- Admitted inquiries are excluded from the pending inquiry count badge
- A new **"Admitted"** filter tab is added alongside ALL / NEW / IN_PROGRESS / FOLLOWED_UP

### UI Changes

**ViewInquiriesModal (or InquiriesSection):**
- Add **"Mark as Admitted"** button on each inquiry card/row (shown only when status ≠ ADMITTED)
- Admitted inquiries show a green `ADMITTED` badge and the conversion date
- Filter tabs: ALL | NEW | IN_PROGRESS | FOLLOWED_UP | **ADMITTED**

### Backend

- Reuse existing `PUT /admin/inquiries/:id/status` endpoint
- Send `{ status: "ADMITTED", admissionDate: "YYYY-MM-DD" }`
- The `admissionDate` field is new — DynamoDB will store it alongside existing fields without a schema migration

---

## Responsive Breakpoints

| Breakpoint | Behaviour |
|---|---|
| ≥ 1024px (desktop) | Fixed 56px collapsed sidebar, expands to 200px on hover |
| < 1024px (tablet/mobile) | No sidebar; hamburger button → overlay drawer |

Tables on mobile: horizontal scroll (`overflow-x: auto`) wrapping the `<table>` element.  
Forms on mobile: all `form-row` grids collapse to single column.

---

## Out of Scope

- Teacher dashboard and Student dashboard — no changes
- Landing page and Login page — no changes
- Gallery feature — no changes
- Push notifications or email alerts
- Any new API endpoints (all features use existing endpoints or extend them minimally)
