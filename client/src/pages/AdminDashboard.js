import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import AddStudentForm from '../components/forms/AddStudentForm';
import AddTeacherForm from '../components/forms/AddTeacherForm';
import AddExamForm from '../components/forms/AddExamForm';
import AddHolidayForm from '../components/forms/AddHolidayForm';
import RecordFeePaymentForm from '../components/forms/RecordFeePaymentForm';
import AddExpenditureForm from '../components/forms/AddExpenditureForm';
import StudentDetailsModal from '../components/modals/StudentDetailsModal';
import ViewInquiriesModal from '../components/modals/ViewInquiriesModal';
import ManageFeeStructureModal from '../components/modals/ManageFeeStructureModal';
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
    const [showAddHoliday, setShowAddHoliday] = useState(false);
    const [showManageFeeStructure, setShowManageFeeStructure] = useState(false);
    const [showRecordPayment, setShowRecordPayment] = useState(false);
    const [showAddExpenditure, setShowAddExpenditure] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [timePeriod, setTimePeriod] = useState('current-year');
    const [studentSearchTerm, setStudentSearchTerm] = useState('');
    const [showInquiries, setShowInquiries] = useState(false);
    const [pendingInquiriesCount, setPendingInquiriesCount] = useState(0);

    useEffect(() => {
        fetchData();
    }, [timePeriod]);

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
                                <button className="action-btn" onClick={() => setShowAddHoliday(true)}>Add Holiday</button>
                                <button className="action-btn" onClick={() => setShowManageFeeStructure(true)}>Manage Fee Structure</button>
                                <button className="action-btn" onClick={() => setShowRecordPayment(true)}>Record Fee Payment</button>
                                <button className="action-btn" onClick={() => setShowAddExpenditure(true)}>Add Expenditure</button>
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
                                    <th>Roll Number</th>
                                    <th>Name</th>
                                    <th>Class</th>
                                    <th>Parent Name</th>
                                    <th>Parent Phone</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students
                                    .filter(student => {
                                        const searchLower = studentSearchTerm.toLowerCase();
                                        return (
                                            student.fullName.toLowerCase().includes(searchLower) ||
                                            student.rollNumber.toLowerCase().includes(searchLower) ||
                                            (student.parentName && student.parentName.toLowerCase().includes(searchLower))
                                        );
                                    })
                                    .map((student, index) => (
                                        <tr
                                            key={index}
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

                        {students.filter(student => {
                            const searchLower = studentSearchTerm.toLowerCase();
                            return (
                                student.fullName.toLowerCase().includes(searchLower) ||
                                student.rollNumber.toLowerCase().includes(searchLower) ||
                                (student.parentName && student.parentName.toLowerCase().includes(searchLower))
                            );
                        }).length === 0 && (
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
                                {teachers.map((teacher, index) => (
                                    <tr key={index}>
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
                            <h2>Earnings Report</h2>
                            <div className="report-grid">
                                <div className="report-item">
                                    <strong>Total Earnings:</strong>
                                    <span>₹{reports?.earnings?.totalEarnings || 0}</span>
                                </div>
                                <div className="report-item">
                                    <strong>Admission Fees:</strong>
                                    <span>₹{reports?.earnings?.admissionFees || 0}</span>
                                </div>
                                <div className="report-item">
                                    <strong>Monthly Fees:</strong>
                                    <span>₹{reports?.earnings?.monthlyFees || 0}</span>
                                </div>
                                <div className="report-item">
                                    <strong>Misc Fees:</strong>
                                    <span>₹{reports?.earnings?.miscFees || 0}</span>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <h2>Student Distribution</h2>
                            <div className="report-grid">
                                {Object.entries(reports?.students?.byClass || {}).map(([className, count]) => (
                                    <div key={className} className="report-item">
                                        <strong>{className}:</strong>
                                        <span>{count} students</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'inquiries' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ margin: 0 }}>Admission Inquiries</h2>
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowInquiries(true)}
                            >
                                View All Inquiries
                            </button>
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
            {showAddHoliday && (
                <AddHolidayForm
                    onClose={() => setShowAddHoliday(false)}
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
            {showAddExpenditure && (
                <AddExpenditureForm
                    onClose={() => setShowAddExpenditure(false)}
                    onSuccess={fetchData}
                />
            )}
            {selectedStudent && (
                <StudentDetailsModal
                    student={selectedStudent}
                    onClose={() => setSelectedStudent(null)}
                    onUpdate={fetchData}
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
