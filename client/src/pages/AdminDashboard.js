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
