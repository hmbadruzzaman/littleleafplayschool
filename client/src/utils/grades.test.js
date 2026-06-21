import {
  DEFAULT_GRADE_SCALE,
  normalizeScale,
  gradeForPercentage,
  gradeBandRangeLabel,
} from './grades';

describe('gradeForPercentage', () => {
  test('maps boundary percentages on the default scale', () => {
    expect(gradeForPercentage(100, DEFAULT_GRADE_SCALE)).toBe('A+');
    expect(gradeForPercentage(90, DEFAULT_GRADE_SCALE)).toBe('A+');
    expect(gradeForPercentage(89, DEFAULT_GRADE_SCALE)).toBe('A');
    expect(gradeForPercentage(40, DEFAULT_GRADE_SCALE)).toBe('D');
    expect(gradeForPercentage(39, DEFAULT_GRADE_SCALE)).toBe('F');
    expect(gradeForPercentage(0, DEFAULT_GRADE_SCALE)).toBe('F');
  });

  test('falls back to the default scale when scale is missing/empty', () => {
    expect(gradeForPercentage(95)).toBe('A+');
    expect(gradeForPercentage(55, null)).toBe('C');
    expect(gradeForPercentage(45, [])).toBe('D');
  });

  test('honours a custom scale', () => {
    const custom = [{ label: 'PASS', min: 33 }, { label: 'FAIL', min: 0 }];
    expect(gradeForPercentage(33, custom)).toBe('PASS');
    expect(gradeForPercentage(32, custom)).toBe('FAIL');
  });

  test('sorts an unsorted scale before evaluating', () => {
    const unsorted = [
      { label: 'F', min: 0 },
      { label: 'A', min: 80 },
      { label: 'B', min: 50 },
    ];
    expect(gradeForPercentage(85, unsorted)).toBe('A');
    expect(gradeForPercentage(50, unsorted)).toBe('B');
    expect(gradeForPercentage(10, unsorted)).toBe('F');
  });
});

describe('gradeBandRangeLabel', () => {
  test('builds ranges from the default scale', () => {
    expect(gradeBandRangeLabel(DEFAULT_GRADE_SCALE, 0)).toBe('90–100%');
    expect(gradeBandRangeLabel(DEFAULT_GRADE_SCALE, 1)).toBe('80–89%');
    expect(gradeBandRangeLabel(DEFAULT_GRADE_SCALE, 6)).toBe('0–39%');
  });
});

describe('normalizeScale', () => {
  test('returns the default scale for junk input', () => {
    expect(normalizeScale(null)).toBe(DEFAULT_GRADE_SCALE);
    expect(normalizeScale([])).toBe(DEFAULT_GRADE_SCALE);
    expect(normalizeScale('nope')).toBe(DEFAULT_GRADE_SCALE);
  });

  test('coerces and sorts a valid scale descending by min', () => {
    const out = normalizeScale([
      { label: 'B', min: '50' },
      { label: 'A', min: 80 },
    ]);
    expect(out).toEqual([
      { label: 'A', min: 80 },
      { label: 'B', min: 50 },
    ]);
  });
});
