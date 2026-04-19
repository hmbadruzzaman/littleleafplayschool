import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import RecordFeePaymentForm from '../../components/forms/RecordFeePaymentForm';
import ManageFeeStructureModal from '../../components/modals/ManageFeeStructureModal';

const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5001/api'
    : 'https://welittleleaf.com/api';

const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

function FeesSection() {
    const [showRecord, setShowRecord]         = useState(false);
    const [showStructure, setShowStructure]   = useState(false);
    const [loading, setLoading]               = useState(true);

    // KPI data
    const [monthEarnings, setMonthEarnings]   = useState(0);
    const [yearEarnings, setYearEarnings]     = useState(0);
    const [earningsByType, setEarningsByType] = useState({});
    const [txCount, setTxCount]               = useState(0);

    // Pending families
    const [pendingData, setPendingData]       = useState(null);
    const [showAllPending, setShowAllPending] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const today = new Date();
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            const yearStart  = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
            const todayStr   = today.toISOString().split('T')[0];
            const token      = localStorage.getItem('token');

            const [monthRes, yearRes, pendingRes] = await Promise.all([
                adminAPI.getEarningsReport(monthStart, todayStr),
                adminAPI.getEarningsReport(yearStart, todayStr),
                fetch(`${API_URL}/admin/reports/pending-fees`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).then(r => r.json()),
            ]);

            setMonthEarnings(monthRes.data.data?.totalEarnings || 0);
            setTxCount(monthRes.data.data?.transactionCount || 0);
            setYearEarnings(yearRes.data.data?.totalEarnings || 0);

            const y = yearRes.data.data || {};
            const byType = Object.fromEntries([
                ['Monthly Fee',   y.monthlyFees],
                ['Admission Fee', y.admissionFees],
                ['Transport Fee', y.transportFees],
                ['Annual Fee',    y.annualFees],
                ['Exam Fee',      y.examFees],
                ['Miscellaneous', y.miscFees],
            ].filter(([, v]) => Number(v) > 0));
            setEarningsByType(byType);

            if (pendingRes.success) setPendingData(pendingRes.data);
        } catch (err) {
            console.error('Error fetching fee data:', err);
        } finally {
            setLoading(false);
        }
    };

    const totalPending     = pendingData?.totalPending || 0;
    const pendingStudents  = pendingData?.students || [];
    const pendingCount     = pendingData?.studentCount || 0;
    const collectionRate   = yearEarnings && (yearEarnings + totalPending)
        ? Math.round((yearEarnings / (yearEarnings + totalPending)) * 100)
        : 0;

    const displayedPending = showAllPending ? pendingStudents : pendingStudents.slice(0, 5);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* ── KPI strip ───────────────────────── */}
            <div className="ll-dash-kpis">
                {[
                    { label: 'Collected · This month', value: fmt(monthEarnings), sub: `${txCount} payments`, accent: 'var(--success-color)' },
                    { label: 'Collected · This year',  value: fmt(yearEarnings),  sub: 'across all types',    accent: 'var(--moss-dark)'      },
                    { label: 'Pending dues',            value: fmt(totalPending),  sub: `${pendingCount} families`,  accent: 'var(--error-color)'   },
                    { label: 'Collection rate',         value: loading ? '—' : `${collectionRate}%`, sub: 'year to date', accent: collectionRate >= 80 ? 'var(--success-color)' : 'var(--warning-color)' },
                ].map((k, i) => (
                    <div key={i} className="ll-dash-kpi" style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius)', padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.accent }} />
                        <div className="ll-dash-kpi__label" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>{k.label}</div>
                        <div className="ll-dash-kpi__value" style={{ fontFamily: 'var(--font-display)', fontSize: 34, color: 'var(--forest-900)', lineHeight: 1 }}>{loading ? '…' : k.value}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{k.sub}</div>
                    </div>
                ))}
            </div>

            {/* ── Main two-column layout ───────────── */}
            <div className="ll-dash-split ll-dash-split--fees">

                {/* Left: earnings by fee type (acts as "recent payments" breakdown) */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                    <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-soft)', background: 'var(--cream-50)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Year to date</div>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--forest-900)', margin: 0 }}>Earnings by fee type</h3>
                        </div>
                        <button onClick={() => { setShowRecord(true); }} className="btn btn-primary" style={{ fontSize: 13 }}>
                            + Record payment
                        </button>
                    </div>

                    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {loading ? (
                            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
                        ) : Object.keys(earningsByType).length === 0 ? (
                            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: 18 }}>
                                No earnings recorded for this year yet.
                            </div>
                        ) : (
                            <>
                                {Object.entries(earningsByType).map(([type, amount], i, arr) => {
                                    const pct = yearEarnings ? Math.round((amount / yearEarnings) * 100) : 0;
                                    const colors = ['#4a5d3f', '#7a8f6a', '#c97b5b', '#e8c97b', '#9a7a6a'];
                                    return (
                                        <div key={type} style={{
                                            display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0',
                                            borderBottom: i < arr.length - 1 ? '1px solid var(--border-soft)' : 'none',
                                        }}>
                                            <div style={{ width: 4, height: 40, background: colors[i % colors.length], borderRadius: 2, flexShrink: 0 }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--forest-900)' }}>
                                                        {type.replace(/_/g, ' ')}
                                                    </span>
                                                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--forest-900)' }}>{fmt(amount)}</span>
                                                </div>
                                                <div style={{ height: 6, background: 'var(--cream-200)', borderRadius: 999, overflow: 'hidden' }}>
                                                    <div style={{ width: `${pct}%`, height: '100%', background: colors[i % colors.length], borderRadius: 999 }} />
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{pct}% of total</div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div style={{ paddingTop: 18, borderTop: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                    <span style={{ fontSize: 13, color: 'var(--text-light)', fontWeight: 500 }}>Total collected this year</span>
                                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--forest-900)' }}>{fmt(yearEarnings)}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Right: gentle nudges — pending families with real amounts */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                    <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-soft)', background: 'var(--cream-50)' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Gentle nudges</div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--forest-900)', margin: 0 }}>Pending families</h3>
                        {pendingCount > 0 && (
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                                {pendingCount} families owe {fmt(totalPending)} total
                            </p>
                        )}
                    </div>

                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {loading ? (
                            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
                        ) : pendingStudents.length === 0 ? (
                            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--success-color)', fontFamily: 'var(--font-display)', fontSize: 18 }}>
                                All families are paid up ✓
                            </div>
                        ) : (
                            <>
                                {displayedPending.map((s, i) => (
                                    <div key={s.studentId || i} style={{
                                        padding: '12px 16px', borderRadius: 10,
                                        background: s.totalPending > 10000 ? '#fdf0ee' : 'var(--cream-50)',
                                        border: `1px solid ${s.totalPending > 10000 ? '#e8c4ba' : 'var(--border-soft)'}`,
                                        display: 'flex', alignItems: 'center', gap: 12,
                                    }}>
                                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--forest-100)', color: 'var(--moss-dark)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontSize: 16, flexShrink: 0 }}>
                                            {(s.studentName || '?')[0]}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--forest-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {s.studentName}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                                {s.class} · {s.parentName}
                                            </div>
                                        </div>
                                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: s.totalPending > 10000 ? 'var(--error-color)' : 'var(--forest-900)', flexShrink: 0, fontWeight: 500 }}>
                                            {fmt(s.totalPending)}
                                        </div>
                                    </div>
                                ))}

                                {pendingStudents.length > 5 && (
                                    <button onClick={() => setShowAllPending(v => !v)}
                                        style={{ fontSize: 12, color: 'var(--moss-dark)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0', textAlign: 'center', fontFamily: 'inherit' }}>
                                        {showAllPending ? 'Show less ↑' : `Show all ${pendingStudents.length} families ↓`}
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-soft)', background: 'var(--cream-50)' }}>
                        <button onClick={() => setShowRecord(true)} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}>
                            Record a payment →
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Fee structure shortcut ───────────── */}
            <div style={{ background: 'var(--cream-50)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--forest-900)' }}>Fee structure</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Define admission, tuition and misc fee templates per class.</div>
                </div>
                <button onClick={() => setShowStructure(true)} className="btn btn-ghost" style={{ fontSize: 13 }}>
                    Manage fee structure →
                </button>
            </div>

            {showRecord    && <RecordFeePaymentForm onClose={() => { setShowRecord(false); fetchData(); }} onSuccess={() => { setShowRecord(false); fetchData(); }} />}
            {showStructure && <ManageFeeStructureModal onClose={() => setShowStructure(false)} />}
        </div>
    );
}

export default FeesSection;
