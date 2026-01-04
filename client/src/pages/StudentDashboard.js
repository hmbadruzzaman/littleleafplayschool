import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { studentAPI } from '../services/api';
import './Dashboard.css';

function StudentDashboard() {
    const { user, logout } = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, []);

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

    if (loading) {
        return <div className="loading">Loading dashboard...</div>;
    }

    const { student, fees, exams, holidays } = dashboardData || {};

    return (
        <div className="dashboard student-dashboard">
            <header className="dashboard-header student-header">
                <div className="container">
                    <div className="header-content">
                        <div className="welcome-section">
                            <div className="student-avatar">
                                {student?.fullName?.charAt(0) || 'S'}
                            </div>
                            <div>
                                <h1>Welcome back, {student?.fullName?.split(' ')[0]}! 👋</h1>
                                <p className="student-subtitle">{student?.class} • Roll No: {student?.rollNumber}</p>
                            </div>
                        </div>
                        <button onClick={logout} className="btn btn-logout">Logout</button>
                    </div>
                </div>
            </header>

            <div className="dashboard-content container">
                {/* Quick Stats Cards */}
                <div className="student-stats-grid">
                    <div className="stat-card stat-paid">
                        <div className="stat-icon">💰</div>
                        <div className="stat-content">
                            <p className="stat-label">Total Paid</p>
                            <p className="stat-value">₹{fees?.totalPaid || 0}</p>
                        </div>
                    </div>
                    <div className="stat-card stat-pending">
                        <div className="stat-icon">📝</div>
                        <div className="stat-content">
                            <p className="stat-label">Pending Fees</p>
                            <p className="stat-value">₹{fees?.totalPending || 0}</p>
                            {fees?.pendingBreakdown && fees.pendingBreakdown.length > 0 && (
                                <div className="pending-breakdown">
                                    {fees.pendingBreakdown.map((item, index) => (
                                        <div key={index} className="breakdown-item">
                                            <span className="breakdown-type">
                                                {item.feeType.replace(/_/g, ' ')}
                                            </span>
                                            <span className="breakdown-amount">₹{item.pendingAmount}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="stat-card stat-exams">
                        <div className="stat-icon">📚</div>
                        <div className="stat-content">
                            <p className="stat-label">Upcoming Exams</p>
                            <p className="stat-value">{exams?.upcoming?.length || 0}</p>
                        </div>
                    </div>
                    <div className="stat-card stat-holidays">
                        <div className="stat-icon">🎉</div>
                        <div className="stat-content">
                            <p className="stat-label">Upcoming Holidays</p>
                            <p className="stat-value">{holidays?.length || 0}</p>
                        </div>
                    </div>
                </div>

                {/* Student Info Card */}
                <div className="card modern-card">
                    <div className="card-header-modern">
                        <h2>👤 Student Information</h2>
                    </div>
                    <div className="info-grid-modern">
                        <div className="info-item-modern">
                            <span className="info-icon">🎓</span>
                            <div>
                                <p className="info-label">Class</p>
                                <p className="info-value">{student?.class}</p>
                            </div>
                        </div>
                        <div className="info-item-modern">
                            <span className="info-icon">👨‍👩‍👦</span>
                            <div>
                                <p className="info-label">Parent Name</p>
                                <p className="info-value">{student?.parentName}</p>
                            </div>
                        </div>
                        <div className="info-item-modern">
                            <span className="info-icon">📞</span>
                            <div>
                                <p className="info-label">Parent Phone</p>
                                <p className="info-value">{student?.parentPhone}</p>
                            </div>
                        </div>
                        {student?.parentEmail && (
                            <div className="info-item-modern">
                                <span className="info-icon">📧</span>
                                <div>
                                    <p className="info-label">Parent Email</p>
                                    <p className="info-value">{student?.parentEmail}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Exam Results */}
                <div className="card modern-card">
                    <div className="card-header-modern">
                        <h2>📊 Exam Results</h2>
                    </div>
                    {exams?.results?.length > 0 ? (
                        <div className="exam-results-grid">
                            {exams.results.map((result, index) => (
                                <div key={index} className="exam-result-card">
                                    <div className="exam-result-header">
                                        <h3>{result.examId}</h3>
                                        <span className={`grade-badge grade-${result.grade}`}>{result.grade}</span>
                                    </div>
                                    <div className="exam-result-details">
                                        <div className="result-detail">
                                            <span className="detail-label">Marks Obtained</span>
                                            <span className="detail-value">{result.marksObtained}/{result.totalMarks}</span>
                                        </div>
                                        <div className="result-detail">
                                            <span className="detail-label">Percentage</span>
                                            <span className="detail-value percentage">{result.percentage}%</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <span className="empty-icon">📝</span>
                            <p>No exam results available yet.</p>
                        </div>
                    )}
                </div>

                {/* Upcoming Exams */}
                <div className="card modern-card">
                    <div className="card-header-modern">
                        <h2>📅 Upcoming Exams</h2>
                    </div>
                    {exams?.upcoming?.length > 0 ? (
                        <div className="upcoming-exams-list">
                            {exams.upcoming.map((exam, index) => {
                                // Parse date without timezone conversion
                                const [year, month, day] = exam.examDate.split('-').map(Number);
                                const examDate = new Date(year, month - 1, day);

                                return (
                                    <div key={index} className="upcoming-exam-item">
                                        <div className="exam-icon">📚</div>
                                        <div className="exam-info">
                                            <h3>{exam.examName}</h3>
                                            <p className="exam-subject">{exam.subject}</p>
                                        </div>
                                        <div className="exam-meta">
                                            <span className="exam-date">
                                                📆 {examDate.toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                            <span className="exam-marks">Total Marks: {exam.totalMarks}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <span className="empty-icon">📚</span>
                            <p>No upcoming exams.</p>
                        </div>
                    )}
                </div>

                {/* Holidays */}
                <div className="card modern-card">
                    <div className="card-header-modern">
                        <h2>🎉 Upcoming Holidays</h2>
                    </div>
                    {holidays?.length > 0 ? (
                        <div className="holidays-modern-list">
                            {holidays.slice(0, 5).map((holiday, index) => {
                                // Parse date without timezone conversion
                                const [year, month, day] = holiday.holidayDate.split('-').map(Number);
                                const holidayDate = new Date(year, month - 1, day);

                                return (
                                    <div key={index} className="holiday-modern-item">
                                        <div className="holiday-icon">🎊</div>
                                        <div className="holiday-info">
                                            <h3>{holiday.holidayName}</h3>
                                            <span className="holiday-date">
                                                {holidayDate.toLocaleDateString('en-US', {
                                                    weekday: 'long',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <span className="empty-icon">🎉</span>
                            <p>No upcoming holidays.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default StudentDashboard;
