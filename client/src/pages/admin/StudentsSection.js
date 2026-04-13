import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import AddStudentForm from '../../components/forms/AddStudentForm';
import StudentDetailsModal from '../../components/modals/StudentDetailsModal';

function StudentsSection() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddStudent, setShowAddStudent] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showInactive, setShowInactive] = useState(false);
    const [sortField, setSortField] = useState('rollNumber');
    const [sortDir, setSortDir] = useState('asc');

    useEffect(() => { fetchStudents(); }, []);

    const fetchStudents = async () => {
        try {
            const res = await adminAPI.getAllStudents();
            setStudents(res.data.data);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (field) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    };

    const getDisplayStudents = () => {
        const statusFilter = showInactive ? 'INACTIVE' : 'ACTIVE';
        return students
            .filter(s => s.status === statusFilter)
            .filter(s => {
                const q = searchTerm.toLowerCase();
                return s.fullName.toLowerCase().includes(q)
                    || s.rollNumber.toLowerCase().includes(q)
                    || (s.parentName && s.parentName.toLowerCase().includes(q));
            })
            .sort((a, b) => {
                const av = (a[sortField] || '').toString().toLowerCase();
                const bv = (b[sortField] || '').toString().toLowerCase();
                if (av < bv) return sortDir === 'asc' ? -1 : 1;
                if (av > bv) return sortDir === 'asc' ? 1 : -1;
                return 0;
            });
    };

    const SortTh = ({ field, children }) => (
        <th onClick={() => handleSort(field)} style={{ cursor: 'pointer', userSelect: 'none' }}>
            {children} {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
        </th>
    );

    if (loading) return <div className="loading">Loading students...</div>;

    const displayed = getDisplayStudents();

    return (
        <div className="card">
            <div className="card-header">
                <h2>{showInactive ? 'Inactive Students' : 'Active Students'}</h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowInactive(v => !v)}
                        style={{ fontSize: '0.875rem' }}
                    >
                        {showInactive ? 'Show Active' : 'Show Inactive'}
                    </button>
                    {!showInactive && (
                        <button className="btn btn-primary" onClick={() => setShowAddStudent(true)}>
                            Add Student
                        </button>
                    )}
                </div>
            </div>

            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }}>
                <input
                    type="text"
                    placeholder="Search by name, roll number, or parent name..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '10px 16px', fontSize: '0.95rem', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none' }}
                />
            </div>

            <div className="admin-table-wrap">
                <table className="table">
                    <thead>
                        <tr>
                            <SortTh field="rollNumber">Roll Number</SortTh>
                            <SortTh field="fullName">Name</SortTh>
                            <SortTh field="class">Class</SortTh>
                            <SortTh field="parentName">Parent Name</SortTh>
                            <SortTh field="parentPhone">Parent Phone</SortTh>
                            <SortTh field="status">Status</SortTh>
                        </tr>
                    </thead>
                    <tbody>
                        {displayed.map(student => (
                            <tr
                                key={student.studentId}
                                onClick={() => setSelectedStudent(student)}
                                style={{ cursor: 'pointer', opacity: student.status === 'INACTIVE' ? 0.6 : 1 }}
                                className="clickable-row"
                            >
                                <td>{student.rollNumber}</td>
                                <td style={{
                                    textDecoration: student.status === 'INACTIVE' ? 'line-through' : 'none',
                                    color: student.status === 'INACTIVE' ? '#94a3b8' : 'inherit'
                                }}>
                                    {student.fullName}
                                </td>
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
            </div>

            {displayed.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                    {searchTerm
                        ? `No ${showInactive ? 'inactive' : 'active'} students matching "${searchTerm}"`
                        : `No ${showInactive ? 'inactive' : 'active'} students`}
                </div>
            )}

            {showAddStudent && (
                <AddStudentForm
                    onClose={() => setShowAddStudent(false)}
                    onSuccess={() => { setShowAddStudent(false); fetchStudents(); }}
                />
            )}

            {selectedStudent && (
                <StudentDetailsModal
                    student={selectedStudent}
                    onClose={() => setSelectedStudent(null)}
                    onUpdate={() => { fetchStudents(); setSelectedStudent(null); }}
                />
            )}
        </div>
    );
}

export default StudentsSection;
