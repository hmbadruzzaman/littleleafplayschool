import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import AddStudentForm from '../../components/forms/AddStudentForm';
import StudentDetailsModal from '../../components/modals/StudentDetailsModal';

function StudentsSection() {
    const [students, setStudents]         = useState([]);
    const [loading, setLoading]           = useState(true);
    const [showAddStudent, setShowAdd]    = useState(false);
    const [selectedStudent, setSelected] = useState(null);
    const [searchTerm, setSearchTerm]    = useState('');
    const [showInactive, setShowInactive]= useState(false);
    const [sortField, setSortField]      = useState('rollNumber');
    const [sortDir, setSortDir]          = useState('asc');

    useEffect(() => { fetchStudents(); }, []);

    const fetchStudents = async () => {
        try {
            const res = await adminAPI.getAllStudents();
            setStudents(res.data.data);
        } catch (err) {
            console.error('Error fetching students:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSort = field => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    };

    const displayed = students
        .filter(s => s.status === (showInactive ? 'INACTIVE' : 'ACTIVE'))
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
            if (av > bv) return sortDir === 'asc' ?  1 : -1;
            return 0;
        });

    const SortTh = ({ field, children }) => (
        <th onClick={() => handleSort(field)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
            {children} {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
        </th>
    );

    if (loading) return <div className="loading">Loading students…</div>;

    return (
        <div className="ll-card">
            <div className="ll-card__head">
                <h2>{showInactive ? 'Inactive Students' : 'Active Students'}</h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button className="btn btn-secondary" style={{ fontSize: 13 }}
                        onClick={() => setShowInactive(v => !v)}>
                        {showInactive ? 'Show Active' : 'Show Inactive'}
                    </button>
                    {!showInactive && (
                        <button className="btn btn-primary" style={{ fontSize: 13 }}
                            onClick={() => setShowAdd(true)}>
                            + Add Student
                        </button>
                    )}
                </div>
            </div>

            {/* Search bar */}
            <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border-soft)' }}>
                <input
                    type="text"
                    placeholder="Search by name, roll number, or parent…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '10px 16px', fontSize: 14, border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
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
                                onClick={() => setSelected(student)}
                                className="clickable-row"
                                style={{ opacity: student.status === 'INACTIVE' ? 0.6 : 1 }}
                            >
                                <td style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>{student.rollNumber}</td>
                                <td style={{
                                    textDecoration: student.status === 'INACTIVE' ? 'line-through' : 'none',
                                    color: student.status === 'INACTIVE' ? 'var(--text-muted)' : 'inherit'
                                }}>{student.fullName}</td>
                                <td>{student.class}</td>
                                <td>{student.parentName}</td>
                                <td>{student.parentPhone}</td>
                                <td><span className={`status-badge ${student.status.toLowerCase()}`}>{student.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {displayed.length === 0 && (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: 20 }}>
                    {searchTerm
                        ? `No ${showInactive ? 'inactive' : 'active'} students matching "${searchTerm}"`
                        : `No ${showInactive ? 'inactive' : 'active'} students found.`}
                </div>
            )}

            {showAddStudent && (
                <AddStudentForm
                    onClose={() => setShowAdd(false)}
                    onSuccess={() => { setShowAdd(false); fetchStudents(); }}
                />
            )}
            {selectedStudent && (
                <StudentDetailsModal
                    student={selectedStudent}
                    onClose={() => setSelected(null)}
                    onUpdate={() => { fetchStudents(); setSelected(null); }}
                />
            )}
        </div>
    );
}

export default StudentsSection;
