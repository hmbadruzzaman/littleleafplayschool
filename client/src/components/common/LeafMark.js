import React from 'react';

/**
 * Little Leaf logo mark — hand-drawn leaf + sprout.
 * Inherits currentColor; size prop scales uniformly.
 */
function LeafMark({ size = 28, className = '' }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 40 40"
            fill="none"
            className={className}
            aria-hidden="true"
        >
            {/* main leaf */}
            <path
                d="M8 30 C 8 16, 18 6, 32 6 C 32 20, 22 30, 8 30 Z"
                fill="currentColor"
                opacity="0.9"
            />
            {/* leaf midrib */}
            <path
                d="M10 28 C 16 22, 22 16, 30 8"
                stroke="#faf6ee"
                strokeWidth="1.4"
                strokeLinecap="round"
                opacity="0.6"
            />
            {/* small sprout */}
            <path
                d="M20 32 C 20 30, 22 27, 26 26"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
            />
            <circle cx="26" cy="26" r="2.2" fill="currentColor" />
        </svg>
    );
}

export default LeafMark;
