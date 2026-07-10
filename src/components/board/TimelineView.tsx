import { useMemo } from 'react'
import { differenceInCalendarDays, format, parseISO, min, max, addDays, isValid } from 'date-fns'
import { GanttChartSquare } from 'lucide-react'
import type { Group, BoardColumn, ItemWithCells } from '@/types'
import { EmptyState } from '@/components/ui/EmptyState'

// Gantt-style timeline. Uses a timeline column if present, else a date column
// (rendered as a single-day marker bar).
export function TimelineView({
  columns,
  items,
  groups,
  onOpenItem,
}: {
  columns: BoardColumn[]
  items: ItemWithCells[]
  groups: Group[]
  onOpenItem: (item: ItemWithCells) => void
}) {
  const timelineCol = columns.find((c) => c.type === 'timeline')
  const dateCol = columns.find((c) => c.type === 'date')
  const statusCol = columns.find((c) => c.type === 'status')
  const labels = statusCol?.settings.labels ?? {}

  const rows = useMemo(() => {
    const out: { item: ItemWithCells; from: Date; to: Date }[] = []
    for (const it of items) {
      let from: Date | null = null
      let to: Date | null = null
      if (timelineCol) {
        const v = it.cells[timelineCol.id]
        if (v && typeof v === 'object') {
          const r = v as { from: string; to: string }
          if (r.from) from = parseISO(r.from)
          if (r.to) to = parseISO(r.to)
        }
      }
      if ((!from || !to) && dateCol) {
        const v = it.cells[dateCol.id]
        if (typeof v === 'string' && v) {
          from = from ?? parseISO(v)
          to = to ?? parseISO(v)
        }
      }
      if (from && to && isValid(from) && isValid(to)) out.push({ item: it, from, to })
    }
    return out
  }, [items, timelineCol, dateCol])

  if (rows.length === 0) {
    return <EmptyState icon={GanttChartSquare} title="Nothing to plot" description="Add a Timeline or Date column with values to see the Gantt chart." />
  }

  const rangeStart = min(rows.map((r) => r.from))
  const rangeEnd = max(rows.map((r) => r.to))
  const paddedStart = addDays(rangeStart, -2)
  const paddedEnd = addDays(rangeEnd, 2)
  const totalDays = Math.max(1, differenceInCalendarDays(paddedEnd, paddedStart))
  const dayW = Math.max(18, Math.min(48, 900 / totalDays))
  const today = new Date()
  const todayOffset = differenceInCalendarDays(today, paddedStart)

  const groupName = (id: string) => groups.find((g) => g.id === id)?.name ?? ''

  return (
    <div className="h-full overflow-auto p-4 md:p-6">
      <div className="inline-block min-w-full">
        {/* month/day header */}
        <div className="flex sticky top-0 z-10" style={{ marginLeft: 220 }}>
          {Array.from({ length: totalDays + 1 }).map((_, i) => {
            const day = addDays(paddedStart, i)
            const isFirst = day.getDate() === 1 || i === 0
            return (
              <div key={i} className="flex-shrink-0 text-center border-l border-[#f1f5f9]" style={{ width: dayW }}>
                {isFirst && <div className="text-[10px] font-bold text-[#64748b] py-0.5">{format(day, 'MMM')}</div>}
                <div className="text-[9px] text-[#94a3b8]">{format(day, 'd')}</div>
              </div>
            )
          })}
        </div>

        {/* rows */}
        <div className="relative">
          {/* today marker */}
          {todayOffset >= 0 && todayOffset <= totalDays && (
            <div className="absolute top-0 bottom-0 w-px bg-[#ef4444] z-[5]" style={{ left: 220 + todayOffset * dayW }}>
              <div className="w-2 h-2 rounded-full bg-[#ef4444] -ml-1" />
            </div>
          )}
          {rows.map(({ item, from, to }) => {
            const offset = differenceInCalendarDays(from, paddedStart)
            const span = Math.max(1, differenceInCalendarDays(to, from) + 1)
            const status = statusCol ? item.cells[statusCol.id] : null
            const color = typeof status === 'string' ? ((labels[status] as string) || '#0ea5e9') : '#0ea5e9'
            return (
              <div key={item.id} className="flex items-center h-10 border-b border-[#f1f5f9]">
                <div className="w-[220px] flex-shrink-0 pr-3 flex items-center gap-2 overflow-hidden">
                  <span className="text-[12px] font-semibold text-[#0f172a] truncate">{item.name || 'Untitled'}</span>
                  <span className="text-[10px] text-[#cbd5e1] flex-shrink-0">{groupName(item.group_id)}</span>
                </div>
                <div className="relative flex-1 h-full">
                  <button
                    onClick={() => onOpenItem(item)}
                    className="absolute top-1/2 -translate-y-1/2 h-6 rounded-full flex items-center px-2 text-[10px] font-semibold text-white truncate hover:brightness-110"
                    style={{ left: offset * dayW, width: span * dayW, background: color }}
                    title={`${format(from, 'MMM d')} – ${format(to, 'MMM d')}`}
                  >
                    {span * dayW > 60 ? `${format(from, 'MMM d')} – ${format(to, 'MMM d')}` : ''}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
