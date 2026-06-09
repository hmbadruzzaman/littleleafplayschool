import React, { useEffect, useRef, useState } from 'react';
import { adminAPI } from '../../services/api';
import AddTeacherForm from '../../components/forms/AddTeacherForm';

const ROLE_LABELS = ['Lead Teacher', 'Assistant', 'Art & Music', 'Phys. Ed.', 'Support'];
const CARD_ACCENTS = ['#4a5d3f', '#c97b5b', '#7a8f6a', '#e8c97b', '#9a7a6a', '#5a7a6a'];

function TeachersSection() {
    const [teachers, setTeachers]      = useState([]);
    const [loading, setLoading]        = useState(true);
    const [showAddTeacher, setShowAdd] = useState(false);
    const [editing, setEditing]        = useState(null);

    useEffect(() => { fetchTeachers(); }, []);

    const fetchTeachers = async () => {
        try {
            const res = await adminAPI.getAllTeachers();
            setTeachers(res.data.data);
        } catch (err) {
            console.error('Error fetching teachers:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (teacher) => {
        const goingInactive = teacher.status === 'ACTIVE';
        const msg = goingInactive
            ? `Mark ${teacher.fullName} as inactive? They will be hidden from the active staff list and can no longer log in.`
            : `Reactivate ${teacher.fullName}? They will be moved back to the active staff list and login will be re-enabled.`;
        if (!window.confirm(msg)) return;
        try {
            await adminAPI.updateTeacher(teacher.teacherId, { status: goingInactive ? 'INACTIVE' : 'ACTIVE' });
            await fetchTeachers();
        } catch (err) {
            console.error('Toggle teacher status error:', err);
            alert(err?.response?.data?.message || 'Failed to update teacher');
        }
    };

    if (loading) return <div className="loading">Loading teachers…</div>;

    const active   = teachers.filter(t => t.status === 'ACTIVE');
    const inactive = teachers.filter(t => t.status !== 'ACTIVE');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── Banner ──────────────────────────── */}
            <div style={{
                background: 'var(--forest-900)', color: 'var(--cream-50)',
                borderRadius: 'var(--radius)', padding: '24px 32px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                position: 'relative', overflow: 'hidden',
            }}>
                <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(95,116,80,0.35), transparent 70%)', top: -120, right: -80, pointerEvents: 'none' }} />
                <div style={{ position: 'relative' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--forest-400)', marginBottom: 8 }}>Teaching team</div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, margin: 0, color: 'var(--cream-50)' }}>
                        {active.length} teacher{active.length !== 1 ? 's' : ''}, one team.
                    </h2>
                    <p style={{ fontSize: 14, color: 'var(--forest-300)', marginTop: 8 }}>
                        {inactive.length > 0 ? `${inactive.length} inactive` : 'All active'} · Manage your staff below.
                    </p>
                </div>
                <button onClick={() => setShowAdd(true)} className="btn" style={{ background: 'var(--cream-50)', color: 'var(--forest-900)', fontSize: 13, flexShrink: 0 }}>
                    + Add Teacher
                </button>
            </div>

            {/* ── Cards grid ──────────────────────── */}
            {active.length > 0 && (
                <div>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>Active Staff</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                        {active.map((t, i) => (
                            <TeacherCard key={t.teacherId} teacher={t} accent={CARD_ACCENTS[i % CARD_ACCENTS.length]} idx={i}
                                onEdit={() => setEditing(t)} onToggleStatus={() => toggleStatus(t)} />
                        ))}
                    </div>
                </div>
            )}

            {inactive.length > 0 && (
                <div>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>Inactive</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, opacity: 0.6 }}>
                        {inactive.map((t, i) => (
                            <TeacherCard key={t.teacherId} teacher={t} accent="#9a9a8a" idx={i}
                                onEdit={() => setEditing(t)} onToggleStatus={() => toggleStatus(t)} />
                        ))}
                    </div>
                </div>
            )}

            {teachers.length === 0 && (
                <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: 20, background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border-soft)' }}>
                    No teachers found. Add the first one.
                </div>
            )}

            {showAddTeacher && (
                <AddTeacherForm
                    onClose={() => setShowAdd(false)}
                    onSuccess={() => { setShowAdd(false); fetchTeachers(); }}
                />
            )}

            {editing && (
                <AddTeacherForm
                    teacher={editing}
                    onClose={() => setEditing(null)}
                    onSuccess={() => { setEditing(null); fetchTeachers(); }}
                />
            )}
        </div>
    );
}

function TeacherCard({ teacher, accent, idx, onEdit, onToggleStatus }) {
    const initials = teacher.fullName
        ? teacher.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
        : '?';

    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const hasActions = !!(onEdit || onToggleStatus);

    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen]);

    return (
        <div style={{
            background: 'var(--surface)', border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius)', overflow: 'hidden',
            transition: 'transform 0.2s, box-shadow 0.2s',
        }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
        >
            {/* Accent top bar */}
            <div style={{ height: 4, background: accent }} />

            <div style={{ padding: '20px 20px 16px' }}>
                {/* Avatar + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: '50%',
                        background: accent, color: '#fdfbf4',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-display)', fontSize: 22, flexShrink: 0,
                    }}>
                        {initials}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--forest-900)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {teacher.fullName}
                        </div>
                        <div style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                            {teacher.employeeId}
                        </div>
                    </div>
                    {hasActions && (
                        <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o); }}
                                aria-label="Actions"
                                style={{
                                    width: 30, height: 30, borderRadius: 8,
                                    background: menuOpen ? 'var(--forest-50)' : 'transparent',
                                    border: '1px solid ' + (menuOpen ? 'var(--forest-200)' : 'transparent'),
                                    color: 'var(--text-muted)', cursor: 'pointer',
                                    display: 'grid', placeItems: 'center',
                                    fontSize: 18, lineHeight: 1, padding: 0,
                                }}
                                onMouseEnter={e => { if (!menuOpen) e.currentTarget.style.background = 'var(--cream-100)'; }}
                                onMouseLeave={e => { if (!menuOpen) e.currentTarget.style.background = 'transparent'; }}
                            >
                                ⋯
                            </button>
                            {menuOpen && (
                                <div style={{
                                    position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                                    minWidth: 160, background: 'var(--surface)',
                                    border: '1px solid var(--border-soft)', borderRadius: 10,
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                                    padding: 4, zIndex: 10,
                                }}>
                                    {onEdit && (
                                        <MenuItem
                                            onClick={() => { setMenuOpen(false); onEdit(); }}
                                            label="Edit"
                                        />
                                    )}
                                    {onToggleStatus && (
                                        <MenuItem
                                            onClick={() => { setMenuOpen(false); onToggleStatus(); }}
                                            label={teacher.status === 'ACTIVE' ? 'Mark Inactive' : 'Mark Active'}
                                            color={teacher.status === 'ACTIVE' ? '#b85b4a' : 'var(--success-color)'}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                    {teacher.email && (
                        <div style={{ fontSize: 13, color: 'var(--text-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {teacher.email}
                        </div>
                    )}
                    {teacher.phone && (
                        <div style={{ fontSize: 13, color: 'var(--text-light)' }}>{teacher.phone}</div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTop: '1px solid var(--border-soft)' }}>
                    <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                        letterSpacing: '0.04em', textTransform: 'uppercase',
                        background: teacher.status === 'ACTIVE' ? 'var(--success-bg)' : '#f0e6e0',
                        color: teacher.status === 'ACTIVE' ? 'var(--success-color)' : '#8a5a4a',
                    }}>
                        {teacher.status}
                    </span>
                    {teacher.assignedClass && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{teacher.assignedClass}</span>
                    )}
                </div>

            </div>
        </div>
    );
}

function MenuItem({ onClick, label, color }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 12px', borderRadius: 6,
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: 13, fontFamily: 'inherit',
                color: color || 'var(--forest-900)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--cream-100)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
            {label}
        </button>
    );
}

export default TeachersSection;
