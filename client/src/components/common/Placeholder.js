import React from 'react';

/**
 * Striped decorative placeholder used where real photography isn't yet
 * available. Children are rendered as an overlay label (e.g. "Director").
 *
 * Props:
 *   ratio    — aspect ratio string e.g. "4/5", "1/1". Default "4/3".
 *   tone     — "warm" (terracotta) | "moss" (forest) | "cream" (muted).
 *   rounded  — CSS radius, default uses --radius.
 */
function Placeholder({ ratio = '4/3', tone = 'moss', rounded, children, style }) {
    const tones = {
        moss: { bg: '#c4ceb8', stripe: '#7a8f6a', label: '#3d4f32' },
        warm: { bg: '#e8b69d', stripe: '#c97b5b', label: '#7a3f2b' },
        cream:{ bg: '#ead9b8', stripe: '#c9b78e', label: '#7a6b4a' },
        butter:{ bg: '#f0dca1', stripe: '#c99a49', label: '#7a5a1e' },
    };
    const t = tones[tone] || tones.moss;

    const stripes = `repeating-linear-gradient(135deg, ${t.stripe} 0, ${t.stripe} 2px, transparent 2px, transparent 14px)`;

    return (
        <div
            className="ll-placeholder"
            style={{
                aspectRatio: ratio,
                background: t.bg,
                backgroundImage: stripes,
                borderRadius: rounded ?? 'var(--radius)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: t.label,
                fontFamily: 'var(--font-display)',
                fontSize: '18px',
                letterSpacing: '0.02em',
                ...style,
            }}
        >
            {children && (
                <span
                    style={{
                        background: 'rgba(250, 246, 238, 0.78)',
                        padding: '6px 14px',
                        borderRadius: 999,
                        fontStyle: 'italic',
                        backdropFilter: 'blur(2px)',
                    }}
                >
                    {children}
                </span>
            )}
        </div>
    );
}

export default Placeholder;
