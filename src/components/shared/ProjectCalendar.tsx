'use client'
import { calendarWeeks, type CalendarProject } from './project-calendar'

type Project = CalendarProject & { title: string; status: string }
type Props<T extends Project> = {
  projects: T[]
  month: string
  colors: Record<string, string>
  statuses: Record<string, string>
  onSelect: (project: T) => void
}
export default function ProjectCalendar<T extends Project>({ projects, month, colors, statuses, onSelect }: Props<T>) {
  return <div className="overflow-x-auto" role="region" aria-label="جدول المشاريع الشهري" tabIndex={0}>
    <div className="min-w-[700px] overflow-hidden rounded-xl border border-slate-200" dir="rtl">
      <div className="grid grid-cols-7 bg-slate-100">{['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'].map(day => <div key={day} className="p-3 text-center text-sm font-bold">{day}</div>)}</div>
      {calendarWeeks(projects, month).map((week, index) => <div key={index} className="relative flex min-h-28 flex-col border-t border-slate-200">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid grid-cols-7">{week.days.map((day, column) => <div key={column} className={`border-e border-slate-200 last:border-e-0 ${day === null ? 'bg-slate-50' : 'bg-white'}`} />)}</div>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 grid grid-cols-7">{week.days.map((day, column) => <div key={column} className="h-10 p-2 text-sm text-slate-500">{day?.toLocaleString('ar-EG')}</div>)}</div>
        <div className="relative grid flex-1 auto-rows-[minmax(112px,1fr)] grid-cols-7 gap-y-px">
          {week.segments.map(segment => <button
            key={segment.project.id}
            type="button"
            title={`${segment.project.title} · ${statuses[segment.project.status]} · ${segment.project.start_date} ← ${segment.project.end_date}`}
            aria-label={`${segment.project.title}، ${statuses[segment.project.status]}، من ${segment.project.start_date} إلى ${segment.project.end_date}، تعديل المشروع`}
            onClick={() => onSelect(segment.project)}
            style={{ gridColumn: `${segment.column} / span ${segment.span}`, gridRow: segment.lane + 1 }}
            className={`flex min-w-0 items-center px-4 pb-4 pt-10 text-start text-sm font-bold transition hover:brightness-95 focus-visible:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sky-600 ${colors[segment.project.status]}`}
          ><span className="min-w-0 flex-1 break-words">{segment.project.title}</span></button>)}
        </div>
      </div>)}
    </div>
  </div>
}
