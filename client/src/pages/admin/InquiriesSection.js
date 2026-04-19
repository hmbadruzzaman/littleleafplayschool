import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import InquiryForm from '../../components/forms/InquiryForm';

const STATUS_META = {
    NEW:          { label: 'New',         bg: '#fdecd4', color: '#9a5a1e' },
    IN_PROGRESS:  { label: 'In Progress', bg: '#e0e9ee', color: '#3a5a6a' },
    FOLLOWED_UP:  { label: 'Responded',   bg: '#e7f0e9', color: '#2d5038' },
    ADMITTED:     { label: 'Admitted',    bg: '#d8ead9', color: '#1f5032' },
    REJECTED:     { label: 'Closed',      bg: '#f0e6e0', color: '#7a4a3a' },
};

const PENDING_STATUSES = ['NEW', 'IN_PROGRESS'];

function InquiriesSection({ onPendingCountChange }) {
    const [inquiries, setInquiries]       = useState([]);
    const [selected, setSelected]         = useState(null);
    const [loading, setLoading]           = useState(true);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [updating, setUpdating]         = useState(false);
    const [showAddInquiry, setShowAdd]    = useState(false);
    const [closeFor, setCloseFor]         = useState(null); // inquiry being closed

    useEffect(() => { fetchInquiries(); }, []);

    const fetchInquiries = async () => {
        try {
            const res = await adminAPI.getAllInquiries();
            const data = res.data.data || [];
            setInquiries(data);
            if (onPendingCountChange) {
                onPendingCountChange(data.filter(i => PENDING_STATUSES.includes(i.status)).length);
            }
            // Keep selected inquiry in sync with refreshed data, or auto-select first pending
            setSelected(prev => {
                if (prev) {
                    const fresh = data.find(i => i.inquiryId === prev.inquiryId);
                    if (fresh) return fresh;
                }
                return data.find(i => PENDING_STATUSES.includes(i.status)) || null;
            });
        } catch (err) {
            console.error('Error fetching inquiries:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (inquiryId, newStatus, comment) => {
        setUpdating(true);
        try {
            await adminAPI.updateInquiryStatus(inquiryId, newStatus, comment);
            await fetchInquiries();
        } catch (err) {
            console.error('Error updating status:', err);
            alert(err?.response?.data?.message || 'Failed to update status');
        } finally {
            setUpdating(false);
        }
    };

    const displayed = filterStatus === 'ALL'
        ? inquiries
        : inquiries.filter(i => i.status === filterStatus);

    const pendingCount = inquiries.filter(i => PENDING_STATUSES.includes(i.status)).length;

    if (loading) return <div className="loading">Loading inquiries…</div>;

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
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--forest-400)', marginBottom: 8 }}>Admission pipeline</div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, margin: 0, color: 'var(--cream-50)' }}>
                        {inquiries.length} inquir{inquiries.length === 1 ? 'y' : 'ies'} in the pipeline.
                    </h2>
                    <p style={{ fontSize: 14, color: 'var(--forest-300)', marginTop: 8 }}>
                        {pendingCount > 0 ? `${pendingCount} awaiting response` : 'All caught up'} · Log a new inquiry from a call or walk-in.
                    </p>
                </div>
                <button onClick={() => setShowAdd(true)} className="btn" style={{ background: 'var(--cream-50)', color: 'var(--forest-900)', fontSize: 13, flexShrink: 0 }}>
                    + Add Inquiry
                </button>
            </div>

            {/* ── Body: list + detail ─────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>

            {/* ── Left: inquiry list ─────────────────── */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>

                {/* Header */}
                <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-soft)', background: 'var(--cream-50)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--forest-900)', margin: 0 }}>Inquiries</h2>
                        {pendingCount > 0 && (
                            <span style={{ background: '#c97b5b', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999 }}>
                                {pendingCount} pending
                            </span>
                        )}
                    </div>
                    {/* Status filter tabs */}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {['ALL', 'NEW', 'IN_PROGRESS', 'FOLLOWED_UP', 'ADMITTED', 'REJECTED'].map(s => (
                            <button key={s} onClick={() => setFilterStatus(s)} style={{
                                padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                                border: '1px solid ' + (filterStatus === s ? 'var(--forest-300)' : 'var(--border-soft)'),
                                background: filterStatus === s ? 'var(--forest-100)' : 'transparent',
                                color: filterStatus === s ? 'var(--forest-800)' : 'var(--text-muted)',
                                cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em', textTransform: 'uppercase',
                                transition: 'all 0.15s',
                            }}>
                                {s === 'ALL' ? 'All' : (STATUS_META[s]?.label || s)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List */}
                <div style={{ maxHeight: 600, overflowY: 'auto' }}>
                    {displayed.length === 0 ? (
                        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: 18 }}>
                            No inquiries here.
                        </div>
                    ) : displayed.map((inq, i) => {
                        const meta = STATUS_META[inq.status] || STATUS_META.NEW;
                        const isSelected = selected?.inquiryId === inq.inquiryId;
                        return (
                            <div key={inq.inquiryId || i}
                                onClick={() => setSelected(inq)}
                                style={{
                                    padding: '16px 24px',
                                    borderBottom: '1px solid var(--border-soft)',
                                    background: isSelected ? 'var(--forest-50)' : 'transparent',
                                    cursor: 'pointer',
                                    transition: 'background 0.12s',
                                    borderLeft: isSelected ? '3px solid var(--moss-dark)' : '3px solid transparent',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                    <div>
                                        <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--forest-900)' }}>{inq.parentName}</span>
                                        {inq.studentName && (
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>for {inq.studentName}</span>
                                        )}
                                    </div>
                                    <span style={{ background: meta.bg, color: meta.color, fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0, marginLeft: 8 }}>
                                        {meta.label}
                                    </span>
                                </div>
                                <p style={{ fontSize: 13, color: 'var(--text-light)', lineHeight: 1.45, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                    {inq.inquiry}
                                </p>
                                <div style={{ marginTop: 8, display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)' }}>
                                    {inq.phone && <span>{inq.phone}</span>}
                                    {inq.preferredClass && <span>Interested in: {inq.preferredClass}</span>}
                                    {inq.createdAt && <span>{new Date(inq.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Right: detail + actions ────────────── */}
            <div style={{ position: 'sticky', top: 90 }}>
                {selected ? (
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-soft)', background: 'var(--cream-50)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--forest-900)', margin: 0 }}>{selected.parentName}</h3>
                                <span style={{
                                    background: (STATUS_META[selected.status] || STATUS_META.NEW).bg,
                                    color: (STATUS_META[selected.status] || STATUS_META.NEW).color,
                                    fontSize: 10, fontWeight: 700, padding: '4px 11px', borderRadius: 999, letterSpacing: '0.05em', textTransform: 'uppercase',
                                }}>
                                    {(STATUS_META[selected.status] || STATUS_META.NEW).label}
                                </span>
                            </div>
                        </div>

                        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Contact info */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                {[
                                    ['Phone', selected.phone],
                                    ['Email', selected.email],
                                    ['Child', selected.studentName],
                                    ['Age', selected.studentAge ? `${selected.studentAge} years` : null],
                                    ['Preferred class', selected.preferredClass],
                                ].filter(([, v]) => v).map(([k, v]) => (
                                    <div key={k} style={{ padding: '10px 14px', background: 'var(--cream-50)', borderRadius: 8, border: '1px solid var(--border-soft)' }}>
                                        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>{k}</div>
                                        <div style={{ fontSize: 14, color: 'var(--forest-900)', fontWeight: 500 }}>{v}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Message */}
                            <div style={{ padding: '14px 16px', background: 'var(--cream-100)', borderRadius: 10, border: '1px solid var(--border-soft)' }}>
                                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Message</div>
                                <p style={{ fontSize: 14, color: 'var(--forest-800)', lineHeight: 1.6, margin: 0 }}>{selected.inquiry}</p>
                            </div>

                            {/* Status actions */}
                            {!['ADMITTED', 'REJECTED'].includes(selected.status) && (
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>Update Status</div>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {selected.status !== 'IN_PROGRESS' && (
                                            <button onClick={() => updateStatus(selected.inquiryId, 'IN_PROGRESS')} disabled={updating}
                                                style={{ padding: '8px 16px', borderRadius: 999, border: `1px solid ${STATUS_META.IN_PROGRESS.bg}`, background: STATUS_META.IN_PROGRESS.bg, color: STATUS_META.IN_PROGRESS.color, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: updating ? 0.6 : 1, letterSpacing: '0.03em' }}>
                                                Mark as In Progress
                                            </button>
                                        )}
                                        {selected.status !== 'FOLLOWED_UP' && (
                                            <button onClick={() => updateStatus(selected.inquiryId, 'FOLLOWED_UP')} disabled={updating}
                                                style={{ padding: '8px 16px', borderRadius: 999, border: `1px solid ${STATUS_META.FOLLOWED_UP.bg}`, background: STATUS_META.FOLLOWED_UP.bg, color: STATUS_META.FOLLOWED_UP.color, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: updating ? 0.6 : 1, letterSpacing: '0.03em' }}>
                                                Mark as Responded
                                            </button>
                                        )}
                                        <button onClick={() => setCloseFor(selected)} disabled={updating}
                                            style={{ padding: '8px 16px', borderRadius: 999, border: `1px solid ${STATUS_META.REJECTED.bg}`, background: STATUS_META.REJECTED.bg, color: STATUS_META.REJECTED.color, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: updating ? 0.6 : 1, letterSpacing: '0.03em' }}>
                                            Mark as Closed…
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Follow-up history */}
                            {selected.followUpHistory?.length > 0 && (
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>Activity</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {[...selected.followUpHistory].reverse().map((h, i) => {
                                            const meta = STATUS_META[h.status] || { label: h.status, bg: '#eee', color: '#555' };
                                            return (
                                                <div key={i} style={{ padding: '10px 14px', background: 'var(--cream-50)', borderRadius: 8, border: '1px solid var(--border-soft)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: h.comment ? 6 : 0 }}>
                                                        <span style={{ background: meta.bg, color: meta.color, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                                            {h.adminAction || `Marked as ${meta.label}`}
                                                        </span>
                                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                            {new Date(h.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    {h.comment && (
                                                        <p style={{ fontSize: 13, color: 'var(--forest-800)', lineHeight: 1.5, margin: 0 }}>{h.comment}</p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Quick contact */}
                            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                                {selected.phone && (
                                    <a href={`tel:${selected.phone}`} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', textDecoration: 'none', fontSize: 13 }}>
                                        Call {selected.parentName?.split(' ')[0]}
                                    </a>
                                )}
                                {selected.email && (
                                    <a href={`mailto:${selected.email}`} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', textDecoration: 'none', fontSize: 13 }}>
                                        Send email
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius)', padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: 18 }}>
                        Select an inquiry to view details.
                    </div>
                )}
            </div>
            </div>

            {showAddInquiry && (
                <InquiryForm
                    onClose={() => setShowAdd(false)}
                    onSuccess={fetchInquiries}
                />
            )}

            {closeFor && (
                <CloseInquiryModal
                    inquiry={closeFor}
                    updating={updating}
                    onCancel={() => setCloseFor(null)}
                    onSubmit={async (resultedInAdmission, comment) => {
                        await updateStatus(closeFor.inquiryId, resultedInAdmission ? 'ADMITTED' : 'REJECTED', comment);
                        setCloseFor(null);
                    }}
                />
            )}
        </div>
    );
}

function CloseInquiryModal({ inquiry, updating, onCancel, onSubmit }) {
    const [admitted, setAdmitted] = useState(null); // true | false | null
    const [comment, setComment]   = useState('');

    const canSubmit = admitted !== null && !updating;

    return (
        <div className="ll-modal-overlay" onClick={onCancel}>
            <div className="ll-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                <div className="ll-modal__header">
                    <h2>Close inquiry · {inquiry.parentName}</h2>
                    <button className="ll-modal__close" onClick={onCancel} aria-label="Close">×</button>
                </div>
                <div className="ll-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--forest-900)', marginBottom: 10 }}>
                            Did this inquiry result in admission?
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            {[
                                { value: true,  label: 'Yes, admitted',  bg: STATUS_META.ADMITTED.bg, color: STATUS_META.ADMITTED.color },
                                { value: false, label: 'No, not admitted', bg: STATUS_META.REJECTED.bg, color: STATUS_META.REJECTED.color },
                            ].map(opt => {
                                const sel = admitted === opt.value;
                                return (
                                    <button key={String(opt.value)} type="button" onClick={() => setAdmitted(opt.value)}
                                        style={{
                                            flex: 1, padding: '12px 16px', borderRadius: 10,
                                            border: `2px solid ${sel ? opt.color : 'var(--border-soft)'}`,
                                            background: sel ? opt.bg : 'transparent',
                                            color: sel ? opt.color : 'var(--text-light)',
                                            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.03em',
                                        }}>
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Comment {admitted === false ? '(reason for closing)' : '(optional)'}</label>
                        <textarea value={comment} onChange={e => setComment(e.target.value)}
                            rows="4" placeholder="Add any notes about the outcome…" />
                    </div>

                    <div className="ll-modal__footer">
                        <button type="button" onClick={onCancel} className="btn btn-ghost">Cancel</button>
                        <button type="button" onClick={() => onSubmit(admitted, comment.trim())}
                            disabled={!canSubmit} className="btn btn-primary">
                            {updating ? 'Saving…' : 'Save & Close Inquiry'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default InquiriesSection;
