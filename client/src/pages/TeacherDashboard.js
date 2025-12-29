import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { teacherAPI } from '../services/api';
import TeacherStudentDetailsModal from '../components/modals/TeacherStudentDetailsModal';
import './Dashboard.css';

function TeacherDashboard() {
    const { logout } = useAuth();
    const [students, setStudents] = useState([]);
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedClass, setSelectedClass] = useState('all');
    const [selectedStudent, setSelectedStudent] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [studentsRes, examsRes] = await Promise.all([
                teacherAPI.getAllStudents(),
                teacherAPI.getAllExams()
            ]);

            setStudents(studentsRes.data.data);
            setExams(examsRes.data.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const groupStudentsByClass = () => {
        const grouped = {};
        students.forEach(student => {
            if (!grouped[student.class]) {
                grouped[student.class] = [];
            }
            grouped[student.class].push(student);
        });
        return grouped;
    };

    const getFilteredStudents = () => {
        if (selectedClass === 'all') {
            return groupStudentsByClass();
        }
        return { [selectedClass]: students.filter(s => s.class === selectedClass) };
    };

    const classes = ['Pre-KG A', 'Pre-KG B', 'LKG A', 'LKG B', 'UKG A'];

    if (loading) {
        return <div className="loading">Loading dashboard...</div>;
    }

    const groupedStudents = getFilteredStudents();

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-content">
                        <h1>Teacher Dashboard</h1>
                        <button onClick={logout} className="btn btn-secondary">Logout</button>
                    </div>
                </div>
            </header>

            <div className="dashboard-content container">
                <div className="card" style={{ marginBottom: '24px' }}>
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }}>
                        <label style={{ fontSize: '0.95rem', fontWeight: '500', color: '#374151', marginRight: '12px' }}>
                            Filter by Class:
                        </label>
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                fontSize: '0.9rem',
                                minWidth: '150px'
                            }}
                        >
                            <option value="all">All Classes</option>
                            {classes.map(cls => (
                                <option key={cls} value={cls}>{cls}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {Object.keys(groupedStudents).length === 0 ? (
                    <div className="card">
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#6b7280' }}>
                            <p>No students found</p>
                        </div>
                    </div>
                ) : (
                    Object.entries(groupedStudents).map(([className, classStudents]) => (
                        <div key={className} className="card" style={{ marginBottom: '24px' }}>
                            <div className="card-header">
                                <h2>{className}</h2>
                                <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                                    {classStudents.length} student{classStudents.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Roll Number</th>
                                        <th>Name</th>
                                        <th>Parent Name</th>
                                        <th>Parent Phone</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {classStudents.map((student, index) => (
                                        <tr
                                            key={index}
                                            onClick={() => setSelectedStudent(student)}
                                            style={{ cursor: 'pointer' }}
                                            className="clickable-row"
                                        >
                                            <td>{student.rollNumber}</td>
                                            <td>{student.fullName}</td>
                                            <td>{student.parentName || 'N/A'}</td>
                                            <td>{student.parentPhone || 'N/A'}</td>
                                            <td>
                                                <span className={`status-badge ${student.status.toLowerCase()}`}>
                                                    {student.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))
                )}
            </div>

            {selectedStudent && (
                <TeacherStudentDetailsModal
                    student={selectedStudent}
                    onClose={() => setSelectedStudent(null)}
                />
            )}
        </div>
    );
}

export default TeacherDashboard;
