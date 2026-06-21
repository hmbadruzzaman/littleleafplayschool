import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import { DEFAULT_GRADE_SCALE, normalizeScale } from '../../utils/grades';

// Admin editor for the global grade scale. Self-contained: loads the current
// scale from SCHOOL_INFO on open and saves it back. Labels are fixed; only each
// band's minimum % is editable, and the lowest band is pinned at 0%.
function GradeScaleModal({ onClose, onSaved }) {
    const [bands, setBands]     = useState(DEFAULT_GRADE_SCALE);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving]   = useState(false);
    const [error, setError]     = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await adminAPI.getSchoolInfo();
                const scale = normalizeScale(res?.data?.data?.gradeScale);
                if (!cancelled) setBands(scale);
            } catch (e) {
                if (!cancelled) setBands(DEFAULT_GRADE_SCALE);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const setMin = (index, raw) => {
        const value = raw === '' ? '' : parseInt(raw, 10);
        setBands((prev) => prev.map((b, i) => (i === index ? { ...b, min: value } : b)));
    };

    // Returns an error message string, or '' when the scale is valid.
    const validate = () => {
        for (let i = 0; i < bands.length; i++) {
            const min = Number(bands[i].min);
            if (bands[i].min === '' || !Number.isInteger(min) || min < 0 || min > 100) {
                return `${bands[i].label}: minimum must be a whole number from 0 to 100.`;
            }
            if (i > 0 && min >= Number(bands[i - 1].min)) {
                return `${bands[i].label} (${min}%) must be lower than ${bands[i - 1].label} (${bands[i - 1].min}%).`;
            }
        }
        if (Number(bands[bands.length - 1].min) !== 0) {
            return `The lowest grade (${bands[bands.length - 1].label}) must start at 0%.`;
        }
        return '';
    };

    const handleSave = async () => {
        const msg = validate();
        if (msg) { setError(msg); return; }
        setSaving(true);
        setError('');
        try {
            const gradeScale = bands.map((b) => ({ label: b.label, min: Number(b.min) }));
            await adminAPI.updateSchoolInfo({ gradeScale });
            if (onSaved) onSaved(gradeScale);
            onClose();
        } catch (e) {
            setError(e?.response?.data?.message || 'Failed to save grade scale.');
            setSaving(false);
        }
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(20,28,18,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1000, padding: 16,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'var(--surface)', borderRadius: 'var(--radius)',
                    width: 420, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                }}
            >
                <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-soft)' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 400, color: 'var(--forest-900)', margin: 0 }}>
                        Grade Scale
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                        Set the minimum percentage for each grade. The marksheet legend uses these ranges.
                    </p>
                </div>

                <div style={{ padding: '16px 24px' }}>
                    {loading ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
                    ) : (
                        <>
                            {bands.map((band, i) => {
                                const isFloor = i === bands.length - 1;
                                return (
                                    <div key={band.label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                                        <span style={{ width: 40, fontWeight: 700, color: 'var(--forest-900)' }}>{band.label}</span>
                                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>min %</span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={band.min}
                                            disabled={isFloor}
                                            onChange={(e) => setMin(i, e.target.value)}
                                            style={{
                                                width: 80, padding: '6px 8px', fontSize: 14,
                                                border: '1px solid var(--border-soft)', borderRadius: 8,
                                                background: isFloor ? 'var(--cream-50)' : 'var(--surface)',
                                                color: 'var(--text)',
                                            }}
                                        />
                                        {isFloor && (
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(floor, fixed)</span>
                                        )}
                                    </div>
                                );
                            })}
                            {error && (
                                <div style={{ marginTop: 8, color: '#b85b4a', fontSize: 12 }}>{error}</div>
                            )}
                        </>
                    )}
                </div>

                <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={onClose} className="btn btn-ghost" style={{ fontSize: 13 }} disabled={saving}>
                        Cancel
                    </button>
                    <button onClick={handleSave} className="btn btn-primary" style={{ fontSize: 13 }} disabled={loading || saving}>
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default GradeScaleModal;
