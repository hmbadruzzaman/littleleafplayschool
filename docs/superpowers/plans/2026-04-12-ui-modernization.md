# UI Modernization & Feature Additions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the admin dashboard with a dark collapsible left sidebar, responsive hamburger drawer on mobile/tablet, and add four functional features: student inactive status, multi-fee recording, new expenditure categories, and inquiry admission conversion tracking.

**Architecture:** `AdminDashboard.js` becomes a pure layout shell (sidebar + top bar + section routing). Each section (Students, Teachers, Fees, etc.) is extracted into its own file under `client/src/pages/admin/`. All existing API calls are preserved unchanged; one backend method needs a minor status list update.

**Tech Stack:** React 18, React Router v6, plain CSS (no UI library), Node.js/Express, DynamoDB

---

## File Map

**Create:**
- `client/src/pages/AdminSidebar.css` — sidebar, top bar, responsive layout styles
- `client/src/pages/admin/DashboardSection.js` — overview stats + quick actions
- `client/src/pages/admin/StudentsSection.js` — student table + inactive toggle
- `client/src/pages/admin/TeachersSection.js` — teacher table
- `client/src/pages/admin/FeesSection.js` — fee payment section wrapper
- `client/src/pages/admin/ReportsSection.js` — financial reports
- `client/src/pages/admin/ExpenditureSection.js` — expenditure management

**Modify:**
- `client/src/pages/AdminDashboard.js` — full rebuild as layout shell only
- `client/src/components/modals/StudentDetailsModal.js` — add Mark Inactive / Mark Active buttons
- `client/src/components/forms/RecordFeePaymentForm.js` — multi-fee rows + multi-month selection
- `client/src/components/forms/AddExpenditureForm.js` — add CAB_DRIVER_SALARY + PETROL options
- `client/src/components/modals/ViewInquiriesModal.js` — add ADMITTED filter tab + Mark as Admitted button
- `server/controllers/adminController.js` — add ADMITTED to allowed inquiry statuses + store admissionDate

---

## Task 1: Backend — Add ADMITTED inquiry status

**Files:**
- Modify: `server/controllers/adminController.js` (around line 800)

- [ ] **Step 1: Open `server/controllers/adminController.js` and find `updateInquiryStatus`**

  Locate this line (~line 800):
  ```js
  if (!['NEW', 'IN_PROGRESS', 'FOLLOWED_UP', 'ENROLLED', 'REJECTED'].includes(status)) {
  ```

- [ ] **Step 2: Replace the entire `updateInquiryStatus` function body**

  ```js
  exports.updateInquiryStatus = async (req, res) => {
      try {
          const { inquiryId } = req.params;
          const { status, comment } = req.body;

          if (!['NEW', 'IN_PROGRESS', 'FOLLOWED_UP', 'ENROLLED', 'REJECTED', 'ADMITTED'].includes(status)) {
              return res.status(400).json(errorResponse('Invalid status'));
          }

          const currentInquiry = await docClient.get({
              TableName: TABLES.INQUIRIES,
              Key: { inquiryId }
          }).promise();

          if (!currentInquiry.Item) {
              return res.status(404).json(errorResponse('Inquiry not found'));
          }

          const followUpHistory = currentInquiry.Item.followUpHistory || [];

          if (comment || status === 'FOLLOWED_UP' || status === 'IN_PROGRESS' || status === 'ADMITTED') {
              followUpHistory.push({
                  timestamp: new Date().toISOString(),
                  status: status,
                  comment: comment || '',
                  adminAction: status === 'FOLLOWED_UP'
                      ? 'Marked as Followed Up'
                      : status === 'IN_PROGRESS'
                          ? 'Marked as In Progress'
                          : status === 'ADMITTED'
                              ? 'Marked as Admitted'
                              : 'Updated'
              });
          }

          let updateExpression = 'SET #status = :status, followedUpAt = :followedUpAt, updatedAt = :updatedAt, followUpHistory = :followUpHistory';
          const expressionAttributeNames = { '#status': 'status' };
          const expressionAttributeValues = {
              ':status': status,
              ':followedUpAt': (status === 'FOLLOWED_UP' || status === 'IN_PROGRESS')
                  ? new Date().toISOString()
                  : currentInquiry.Item.followedUpAt,
              ':updatedAt': new Date().toISOString(),
              ':followUpHistory': followUpHistory
          };

          if (status === 'ADMITTED') {
              updateExpression += ', admissionDate = :admissionDate';
              expressionAttributeValues[':admissionDate'] = new Date().toISOString().split('T')[0];
          }

          await docClient.update({
              TableName: TABLES.INQUIRIES,
              Key: { inquiryId },
              UpdateExpression: updateExpression,
              ExpressionAttributeNames: expressionAttributeNames,
              ExpressionAttributeValues: expressionAttributeValues
          }).promise();

          const updatedInquiry = await docClient.get({
              TableName: TABLES.INQUIRIES,
              Key: { inquiryId }
          }).promise();

          res.status(200).json(successResponse(updatedInquiry.Item, 'Inquiry status updated successfully'));
      } catch (error) {
          console.error('Update inquiry status error:', error);
          res.status(500).json(errorResponse('Failed to update inquiry status', error));
      }
  };
  ```

- [ ] **Step 3: Verify the server still starts**

  ```bash
  cd server && node -e "require('./controllers/adminController')" && echo "OK"
  ```
  Expected: `OK` with no errors.

---

## Task 2: Sidebar CSS + Layout Shell

**Files:**
- Create: `client/src/pages/AdminSidebar.css`
- Modify: `client/src/pages/AdminDashboard.js` (full rewrite)

- [ ] **Step 1: Create `client/src/pages/AdminSidebar.css`**

  ```css
  /* === Layout === */
  .admin-layout {
      display: flex;
      min-height: 100vh;
      background: #f1f5f9;
  }

  /* === Sidebar === */
  .admin-sidebar {
      width: 56px;
      background: #1e293b;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px 0;
      gap: 4px;
      flex-shrink: 0;
      transition: width 0.2s ease;
      overflow: hidden;
      position: fixed;
      top: 0;
      left: 0;
      height: 100vh;
      z-index: 100;
  }

  .admin-sidebar:hover {
      width: 200px;
  }

  .admin-sidebar-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 12px;
      margin-bottom: 12px;
      white-space: nowrap;
      width: 100%;
  }

  .admin-sidebar-logo-icon {
      width: 32px;
      height: 32px;
      background: #4ade80;
      border-radius: 8px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: #14532d;
      font-size: 13px;
  }

  .admin-sidebar-logo-text {
      color: white;
      font-weight: 700;
      font-size: 13px;
      opacity: 0;
      transition: opacity 0.15s 0.05s;
      white-space: nowrap;
  }

  .admin-sidebar:hover .admin-sidebar-logo-text {
      opacity: 1;
  }

  .admin-sidebar-nav {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 0 8px;
      flex: 1;
  }

  .admin-nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 9px 8px;
      border-radius: 6px;
      cursor: pointer;
      white-space: nowrap;
      border: none;
      background: transparent;
      width: 100%;
      text-align: left;
      position: relative;
      text-decoration: none;
  }

  .admin-nav-item:hover {
      background: rgba(255, 255, 255, 0.08);
  }

  .admin-nav-item.active {
      background: rgba(74, 222, 128, 0.15);
  }

  .admin-nav-item.active .admin-nav-label {
      color: #4ade80;
      font-weight: 600;
  }

  .admin-nav-icon {
      font-size: 16px;
      flex-shrink: 0;
      width: 20px;
      text-align: center;
  }

  .admin-nav-label {
      color: #94a3b8;
      font-size: 13px;
      opacity: 0;
      transition: opacity 0.15s 0.05s;
  }

  .admin-sidebar:hover .admin-nav-label {
      opacity: 1;
  }

  .admin-nav-badge {
      position: absolute;
      top: 6px;
      left: 28px;
      width: 8px;
      height: 8px;
      background: #f97316;
      border-radius: 50%;
      border: 2px solid #1e293b;
  }

  .admin-sidebar-bottom {
      width: 100%;
      padding: 0 8px;
  }

  /* === Main area === */
  .admin-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      margin-left: 56px;
      transition: margin-left 0.2s ease;
      min-width: 0;
  }

  /* === Top bar === */
  .admin-topbar {
      background: white;
      border-bottom: 1px solid #e2e8f0;
      padding: 0 20px;
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 50;
  }

  .admin-topbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
  }

  .admin-hamburger {
      display: none;
      background: none;
      border: none;
      cursor: pointer;
      padding: 6px;
      border-radius: 4px;
      flex-direction: column;
      gap: 4px;
  }

  .admin-hamburger span {
      display: block;
      width: 18px;
      height: 2px;
      background: #1e293b;
      border-radius: 1px;
  }

  .admin-topbar-title {
      font-weight: 700;
      color: #1e293b;
      font-size: 15px;
  }

  .admin-topbar-subtitle {
      color: #94a3b8;
      font-size: 13px;
  }

  .admin-topbar-avatar {
      width: 32px;
      height: 32px;
      background: #f0fdf4;
      border: 2px solid #4ade80;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      color: #16a34a;
  }

  /* === Content area === */
  .admin-content {
      flex: 1;
      padding: 24px;
      overflow-x: hidden;
  }

  /* === Overlay (mobile drawer) === */
  .admin-sidebar-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 99;
  }

  .admin-sidebar-overlay.visible {
      display: block;
  }

  /* === Responsive === */
  @media (max-width: 1023px) {
      .admin-sidebar {
          width: 200px;
          transform: translateX(-100%);
          transition: transform 0.25s ease;
      }

      .admin-sidebar:hover {
          width: 200px;
      }

      .admin-sidebar.mobile-open {
          transform: translateX(0);
      }

      .admin-sidebar .admin-nav-label,
      .admin-sidebar .admin-sidebar-logo-text {
          opacity: 1;
      }

      .admin-main {
          margin-left: 0;
      }

      .admin-hamburger {
          display: flex;
      }

      .admin-content {
          padding: 16px;
      }
  }

  /* === Table responsiveness === */
  .admin-table-wrap {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
  }

  @media (max-width: 640px) {
      .form-row {
          flex-direction: column;
      }
  }
  ```

- [ ] **Step 2: Rewrite `client/src/pages/AdminDashboard.js` as the layout shell**

  ```jsx
  import React, { useState } from 'react';
  import { useAuth } from '../context/AuthContext';
  import DashboardSection from './admin/DashboardSection';
  import StudentsSection from './admin/StudentsSection';
  import TeachersSection from './admin/TeachersSection';
  import FeesSection from './admin/FeesSection';
  import ReportsSection from './admin/ReportsSection';
  import ExpenditureSection from './admin/ExpenditureSection';
  import ViewInquiriesModal from '../components/modals/ViewInquiriesModal';
  import './AdminSidebar.css';

  const NAV_ITEMS = [
      { key: 'dashboard', icon: '🏠', label: 'Dashboard' },
      { key: 'students', icon: '👨‍🎓', label: 'Students' },
      { key: 'teachers', icon: '👩‍🏫', label: 'Teachers' },
      { key: 'fees', icon: '💰', label: 'Fees' },
      { key: 'reports', icon: '📊', label: 'Reports' },
      { key: 'expenditure', icon: '🗓️', label: 'Expenditure' },
      { key: 'inquiries', icon: '📋', label: 'Inquiries' },
  ];

  const PAGE_TITLES = {
      dashboard: { title: 'Dashboard', subtitle: 'Overview' },
      students: { title: 'Students', subtitle: 'Manage student records' },
      teachers: { title: 'Teachers', subtitle: 'Manage staff' },
      fees: { title: 'Fees', subtitle: 'Record & manage fee payments' },
      reports: { title: 'Reports', subtitle: 'Financial reports' },
      expenditure: { title: 'Expenditure', subtitle: 'Track expenses' },
      inquiries: { title: 'Inquiries', subtitle: 'Admission inquiries' },
  };

  function AdminDashboard() {
      const { logout } = useAuth();
      const [activeSection, setActiveSection] = useState('dashboard');
      const [mobileOpen, setMobileOpen] = useState(false);
      const [pendingInquiriesCount, setPendingInquiriesCount] = useState(0);

      const handleNavClick = (key) => {
          setActiveSection(key);
          setMobileOpen(false);
      };

      const { title, subtitle } = PAGE_TITLES[activeSection] || PAGE_TITLES.dashboard;

      return (
          <div className="admin-layout">
              {/* Mobile overlay */}
              <div
                  className={`admin-sidebar-overlay ${mobileOpen ? 'visible' : ''}`}
                  onClick={() => setMobileOpen(false)}
              />

              {/* Sidebar */}
              <aside className={`admin-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
                  <div className="admin-sidebar-logo">
                      <div className="admin-sidebar-logo-icon">LL</div>
                      <span className="admin-sidebar-logo-text">Little Leaf</span>
                  </div>

                  <nav className="admin-sidebar-nav">
                      {NAV_ITEMS.map(item => (
                          <button
                              key={item.key}
                              className={`admin-nav-item ${activeSection === item.key ? 'active' : ''}`}
                              onClick={() => handleNavClick(item.key)}
                          >
                              <span className="admin-nav-icon">{item.icon}</span>
                              <span className="admin-nav-label">{item.label}</span>
                              {item.key === 'inquiries' && pendingInquiriesCount > 0 && (
                                  <span className="admin-nav-badge" title={`${pendingInquiriesCount} pending`} />
                              )}
                          </button>
                      ))}
                  </nav>

                  <div className="admin-sidebar-bottom">
                      <button className="admin-nav-item" onClick={logout}>
                          <span className="admin-nav-icon">🚪</span>
                          <span className="admin-nav-label">Logout</span>
                      </button>
                  </div>
              </aside>

              {/* Main */}
              <div className="admin-main">
                  <header className="admin-topbar">
                      <div className="admin-topbar-left">
                          <button
                              className="admin-hamburger"
                              onClick={() => setMobileOpen(o => !o)}
                              aria-label="Toggle navigation"
                          >
                              <span /><span /><span />
                          </button>
                          <div>
                              <span className="admin-topbar-title">{title}</span>
                              {subtitle && (
                                  <span className="admin-topbar-subtitle"> — {subtitle}</span>
                              )}
                          </div>
                      </div>
                      <div className="admin-topbar-avatar" title="Admin">A</div>
                  </header>

                  <main className="admin-content">
                      {activeSection === 'dashboard' && (
                          <DashboardSection
                              onNavigate={handleNavClick}
                              onPendingInquiriesCount={setPendingInquiriesCount}
                          />
                      )}
                      {activeSection === 'students' && <StudentsSection />}
                      {activeSection === 'teachers' && <TeachersSection />}
                      {activeSection === 'fees' && <FeesSection />}
                      {activeSection === 'reports' && <ReportsSection />}
                      {activeSection === 'expenditure' && <ExpenditureSection />}
                      {activeSection === 'inquiries' && (
                          <ViewInquiriesModal
                              inline
                              onPendingCountChange={setPendingInquiriesCount}
                          />
                      )}
                  </main>
              </div>
          </div>
      );
  }

  export default AdminDashboard;
  ```

- [ ] **Step 3: Verify the app loads without crashing**

  ```bash
  cd client && npm start
  ```
  Expected: App loads. Errors about missing section imports are expected until later tasks create those files.

---

## Task 3: DashboardSection.js

**Files:**
- Create: `client/src/pages/admin/DashboardSection.js`

- [ ] **Step 1: Create `client/src/pages/admin/DashboardSection.js`**

  ```jsx
  import React, { useEffect, useState } from 'react';
  import { adminAPI } from '../../services/api';

  const API_URL = window.location.hostname === 'localhost'
      ? 'http://localhost:5001/api'
      : 'https://welittleleaf.com/api';

  function DashboardSection({ onNavigate, onPendingInquiriesCount }) {
      const [reports, setReports] = useState(null);
      const [teachers, setTeachers] = useState([]);
      const [timePeriod, setTimePeriod] = useState('current-year');
      const [loading, setLoading] = useState(true);

      useEffect(() => { fetchData(); }, [timePeriod]);

      const getDateRange = () => {
          const today = new Date();
          switch (timePeriod) {
              case 'current-month':
                  return {
                      startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
                      endDate: today.toISOString().split('T')[0]
                  };
              case 'last-month':
                  return {
                      startDate: new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0],
                      endDate: new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0]
                  };
              case 'last-year':
                  return {
                      startDate: new Date(today.getFullYear() - 1, 0, 1).toISOString().split('T')[0],
                      endDate: new Date(today.getFullYear() - 1, 11, 31).toISOString().split('T')[0]
                  };
              default:
                  return {
                      startDate: new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0],
                      endDate: today.toISOString().split('T')[0]
                  };
          }
      };

      const fetchData = async () => {
          try {
              const { startDate, endDate } = getDateRange();
              const token = localStorage.getItem('token');
              const [studentsRes, teachersRes, studentReportRes, earningsRes, expenditureRes, inquiriesRes] = await Promise.all([
                  adminAPI.getAllStudents(),
                  adminAPI.getAllTeachers(),
                  adminAPI.getStudentCountReport(),
                  adminAPI.getEarningsReport(startDate, endDate),
                  fetch(`${API_URL}/admin/reports/expenditure?startDate=${startDate}&endDate=${endDate}`, {
                      headers: { 'Authorization': `Bearer ${token}` }
                  }).then(r => r.json()),
                  adminAPI.getAllInquiries(),
              ]);

              setTeachers(teachersRes.data.data);
              setReports({
                  students: studentReportRes.data.data,
                  earnings: earningsRes.data.data,
                  expenditure: expenditureRes.data
              });

              const pendingCount = (inquiriesRes.data.data || []).filter(
                  inq => inq.status === 'NEW' || inq.status === 'IN_PROGRESS'
              ).length;
              if (onPendingInquiriesCount) onPendingInquiriesCount(pendingCount);
          } catch (error) {
              console.error('Error fetching dashboard data:', error);
          } finally {
              setLoading(false);
          }
      };

      if (loading) return <div className="loading">Loading dashboard...</div>;

      const earnings = reports?.earnings?.totalEarnings || 0;
      const expenditure = reports?.expenditure?.totalExpenditure || 0;
      const netAmount = earnings - expenditure;

      return (
          <>
              <div className="card" style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h2 style={{ margin: 0 }}>Financial Overview</h2>
                      <select
                          value={timePeriod}
                          onChange={(e) => setTimePeriod(e.target.value)}
                          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
                      >
                          <option value="current-month">Current Month</option>
                          <option value="last-month">Last Month</option>
                          <option value="current-year">Current Year</option>
                          <option value="last-year">Last Year</option>
                      </select>
                  </div>
                  <div className="stats-grid">
                      <div className="stat-card">
                          <h3>Total Earnings</h3>
                          <p className="stat-number" style={{ color: '#10b981' }}>₹{earnings.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="stat-card">
                          <h3>Total Expenditure</h3>
                          <p className="stat-number" style={{ color: '#ef4444' }}>₹{expenditure.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="stat-card">
                          <h3>In Hand Amount</h3>
                          <p className="stat-number" style={{ color: netAmount >= 0 ? '#10b981' : '#ef4444' }}>
                              ₹{netAmount.toFixed(2)}
                          </p>
                      </div>
                  </div>
              </div>

              <div className="stats-grid" style={{ marginBottom: '24px' }}>
                  <div className="stat-card">
                      <h3>Total Students</h3>
                      <p className="stat-number">{reports?.students?.totalStudents || 0}</p>
                  </div>
                  <div className="stat-card">
                      <h3>Active Students</h3>
                      <p className="stat-number">{reports?.students?.activeStudents || 0}</p>
                  </div>
                  <div className="stat-card">
                      <h3>Total Teachers</h3>
                      <p className="stat-number">{teachers.length}</p>
                  </div>
              </div>

              <div className="card">
                  <h2>Quick Actions</h2>
                  <div className="actions-grid">
                      <button className="action-btn" onClick={() => onNavigate('students')}>Manage Students</button>
                      <button className="action-btn" onClick={() => onNavigate('teachers')}>Manage Teachers</button>
                      <button className="action-btn" onClick={() => onNavigate('fees')}>Record Fee Payment</button>
                      <button className="action-btn" onClick={() => onNavigate('expenditure')}>Manage Expenditures</button>
                      <button className="action-btn" onClick={() => onNavigate('reports')}>View Reports</button>
                      <button className="action-btn" onClick={() => onNavigate('inquiries')}>View Inquiries</button>
                  </div>
              </div>
          </>
      );
  }

  export default DashboardSection;
  ```

- [ ] **Step 2: Verify dashboard section loads**

  Navigate to the Dashboard section in the running app. Stats, financial overview, and quick actions should render correctly.

---

## Task 4: TeachersSection.js

**Files:**
- Create: `client/src/pages/admin/TeachersSection.js`

- [ ] **Step 1: Create `client/src/pages/admin/TeachersSection.js`**

  ```jsx
  import React, { useEffect, useState } from 'react';
  import { adminAPI } from '../../services/api';
  import AddTeacherForm from '../../components/forms/AddTeacherForm';

  function TeachersSection() {
      const [teachers, setTeachers] = useState([]);
      const [loading, setLoading] = useState(true);
      const [showAddTeacher, setShowAddTeacher] = useState(false);

      useEffect(() => { fetchTeachers(); }, []);

      const fetchTeachers = async () => {
          try {
              const res = await adminAPI.getAllTeachers();
              setTeachers(res.data.data);
          } catch (error) {
              console.error('Error fetching teachers:', error);
          } finally {
              setLoading(false);
          }
      };

      if (loading) return <div className="loading">Loading teachers...</div>;

      return (
          <div className="card">
              <div className="card-header">
                  <h2>All Teachers</h2>
                  <button className="btn btn-primary" onClick={() => setShowAddTeacher(true)}>Add Teacher</button>
              </div>
              <div className="admin-table-wrap">
                  <table className="table">
                      <thead>
                          <tr>
                              <th>Employee ID</th>
                              <th>Name</th>
                              <th>Email</th>
                              <th>Phone</th>
                              <th>Status</th>
                          </tr>
                      </thead>
                      <tbody>
                          {teachers.map((teacher) => (
                              <tr key={teacher.teacherId}>
                                  <td>{teacher.employeeId}</td>
                                  <td>{teacher.fullName}</td>
                                  <td>{teacher.email}</td>
                                  <td>{teacher.phone}</td>
                                  <td>
                                      <span className={`status-badge ${teacher.status.toLowerCase()}`}>
                                          {teacher.status}
                                      </span>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>

              {showAddTeacher && (
                  <AddTeacherForm
                      onClose={() => setShowAddTeacher(false)}
                      onSuccess={() => { setShowAddTeacher(false); fetchTeachers(); }}
                  />
              )}
          </div>
      );
  }

  export default TeachersSection;
  ```

- [ ] **Step 2: Verify Teachers section loads correctly in the browser**

---

## Task 5: ReportsSection.js

**Files:**
- Create: `client/src/pages/admin/ReportsSection.js`

- [ ] **Step 1: Create `client/src/pages/admin/ReportsSection.js`**

  ```jsx
  import React, { useState } from 'react';

  const API_URL = window.location.hostname === 'localhost'
      ? 'http://localhost:5001/api'
      : 'https://welittleleaf.com/api';

  function ReportsSection() {
      const today = new Date();
      const [reportStartDate, setReportStartDate] = useState(
          new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]
      );
      const [reportEndDate, setReportEndDate] = useState(today.toISOString().split('T')[0]);
      const [reportLoading, setReportLoading] = useState(false);
      const [reports, setReports] = useState(null);
      const [pendingFeesData, setPendingFeesData] = useState(null);
      const [showPendingDetails, setShowPendingDetails] = useState(false);

      const fetchReports = async (startDate, endDate) => {
          setReportLoading(true);
          try {
              const token = localStorage.getItem('token');
              const [earningsRes, expenditureRes, pendingFeesRes] = await Promise.all([
                  fetch(`${API_URL}/admin/reports/earnings?startDate=${startDate}&endDate=${endDate}`, {
                      headers: { 'Authorization': `Bearer ${token}` }
                  }).then(r => r.json()),
                  fetch(`${API_URL}/admin/reports/expenditure?startDate=${startDate}&endDate=${endDate}`, {
                      headers: { 'Authorization': `Bearer ${token}` }
                  }).then(r => r.json()),
                  fetch(`${API_URL}/admin/reports/pending-fees`, {
                      headers: { 'Authorization': `Bearer ${token}` }
                  }).then(r => r.json()),
              ]);
              if (earningsRes.success) {
                  setReports({
                      earnings: earningsRes.data,
                      expenditure: expenditureRes.success ? expenditureRes.data : null
                  });
              }
              if (pendingFeesRes.success) setPendingFeesData(pendingFeesRes.data);
          } catch (error) {
              console.error('Error fetching reports:', error);
          } finally {
              setReportLoading(false);
          }
      };

      const setQuickDateRange = (range) => {
          const now = new Date();
          let start, end;
          switch (range) {
              case 'today': start = end = now.toISOString().split('T')[0]; break;
              case 'this-week': {
                  const ws = new Date(now); ws.setDate(now.getDate() - now.getDay());
                  start = ws.toISOString().split('T')[0]; end = now.toISOString().split('T')[0]; break;
              }
              case 'this-month':
                  start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                  end = now.toISOString().split('T')[0]; break;
              case 'last-month':
                  start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
                  end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]; break;
              case 'this-year':
                  start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
                  end = now.toISOString().split('T')[0]; break;
              case 'last-year':
                  start = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
                  end = new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0]; break;
              default: return;
          }
          setReportStartDate(start);
          setReportEndDate(end);
          fetchReports(start, end);
      };

      const earnings = reports?.earnings?.totalEarnings || 0;
      const expenditure = reports?.expenditure?.totalExpenditure || 0;
      const net = earnings - expenditure;
      const presets = ['today','this-week','this-month','last-month','this-year','last-year'];
      const presetLabels = { today:'Today','this-week':'This Week','this-month':'This Month','last-month':'Last Month','this-year':'This Year','last-year':'Last Year' };

      return (
          <div className="card">
              <div style={{ marginBottom: '1.5rem' }}>
                  <h2 style={{ margin: '0 0 1rem 0' }}>Financial Reports</h2>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                      {presets.map(r => (
                          <button key={r} onClick={() => setQuickDateRange(r)} className="btn btn-secondary"
                              style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}>
                              {presetLabels[r]}
                          </button>
                      ))}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div>
                          <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginRight: '0.5rem' }}>From:</label>
                          <input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)}
                              style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }} />
                      </div>
                      <div>
                          <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginRight: '0.5rem' }}>To:</label>
                          <input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)}
                              style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }} />
                      </div>
                      <button onClick={() => fetchReports(reportStartDate, reportEndDate)}
                          disabled={reportLoading} className="btn btn-primary"
                          style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
                          {reportLoading ? 'Loading...' : 'Apply Filter'}
                      </button>
                  </div>
              </div>

              {reports && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                          <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Total Earnings</div>
                          <div style={{ fontSize: '2rem', fontWeight: '700' }}>₹{earnings.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '0.5rem' }}>{reports.earnings?.transactionCount || 0} transactions</div>
                      </div>
                      <div style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                          <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Total Expenditure</div>
                          <div style={{ fontSize: '2rem', fontWeight: '700' }}>₹{expenditure.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '0.5rem' }}>{reports.expenditure?.transactionCount || 0} transactions</div>
                      </div>
                      <div style={{ background: net >= 0 ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'linear-gradient(135deg,#f59e0b,#d97706)', color: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                          <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>{net >= 0 ? 'Net Profit' : 'Net Loss'}</div>
                          <div style={{ fontSize: '2rem', fontWeight: '700' }}>₹{Math.abs(net).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '0.5rem' }}>{((net / (earnings || 1)) * 100).toFixed(1)}% margin</div>
                      </div>
                  </div>
              )}

              {pendingFeesData && (
                  <div style={{ marginTop: '1.5rem' }}>
                      <div onClick={() => setShowPendingDetails(!showPendingDetails)}
                          style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: 'white', padding: '1.5rem', borderRadius: '0.5rem', cursor: 'pointer' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                  <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Total Pending Fees (Active Students)</div>
                                  <div style={{ fontSize: '2rem', fontWeight: '700' }}>₹{pendingFeesData.totalPending?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                                  <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '0.5rem' }}>{pendingFeesData.studentCount} students with dues</div>
                              </div>
                              <div style={{ fontSize: '1.5rem' }}>{showPendingDetails ? '▲' : '▼'}</div>
                          </div>
                      </div>

                      {showPendingDetails && pendingFeesData.students?.length > 0 && (
                          <div style={{ marginTop: '1rem', background: 'white', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                              <div className="admin-table-wrap">
                                  <table className="table">
                                      <thead>
                                          <tr><th>Roll No</th><th>Student</th><th>Class</th><th>Parent</th><th>Phone</th><th>Pending Amount</th></tr>
                                      </thead>
                                      <tbody>
                                          {pendingFeesData.students.map(s => (
                                              <tr key={s.studentId}>
                                                  <td>{s.rollNumber}</td>
                                                  <td>{s.studentName}</td>
                                                  <td>{s.class}</td>
                                                  <td>{s.parentName}</td>
                                                  <td>{s.phone}</td>
                                                  <td style={{ color: '#dc2626', fontWeight: '600' }}>₹{s.totalPending?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      )}
                  </div>
              )}
          </div>
      );
  }

  export default ReportsSection;
  ```

- [ ] **Step 2: Verify Reports section loads and "Apply Filter" button works**

---

## Task 6: StudentsSection.js + Student Inactive Status

**Files:**
- Create: `client/src/pages/admin/StudentsSection.js`
- Modify: `client/src/components/modals/StudentDetailsModal.js`
- Modify: `client/src/pages/Dashboard.css`

- [ ] **Step 1: Create `client/src/pages/admin/StudentsSection.js`**

  ```jsx
  import React, { useEffect, useState } from 'react';
  import { adminAPI } from '../../services/api';
  import AddStudentForm from '../../components/forms/AddStudentForm';
  import StudentDetailsModal from '../../components/modals/StudentDetailsModal';

  function StudentsSection() {
      const [students, setStudents] = useState([]);
      const [loading, setLoading] = useState(true);
      const [showAddStudent, setShowAddStudent] = useState(false);
      const [selectedStudent, setSelectedStudent] = useState(null);
      const [searchTerm, setSearchTerm] = useState('');
      const [showInactive, setShowInactive] = useState(false);
      const [sortField, setSortField] = useState('rollNumber');
      const [sortDir, setSortDir] = useState('asc');

      useEffect(() => { fetchStudents(); }, []);

      const fetchStudents = async () => {
          try {
              const res = await adminAPI.getAllStudents();
              setStudents(res.data.data);
          } catch (error) {
              console.error('Error fetching students:', error);
          } finally {
              setLoading(false);
          }
      };

      const handleSort = (field) => {
          if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
          else { setSortField(field); setSortDir('asc'); }
      };

      const getDisplayStudents = () => {
          const statusFilter = showInactive ? 'INACTIVE' : 'ACTIVE';
          return students
              .filter(s => s.status === statusFilter)
              .filter(s => {
                  const q = searchTerm.toLowerCase();
                  return s.fullName.toLowerCase().includes(q)
                      || s.rollNumber.toLowerCase().includes(q)
                      || (s.parentName && s.parentName.toLowerCase().includes(q));
              })
              .sort((a, b) => {
                  const av = (a[sortField] || '').toString().toLowerCase();
                  const bv = (b[sortField] || '').toString().toLowerCase();
                  if (av < bv) return sortDir === 'asc' ? -1 : 1;
                  if (av > bv) return sortDir === 'asc' ? 1 : -1;
                  return 0;
              });
      };

      const SortTh = ({ field, children }) => (
          <th onClick={() => handleSort(field)} style={{ cursor: 'pointer', userSelect: 'none' }}>
              {children} {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
          </th>
      );

      if (loading) return <div className="loading">Loading students...</div>;

      const displayed = getDisplayStudents();

      return (
          <div className="card">
              <div className="card-header">
                  <h2>{showInactive ? 'Inactive Students' : 'Active Students'}</h2>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                          className="btn btn-secondary"
                          onClick={() => setShowInactive(v => !v)}
                          style={{ fontSize: '0.875rem' }}
                      >
                          {showInactive ? 'Show Active' : 'Show Inactive'}
                      </button>
                      {!showInactive && (
                          <button className="btn btn-primary" onClick={() => setShowAddStudent(true)}>
                              Add Student
                          </button>
                      )}
                  </div>
              </div>

              <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }}>
                  <input
                      type="text"
                      placeholder="Search by name, roll number, or parent name..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      style={{ width: '100%', padding: '10px 16px', fontSize: '0.95rem', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none' }}
                  />
              </div>

              <div className="admin-table-wrap">
                  <table className="table">
                      <thead>
                          <tr>
                              <SortTh field="rollNumber">Roll Number</SortTh>
                              <SortTh field="fullName">Name</SortTh>
                              <SortTh field="class">Class</SortTh>
                              <SortTh field="parentName">Parent Name</SortTh>
                              <SortTh field="parentPhone">Parent Phone</SortTh>
                              <SortTh field="status">Status</SortTh>
                          </tr>
                      </thead>
                      <tbody>
                          {displayed.map(student => (
                              <tr
                                  key={student.studentId}
                                  onClick={() => setSelectedStudent(student)}
                                  style={{ cursor: 'pointer', opacity: student.status === 'INACTIVE' ? 0.6 : 1 }}
                                  className="clickable-row"
                              >
                                  <td>{student.rollNumber}</td>
                                  <td style={{
                                      textDecoration: student.status === 'INACTIVE' ? 'line-through' : 'none',
                                      color: student.status === 'INACTIVE' ? '#94a3b8' : 'inherit'
                                  }}>
                                      {student.fullName}
                                  </td>
                                  <td>{student.class}</td>
                                  <td>{student.parentName}</td>
                                  <td>{student.parentPhone}</td>
                                  <td>
                                      <span className={`status-badge ${student.status.toLowerCase()}`}>
                                          {student.status}
                                      </span>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>

              {displayed.length === 0 && (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                      {searchTerm
                          ? `No ${showInactive ? 'inactive' : 'active'} students matching "${searchTerm}"`
                          : `No ${showInactive ? 'inactive' : 'active'} students`}
                  </div>
              )}

              {showAddStudent && (
                  <AddStudentForm
                      onClose={() => setShowAddStudent(false)}
                      onSuccess={() => { setShowAddStudent(false); fetchStudents(); }}
                  />
              )}

              {selectedStudent && (
                  <StudentDetailsModal
                      student={selectedStudent}
                      onClose={() => setSelectedStudent(null)}
                      onUpdate={() => { fetchStudents(); setSelectedStudent(null); }}
                  />
              )}
          </div>
      );
  }

  export default StudentsSection;
  ```

- [ ] **Step 2: Add inactive/active badge styles to `client/src/pages/Dashboard.css`**

  Append to the end of `Dashboard.css`:
  ```css
  .status-badge.inactive {
      background: #fef2f2;
      color: #dc2626;
  }

  .status-badge.active {
      background: #f0fdf4;
      color: #16a34a;
  }
  ```

- [ ] **Step 3: Add Mark Inactive / Mark Active buttons to `StudentDetailsModal.js`**

  Add `isUpdatingStatus` state after the existing state declarations:
  ```jsx
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  ```

  Add `handleToggleStatus` function after `handleDeleteStudent`:
  ```jsx
  const handleToggleStatus = async () => {
      const newStatus = student.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const confirmMsg = newStatus === 'INACTIVE'
          ? `Mark ${student.fullName} as inactive? They will be hidden from reports and the active student list. Their pending dues will remain visible and can still be settled.`
          : `Reactivate ${student.fullName}? They will appear in the active student list again.`;
      if (!window.confirm(confirmMsg)) return;

      setIsUpdatingStatus(true);
      try {
          const token = localStorage.getItem('token');
          const API_URL = window.location.hostname === 'localhost'
              ? 'http://localhost:5001/api'
              : 'https://welittleleaf.com/api';
          const res = await fetch(`${API_URL}/admin/students/${encodeURIComponent(student.studentId)}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ status: newStatus })
          });
          const data = await res.json();
          if (data.success) {
              alert(`Student marked as ${newStatus.toLowerCase()} successfully`);
              if (onUpdate) onUpdate();
              onClose();
          } else {
              alert(data.message || 'Failed to update student status');
          }
      } catch (error) {
          console.error('Error updating student status:', error);
          alert('An error occurred');
      } finally {
          setIsUpdatingStatus(false);
      }
  };
  ```

  Replace the existing `modal-footer` div:
  ```jsx
  <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
          <button
              onClick={handleToggleStatus}
              className="btn"
              disabled={isUpdatingStatus}
              style={{
                  backgroundColor: student.status === 'ACTIVE' ? '#f59e0b' : '#10b981',
                  color: 'white',
                  border: 'none'
              }}
          >
              {isUpdatingStatus
                  ? 'Updating...'
                  : student.status === 'ACTIVE' ? '⏸ Mark Inactive' : '▶ Mark Active'}
          </button>
          <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn btn-danger"
              style={{ backgroundColor: '#ef4444', color: 'white', border: 'none' }}
          >
              🗑️ Delete Student
          </button>
      </div>
      <button onClick={onClose} className="btn btn-secondary">Close</button>
  </div>
  ```

- [ ] **Step 4: Verify in the browser**

  - Students section shows only active students by default
  - "Show Inactive" toggle switches to inactive list (greyed, strikethrough names)
  - Opening a student modal shows "⏸ Mark Inactive" button; clicking it confirms and removes the student from the active list
  - Opening an inactive student shows "▶ Mark Active" button instead

---

## Task 7: ExpenditureSection.js + New Categories

**Files:**
- Create: `client/src/pages/admin/ExpenditureSection.js`
- Modify: `client/src/components/forms/AddExpenditureForm.js`
- Modify: `client/src/components/modals/ManageExpendituresModal.js`

- [ ] **Step 1: Add new categories to `AddExpenditureForm.js`**

  Find the `expenseType` `<select>` and replace its options:
  ```jsx
  <option value="SALARY">Salary</option>
  <option value="INFRASTRUCTURE">Infrastructure</option>
  <option value="UTILITIES">Utilities</option>
  <option value="SUPPLIES">Supplies</option>
  <option value="MAINTENANCE">Maintenance</option>
  <option value="CAB_DRIVER_SALARY">Cab Driver's Salary</option>
  <option value="PETROL">Petrol</option>
  <option value="MISC">Miscellaneous</option>
  ```

- [ ] **Step 2: Update `ManageExpendituresModal.js` to support inline rendering**

  Change the function signature:
  ```jsx
  function ManageExpendituresModal({ onClose, inline = false }) {
  ```

  Wrap the existing return so it skips the overlay when `inline` is true. Find the outermost return statement — it will look like:
  ```jsx
  return (
      <div className="modal-overlay" onClick={onClose}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                  <h2>Manage Expenditures</h2>
                  <button className="close-btn" onClick={onClose}>&times;</button>
              </div>
              {/* ... rest of modal body ... */}
          </div>
      </div>
  );
  ```

  Replace with:
  ```jsx
  const body = (
      <div className={inline ? '' : 'modal-content modal-large'} onClick={e => e.stopPropagation()}>
          {!inline && (
              <div className="modal-header">
                  <h2>Manage Expenditures</h2>
                  <button className="close-btn" onClick={onClose}>&times;</button>
              </div>
          )}
          {inline && <h2 style={{ marginBottom: '20px' }}>Expenditures</h2>}
          {/* ... rest of modal body unchanged ... */}
      </div>
  );

  if (inline) return body;

  return (
      <div className="modal-overlay" onClick={onClose}>
          {body}
      </div>
  );
  ```

- [ ] **Step 3: Create `client/src/pages/admin/ExpenditureSection.js`**

  ```jsx
  import React from 'react';
  import ManageExpendituresModal from '../../components/modals/ManageExpendituresModal';

  function ExpenditureSection() {
      return <ManageExpendituresModal inline onClose={() => {}} />;
  }

  export default ExpenditureSection;
  ```

- [ ] **Step 4: Verify in the browser**

  - Expenditure section renders inline (no modal overlay)
  - "Add Expenditure" form shows "Cab Driver's Salary" and "Petrol" in the dropdown

---

## Task 8: FeesSection.js + Multi-Fee Recording Form

**Files:**
- Create: `client/src/pages/admin/FeesSection.js`
- Modify: `client/src/components/forms/RecordFeePaymentForm.js`

- [ ] **Step 1: Rewrite `client/src/components/forms/RecordFeePaymentForm.js`**

  ```jsx
  import React, { useState, useEffect } from 'react';
  import './Forms.css';

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const CURRENT_YEAR = new Date().getFullYear();
  const YEAR_OPTIONS = [
      `${CURRENT_YEAR - 1}-${CURRENT_YEAR}`,
      `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`,
      `${CURRENT_YEAR + 1}-${CURRENT_YEAR + 2}`
  ];
  const NEEDS_MONTH = ['MONTHLY_FEE', 'TRANSPORT_FEE'];

  function emptyRow() {
      return {
          feeType: 'MONTHLY_FEE',
          amount: '',
          months: [],
          academicYear: YEAR_OPTIONS[1],
          dueDate: '',
          paymentStatus: 'PAID',
          paymentMethod: 'CASH',
          transactionId: '',
          remarks: ''
      };
  }

  function RecordFeePaymentForm({ onClose, onSuccess, preselectedStudent = null }) {
      const [students, setStudents] = useState([]);
      const [selectedStudentId, setSelectedStudentId] = useState(preselectedStudent?.studentId || '');
      const [selectedRollNumber, setSelectedRollNumber] = useState(preselectedStudent?.rollNumber || '');
      const [feeRows, setFeeRows] = useState([emptyRow()]);
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState('');
      const [results, setResults] = useState(null);

      const API_URL = window.location.hostname === 'localhost'
          ? 'http://localhost:5001/api'
          : 'https://welittleleaf.com/api';

      useEffect(() => {
          if (!preselectedStudent) fetchStudents();
      }, [preselectedStudent]);

      const fetchStudents = async () => {
          try {
              const token = localStorage.getItem('token');
              const res = await fetch(`${API_URL}/admin/students`, {
                  headers: { 'Authorization': `Bearer ${token}` }
              });
              const data = await res.json();
              if (data.success) setStudents(data.data);
          } catch (err) {
              console.error('Error fetching students:', err);
          }
      };

      const handleStudentSelect = (e) => {
          const s = students.find(s => s.studentId === e.target.value);
          if (s) { setSelectedStudentId(s.studentId); setSelectedRollNumber(s.rollNumber); }
      };

      const updateRow = (index, field, value) => {
          setFeeRows(rows => rows.map((row, i) => i === index ? { ...row, [field]: value } : row));
      };

      const toggleMonth = (index, month) => {
          setFeeRows(rows => rows.map((row, i) => {
              if (i !== index) return row;
              const months = row.months.includes(month)
                  ? row.months.filter(m => m !== month)
                  : [...row.months, month];
              return { ...row, months };
          }));
      };

      const addRow = () => {
          if (feeRows.length < 6) setFeeRows(rows => [...rows, emptyRow()]);
      };

      const removeRow = (index) => {
          if (feeRows.length > 1) setFeeRows(rows => rows.filter((_, i) => i !== index));
      };

      const calcTotal = () => feeRows.reduce((total, row) => {
          const amount = parseFloat(row.amount) || 0;
          const count = NEEDS_MONTH.includes(row.feeType) ? (row.months.length || 1) : 1;
          return total + amount * count;
      }, 0);

      const validateRows = () => {
          if (!selectedStudentId) return 'Please select a student';
          for (let i = 0; i < feeRows.length; i++) {
              const row = feeRows[i];
              if (!row.amount || parseFloat(row.amount) <= 0) return `Row ${i + 1}: Valid amount is required`;
              if (NEEDS_MONTH.includes(row.feeType) && row.months.length === 0) return `Row ${i + 1}: Select at least one month`;
              if (!row.dueDate) return `Row ${i + 1}: Due date is required`;
          }
          return null;
      };

      const handleSubmit = async (e) => {
          e.preventDefault();
          const validationError = validateRows();
          if (validationError) { setError(validationError); return; }

          setLoading(true);
          setError('');
          const token = localStorage.getItem('token');

          const records = [];
          for (const row of feeRows) {
              const monthList = NEEDS_MONTH.includes(row.feeType) ? row.months : [null];
              for (const month of monthList) {
                  records.push({
                      studentId: selectedStudentId,
                      rollNumber: selectedRollNumber,
                      feeType: row.feeType,
                      amount: parseFloat(row.amount),
                      month: month || '',
                      academicYear: row.academicYear,
                      dueDate: row.dueDate,
                      paymentStatus: row.paymentStatus,
                      paymentMethod: row.paymentStatus === 'PAID' ? row.paymentMethod : undefined,
                      transactionId: row.transactionId || undefined,
                      remarks: row.remarks || undefined,
                      paymentDate: row.paymentStatus === 'PAID' ? new Date().toISOString().split('T')[0] : null
                  });
              }
          }

          let succeeded = 0;
          let failed = 0;
          for (const record of records) {
              try {
                  const res = await fetch(`${API_URL}/admin/fees`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify(record)
                  });
                  const data = await res.json();
                  if (data.success) succeeded++;
                  else failed++;
              } catch {
                  failed++;
              }
          }

          setLoading(false);
          setResults({ succeeded, failed, total: records.length });
          if (failed === 0) {
              if (onSuccess) onSuccess();
              onClose();
          }
      };

      if (results && results.failed > 0) {
          return (
              <div className="modal-overlay" onClick={onClose}>
                  <div className="modal-content" onClick={e => e.stopPropagation()}>
                      <div className="modal-header">
                          <h2>Partial Success</h2>
                          <button className="close-btn" onClick={onClose}>&times;</button>
                      </div>
                      <div className="modal-body">
                          <p style={{ color: '#16a34a', marginBottom: '8px' }}>✓ {results.succeeded} of {results.total} records saved successfully.</p>
                          <p style={{ color: '#dc2626' }}>✗ {results.failed} records failed. Please record them again.</p>
                      </div>
                      <div className="form-footer">
                          <button onClick={() => { if (onSuccess) onSuccess(); onClose(); }} className="btn btn-secondary">Close</button>
                      </div>
                  </div>
              </div>
          );
      }

      return (
          <div className="modal-overlay" onClick={onClose}>
              <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
                  <div className="modal-header">
                      <h2>Record Fee Payment</h2>
                      <button className="close-btn" onClick={onClose}>&times;</button>
                  </div>

                  <form onSubmit={handleSubmit} className="form">
                      {error && <div className="error-message">{error}</div>}

                      {preselectedStudent ? (
                          <div className="form-group">
                              <label>Student</label>
                              <input type="text"
                                  value={`${preselectedStudent.rollNumber} - ${preselectedStudent.fullName}`}
                                  disabled style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }} />
                          </div>
                      ) : (
                          <div className="form-group">
                              <label>Select Student *</label>
                              <select value={selectedStudentId} onChange={handleStudentSelect} required>
                                  <option value="">-- Select Student --</option>
                                  {students.filter(s => s.status === 'ACTIVE').map(s => (
                                      <option key={s.studentId} value={s.studentId}>
                                          {s.rollNumber} - {s.fullName} ({s.class})
                                      </option>
                                  ))}
                                  {students.some(s => s.status === 'INACTIVE') && (
                                      <>
                                          <option disabled>── Inactive Students (pending dues) ──</option>
                                          {students.filter(s => s.status === 'INACTIVE').map(s => (
                                              <option key={s.studentId} value={s.studentId}>
                                                  {s.rollNumber} - {s.fullName} (INACTIVE)
                                              </option>
                                          ))}
                                      </>
                                  )}
                              </select>
                          </div>
                      )}

                      {feeRows.map((row, index) => (
                          <div key={index} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '12px', position: 'relative' }}>
                              {feeRows.length > 1 && (
                                  <button type="button" onClick={() => removeRow(index)}
                                      style={{ position: 'absolute', top: '8px', right: '8px', background: '#fee2e2', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', color: '#dc2626', fontWeight: '700' }}>
                                      ×
                                  </button>
                              )}

                              <div className="form-row">
                                  <div className="form-group">
                                      <label>Fee Type *</label>
                                      <select value={row.feeType} onChange={e => updateRow(index, 'feeType', e.target.value)} required>
                                          <option value="ADMISSION_FEE">Admission Fee</option>
                                          <option value="MONTHLY_FEE">Monthly Tuition Fee</option>
                                          <option value="ANNUAL_FEE">Annual Fee</option>
                                          <option value="EXAM_FEE">Exam Fee</option>
                                          <option value="TRANSPORT_FEE">Transport Fee</option>
                                          <option value="MISC">Miscellaneous</option>
                                      </select>
                                  </div>
                                  <div className="form-group">
                                      <label>Amount per {NEEDS_MONTH.includes(row.feeType) ? 'month' : 'entry'} (₹) *</label>
                                      <input type="number" value={row.amount}
                                          onChange={e => updateRow(index, 'amount', e.target.value)}
                                          placeholder="e.g., 3000" min="0" step="0.01" required />
                                  </div>
                              </div>

                              {NEEDS_MONTH.includes(row.feeType) && (
                                  <div className="form-group">
                                      <label>Select Months * <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>(select all months being paid)</span></label>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                                          {MONTHS.map(month => (
                                              <label key={month} style={{
                                                  display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                                                  padding: '4px 10px', borderRadius: '20px', userSelect: 'none',
                                                  border: `1px solid ${row.months.includes(month) ? '#16a34a' : '#d1d5db'}`,
                                                  background: row.months.includes(month) ? '#f0fdf4' : 'white',
                                                  fontSize: '0.85rem', color: row.months.includes(month) ? '#16a34a' : '#374151'
                                              }}>
                                                  <input type="checkbox" checked={row.months.includes(month)}
                                                      onChange={() => toggleMonth(index, month)} style={{ display: 'none' }} />
                                                  {row.months.includes(month) ? '✓ ' : ''}{month}
                                              </label>
                                          ))}
                                      </div>
                                      <div style={{ marginTop: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                          <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Academic Year *</label>
                                          <select value={row.academicYear} onChange={e => updateRow(index, 'academicYear', e.target.value)} required>
                                              {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                                          </select>
                                      </div>
                                  </div>
                              )}

                              <div className="form-row">
                                  <div className="form-group">
                                      <label>Due Date *</label>
                                      <input type="date" value={row.dueDate} onChange={e => updateRow(index, 'dueDate', e.target.value)} required />
                                  </div>
                                  <div className="form-group">
                                      <label>Payment Status *</label>
                                      <select value={row.paymentStatus} onChange={e => updateRow(index, 'paymentStatus', e.target.value)} required>
                                          <option value="PAID">Paid</option>
                                          <option value="PENDING">Pending</option>
                                          <option value="OVERDUE">Overdue</option>
                                      </select>
                                  </div>
                              </div>

                              {row.paymentStatus === 'PAID' && (
                                  <div className="form-row">
                                      <div className="form-group">
                                          <label>Payment Method *</label>
                                          <select value={row.paymentMethod} onChange={e => updateRow(index, 'paymentMethod', e.target.value)} required>
                                              <option value="CASH">Cash</option>
                                              <option value="CARD">Card</option>
                                              <option value="UPI">UPI</option>
                                              <option value="NET_BANKING">Net Banking</option>
                                              <option value="CHEQUE">Cheque</option>
                                          </select>
                                      </div>
                                      <div className="form-group">
                                          <label>Transaction ID</label>
                                          <input type="text" value={row.transactionId}
                                              onChange={e => updateRow(index, 'transactionId', e.target.value)}
                                              placeholder="Optional" />
                                      </div>
                                  </div>
                              )}

                              <div className="form-group">
                                  <label>Remarks</label>
                                  <textarea value={row.remarks} onChange={e => updateRow(index, 'remarks', e.target.value)}
                                      rows="2" placeholder="Optional notes" />
                              </div>
                          </div>
                      ))}

                      {feeRows.length < 6 && (
                          <button type="button" onClick={addRow} className="btn btn-secondary"
                              style={{ marginBottom: '16px', width: '100%' }}>
                              + Add Another Fee
                          </button>
                      )}

                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '600', color: '#166534' }}>Total Amount</span>
                          <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#15803d' }}>
                              ₹{calcTotal().toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                      </div>

                      <div className="form-actions">
                          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                          <button type="submit" className="btn btn-primary" disabled={loading}>
                              {loading ? 'Saving...' : 'Record Payment'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      );
  }

  export default RecordFeePaymentForm;
  ```

- [ ] **Step 2: Create `client/src/pages/admin/FeesSection.js`**

  ```jsx
  import React, { useState } from 'react';
  import RecordFeePaymentForm from '../../components/forms/RecordFeePaymentForm';
  import ManageFeeStructureModal from '../../components/modals/ManageFeeStructureModal';

  function FeesSection() {
      const [showRecord, setShowRecord] = useState(false);
      const [showStructure, setShowStructure] = useState(false);

      return (
          <div className="card">
              <div className="card-header">
                  <h2>Fee Management</h2>
              </div>
              <div className="actions-grid" style={{ marginTop: '16px' }}>
                  <button className="action-btn" onClick={() => setShowRecord(true)}>
                      💰 Record Fee Payment
                  </button>
                  <button className="action-btn" onClick={() => setShowStructure(true)}>
                      📋 Manage Fee Structure
                  </button>
              </div>

              {showRecord && (
                  <RecordFeePaymentForm
                      onClose={() => setShowRecord(false)}
                      onSuccess={() => setShowRecord(false)}
                  />
              )}
              {showStructure && (
                  <ManageFeeStructureModal onClose={() => setShowStructure(false)} />
              )}
          </div>
      );
  }

  export default FeesSection;
  ```

- [ ] **Step 3: Verify in the browser**

  - Open Fees → "Record Fee Payment" opens the new form
  - Active students at top of dropdown; inactive students in a separate group labelled "Inactive Students (pending dues)"
  - Select Monthly Tuition Fee → month checkboxes appear
  - Tick April + May with ₹3000/month → total shows ₹6000
  - Click "+ Add Another Fee" → second row appended
  - Submit → form closes, fee records created (one per month per fee type)

---

## Task 9: Inquiries + Admission Conversion

**Files:**
- Modify: `client/src/components/modals/ViewInquiriesModal.js`

- [ ] **Step 1: Add `inline` and `onPendingCountChange` props to `ViewInquiriesModal.js`**

  Change the function signature:
  ```jsx
  function ViewInquiriesModal({ onClose, inline = false, onPendingCountChange }) {
  ```

  Add a `useEffect` after the existing `useEffect` that calls `fetchInquiries`:
  ```jsx
  useEffect(() => {
      if (onPendingCountChange) {
          const count = inquiries.filter(inq => inq.status === 'NEW' || inq.status === 'IN_PROGRESS').length;
          onPendingCountChange(count);
      }
  }, [inquiries]);
  ```

- [ ] **Step 2: Add ADMITTED to the filter state and filter tabs**

  The existing filter state is `const [filter, setFilter] = useState('ALL');`. No change needed to the declaration.

  In `getFilteredInquiries`, the existing logic already handles any status string — no change needed there.

  Find the filter buttons row (buttons for ALL, NEW, IN_PROGRESS, FOLLOWED_UP) and add an Admitted button:
  ```jsx
  <button
      className={`tab ${filter === 'ADMITTED' ? 'active' : ''}`}
      onClick={() => setFilter('ADMITTED')}
  >
      Admitted
  </button>
  ```

- [ ] **Step 3: Add `handleMarkAdmitted` function**

  Add this function alongside `handleFollowUp`:
  ```jsx
  const handleMarkAdmitted = async (inquiry) => {
      if (!window.confirm(`Mark inquiry from ${inquiry.parentName} as admitted? This records today as the admission date.`)) return;

      try {
          const token = localStorage.getItem('token');
          const API_URL = window.location.hostname === 'localhost'
              ? 'http://localhost:5001/api'
              : 'https://welittleleaf.com/api';

          const response = await fetch(
              `${API_URL}/admin/inquiries/${encodeURIComponent(inquiry.inquiryId)}/status`,
              {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify({ status: 'ADMITTED' })
              }
          );
          const data = await response.json();
          if (data.success) {
              setMessage({ type: 'success', text: 'Inquiry marked as admitted' });
              setInquiries(prev => prev.map(inq =>
                  inq.inquiryId === inquiry.inquiryId
                      ? { ...inq, status: 'ADMITTED', admissionDate: new Date().toISOString().split('T')[0] }
                      : inq
              ));
              setTimeout(() => setMessage({ type: '', text: '' }), 3000);
          } else {
              setMessage({ type: 'error', text: data.message || 'Failed to update' });
          }
      } catch (error) {
          console.error('Error marking admitted:', error);
          setMessage({ type: 'error', text: 'Failed to update inquiry status' });
      }
  };
  ```

- [ ] **Step 4: Add "Mark as Admitted" button to each inquiry card**

  Find wherever the "Follow Up" button is rendered per inquiry and add alongside it:
  ```jsx
  {inquiry.status !== 'ADMITTED' && (
      <button
          onClick={() => handleMarkAdmitted(inquiry)}
          className="btn btn-primary"
          style={{ fontSize: '0.8rem', padding: '4px 10px', background: '#16a34a', border: 'none' }}
      >
          ✓ Mark as Admitted
      </button>
  )}
  {inquiry.status === 'ADMITTED' && (
      <span style={{ color: '#16a34a', fontWeight: '600', fontSize: '0.875rem' }}>
          ✓ Admitted{inquiry.admissionDate ? ` on ${inquiry.admissionDate}` : ''}
      </span>
  )}
  ```

- [ ] **Step 5: Update inline rendering**

  Find the outermost `return` in `ViewInquiriesModal` and apply the same inline pattern as Task 7:
  ```jsx
  const body = (
      <div className={inline ? '' : 'modal-content modal-large'} onClick={e => e.stopPropagation()}>
          {!inline && (
              <div className="modal-header">
                  <h2>Inquiries</h2>
                  <button className="close-btn" onClick={onClose}>&times;</button>
              </div>
          )}
          {/* rest of modal body unchanged */}
      </div>
  );

  if (inline) return body;

  return (
      <div className="modal-overlay" onClick={onClose}>
          {body}
      </div>
  );
  ```

- [ ] **Step 6: Verify in the browser**

  - Inquiries section shows filter tabs: ALL | NEW | FOLLOWED_UP | IN_PROGRESS | **Admitted**
  - Each inquiry row has "✓ Mark as Admitted" button
  - Clicking it prompts confirmation → marks as admitted → moves to Admitted tab with date shown
  - Orange sidebar dot disappears when all NEW/IN_PROGRESS inquiries are resolved

---

## Task 10: Final Integration Check

- [ ] **Step 1: Start the full app**

  ```bash
  # Terminal 1
  cd server && npm start

  # Terminal 2
  cd client && npm start
  ```

- [ ] **Step 2: Desktop smoke test — walk through each sidebar item**

  - **Dashboard** — stats load, quick action buttons navigate to correct sections, sidebar hover expands smoothly
  - **Students** — active students shown, "Show Inactive" toggle works, Mark Inactive modal works
  - **Teachers** — teacher list loads, Add Teacher form opens
  - **Fees** — multi-fee form works, month checkboxes appear for monthly/transport fees, total calculates
  - **Reports** — date presets work, pending fees section expands, pending count shows only active students
  - **Expenditure** — inline list visible, "Cab Driver's Salary" and "Petrol" in dropdown
  - **Inquiries** — Admitted tab works, Mark as Admitted button works

- [ ] **Step 3: Mobile smoke test (iPhone 390px)**

  Open DevTools → device toolbar → iPhone 14 Pro (390×844):
  - Sidebar hidden, hamburger (☰) visible in top bar
  - Tap ☰ → drawer slides in
  - Tap outside → drawer closes
  - All sections render without horizontal overflow

- [ ] **Step 4: Tablet smoke test (iPad 820px)**

  DevTools → iPad Air (820×1180):
  - Same hamburger behaviour as mobile
  - Tables scroll horizontally when content overflows
