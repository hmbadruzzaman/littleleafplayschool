import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardSection from './admin/DashboardSection';
import StudentsSection from './admin/StudentsSection';
import TeachersSection from './admin/TeachersSection';
import FeesSection from './admin/FeesSection';
import ReportsSection from './admin/ReportsSection';
import ExpenditureSection from './admin/ExpenditureSection';
import InquiriesSection from './admin/InquiriesSection';
import LeafMark from '../components/common/LeafMark';
import './AdminSidebar.css';

/* SVG icon set — inline, stroke-based */
function NavIcon({ name }) {
    const paths = {
        home:        <><path d="M3 10l9-7 9 7"/><path d="M5 9v11h14V9"/></>,
        users:       <><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5"/><circle cx="17" cy="9" r="2.2"/><path d="M15 20c0-2.4 1.6-4.4 4-5"/></>,
        chalkboard:  <><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20l4-4 4 4"/><path d="M7 9h10M7 12h6"/></>,
        coin:        <><circle cx="12" cy="12" r="8.5"/><path d="M12 7v10M14.5 9.5c-.5-.9-1.4-1.5-2.5-1.5-1.9 0-2.8 1-2.8 2.1 0 2.8 5.6 1.7 5.6 4.4 0 1.1-.9 2.1-2.8 2.1-1.4 0-2.4-.5-2.8-1.5"/></>,
        chart:       <><path d="M4 20V8M9 20v-6M14 20v-3.5M19 20V11"/></>,
        receipt:     <><path d="M5 3v18l2-1.5L9 21l2-1.5L13 21l2-1.5L17 21l2-1.5V3"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
        mail:        <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></>,
        logout:      <><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5"/><path d="M15 16l4-4-4-4M19 12H9"/></>,
        menu:        <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    };
    return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
            stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            {paths[name]}
        </svg>
    );
}

const NAV_ITEMS = [
    { key: 'dashboard',   icon: 'home',       label: 'Overview'    },
    { key: 'students',    icon: 'users',      label: 'Students'    },
    { key: 'teachers',    icon: 'chalkboard', label: 'Teachers'    },
    { key: 'fees',        icon: 'coin',       label: 'Fees'        },
    { key: 'reports',     icon: 'chart',      label: 'Reports'     },
    { key: 'expenditure', icon: 'receipt',    label: 'Expenditure' },
    { key: 'inquiries',   icon: 'mail',       label: 'Inquiries'   },
];

const PAGE_META = {
    dashboard:   { title: 'Overview',     sub: "Here's what's happening at school." },
    students:    { title: 'Students',     sub: 'Everyone on the roster, in one place.' },
    teachers:    { title: 'Teachers',     sub: 'Manage your teaching team.' },
    fees:        { title: 'Fees',         sub: 'Record payments, track dues.' },
    reports:     { title: 'Reports',      sub: 'Financial reports and analytics.' },
    expenditure: { title: 'Expenditure',  sub: 'Every rupee, accounted for.' },
    inquiries:   { title: 'Inquiries',    sub: "Parents who'd like to hear from you." },
};

function AdminDashboard() {
    const { logout } = useAuth();
    const [activeSection, setActiveSection] = useState('dashboard');
    const [mobileOpen, setMobileOpen] = useState(false);
    const [pendingInquiriesCount, setPendingInquiriesCount] = useState(0);

    const handleNavClick = key => { setActiveSection(key); setMobileOpen(false); };
    const { title, sub } = PAGE_META[activeSection] || PAGE_META.dashboard;

    return (
        <div className="ll-admin">
            {/* Mobile overlay */}
            {mobileOpen && (
                <div className="ll-admin__overlay" onClick={() => setMobileOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`ll-admin__sidebar ${mobileOpen ? 'll-admin__sidebar--open' : ''}`}>
                <div className="ll-admin__sidebar-logo">
                    <div className="ll-admin__sidebar-logo-icon">
                        <LeafMark size={18} />
                    </div>
                    <span className="ll-admin__sidebar-logo-text">Little Leaf</span>
                </div>

                <div className="ll-admin__sidebar-label">Manage</div>

                <nav className="ll-admin__nav">
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.key}
                            className={`ll-admin__nav-item ${activeSection === item.key ? 'll-admin__nav-item--active' : ''}`}
                            onClick={() => handleNavClick(item.key)}
                        >
                            <span className="ll-admin__nav-icon"><NavIcon name={item.icon} /></span>
                            <span className="ll-admin__nav-label">{item.label}</span>
                            {item.key === 'inquiries' && pendingInquiriesCount > 0 && (
                                <span className="ll-admin__nav-badge">{pendingInquiriesCount}</span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="ll-admin__sidebar-footer">
                    <button className="ll-admin__nav-item" onClick={logout}>
                        <span className="ll-admin__nav-icon"><NavIcon name="logout" /></span>
                        <span className="ll-admin__nav-label">Sign out</span>
                    </button>
                </div>
            </aside>

            {/* Main area */}
            <div className="ll-admin__main">
                {/* Topbar */}
                <header className="ll-admin__topbar">
                    <div className="ll-admin__topbar-left">
                        <button
                            className="ll-admin__hamburger"
                            onClick={() => setMobileOpen(o => !o)}
                            aria-label="Toggle navigation"
                        >
                            <NavIcon name="menu" />
                        </button>
                        <div>
                            <h1 className="ll-admin__topbar-title">{title}</h1>
                            <p className="ll-admin__topbar-sub">{sub}</p>
                        </div>
                    </div>
                    <div className="ll-admin__topbar-right">
                        <div className="ll-admin__avatar" title="Admin">A</div>
                    </div>
                </header>

                {/* Content */}
                <main className="ll-admin__content">
                    {activeSection === 'dashboard' && (
                        <DashboardSection
                            onNavigate={handleNavClick}
                            onPendingInquiriesCount={setPendingInquiriesCount}
                        />
                    )}
                    {activeSection === 'students'    && <StudentsSection />}
                    {activeSection === 'teachers'    && <TeachersSection />}
                    {activeSection === 'fees'        && <FeesSection />}
                    {activeSection === 'reports'     && <ReportsSection />}
                    {activeSection === 'expenditure' && <ExpenditureSection />}
                    {activeSection === 'inquiries'   && (
                        <InquiriesSection onPendingCountChange={setPendingInquiriesCount} />
                    )}
                </main>
            </div>
        </div>
    );
}

export default AdminDashboard;
