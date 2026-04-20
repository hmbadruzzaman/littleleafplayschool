import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { studentAPI } from '../services/api';
import LeafMark from '../components/common/LeafMark';
import './Dashboard.css';

function StudentDashboard() {
    const { logout } = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchDashboard(); }, []);

    const fetchDashboard = async () => {
        try {
            const response = await studentAPI.getDashboard();
            setDashboardData(response.data.data);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading">Loading dashboard…</div>;

    const { student, fees, exams, holidays } = dashboardData || {};
    const firstName = student?.fullName?.split(' ')[0] || 'there';

    const today = new Date();
    const dateCap = today.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
    }).toUpperCase();

    const attendancePct = dashboardData?.attendance?.percentage ?? null;

    const feesPaid = (fees?.totalPending || 0) === 0;
    const nextPending = fees?.pendingBreakdown?.[0];
    const recentPaid = Array.isArray(fees?.paid) && fees.paid.length
        ? [...fees.paid].sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''))[0]
        : null;

    const nextExam = exams?.upcoming?.[0];
    const nextHoliday = holidays?.[0];

    const recentResults = (exams?.results || []).slice(0, 4);

    return (
        <div className="ll-portal">
            {/* Header */}
            <header className="ll-portal__header">
                <div className="container ll-portal__header-inner">
                    <div className="ll-portal__logo">
                        <div className="ll-portal__logo-icon"><LeafMark size={18} /></div>
                        <span>Little Leaf</span>
                    </div>
                    <div className="ll-portal__header-right">
                        <span className="ll-portal__role-pill">Student Portal</span>
                        <div className="ll-portal__avatar">{student?.fullName?.charAt(0) || 'S'}</div>
                        <button onClick={logout} className="btn btn-ghost" style={{ fontSize: 13 }}>Sign out</button>
                    </div>
                </div>
            </header>

            <div className="container ll-portal__body">

                {/* Hero banner */}
                <div className="ll-student-hero">
                    <div className="ll-student-hero__left">
                        <div className="ll-student-hero__cap">{dateCap}</div>
                        <h1 className="ll-student-hero__h1">
                            Hello, {firstName} <LeafMark size={26} className="ll-student-hero__leaf" />
                        </h1>
                        <p className="ll-student-hero__sub">
                            {student?.class ? <>You're in <strong>{student.class}</strong>. </> : null}
                            Have a wonderful day of learning and play.
                        </p>
                    </div>
                    {attendancePct != null && (
                        <div className="ll-student-hero__stat">
                            <div className="ll-student-hero__stat-value">{attendancePct}%</div>
                            <div className="ll-student-hero__stat-label">Attendance</div>
                        </div>
                    )}
                </div>

                {/* Three summary cards */}
                <div className="ll-student-cards">
                    {/* Fees */}
                    <div className="ll-student-card">
                        <div className="ll-student-card__cap">Fees</div>
                        <div className="ll-student-card__title">
                            {feesPaid ? 'All paid' : `₹${fees.totalPending.toLocaleString('en-IN')} due`}
                        </div>
                        <div className="ll-student-card__meta">
                            {feesPaid
                                ? (recentPaid?.paymentDate
                                    ? `Last paid ${formatDate(recentPaid.paymentDate)}`
                                    : 'Nothing pending')
                                : (nextPending?.dueDate
                                    ? `Next due: ${formatDate(nextPending.dueDate)}`
                                    : 'Please clear pending dues')}
                        </div>
                        {feesPaid && recentPaid ? (
                            <div className="ll-student-card__chip ll-student-card__chip--soft">
                                ✓ {formatFeeType(recentPaid.feeType)} · ₹{Number(recentPaid.amount).toLocaleString('en-IN')} paid
                            </div>
                        ) : !feesPaid && nextPending ? (
                            <div className="ll-student-card__chip ll-student-card__chip--warn">
                                {formatFeeType(nextPending.feeType)} · ₹{Number(nextPending.pendingAmount).toLocaleString('en-IN')} pending
                            </div>
                        ) : null}
                    </div>

                    {/* Next exam */}
                    <div className="ll-student-card">
                        <div className="ll-student-card__cap">Next exam</div>
                        {nextExam ? (
                            <>
                                <div className="ll-student-card__title">
                                    {nextExam.examName}
                                    {nextExam.subject ? <> <span className="ll-student-card__title-sep">—</span> {nextExam.subject}</> : null}
                                </div>
                                <div className="ll-student-card__meta">
                                    {formatDate(nextExam.examDate)}
                                    {nextExam.examTime ? ` · ${nextExam.examTime}` : ''}
                                </div>
                                {nextExam.subject && (
                                    <div className="ll-student-card__chip ll-student-card__chip--neutral">
                                        Subject: {nextExam.subject}
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="ll-student-card__title">No exams scheduled</div>
                                <div className="ll-student-card__meta">Enjoy the stress-free stretch.</div>
                            </>
                        )}
                    </div>

                    {/* Next holiday */}
                    <div className="ll-student-card">
                        <div className="ll-student-card__cap">Next holiday</div>
                        {nextHoliday ? (
                            <>
                                <div className="ll-student-card__title">{nextHoliday.holidayName}</div>
                                <div className="ll-student-card__meta">
                                    {formatDate(nextHoliday.holidayDate)}
                                    {nextHoliday.endDate && nextHoliday.endDate !== nextHoliday.holidayDate
                                        ? ` — ${formatDate(nextHoliday.endDate)}`
                                        : ''}
                                </div>
                                <div className="ll-student-card__chip ll-student-card__chip--warm">
                                    Have a wonderful time
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="ll-student-card__title">No holidays ahead</div>
                                <div className="ll-student-card__meta">Keep up the steady rhythm.</div>
                            </>
                        )}
                    </div>
                </div>

                {/* Recent marks + My class */}
                <div className="ll-student-split">
                    {/* Recent marks */}
                    <div className="ll-student-panel">
                        <div className="ll-student-panel__cap">Recent marks</div>
                        <h2 className="ll-student-panel__title">How I'm doing</h2>

                        {recentResults.length > 0 ? (
                            <div className="ll-marks">
                                {recentResults.map((r, i) => {
                                    const pct = Math.round(r.percentage || 0);
                                    const toneClass =
                                        pct >= 90 ? 'll-marks__bar--moss'
                                        : pct >= 75 ? 'll-marks__bar--olive'
                                        : pct >= 60 ? 'll-marks__bar--butter'
                                        : 'll-marks__bar--warm';
                                    return (
                                        <div key={i} className="ll-marks__row">
                                            <div className="ll-marks__label">
                                                <div className="ll-marks__subject">
                                                    {r.subject || r.examName || 'Exam'}
                                                </div>
                                                {r.examName && r.subject && (
                                                    <div className="ll-marks__topic">{r.examName}</div>
                                                )}
                                            </div>
                                            <div className="ll-marks__score">
                                                {r.marksObtained}<span className="ll-marks__score-total">/{r.totalMarks}</span>
                                            </div>
                                            <div className="ll-marks__bar-wrap">
                                                <div className={`ll-marks__bar ${toneClass}`} style={{ width: `${pct}%` }} />
                                            </div>
                                            <div className="ll-marks__pct">{pct}%</div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="ll-empty">No exam results yet.</div>
                        )}
                    </div>

                    {/* My class */}
                    <div className="ll-student-panel">
                        <div className="ll-student-panel__cap">My class</div>
                        <h2 className="ll-student-panel__title">
                            {student?.class || 'Your class'}
                            {student?.section ? ` — ${student.section}` : ''}
                        </h2>

                        <div className="ll-class-info">
                            <div className="ll-class-info__row">
                                <span className="ll-class-info__label">Roll number</span>
                                <span className="ll-class-info__value">{student?.rollNumber || '—'}</span>
                            </div>
                            <div className="ll-class-info__row">
                                <span className="ll-class-info__label">Parent</span>
                                <span className="ll-class-info__value">{student?.parentName || '—'}</span>
                            </div>
                            {student?.parentPhone && (
                                <div className="ll-class-info__row">
                                    <span className="ll-class-info__label">Parent phone</span>
                                    <span className="ll-class-info__value">{student.parentPhone}</span>
                                </div>
                            )}
                        </div>

                        <div className="ll-class-photo">
                            <span>Class group photo</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

function formatDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFeeType(t) {
    if (!t) return 'Fee';
    return t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

export default StudentDashboard;
