import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { studentAPI } from '../services/api';
import LeafMark from '../components/common/LeafMark';
import './Dashboard.css';

function StudentDashboard() {
    const { user, logout } = useAuth();
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

                {/* Welcome banner */}
                <div className="ll-portal__welcome">
                    <div className="ll-portal__welcome-blob" />
                    <div className="ll-portal__welcome-text">
                        <div className="ll-eyebrow ll-eyebrow--light" style={{ marginBottom: 10 }}>
                            {student?.class} · Roll {student?.rollNumber}
                        </div>
                        <h1>Hello, {firstName}.</h1>
                        <p>Here's how things are looking for you today.</p>
                    </div>
                </div>

                {/* Fee + exam + holiday quick cards */}
                <div className="ll-portal__quick-grid">
                    <div className={`ll-quick-card ${fees?.totalPending > 0 ? 'll-quick-card--warn' : 'll-quick-card--ok'}`}>
                        <div className="ll-quick-card__label">Fees paid</div>
                        <div className="ll-quick-card__value">₹{fees?.totalPaid || 0}</div>
                        {fees?.totalPending > 0 ? (
                            <div className="ll-quick-card__sub warn">₹{fees.totalPending} pending</div>
                        ) : (
                            <div className="ll-quick-card__sub ok">All clear ✓</div>
                        )}
                        {fees?.pendingBreakdown?.length > 0 && (
                            <div className="ll-quick-card__breakdown">
                                {fees.pendingBreakdown.map((item, i) => (
                                    <div key={i} className="ll-quick-card__breakdown-row">
                                        <span>{item.feeType.replace(/_/g, ' ')}</span>
                                        <span>₹{item.pendingAmount}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="ll-quick-card">
                        <div className="ll-quick-card__label">Upcoming exams</div>
                        <div className="ll-quick-card__value">{exams?.upcoming?.length || 0}</div>
                        <div className="ll-quick-card__sub">scheduled</div>
                    </div>

                    <div className="ll-quick-card">
                        <div className="ll-quick-card__label">Upcoming holidays</div>
                        <div className="ll-quick-card__value">{holidays?.length || 0}</div>
                        <div className="ll-quick-card__sub">ahead</div>
                    </div>
                </div>

                {/* Student info */}
                <div className="ll-portal__section">
                    <h2 className="ll-portal__section-title">Student Information</h2>
                    <div className="ll-info-grid">
                        {[
                            ['Class',        student?.class],
                            ['Parent',       student?.parentName],
                            ['Parent Phone', student?.parentPhone],
                            student?.parentEmail ? ['Parent Email', student.parentEmail] : null,
                        ].filter(Boolean).map(([label, val]) => (
                            <div key={label} className="ll-info-item">
                                <div className="ll-info-item__label">{label}</div>
                                <div className="ll-info-item__value">{val}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Exam results */}
                <div className="ll-portal__section">
                    <h2 className="ll-portal__section-title">Exam Results</h2>
                    {exams?.results?.length > 0 ? (
                        <div className="ll-results-grid">
                            {exams.results.map((result, i) => (
                                <div key={i} className="ll-result-card">
                                    <div className="ll-result-card__top">
                                        <span className="ll-result-card__name">{result.examId}</span>
                                        <span className={`ll-result-card__grade grade-${result.grade}`}>{result.grade}</span>
                                    </div>
                                    <div className="ll-result-card__row">
                                        <span>Marks</span>
                                        <strong>{result.marksObtained}/{result.totalMarks}</strong>
                                    </div>
                                    <div className="ll-result-card__row">
                                        <span>Percentage</span>
                                        <strong className="ll-result-card__pct">{result.percentage}%</strong>
                                    </div>
                                    <div className="ll-result-card__bar">
                                        <div style={{ width: `${result.percentage}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="ll-empty">No exam results available yet.</div>
                    )}
                </div>

                {/* Upcoming exams */}
                <div className="ll-portal__section">
                    <h2 className="ll-portal__section-title">Upcoming Exams</h2>
                    {exams?.upcoming?.length > 0 ? (
                        <div className="ll-exam-list">
                            {exams.upcoming.map((exam, i) => {
                                const [y, m, d] = exam.examDate.split('-').map(Number);
                                const date = new Date(y, m - 1, d);
                                return (
                                    <div key={i} className="ll-exam-item">
                                        <div className="ll-exam-item__date">
                                            <span className="ll-exam-item__day">{d}</span>
                                            <span className="ll-exam-item__mon">
                                                {date.toLocaleString('en-US', { month: 'short' })}
                                            </span>
                                        </div>
                                        <div className="ll-exam-item__info">
                                            <div className="ll-exam-item__name">{exam.examName}</div>
                                            <div className="ll-exam-item__sub">{exam.subject}</div>
                                        </div>
                                        <div className="ll-exam-item__meta">
                                            Total: {exam.totalMarks} marks
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="ll-empty">No upcoming exams.</div>
                    )}
                </div>

                {/* Holidays */}
                <div className="ll-portal__section">
                    <h2 className="ll-portal__section-title">Upcoming Holidays</h2>
                    {holidays?.length > 0 ? (
                        <div className="ll-exam-list">
                            {holidays.slice(0, 5).map((h, i) => {
                                const [y, m, d] = h.holidayDate.split('-').map(Number);
                                const date = new Date(y, m - 1, d);
                                return (
                                    <div key={i} className="ll-exam-item">
                                        <div className="ll-exam-item__date">
                                            <span className="ll-exam-item__day">{d}</span>
                                            <span className="ll-exam-item__mon">
                                                {date.toLocaleString('en-US', { month: 'short' })}
                                            </span>
                                        </div>
                                        <div className="ll-exam-item__info">
                                            <div className="ll-exam-item__name">{h.holidayName}</div>
                                            <div className="ll-exam-item__sub">
                                                {date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="ll-empty">No upcoming holidays.</div>
                    )}
                </div>

            </div>
        </div>
    );
}

export default StudentDashboard;
