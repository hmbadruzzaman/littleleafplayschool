import React, { useState, useEffect } from 'react';

const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5001/api'
    : 'https://welittleleaf.com/api';

const PRESETS = [
    { key: 'today',       label: 'Today'      },
    { key: 'this-week',   label: 'This Week'  },
    { key: 'this-month',  label: 'This Month' },
    { key: 'last-month',  label: 'Last Month' },
    { key: 'this-year',   label: 'This Year'  },
    { key: 'last-year',   label: 'Last Year'  },
];

const CHART_COLORS = ['#4a5d3f', '#7a8f6a', '#e8c97b', '#c97b5b', '#9a7a6a', '#b8a582'];

const EARNINGS_CATEGORIES = [
    { key: 'monthlyFees',   label: 'Monthly Tuition' },
    { key: 'admissionFees', label: 'Admission Fees'  },
    { key: 'annualFees',    label: 'Annual Fees'     },
    { key: 'transportFees', label: 'Transport'       },
    { key: 'examFees',      label: 'Exam Fees'       },
    { key: 'miscFees',      label: 'Miscellaneous'   },
];

const EXPENDITURE_CATEGORIES = [
    { key: 'salaryExpenses',         label: 'Salaries'       },
    { key: 'infrastructureExpenses', label: 'Infrastructure' },
    { key: 'utilitiesExpenses',      label: 'Utilities'      },
    { key: 'suppliesExpenses',       label: 'Supplies'       },
    { key: 'maintenanceExpenses',    label: 'Maintenance'    },
    { key: 'miscExpenses',           label: 'Miscellaneous'  },
];

// Compact currency formatter for center-of-donut label
const fmtCompact = n => {
    const v = Number(n) || 0;
    if (v >= 1e7) return '₹' + (v / 1e7).toFixed(1).replace(/\.0$/, '') + 'Cr';
    if (v >= 1e5) return '₹' + (v / 1e5).toFixed(1).replace(/\.0$/, '') + 'L';
    if (v >= 1e3) return '₹' + (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return '₹' + v.toLocaleString('en-IN');
};

function DonutChart({ items, total }) {
    const size = 170, stroke = 26;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const cx = size / 2, cy = size / 2;

    let cumulative = 0;
    const segments = items.map(item => {
        const arc = total ? (item.amount / total) * circumference : 0;
        const seg = { arc, offset: -cumulative, color: item.color };
        cumulative += arc;
        return seg;
    });

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
            <g transform={`rotate(-90 ${cx} ${cy})`}>
                {segments.map((s, i) => (
                    <circle
                        key={i}
                        cx={cx} cy={cy} r={radius}
                        fill="none"
                        stroke={s.color}
                        strokeWidth={stroke}
                        strokeDasharray={`${s.arc} ${circumference - s.arc}`}
                        strokeDashoffset={s.offset}
                    />
                ))}
            </g>
            <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="middle"
                  fontFamily="var(--font-display)" fontSize="22" fill="var(--forest-900)">
                {fmtCompact(total)}
            </text>
            <text x={cx} y={cy + 18} textAnchor="middle" dominantBaseline="middle"
                  fontSize="10" letterSpacing="0.14em" fill="var(--text-muted)">
                TOTAL
            </text>
        </svg>
    );
}

function ChartCard({ eyebrow, title, items, total, fmt, emptyHint }) {
    return (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-soft)', background: 'var(--cream-50)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>{eyebrow}</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--forest-900)', margin: 0 }}>{title}</h3>
            </div>
            {items.length === 0 ? (
                <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>{emptyHint}</div>
            ) : (
                <div style={{ padding: '24px 20px', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                    <DonutChart items={items} total={total} />
                    <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column' }}>
                        {items.map((item, i) => {
                            const pct = total ? Math.round((item.amount / total) * 100) : 0;
                            const isLast = i === items.length - 1;
                            return (
                                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: isLast ? 'none' : '1px solid var(--border-soft)' }}>
                                    <span style={{ width: 10, height: 10, borderRadius: 3, background: item.color, flexShrink: 0 }} />
                                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--forest-900)' }}>{item.label}</span>
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--forest-900)', minWidth: 78, textAlign: 'right' }}>{fmt(item.amount)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function getRange(key) {
    const now = new Date();
    let start, end = now.toISOString().split('T')[0];
    switch (key) {
        case 'today':      start = end; break;
        case 'this-week': { const ws = new Date(now); ws.setDate(now.getDate() - now.getDay()); start = ws.toISOString().split('T')[0]; break; }
        case 'this-month': start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]; break;
        case 'last-month': start = new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString().split('T')[0]; end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]; break;
        case 'this-year':  start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]; break;
        case 'last-year':  start = new Date(now.getFullYear()-1, 0, 1).toISOString().split('T')[0]; end = new Date(now.getFullYear()-1, 11, 31).toISOString().split('T')[0]; break;
        default:           start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    }
    return { start, end };
}

function ReportsSection() {
    const today = new Date();
    const [startDate, setStartDate]       = useState(new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]);
    const [endDate, setEndDate]           = useState(today.toISOString().split('T')[0]);
    const [reportLoading, setLoading]     = useState(false);
    const [reports, setReports]           = useState(null);
    const [pendingFees, setPendingFees]   = useState(null);
    const [showPending, setShowPending]   = useState(false);
    const [activePreset, setActivePreset] = useState('this-year');

    // Auto-load on mount
    useEffect(() => {
        const { start, end } = getRange('this-year');
        fetchReports(start, end);
    }, []);

    const fetchReports = async (s, e) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [earningsRes, expenditureRes, pendingRes] = await Promise.all([
                fetch(`${API_URL}/admin/reports/earnings?startDate=${s}&endDate=${e}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
                fetch(`${API_URL}/admin/reports/expenditure?startDate=${s}&endDate=${e}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
                fetch(`${API_URL}/admin/reports/pending-fees`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
            ]);
            if (earningsRes.success) {
                setReports({ earnings: earningsRes.data, expenditure: expenditureRes.success ? expenditureRes.data : null });
            }
            if (pendingRes.success) setPendingFees(pendingRes.data);
        } catch (err) {
            console.error('Error fetching reports:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePreset = key => {
        setActivePreset(key);
        const { start, end } = getRange(key);
        setStartDate(start); setEndDate(end);
        fetchReports(start, end);
    };

    const handleApply = () => { setActivePreset(null); fetchReports(startDate, endDate); };

    const earnings    = reports?.earnings?.totalEarnings       || 0;
    const expenditure = reports?.expenditure?.totalExpenditure || 0;
    const net         = earnings - expenditure;
    const fmt = n => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── Filter card ─────────────────────── */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-soft)', background: 'var(--cream-50)' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Financial Reports</div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400, color: 'var(--forest-900)', margin: 0 }}>Choose a period</h2>
                </div>
                <div style={{ padding: '18px 24px' }}>
                    {/* Preset pills */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                        {PRESETS.map(p => (
                            <button key={p.key} onClick={() => handlePreset(p.key)} style={{
                                padding: '7px 16px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                                border: '1px solid ' + (activePreset === p.key ? 'var(--forest-400)' : 'var(--border-color)'),
                                background: activePreset === p.key ? 'var(--forest-900)' : 'transparent',
                                color: activePreset === p.key ? 'var(--cream-50)' : 'var(--text-light)',
                                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                            }}>{p.label}</button>
                        ))}
                    </div>

                    {/* Custom date inputs */}
                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap', padding: '16px', background: 'var(--cream-50)', borderRadius: 10, border: '1px solid var(--border-soft)' }}>
                        {[['From', startDate, setStartDate], ['To', endDate, setEndDate]].map(([label, val, setter]) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-light)', whiteSpace: 'nowrap' }}>{label}:</label>
                                <input type="date" value={val} onChange={e => { setter(e.target.value); setActivePreset(null); }}
                                    style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13, background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit' }} />
                            </div>
                        ))}
                        <button onClick={handleApply} disabled={reportLoading} className="btn btn-primary" style={{ fontSize: 13 }}>
                            {reportLoading ? 'Loading…' : 'Apply'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Results ─────────────────────────── */}
            {reportLoading && <div className="loading" style={{ minHeight: 160 }}>Loading report…</div>}

            {!reportLoading && reports && (
                <>
                    {/* 3 KPI cards */}
                    <div className="ll-dash-kpis ll-dash-kpis--three">
                        {[
                            { label: 'Total Earnings',   value: fmt(earnings),    sub: `${reports.earnings?.transactionCount || 0} transactions`,  accent: 'var(--success-color)', bg: 'var(--success-bg)'   },
                            { label: 'Total Expenditure', value: fmt(expenditure), sub: `${reports.expenditure?.transactionCount || 0} transactions`, accent: 'var(--error-color)',   bg: 'var(--error-bg)'     },
                            { label: net >= 0 ? 'Net Profit' : 'Net Loss', value: fmt(Math.abs(net)), sub: `${((net / (earnings || 1)) * 100).toFixed(1)}% margin`, accent: net >= 0 ? 'var(--success-color)' : 'var(--warning-color)', bg: net >= 0 ? 'var(--success-bg)' : 'var(--warning-bg)' },
                        ].map((k, i) => (
                            <div key={i} className="ll-dash-kpi" style={{ background: k.bg, border: `1px solid ${k.accent}30`, borderRadius: 'var(--radius)', padding: '24px', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.accent }} />
                                <div className="ll-dash-kpi__label" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: k.accent, marginBottom: 12 }}>{k.label}</div>
                                <div className="ll-dash-kpi__value" style={{ fontFamily: 'var(--font-display)', fontSize: 38, color: 'var(--forest-900)', lineHeight: 1 }}>{k.value}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{k.sub}</div>
                            </div>
                        ))}
                    </div>

                    {/* Money flow — side by side */}
                    <div className="ll-dash-split ll-dash-split--charts">
                        <ChartCard
                            eyebrow="Earnings Breakdown"
                            title="Where the money comes from"
                            items={EARNINGS_CATEGORIES
                                .map(c => ({ label: c.label, amount: Number(reports.earnings?.[c.key]) || 0 }))
                                .filter(x => x.amount > 0)
                                .sort((a, b) => b.amount - a.amount)
                                .map((x, i) => ({ ...x, color: CHART_COLORS[i % CHART_COLORS.length] }))}
                            total={earnings}
                            fmt={fmt}
                            emptyHint="No earnings recorded for this period."
                        />
                        <ChartCard
                            eyebrow="Expenditure Breakdown"
                            title="Where the money goes"
                            items={EXPENDITURE_CATEGORIES
                                .map(c => ({ label: c.label, amount: Number(reports.expenditure?.[c.key]) || 0 }))
                                .filter(x => x.amount > 0)
                                .sort((a, b) => b.amount - a.amount)
                                .map((x, i) => ({ ...x, color: CHART_COLORS[i % CHART_COLORS.length] }))}
                            total={expenditure}
                            fmt={fmt}
                            emptyHint="No expenditure recorded for this period."
                        />
                    </div>
                </>
            )}

            {/* ── Pending fees ────────────────────── */}
            {!reportLoading && pendingFees && (
                <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border-soft)' }}>
                    <button onClick={() => setShowPending(!showPending)} style={{
                        width: '100%', padding: '20px 24px', background: 'var(--warning-bg)',
                        border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        fontFamily: 'inherit', borderBottom: showPending ? '1px solid var(--border-soft)' : 'none',
                    }}>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--warning-color)', marginBottom: 6 }}>Total Pending Fees</div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, color: 'var(--forest-900)', lineHeight: 1 }}>
                                {fmt(pendingFees.totalPending || 0)}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 6 }}>{pendingFees.studentCount || 0} students with dues</div>
                        </div>
                        <span style={{ fontSize: 20, color: 'var(--warning-color)' }}>{showPending ? '▲' : '▼'}</span>
                    </button>

                    {showPending && pendingFees.students?.length > 0 && (
                        <div className="admin-table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Roll No</th>
                                        <th>Student</th>
                                        <th>Class</th>
                                        <th>Parent</th>
                                        <th>Phone</th>
                                        <th>Pending Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingFees.students.map(s => (
                                        <tr key={s.studentId}>
                                            <td style={{ fontWeight: 500 }}>{s.rollNumber}</td>
                                            <td>{s.studentName}</td>
                                            <td>{s.class}</td>
                                            <td>{s.parentName}</td>
                                            <td style={{ color: 'var(--text-light)' }}>{s.phone}</td>
                                            <td style={{ color: 'var(--error-color)', fontWeight: 600 }}>
                                                {fmt(s.totalPending || 0)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default ReportsSection;
