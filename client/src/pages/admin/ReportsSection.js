import React, { useState } from 'react';

const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5001/api'
    : 'https://welittleleaf.com/api';

function ReportsSection() {
    const today = new Date();
    const [reportStartDate, setReportStartDate] = useState(
        new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]
    );
    const [reportEndDate, setReportEndDate] = useState(today.toISOString().split('T')[0]);
    const [reportLoading, setReportLoading] = useState(false);
    const [reports, setReports] = useState(null);
    const [pendingFeesData, setPendingFeesData] = useState(null);
    const [showPendingDetails, setShowPendingDetails] = useState(false);

    const fetchReports = async (startDate, endDate) => {
        setReportLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [earningsRes, expenditureRes, pendingFeesRes] = await Promise.all([
                fetch(`${API_URL}/admin/reports/earnings?startDate=${startDate}&endDate=${endDate}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).then(r => r.json()),
                fetch(`${API_URL}/admin/reports/expenditure?startDate=${startDate}&endDate=${endDate}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).then(r => r.json()),
                fetch(`${API_URL}/admin/reports/pending-fees`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).then(r => r.json()),
            ]);
            if (earningsRes.success) {
                setReports({
                    earnings: earningsRes.data,
                    expenditure: expenditureRes.success ? expenditureRes.data : null
                });
            }
            if (pendingFeesRes.success) setPendingFeesData(pendingFeesRes.data);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setReportLoading(false);
        }
    };

    const setQuickDateRange = (range) => {
        const now = new Date();
        let start, end;
        switch (range) {
            case 'today': start = end = now.toISOString().split('T')[0]; break;
            case 'this-week': {
                const ws = new Date(now); ws.setDate(now.getDate() - now.getDay());
                start = ws.toISOString().split('T')[0]; end = now.toISOString().split('T')[0]; break;
            }
            case 'this-month':
                start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                end = now.toISOString().split('T')[0]; break;
            case 'last-month':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
                end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]; break;
            case 'this-year':
                start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
                end = now.toISOString().split('T')[0]; break;
            case 'last-year':
                start = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
                end = new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0]; break;
            default: return;
        }
        setReportStartDate(start);
        setReportEndDate(end);
        fetchReports(start, end);
    };

    const earnings = reports?.earnings?.totalEarnings || 0;
    const expenditure = reports?.expenditure?.totalExpenditure || 0;
    const net = earnings - expenditure;
    const presets = ['today','this-week','this-month','last-month','this-year','last-year'];
    const presetLabels = { today:'Today','this-week':'This Week','this-month':'This Month','last-month':'Last Month','this-year':'This Year','last-year':'Last Year' };

    return (
        <div className="card">
            <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ margin: '0 0 1rem 0' }}>Financial Reports</h2>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    {presets.map(r => (
                        <button key={r} onClick={() => setQuickDateRange(r)} className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}>
                            {presetLabels[r]}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                        <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginRight: '0.5rem' }}>From:</label>
                        <input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)}
                            style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginRight: '0.5rem' }}>To:</label>
                        <input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)}
                            style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }} />
                    </div>
                    <button onClick={() => fetchReports(reportStartDate, reportEndDate)}
                        disabled={reportLoading} className="btn btn-primary"
                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
                        {reportLoading ? 'Loading...' : 'Apply Filter'}
                    </button>
                </div>
            </div>

            {reports && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                        <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Total Earnings</div>
                        <div style={{ fontSize: '2rem', fontWeight: '700' }}>₹{earnings.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '0.5rem' }}>{reports.earnings?.transactionCount || 0} transactions</div>
                    </div>
                    <div style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                        <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Total Expenditure</div>
                        <div style={{ fontSize: '2rem', fontWeight: '700' }}>₹{expenditure.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '0.5rem' }}>{reports.expenditure?.transactionCount || 0} transactions</div>
                    </div>
                    <div style={{ background: net >= 0 ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'linear-gradient(135deg,#f59e0b,#d97706)', color: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                        <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>{net >= 0 ? 'Net Profit' : 'Net Loss'}</div>
                        <div style={{ fontSize: '2rem', fontWeight: '700' }}>₹{Math.abs(net).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '0.5rem' }}>{((net / (earnings || 1)) * 100).toFixed(1)}% margin</div>
                    </div>
                </div>
            )}

            {pendingFeesData && (
                <div style={{ marginTop: '1.5rem' }}>
                    <div onClick={() => setShowPendingDetails(!showPendingDetails)}
                        style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: 'white', padding: '1.5rem', borderRadius: '0.5rem', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Total Pending Fees (Active Students)</div>
                                <div style={{ fontSize: '2rem', fontWeight: '700' }}>₹{pendingFeesData.totalPending?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '0.5rem' }}>{pendingFeesData.studentCount} students with dues</div>
                            </div>
                            <div style={{ fontSize: '1.5rem' }}>{showPendingDetails ? '▲' : '▼'}</div>
                        </div>
                    </div>

                    {showPendingDetails && pendingFeesData.students?.length > 0 && (
                        <div style={{ marginTop: '1rem', background: 'white', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                            <div className="admin-table-wrap">
                                <table className="table">
                                    <thead>
                                        <tr><th>Roll No</th><th>Student</th><th>Class</th><th>Parent</th><th>Phone</th><th>Pending Amount</th></tr>
                                    </thead>
                                    <tbody>
                                        {pendingFeesData.students.map(s => (
                                            <tr key={s.studentId}>
                                                <td>{s.rollNumber}</td>
                                                <td>{s.studentName}</td>
                                                <td>{s.class}</td>
                                                <td>{s.parentName}</td>
                                                <td>{s.phone}</td>
                                                <td style={{ color: '#dc2626', fontWeight: '600' }}>₹{s.totalPending?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default ReportsSection;
