export type CalendarProject = { id: string; start_date: string; end_date: string }
const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86400000

// Place each weekly segment in the first free lane so overlapping projects never cover each other.
export function calendarWeeks<T extends CalendarProject>(projects: T[], month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  const monthStart = dayNumber(`${month}-01`)
  const firstWeekday = new Date(monthStart * 86400000).getUTCDay()
  return Array.from({ length: Math.ceil((firstWeekday + daysInMonth) / 7) }, (_, week) => {
    const firstDay = week * 7 - firstWeekday + 1
    const start = monthStart + Math.max(1, firstDay) - 1
    const end = monthStart + Math.min(daysInMonth, firstDay + 6) - 1
    const laneEnds: number[] = []
    const segments = projects
      .filter(project => dayNumber(project.start_date) <= end && dayNumber(project.end_date) >= start)
      .map(project => ({ project, start: Math.max(start, dayNumber(project.start_date)), end: Math.min(end, dayNumber(project.end_date)) }))
      .sort((a, b) => a.start - b.start || b.end - a.end || a.project.id.localeCompare(b.project.id))
      .map(segment => {
        let lane = laneEnds.findIndex(last => last < segment.start)
        if (lane === -1) lane = laneEnds.length
        laneEnds[lane] = segment.end
        return {
          project: segment.project,
          column: segment.start - monthStart - firstDay + 2,
          span: segment.end - segment.start + 1,
          lane,
          startsHere: segment.start === dayNumber(segment.project.start_date),
          endsHere: segment.end === dayNumber(segment.project.end_date),
        }
      })
    return { days: Array.from({ length: 7 }, (_, column) => { const day = firstDay + column; return day >= 1 && day <= daysInMonth ? day : null }), segments }
  })
}
