const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const moduleUnderTest = { exports: {} }
new Function('module', 'exports', ts.transpileModule(fs.readFileSync('src/components/shared/project-calendar.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(moduleUnderTest, moduleUnderTest.exports)
const { calendarWeeks } = moduleUnderTest.exports
const project = (id, start_date, end_date) => ({ id, start_date, end_date })
const weeks = calendarWeeks([
  project('long', '2026-10-15', '2026-10-30'),
  project('overlap', '2026-10-16', '2026-10-19'),
  project('one-day', '2026-10-18', '2026-10-18'),
  project('across-month', '2026-09-29', '2026-11-04'),
  project('outside', '2026-11-01', '2026-11-02'),
], '2026-10')
assert.equal(weeks.flatMap(w => w.days).filter(Boolean).length, 31)
const longSegments = weeks.flatMap(w => w.segments).filter(s => s.project.id === 'long')
assert.deepEqual(longSegments.map(s => [s.column, s.span]), [[5,3],[1,7],[1,6]])
assert.equal(longSegments[0].startsHere, true)
assert.equal(longSegments[1].startsHere, false)
assert.equal(longSegments[2].endsHere, true)
assert.equal(longSegments.reduce((total, s) => total + s.span, 0), 16)
for (const week of weeks) {
  const occupied = new Set()
  for (const segment of week.segments) {
    assert.ok(segment.column >= 1 && segment.column + segment.span <= 8)
    assert.notEqual(segment.project.id, 'outside')
    for (let col = segment.column; col < segment.column + segment.span; col++) {
      assert.notEqual(week.days[col - 1], null)
      const cell = `${segment.lane}:${col}`
      assert.ok(!occupied.has(cell), 'Overlapping bars must use separate lanes')
      occupied.add(cell)
    }
    if (segment.project.id === 'across-month') {
      assert.equal(segment.startsHere, false)
      assert.equal(segment.endsHere, false)
    }
  }
}
const oneDay = weeks.flatMap(w => w.segments).find(s => s.project.id === 'one-day')
assert.equal(oneDay.span, 1)
assert.ok(oneDay.startsHere && oneDay.endsHere)
assert.equal(calendarWeeks([], '2024-02').flatMap(w => w.days).filter(Boolean).length, 29)
assert.equal(calendarWeeks([], '2026-02').length, 4)
assert.equal(calendarWeeks([], '2026-05').length, 6)
const reuse = calendarWeeks([project('a', '2026-10-04','2026-10-05'),project('b','2026-10-06','2026-10-08')], '2026-10')[1]
assert.equal(reuse.segments[0].lane, reuse.segments[1].lane)
console.log('Calendar tests passed: connected weekly spans, overlaps, lane reuse, month clipping, one-day projects, leap years, and four/six-week months.')
