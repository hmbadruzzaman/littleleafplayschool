// Global grade scale. Bands are stored high→low by `min`; the letter labels are
// fixed and only each band's `min` percentage is admin-editable. Persisted on
// the SCHOOL_INFO item as `gradeScale`. See
// docs/superpowers/specs/2026-06-20-grade-scale-legend-design.md

export const DEFAULT_GRADE_SCALE = [
  { label: 'A+', min: 90 },
  { label: 'A',  min: 80 },
  { label: 'B+', min: 70 },
  { label: 'B',  min: 60 },
  { label: 'C',  min: 50 },
  { label: 'D',  min: 40 },
  { label: 'F',  min: 0  },
];

// Coerce an arbitrary value into a clean scale sorted high→low by min. Returns
// the shared DEFAULT_GRADE_SCALE (same reference) when given nothing usable.
export function normalizeScale(scale) {
  if (!Array.isArray(scale) || scale.length === 0) return DEFAULT_GRADE_SCALE;
  const cleaned = scale
    .filter((b) => b && typeof b.label === 'string' && Number.isFinite(Number(b.min)))
    .map((b) => ({ label: b.label, min: Number(b.min) }))
    .sort((a, b) => b.min - a.min);
  return cleaned.length ? cleaned : DEFAULT_GRADE_SCALE;
}

// Letter grade for a percentage: the first band (high→low) whose `min` it meets.
export function gradeForPercentage(pct, scale) {
  const bands = normalizeScale(scale);
  const p = Number(pct) || 0;
  const band = bands.find((b) => p >= b.min);
  return band ? band.label : bands[bands.length - 1].label;
}

// Human range for the band at `index` in a high→low scale, e.g. "90–100%",
// "80–89%", "0–39%".
export function gradeBandRangeLabel(scale, index) {
  const bands = normalizeScale(scale);
  const band = bands[index];
  if (!band) return '';
  const upper = index === 0 ? 100 : bands[index - 1].min - 1;
  return `${band.min}–${upper}%`;
}
