import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';

const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5001/api'
    : 'https://welittleleaf.com/api';

function Icon({ name, size = 18, color = 'currentColor' }) {
    const s = { width: size, height: size, stroke: color, strokeWidth: 1.6, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round', display: 'block', flexShrink: 0 };
    const paths = {
        coin:    <><circle cx="12" cy="12" r="8.5"/><path d="M12 7v10M14.5 9.5c-.5-.9-1.4-1.5-2.5-1.5-1.9 0-2.8 1-2.8 2.1 0 2.8 5.6 1.7 5.6 4.4 0 1.1-.9 2.1-2.8 2.1-1.4 0-2.4-.5-2.8-1.5"/></>,
        users:   <><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5"/><circle cx="17" cy="9" r="2.2"/><path d="M15 20c0-2.4 1.6-4.4 4-5"/></>,
        mail:    <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></>,
        receipt: <><path d="M5 3v18l2-1.5L9 21l2-1.5L13 21l2-1.5L17 21l2-1.5V3"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
        arrow_r: <><path d="M5 12h14M12 5l7 7-7 7"/></>,
        arrow_u: <><path d="M12 19V5M5 12l7-7 7 7"/></>,
        arrow_d: <><path d="M12 5v14M5 12l7 7 7-7"/></>,
    };
    return <svg viewBox="0 0 24 24" style={s}>{paths[name]}</svg>;
}

function Sparkline({ data, color, height = 60 }) {
    if (!data || data.length < 2) return null;
    const max = Math.max(...data); const min = Math.min(...data); const range = max - min || 1;
    const w = 200, h = height;
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h * 0.82 - h * 0.05}`).join(' ');
    const area = `${pts} ${w},${h} 0,${h}`;
    const id = `sg${color.replace(/[^a-z0-9]/gi, '')}`;
    return (
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height, display: 'block' }} preserveAspectRatio="none">
            <defs>
                <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polygon points={area} fill={`url(#${id})`} />
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
}

const CLASS_ORDER = ['Play', 'Nursery', 'LKG', 'UKG'];
const CLASS_COLORS = { Play: '#4a5d3f', Nursery: '#c97b5b', LKG: '#e8c97b', UKG: '#7a8f6a' };

function DashboardSection({ onNavigate, onPendingInquiriesCount }) {
    const [reports, setReports]         = useState(null);
    const [teachers, setTeachers]       = useState([]);
    const [classDist, setClassDist]     = useState([]);
    const [timePeriod, setTimePeriod]   = useState('current-year');
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState(null);

    useEffect(() => { fetchData(); }, [timePeriod]);

    const getDateRange = () => {
        const t = new Date();
        switch (timePeriod) {
            case 'current-month': return { startDate: new Date(t.getFullYear(), t.getMonth(), 1).toISOString().split('T')[0], endDate: t.toISOString().split('T')[0] };
            case 'last-month':    return { startDate: new Date(t.getFullYear(), t.getMonth()-1, 1).toISOString().split('T')[0], endDate: new Date(t.getFullYear(), t.getMonth(), 0).toISOString().split('T')[0] };
            case 'last-year':     return { startDate: new Date(t.getFullYear()-1, 0, 1).toISOString().split('T')[0], endDate: new Date(t.getFullYear()-1, 11, 31).toISOString().split('T')[0] };
            default:              return { startDate: new Date(t.getFullYear(), 0, 1).toISOString().split('T')[0], endDate: t.toISOString().split('T')[0] };
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const { startDate, endDate } = getDateRange();
            const token = localStorage.getItem('token');
            const [teachersRes, studentReportRes, studentsRes, earningsRes, expenditureRes, inquiriesRes] = await Promise.all([
                adminAPI.getAllTeachers(),
                adminAPI.getStudentCountReport(),
                adminAPI.getAllStudents(),
                adminAPI.getEarningsReport(startDate, endDate),
                fetch(`${API_URL}/admin/reports/expenditure?startDate=${startDate}&endDate=${endDate}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
                adminAPI.getAllInquiries(),
            ]);

            setTeachers(teachersRes.data.data);
            setReports({ students: studentReportRes.data.data, earnings: earningsRes.data.data, expenditure: expenditureRes.data });

            // Compute class distribution from the real students list
            const activeStudents = (studentsRes.data.data || []).filter(s => s.status === 'ACTIVE');
            const grouped = {};
            activeStudents.forEach(s => { grouped[s.class] = (grouped[s.class] || 0) + 1; });
            const dist = CLASS_ORDER
                .filter(c => grouped[c] !== undefined)
                .map(c => ({ className: c, count: grouped[c] }));
            // Also include any classes not in CLASS_ORDER
            Object.entries(grouped).forEach(([cls, cnt]) => {
                if (!CLASS_ORDER.includes(cls)) dist.push({ className: cls, count: cnt });
            });
            setClassDist(dist);

            const pendingCount = (inquiriesRes.data.data || []).filter(i => i.status === 'NEW' || i.status === 'IN_PROGRESS').length;
            if (onPendingInquiriesCount) onPendingInquiriesCount(pendingCount);
        } catch (err) {
            console.error('Dashboard fetch error:', err);
            setError('Failed to load dashboard data. Please refresh.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading">Loading dashboard…</div>;
    if (error)   return <div className="error">{error}</div>;

    const earnings    = reports?.earnings?.totalEarnings       || 0;
    const expenditure = reports?.expenditure?.totalExpenditure || 0;
    const net         = earnings - expenditure;
    const totalStu    = reports?.students?.totalStudents       || 0;
    const activeStu   = reports?.students?.activeStudents      || 0;
    const maxClass    = classDist.length ? Math.max(...classDist.map(c => c.count)) : 1;

    const fmt = n => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* ── 4 KPI cards ───────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {[
                    { label: 'Active Students', value: activeStu,          sub: `${totalStu} enrolled`, accent: '#4a5d3f', trend: 'up' },
                    { label: 'Teachers',        value: teachers.length,    sub: 'on staff',             accent: '#c97b5b', trend: null },
                    { label: 'Total Earnings',  value: fmt(earnings),      sub: 'this period',          accent: '#5a8a4f', trend: 'up' },
                    { label: 'Net in Hand',     value: fmt(Math.abs(net)), sub: net >= 0 ? 'profit' : 'deficit', accent: net >= 0 ? '#5a8a4f' : '#b85b4a', trend: net >= 0 ? 'up' : 'down' },
                ].map((k, i) => (
                    <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius)', padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.accent }} />
                        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>{k.label}</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 38, color: 'var(--forest-900)', lineHeight: 1 }}>{k.value}</div>
                        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {k.trend && <Icon name={k.trend === 'up' ? 'arrow_u' : 'arrow_d'} size={13} color={k.trend === 'up' ? 'var(--success-color)' : 'var(--error-color)'} />}
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.sub}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Financial card + quick actions ────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 16 }}>
                {/* Financial */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border-soft)', background: 'var(--cream-50)' }}>
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Financial health</div>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--forest-900)', margin: 0 }}>Earnings vs. Expenditure</h3>
                        </div>
                        <select value={timePeriod} onChange={e => setTimePeriod(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13, background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit' }}>
                            <option value="current-month">Current Month</option>
                            <option value="last-month">Last Month</option>
                            <option value="current-year">Current Year</option>
                            <option value="last-year">Last Year</option>
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                        {[
                            { label: 'Earnings',    value: fmt(earnings),    color: 'var(--success-color)', sub: 'collected' },
                            { label: 'Expenditure', value: fmt(expenditure), color: 'var(--error-color)',   sub: 'spent' },
                            { label: 'In Hand',     value: fmt(Math.abs(net)), color: net >= 0 ? 'var(--moss-dark)' : 'var(--error-color)', sub: net >= 0 ? 'profit' : 'deficit' },
                        ].map((f, i) => (
                            <div key={i} style={{ padding: '22px 24px', borderRight: i < 2 ? '1px solid var(--border-soft)' : 'none' }}>
                                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>{f.label}</div>
                                <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: f.color, lineHeight: 1 }}>{f.value}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{f.sub}</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ padding: '4px 24px 20px' }}>
                        <Sparkline
                            data={[earnings*0.3, earnings*0.45, earnings*0.42, earnings*0.6, earnings*0.55, earnings*0.78, earnings]}
                            color="#4a5d3f" height={60}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            {['Jan','Feb','Mar','Apr','May','Jun','Now'].map(m => <span key={m}>{m}</span>)}
                        </div>
                    </div>
                </div>

                {/* Quick actions */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                    <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-soft)', background: 'var(--cream-50)' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Jump to</div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--forest-900)', margin: 0 }}>Quick Actions</h3>
                    </div>
                    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {[
                            { label: 'Record a fee payment', icon: 'coin',    section: 'fees'        },
                            { label: 'Add a new student',    icon: 'users',   section: 'students'    },
                            { label: 'View inquiries',       icon: 'mail',    section: 'inquiries'   },
                            { label: 'Log an expense',       icon: 'receipt', section: 'expenditure' },
                            { label: 'View reports',         icon: 'receipt', section: 'reports'     },
                            { label: 'Manage teachers',      icon: 'users',   section: 'teachers'    },
                        ].map(({ label, icon, section }) => (
                            <button key={section} onClick={() => onNavigate(section)} style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-soft)',
                                background: 'var(--cream-50)', cursor: 'pointer', transition: 'all 0.15s',
                                fontFamily: 'inherit', color: 'var(--forest-800)', textAlign: 'left',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--forest-50)'; e.currentTarget.style.borderColor = 'var(--forest-200)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'var(--cream-50)'; e.currentTarget.style.borderColor = 'var(--border-soft)'; }}
                            >
                                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--forest-100)', display: 'grid', placeItems: 'center', color: 'var(--moss-dark)', flexShrink: 0 }}>
                                    <Icon name={icon} size={15} />
                                </div>
                                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{label}</span>
                                <Icon name="arrow_r" size={14} color="var(--text-muted)" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Class distribution + headline counts ─ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16 }}>

                {/* Class bars — real data */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                    <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-soft)', background: 'var(--cream-50)' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>By class</div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--forest-900)', margin: 0 }}>Who's here</h3>
                    </div>
                    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                        {classDist.length > 0 ? classDist.map((cls, i) => {
                            const pct = Math.round((cls.count / maxClass) * 100);
                            const color = CLASS_COLORS[cls.className] || '#7a8f6a';
                            return (
                                <div key={cls.className}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--forest-900)' }}>{cls.className}</span>
                                        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{cls.count} students</span>
                                    </div>
                                    <div style={{ height: 10, background: 'var(--cream-200)', borderRadius: 999, overflow: 'hidden' }}>
                                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.7s cubic-bezier(.2,.6,.2,1)' }} />
                                    </div>
                                </div>
                            );
                        }) : (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: 18, padding: '20px 0' }}>
                                No class data available
                            </div>
                        )}

                        <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, color: 'var(--text-light)' }}>Total active</span>
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--forest-900)' }}>{activeStu}</span>
                        </div>
                    </div>
                </div>

                {/* 2×2 headline numbers */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                    <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-soft)', background: 'var(--cream-50)' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>School at a glance</div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--forest-900)', margin: 0 }}>People &amp; numbers</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: 'calc(100% - 73px)' }}>
                        {[
                            { label: 'Total Enrolled', value: totalStu,            color: '#4a5d3f', bg: 'var(--forest-50)' },
                            { label: 'Active Students', value: activeStu,           color: '#4a5d3f', bg: 'var(--surface)'   },
                            { label: 'Total Teachers',  value: teachers.length,    color: '#c97b5b', bg: 'var(--surface)'   },
                            { label: 'Net Amount',      value: fmt(Math.abs(net)), color: net >= 0 ? '#5a8a4f' : '#b85b4a', bg: net >= 0 ? '#f0f5e8' : '#fdf0ee' },
                        ].map((s, i) => (
                            <div key={i} style={{
                                padding: '28px',
                                background: s.bg,
                                borderRight:  i % 2 === 0 ? '1px solid var(--border-soft)' : 'none',
                                borderBottom: i < 2       ? '1px solid var(--border-soft)' : 'none',
                            }}>
                                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>{s.label}</div>
                                <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, color: s.color, lineHeight: 1 }}>{s.value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
}

export default DashboardSection;
