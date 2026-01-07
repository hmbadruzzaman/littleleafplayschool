import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import AddStudentForm from '../components/forms/AddStudentForm';
import AddTeacherForm from '../components/forms/AddTeacherForm';
import AddExamForm from '../components/forms/AddExamForm';
import RecordFeePaymentForm from '../components/forms/RecordFeePaymentForm';
import InquiryForm from '../components/forms/InquiryForm';
import StudentDetailsModal from '../components/modals/StudentDetailsModal';
import ViewInquiriesModal from '../components/modals/ViewInquiriesModal';
import ManageFeeStructureModal from '../components/modals/ManageFeeStructureModal';
import ManageHolidaysModal from '../components/modals/ManageHolidaysModal';
import ManageExpendituresModal from '../components/modals/ManageExpendituresModal';
import './Dashboard.css';

function AdminDashboard() {
    const { logout } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [reports, setReports] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAddStudent, setShowAddStudent] = useState(false);
    const [showAddTeacher, setShowAddTeacher] = useState(false);
    const [showAddExam, setShowAddExam] = useState(false);
    const [showManageFeeStructure, setShowManageFeeStructure] = useState(false);
    const [showManageHolidays, setShowManageHolidays] = useState(false);
    const [showRecordPayment, setShowRecordPayment] = useState(false);
    const [showManageExpenditures, setShowManageExpenditures] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [timePeriod, setTimePeriod] = useState('current-year');
    const [studentSearchTerm, setStudentSearchTerm] = useState('');
    const [showInquiries, setShowInquiries] = useState(false);
    const [showAddInquiry, setShowAddInquiry] = useState(false);
    const [pendingInquiriesCount, setPendingInquiriesCount] = useState(0);
    const [reportStartDate, setReportStartDate] = useState(
        new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
    );
    const [reportEndDate, setReportEndDate] = useState(
        new Date().toISOString().split('T')[0]
    );
    const [reportLoading, setReportLoading] = useState(false);
    const [studentSortField, setStudentSortField] = useState('rollNumber');
    const [studentSortDirection, setStudentSortDirection] = useState('asc');

    useEffect(() => {
        fetchData();
    }, [timePeriod]);

    const fetchEarningsReport = async (startDate, endDate) => {
        try {
            setReportLoading(true);
            const token = localStorage.getItem('token');
            const API_URL = window.location.hostname === 'localhost'
                ? 'http://localhost:5001/api'
                : 'https://welittleleaf.com/api';

            // Fetch both earnings and expenditure reports
            const [earningsResponse, expenditureResponse] = await Promise.all([
                fetch(
                    `${API_URL}/admin/reports/earnings?startDate=${startDate}&endDate=${endDate}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                ),
                fetch(
                    `${API_URL}/admin/reports/expenditure?startDate=${startDate}&endDate=${endDate}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                )
            ]);

            const earningsData = await earningsResponse.json();
            const expenditureData = await expenditureResponse.json();

            if (earningsData.success) {
                setReports(prev => ({
                    ...prev,
                    earnings: earningsData.data,
                    expenditure: expenditureData.success ? expenditureData.data : prev?.expenditure
                }));
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setReportLoading(false);
        }
    };

    const setQuickDateRange = (range) => {
        const today = new Date();
        let start, end;

        switch(range) {
            case 'today':
                start = end = today.toISOString().split('T')[0];
                break;
            case 'this-week':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                start = weekStart.toISOString().split('T')[0];
                end = today.toISOString().split('T')[0];
                break;
            case 'this-month':
                start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                end = today.toISOString().split('T')[0];
                break;
            case 'last-month':
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
                end = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
                break;
            case 'this-year':
                start = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
                end = today.toISOString().split('T')[0];
                break;
            case 'last-year':
                start = new Date(today.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
                end = new Date(today.getFullYear() - 1, 11, 31).toISOString().split('T')[0];
                break;
            default:
                return;
        }

        setReportStartDate(start);
        setReportEndDate(end);
        fetchEarningsReport(start, end);
    };

    const getDateRange = () => {
        const today = new Date();
        let startDate, endDate;

        switch(timePeriod) {
            case 'current-month':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = today;
                break;
            case 'last-month':
                startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                endDate = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            case 'current-year':
                startDate = new Date(today.getFullYear(), 0, 1);
                endDate = today;
                break;
            case 'last-year':
                startDate = new Date(today.getFullYear() - 1, 0, 1);
                endDate = new Date(today.getFullYear() - 1, 11, 31);
                break;
            default:
                startDate = new Date(today.getFullYear(), 0, 1);
                endDate = today;
        }

        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
        };
    };

    const fetchData = async () => {
        try {
            const { startDate, endDate } = getDateRange();
            const API_URL = window.location.hostname === 'localhost'
                ? 'http://localhost:5001/api'
                : 'https://welittleleaf.com/api';

            const [studentsRes, teachersRes, studentReportRes, earningsRes, expenditureRes, inquiriesRes] = await Promise.all([
                adminAPI.getAllStudents(),
                adminAPI.getAllTeachers(),
                adminAPI.getStudentCountReport(),
                adminAPI.getEarningsReport(startDate, endDate),
                fetch(`${API_URL}/admin/reports/expenditure?startDate=${startDate}&endDate=${endDate}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }).then(res => res.json()),
                adminAPI.getAllInquiries()
            ]);

            setStudents(studentsRes.data.data);
            setTeachers(teachersRes.data.data);
            setReports({
                students: studentReportRes.data.data,
                earnings: earningsRes.data.data,
                expenditure: expenditureRes.data
            });

            // Count pending inquiries (NEW + IN_PROGRESS)
            const pendingCount = (inquiriesRes.data.data || []).filter(inq => inq.status === 'NEW' || inq.status === 'IN_PROGRESS').length;
            setPendingInquiriesCount(pendingCount);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStudentSort = (field) => {
        if (studentSortField === field) {
            // Toggle direction if clicking the same field
            setStudentSortDirection(studentSortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // Set new field and default to ascending
            setStudentSortField(field);
            setStudentSortDirection('asc');
        }
    };

    const getSortedStudents = () => {
        const filtered = students.filter(student => {
            const searchLower = studentSearchTerm.toLowerCase();
            return (
                student.fullName.toLowerCase().includes(searchLower) ||
                student.rollNumber.toLowerCase().includes(searchLower) ||
                (student.parentName && student.parentName.toLowerCase().includes(searchLower))
            );
        });

        return filtered.sort((a, b) => {
            let aValue = a[studentSortField];
            let bValue = b[studentSortField];

            // Handle null/undefined values
            if (!aValue) aValue = '';
            if (!bValue) bValue = '';

            // Convert to lowercase for string comparison
            if (typeof aValue === 'string') aValue = aValue.toLowerCase();
            if (typeof bValue === 'string') bValue = bValue.toLowerCase();

            if (aValue < bValue) return studentSortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return studentSortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    };

    if (loading) {
        return <div className="loading">Loading dashboard...</div>;
    }

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-content">
                        <h1>Admin Dashboard</h1>
                        <button onClick={logout} className="btn btn-secondary">Logout</button>
                    </div>
                </div>
            </header>

            <div className="dashboard-content container">
                <div className="tabs">
                    <button
                        className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dashboard')}
                    >
                        Dashboard
                    </button>
                    <button
                        className={`tab ${activeTab === 'students' ? 'active' : ''}`}
                        onClick={() => setActiveTab('students')}
                    >
                        Students
                    </button>
                    <button
                        className={`tab ${activeTab === 'teachers' ? 'active' : ''}`}
                        onClick={() => setActiveTab('teachers')}
                    >
                        Teachers
                    </button>
                    <button
                        className={`tab ${activeTab === 'reports' ? 'active' : ''}`}
                        onClick={() => setActiveTab('reports')}
                    >
                        Reports
                    </button>
                    <button
                        className={`tab ${activeTab === 'inquiries' ? 'active' : ''}`}
                        onClick={() => setActiveTab('inquiries')}
                    >
                        Inquiries
                        {pendingInquiriesCount > 0 && (
                            <span className="badge">{pendingInquiriesCount}</span>
                        )}
                    </button>
                </div>

                {activeTab === 'dashboard' && (
                    <>
                        <div className="card" style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h2 style={{ margin: 0 }}>Financial Overview</h2>
                                <select
                                    value={timePeriod}
                                    onChange={(e) => setTimePeriod(e.target.value)}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '0.9rem'
                                    }}
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
                                    <p className="stat-number" style={{ color: '#10b981' }}>
                                        ₹{reports?.earnings?.totalEarnings || 0}
                                    </p>
                                </div>
                                <div className="stat-card">
                                    <h3>Total Expenditure</h3>
                                    <p className="stat-number" style={{ color: '#ef4444' }}>
                                        ₹{reports?.expenditure?.totalExpenditure || 0}
                                    </p>
                                </div>
                                <div className="stat-card">
                                    <h3>In Hand Amount</h3>
                                    <p
                                        className="stat-number"
                                        style={{
                                            color: ((reports?.earnings?.totalEarnings || 0) - (reports?.expenditure?.totalExpenditure || 0)) >= 0
                                                ? '#10b981'
                                                : '#ef4444'
                                        }}
                                    >
                                        ₹{((reports?.earnings?.totalEarnings || 0) - (reports?.expenditure?.totalExpenditure || 0)).toFixed(2)}
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
                                <button className="action-btn" onClick={() => setShowAddStudent(true)}>Create Student</button>
                                <button className="action-btn" onClick={() => setShowAddTeacher(true)}>Create Teacher</button>
                                <button className="action-btn" onClick={() => setShowAddExam(true)}>Create Exam</button>
                                <button className="action-btn" onClick={() => setShowManageHolidays(true)}>Manage Holidays</button>
                                <button className="action-btn" onClick={() => setShowManageFeeStructure(true)}>Manage Fee Structure</button>
                                <button className="action-btn" onClick={() => setShowRecordPayment(true)}>Record Fee Payment</button>
                                <button className="action-btn" onClick={() => setShowManageExpenditures(true)}>Manage Expenditures</button>
                                <button className="action-btn" onClick={() => setActiveTab('reports')}>View Reports</button>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'students' && (
                    <div className="card">
                        <div className="card-header">
                            <h2>All Students</h2>
                            <button className="btn btn-primary" onClick={() => setShowAddStudent(true)}>Add Student</button>
                        </div>

                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }}>
                            <input
                                type="text"
                                placeholder="Search by name, roll number, or parent name..."
                                value={studentSearchTerm}
                                onChange={(e) => setStudentSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 16px',
                                    fontSize: '0.95rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    outline: 'none',
                                    transition: 'all 0.2s'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#3b82f6';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#d1d5db';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>

                        <table className="table">
                            <thead>
                                <tr>
                                    <th onClick={() => handleStudentSort('rollNumber')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        Roll Number {studentSortField === 'rollNumber' && (studentSortDirection === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleStudentSort('fullName')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        Name {studentSortField === 'fullName' && (studentSortDirection === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleStudentSort('class')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        Class {studentSortField === 'class' && (studentSortDirection === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleStudentSort('parentName')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        Parent Name {studentSortField === 'parentName' && (studentSortDirection === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleStudentSort('parentPhone')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        Parent Phone {studentSortField === 'parentPhone' && (studentSortDirection === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleStudentSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        Status {studentSortField === 'status' && (studentSortDirection === 'asc' ? '↑' : '↓')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {getSortedStudents().map((student) => (
                                    <tr
                                        key={student.studentId}
                                        onClick={() => setSelectedStudent(student)}
                                        style={{ cursor: 'pointer' }}
                                        className="clickable-row"
                                    >
                                        <td>{student.rollNumber}</td>
                                        <td>{student.fullName}</td>
                                        <td>{student.class}</td>
                                        <td>{student.parentName}</td>
                                        <td>{student.parentPhone}</td>
                                        <td>
                                            <span className={`status-badge ${student.status.toLowerCase()}`}>
                                                {student.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {getSortedStudents().length === 0 && (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                                No students found matching "{studentSearchTerm}"
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'teachers' && (
                    <div className="card">
                        <div className="card-header">
                            <h2>All Teachers</h2>
                            <button className="btn btn-primary" onClick={() => setShowAddTeacher(true)}>Add Teacher</button>
                        </div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Employee ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teachers.map((teacher) => (
                                    <tr key={teacher.teacherId}>
                                        <td>{teacher.employeeId}</td>
                                        <td>{teacher.fullName}</td>
                                        <td>{teacher.email}</td>
                                        <td>{teacher.phone}</td>
                                        <td>
                                            <span className={`status-badge ${teacher.status.toLowerCase()}`}>
                                                {teacher.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'reports' && (
                    <>
                        <div className="card">
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h2 style={{ margin: '0 0 1rem 0' }}>Financial Reports</h2>

                                {/* Quick Presets */}
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={() => setQuickDateRange('today')}
                                        className="btn btn-secondary"
                                        style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
                                    >
                                        Today
                                    </button>
                                    <button
                                        onClick={() => setQuickDateRange('this-week')}
                                        className="btn btn-secondary"
                                        style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
                                    >
                                        This Week
                                    </button>
                                    <button
                                        onClick={() => setQuickDateRange('this-month')}
                                        className="btn btn-secondary"
                                        style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
                                    >
                                        This Month
                                    </button>
                                    <button
                                        onClick={() => setQuickDateRange('last-month')}
                                        className="btn btn-secondary"
                                        style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
                                    >
                                        Last Month
                                    </button>
                                    <button
                                        onClick={() => setQuickDateRange('this-year')}
                                        className="btn btn-secondary"
                                        style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
                                    >
                                        This Year
                                    </button>
                                    <button
                                        onClick={() => setQuickDateRange('last-year')}
                                        className="btn btn-secondary"
                                        style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
                                    >
                                        Last Year
                                    </button>
                                </div>

                                {/* Custom Date Range */}
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <div>
                                        <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginRight: '0.5rem' }}>
                                            From:
                                        </label>
                                        <input
                                            type="date"
                                            value={reportStartDate}
                                            onChange={(e) => setReportStartDate(e.target.value)}
                                            style={{
                                                padding: '0.5rem',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '0.375rem',
                                                fontSize: '0.875rem'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginRight: '0.5rem' }}>
                                            To:
                                        </label>
                                        <input
                                            type="date"
                                            value={reportEndDate}
                                            onChange={(e) => setReportEndDate(e.target.value)}
                                            style={{
                                                padding: '0.5rem',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '0.375rem',
                                                fontSize: '0.875rem'
                                            }}
                                        />
                                    </div>
                                    <button
                                        onClick={() => fetchEarningsReport(reportStartDate, reportEndDate)}
                                        disabled={reportLoading}
                                        className="btn btn-primary"
                                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                                    >
                                        {reportLoading ? 'Loading...' : 'Apply Filter'}
                                    </button>
                                </div>
                            </div>

                            {/* Earnings vs Expenditure Summary */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: 'white',
                                    padding: '1.5rem',
                                    borderRadius: '0.5rem',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '500', opacity: 0.9, marginBottom: '0.5rem' }}>
                                        Total Earnings
                                    </div>
                                    <div style={{ fontSize: '2rem', fontWeight: '700' }}>
                                        ₹{(reports?.earnings?.totalEarnings || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '0.5rem' }}>
                                        {reports?.earnings?.transactionCount || 0} transactions
                                    </div>
                                </div>

                                <div style={{
                                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                    color: 'white',
                                    padding: '1.5rem',
                                    borderRadius: '0.5rem',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '500', opacity: 0.9, marginBottom: '0.5rem' }}>
                                        Total Expenditure
                                    </div>
                                    <div style={{ fontSize: '2rem', fontWeight: '700' }}>
                                        ₹{(reports?.expenditure?.totalExpenditure || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '0.5rem' }}>
                                        {reports?.expenditure?.transactionCount || 0} transactions
                                    </div>
                                </div>

                                <div style={{
                                    background: (reports?.earnings?.totalEarnings || 0) - (reports?.expenditure?.totalExpenditure || 0) >= 0
                                        ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                                        : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                    color: 'white',
                                    padding: '1.5rem',
                                    borderRadius: '0.5rem',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '500', opacity: 0.9, marginBottom: '0.5rem' }}>
                                        {(reports?.earnings?.totalEarnings || 0) - (reports?.expenditure?.totalExpenditure || 0) >= 0 ? 'Net Profit' : 'Net Loss'}
                                    </div>
                                    <div style={{ fontSize: '2rem', fontWeight: '700' }}>
                                        ₹{Math.abs((reports?.earnings?.totalEarnings || 0) - (reports?.expenditure?.totalExpenditure || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '0.5rem' }}>
                                        {((((reports?.earnings?.totalEarnings || 0) - (reports?.expenditure?.totalExpenditure || 0)) / (reports?.earnings?.totalEarnings || 1)) * 100).toFixed(1)}% margin
                                    </div>
                                </div>
                            </div>

                            {/* Earnings Breakdown */}
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#111827' }}>
                                Earnings by Fee Type
                            </h3>
                            <div className="report-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{
                                    padding: '1rem',
                                    backgroundColor: '#fef3c7',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #fde68a'
                                }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#92400e', marginBottom: '0.5rem' }}>
                                        Admission Fees
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#78350f' }}>
                                        ₹{(reports?.earnings?.admissionFees || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </div>
                                </div>

                                <div style={{
                                    padding: '1rem',
                                    backgroundColor: '#dbeafe',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #bfdbfe'
                                }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1e40af', marginBottom: '0.5rem' }}>
                                        Monthly Fees
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e3a8a' }}>
                                        ₹{(reports?.earnings?.monthlyFees || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </div>
                                </div>

                                <div style={{
                                    padding: '1rem',
                                    backgroundColor: '#e0e7ff',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #c7d2fe'
                                }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#4338ca', marginBottom: '0.5rem' }}>
                                        Transport Fees
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3730a3' }}>
                                        ₹{(reports?.earnings?.transportFees || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </div>
                                </div>

                                <div style={{
                                    padding: '1rem',
                                    backgroundColor: '#fce7f3',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #fbcfe8'
                                }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#9f1239', marginBottom: '0.5rem' }}>
                                        Annual Fees
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#881337' }}>
                                        ₹{(reports?.earnings?.annualFees || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </div>
                                </div>

                                <div style={{
                                    padding: '1rem',
                                    backgroundColor: '#dcfce7',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #bbf7d0'
                                }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#166534', marginBottom: '0.5rem' }}>
                                        Exam Fees
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#14532d' }}>
                                        ₹{(reports?.earnings?.examFees || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </div>
                                </div>

                                <div style={{
                                    padding: '1rem',
                                    backgroundColor: '#f3f4f6',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #e5e7eb'
                                }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                                        Miscellaneous
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>
                                        ₹{(reports?.earnings?.miscFees || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>

                            {/* Expenditure Breakdown */}
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', marginTop: '2rem', color: '#111827' }}>
                                Expenditure by Type
                            </h3>
                            <div className="report-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{
                                    padding: '1rem',
                                    backgroundColor: '#fef3c7',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #fde68a'
                                }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#92400e', marginBottom: '0.5rem' }}>
                                        Salary Expenses
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#78350f' }}>
                                        ₹{(reports?.expenditure?.salaryExpenses || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </div>
                                </div>

                                <div style={{
                                    padding: '1rem',
                                    backgroundColor: '#dbeafe',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #bfdbfe'
                                }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1e40af', marginBottom: '0.5rem' }}>
                                        Infrastructure Expenses
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e3a8a' }}>
                                        ₹{(reports?.expenditure?.infrastructureExpenses || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </div>
                                </div>

                                <div style={{
                                    padding: '1rem',
                                    backgroundColor: '#e0e7ff',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #c7d2fe'
                                }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#4338ca', marginBottom: '0.5rem' }}>
                                        Utilities Expenses
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3730a3' }}>
                                        ₹{(reports?.expenditure?.utilitiesExpenses || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </div>
                                </div>

                                <div style={{
                                    padding: '1rem',
                                    backgroundColor: '#fce7f3',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #fbcfe8'
                                }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#9f1239', marginBottom: '0.5rem' }}>
                                        Supplies Expenses
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#881337' }}>
                                        ₹{(reports?.expenditure?.suppliesExpenses || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </div>
                                </div>

                                <div style={{
                                    padding: '1rem',
                                    backgroundColor: '#dcfce7',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #bbf7d0'
                                }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#166534', marginBottom: '0.5rem' }}>
                                        Maintenance Expenses
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#14532d' }}>
                                        ₹{(reports?.expenditure?.maintenanceExpenses || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </div>
                                </div>

                                <div style={{
                                    padding: '1rem',
                                    backgroundColor: '#f3f4f6',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #e5e7eb'
                                }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                                        Miscellaneous
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>
                                        ₹{(reports?.expenditure?.miscExpenses || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <h2>Student Distribution by Class</h2>
                            <div className="report-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                {Object.entries(reports?.students?.byClass || {}).map(([className, count], index) => {
                                    const colors = [
                                        { bg: '#fef3c7', border: '#fde68a', textLight: '#92400e', textDark: '#78350f' },
                                        { bg: '#dbeafe', border: '#bfdbfe', textLight: '#1e40af', textDark: '#1e3a8a' },
                                        { bg: '#e0e7ff', border: '#c7d2fe', textLight: '#4338ca', textDark: '#3730a3' },
                                        { bg: '#fce7f3', border: '#fbcfe8', textLight: '#9f1239', textDark: '#881337' },
                                        { bg: '#dcfce7', border: '#bbf7d0', textLight: '#166534', textDark: '#14532d' },
                                        { bg: '#f3f4f6', border: '#e5e7eb', textLight: '#374151', textDark: '#1f2937' }
                                    ];
                                    const color = colors[index % colors.length];

                                    return (
                                        <div key={className} style={{
                                            padding: '1rem',
                                            backgroundColor: color.bg,
                                            borderRadius: '0.5rem',
                                            border: `1px solid ${color.border}`
                                        }}>
                                            <div style={{ fontSize: '0.875rem', fontWeight: '500', color: color.textLight, marginBottom: '0.5rem' }}>
                                                {className}
                                            </div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: color.textDark }}>
                                                {count} {count === 1 ? 'Student' : 'Students'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'inquiries' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ margin: 0 }}>Admission Inquiries</h2>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setShowAddInquiry(true)}
                                >
                                    Add Inquiry
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setShowInquiries(true)}
                                >
                                    View All Inquiries
                                </button>
                            </div>
                        </div>
                        <p style={{ color: '#6b7280', marginTop: 0 }}>
                            {pendingInquiriesCount > 0
                                ? `You have ${pendingInquiriesCount} pending ${pendingInquiriesCount === 1 ? 'inquiry' : 'inquiries'} awaiting follow-up.`
                                : 'All inquiries have been followed up.'
                            }
                        </p>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showAddStudent && (
                <AddStudentForm
                    onClose={() => setShowAddStudent(false)}
                    onSuccess={fetchData}
                />
            )}
            {showAddTeacher && (
                <AddTeacherForm
                    onClose={() => setShowAddTeacher(false)}
                    onSuccess={fetchData}
                />
            )}
            {showAddExam && (
                <AddExamForm
                    onClose={() => setShowAddExam(false)}
                    onSuccess={fetchData}
                />
            )}
            {showManageHolidays && (
                <ManageHolidaysModal
                    onClose={() => setShowManageHolidays(false)}
                    onSuccess={fetchData}
                />
            )}
            {showManageFeeStructure && (
                <ManageFeeStructureModal
                    onClose={() => setShowManageFeeStructure(false)}
                    onSuccess={fetchData}
                />
            )}
            {showRecordPayment && (
                <RecordFeePaymentForm
                    onClose={() => setShowRecordPayment(false)}
                    onSuccess={fetchData}
                />
            )}
            {showManageExpenditures && (
                <ManageExpendituresModal
                    onClose={() => setShowManageExpenditures(false)}
                />
            )}
            {selectedStudent && (
                <StudentDetailsModal
                    student={selectedStudent}
                    onClose={() => setSelectedStudent(null)}
                    onUpdate={fetchData}
                />
            )}
            {showAddInquiry && (
                <InquiryForm
                    onClose={() => {
                        setShowAddInquiry(false);
                        fetchData(); // Refresh to update pending count
                    }}
                />
            )}
            {showInquiries && (
                <ViewInquiriesModal
                    onClose={() => {
                        setShowInquiries(false);
                        fetchData(); // Refresh to update pending count
                    }}
                />
            )}
        </div>
    );
}

export default AdminDashboard;
