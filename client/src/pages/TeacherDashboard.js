import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { teacherAPI } from '../services/api';
import TeacherStudentDetailsModal from '../components/modals/TeacherStudentDetailsModal';
import LeafMark from '../components/common/LeafMark';
import './Dashboard.css';

function TeacherDashboard() {
    const { logout } = useAuth();
    const [students, setStudents]         = useState([]);
    const [exams, setExams]               = useState([]);
    const [loading, setLoading]           = useState(true);
    const [selectedClass, setSelectedClass] = useState('all');
    const [selectedStudent, setSelectedStudent] = useState(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [studentsRes, examsRes] = await Promise.all([
                teacherAPI.getAllStudents(),
                teacherAPI.getAllExams()
            ]);
            setStudents(studentsRes.data.data);
            setExams(examsRes.data.data);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const groupStudentsByClass = () => {
        const grouped = {};
        students.forEach(s => {
            if (!grouped[s.class]) grouped[s.class] = [];
            grouped[s.class].push(s);
        });
        return grouped;
    };

    const getFilteredStudents = () => {
        if (selectedClass === 'all') return groupStudentsByClass();
        return { [selectedClass]: students.filter(s => s.class === selectedClass) };
    };

    const classes = ['Play', 'Nursery', 'LKG', 'UKG'];

    if (loading) return <div className="loading">Loading dashboard…</div>;

    const groupedStudents = getFilteredStudents();

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
                        <span className="ll-portal__role-pill">Teacher Portal</span>
                        <button onClick={logout} className="btn btn-ghost" style={{ fontSize: 13 }}>Sign out</button>
                    </div>
                </div>
            </header>

            <div className="container ll-portal__body">

                {/* Welcome */}
                <div className="ll-portal__welcome ll-portal__welcome--compact">
                    <div className="ll-portal__welcome-blob" />
                    <div className="ll-portal__welcome-text">
                        <h1>Teacher Dashboard</h1>
                        <p>{students.length} students across your classes.</p>
                    </div>
                </div>

                {/* Class filter */}
                <div className="ll-portal__section">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-light)' }}>Filter by class:</span>
                        <div className="ll-class-filter">
                            <button
                                className={`ll-class-filter__btn ${selectedClass === 'all' ? 'll-class-filter__btn--active' : ''}`}
                                onClick={() => setSelectedClass('all')}
                            >All Classes</button>
                            {classes.map(cls => (
                                <button key={cls}
                                    className={`ll-class-filter__btn ${selectedClass === cls ? 'll-class-filter__btn--active' : ''}`}
                                    onClick={() => setSelectedClass(cls)}
                                >{cls}</button>
                            ))}
                        </div>
                    </div>

                    {Object.keys(groupedStudents).length === 0 ? (
                        <div className="ll-empty">No students found.</div>
                    ) : (
                        Object.entries(groupedStudents).map(([className, classStudents]) => (
                            <div key={className} className="ll-card" style={{ marginBottom: 20, overflow: 'hidden' }}>
                                <div className="ll-card__head">
                                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--forest-900)', margin: 0 }}>
                                        {className}
                                    </h3>
                                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                        {classStudents.length} student{classStudents.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="admin-table-wrap">
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
                                            {classStudents.map((student, idx) => (
                                                <tr key={idx}
                                                    onClick={() => setSelectedStudent(student)}
                                                    className="clickable-row">
                                                    <td style={{ fontWeight: 500 }}>{student.rollNumber}</td>
                                                    <td>{student.fullName}</td>
                                                    <td style={{ color: 'var(--text-light)' }}>{student.parentName || '—'}</td>
                                                    <td style={{ color: 'var(--text-light)' }}>{student.parentPhone || '—'}</td>
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
                            </div>
                        ))
                    )}
                </div>
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
