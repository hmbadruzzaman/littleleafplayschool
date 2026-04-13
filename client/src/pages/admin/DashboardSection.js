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
    const [error, setError] = useState(null);

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
            const [teachersRes, studentReportRes, earningsRes, expenditureRes, inquiriesRes] = await Promise.all([
                adminAPI.getAllTeachers(),
                adminAPI.getStudentCountReport(),
                adminAPI.getEarningsReport(startDate, endDate),
                fetch(`${API_URL}/admin/reports/expenditure?startDate=${startDate}&endDate=${endDate}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).then(r => {
                    if (!r.ok) throw new Error(`Expenditure API error: ${r.status}`);
                    return r.json();
                }),
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
            setError('Failed to load dashboard data. Please refresh.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading">Loading dashboard...</div>;
    if (error) return <div className="error">{error}</div>;

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
