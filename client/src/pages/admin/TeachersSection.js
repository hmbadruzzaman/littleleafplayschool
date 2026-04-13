import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import AddTeacherForm from '../../components/forms/AddTeacherForm';

function TeachersSection() {
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddTeacher, setShowAddTeacher] = useState(false);

    useEffect(() => { fetchTeachers(); }, []);

    const fetchTeachers = async () => {
        try {
            const res = await adminAPI.getAllTeachers();
            setTeachers(res.data.data);
        } catch (error) {
            console.error('Error fetching teachers:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading">Loading teachers...</div>;

    return (
        <div className="card">
            <div className="card-header">
                <h2>All Teachers</h2>
                <button className="btn btn-primary" onClick={() => setShowAddTeacher(true)}>Add Teacher</button>
            </div>
            <div className="admin-table-wrap">
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

            {showAddTeacher && (
                <AddTeacherForm
                    onClose={() => setShowAddTeacher(false)}
                    onSuccess={() => { setShowAddTeacher(false); fetchTeachers(); }}
                />
            )}
        </div>
    );
}

export default TeachersSection;
