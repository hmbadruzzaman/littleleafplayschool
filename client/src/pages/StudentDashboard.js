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
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-content">
                        <h1>Student Dashboard</h1>
                        <div className="user-info">
                            <span>Welcome, {student?.fullName}</span>
                            <button onClick={logout} className="btn btn-secondary">Logout</button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="dashboard-content container">
                {/* Student Info Card */}
                <div className="card">
                    <h2>Student Information</h2>
                    <div className="info-grid">
                        <div className="info-item">
                            <strong>Roll Number:</strong> {student?.rollNumber}
                        </div>
                        <div className="info-item">
                            <strong>Class:</strong> {student?.class}
                        </div>
                        <div className="info-item">
                            <strong>Parent Name:</strong> {student?.parentName}
                        </div>
                        <div className="info-item">
                            <strong>Parent Phone:</strong> {student?.parentPhone}
                        </div>
                    </div>
                </div>

                {/* Fees Summary */}
                <div className="card">
                    <h2>Fees Summary</h2>
                    <div className="fees-summary">
                        <div className="fee-item">
                            <span className="fee-label">Total Paid:</span>
                            <span className="fee-amount paid">₹{fees?.totalPaid || 0}</span>
                        </div>
                        <div className="fee-item">
                            <span className="fee-label">Total Pending:</span>
                            <span className="fee-amount pending">₹{fees?.totalPending || 0}</span>
                        </div>
                    </div>

                    {fees?.pending?.length > 0 && (
                        <div className="fee-details">
                            <h3>Pending Fees</h3>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Amount</th>
                                        <th>Due Date</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fees.pending.map((fee, index) => (
                                        <tr key={index}>
                                            <td>{fee.feeType}</td>
                                            <td>₹{fee.amount}</td>
                                            <td>{new Date(fee.dueDate).toLocaleDateString()}</td>
                                            <td><span className="status-badge pending">{fee.paymentStatus}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Exam Results */}
                <div className="card">
                    <h2>Exam Results</h2>
                    {exams?.results?.length > 0 ? (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Exam</th>
                                    <th>Marks</th>
                                    <th>Percentage</th>
                                    <th>Grade</th>
                                </tr>
                            </thead>
                            <tbody>
                                {exams.results.map((result, index) => (
                                    <tr key={index}>
                                        <td>{result.examId}</td>
                                        <td>{result.marksObtained}/{result.totalMarks}</td>
                                        <td>{result.percentage}%</td>
                                        <td><span className="grade">{result.grade}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>No exam results available yet.</p>
                    )}
                </div>

                {/* Upcoming Exams */}
                <div className="card">
                    <h2>Upcoming Exams</h2>
                    {exams?.upcoming?.length > 0 ? (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Exam Name</th>
                                    <th>Subject</th>
                                    <th>Date</th>
                                    <th>Total Marks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {exams.upcoming.map((exam, index) => (
                                    <tr key={index}>
                                        <td>{exam.examName}</td>
                                        <td>{exam.subject}</td>
                                        <td>{new Date(exam.examDate).toLocaleDateString()}</td>
                                        <td>{exam.totalMarks}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>No upcoming exams.</p>
                    )}
                </div>

                {/* Holidays */}
                <div className="card">
                    <h2>Upcoming Holidays</h2>
                    {holidays?.length > 0 ? (
                        <div className="holidays-list">
                            {holidays.slice(0, 5).map((holiday, index) => (
                                <div key={index} className="holiday-item">
                                    <strong>{holiday.holidayName}</strong>
                                    <span>{new Date(holiday.holidayDate).toLocaleDateString()}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p>No upcoming holidays.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default StudentDashboard;
