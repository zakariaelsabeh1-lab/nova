import { useMemo, useState } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isSameDay, addMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import type { BoardColumn, ItemWithCells } from '@/types'
import { EmptyState } from '@/components/ui/EmptyState'

export function CalendarView({
  columns,
  items,
  onOpenItem,
}: {
  columns: BoardColumn[]
  items: ItemWithCells[]
  onOpenItem: (item: ItemWithCells) => void
}) {
  const dateCol = columns.find((c) => c.type === 'date')
  const statusCol = columns.find((c) => c.type === 'status')
  const [cursor, setCursor] = useState(new Date())

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [cursor])

  const itemsByDay = useMemo(() => {
    const map = new Map<string, ItemWithCells[]>()
    if (!dateCol) return map
    for (const it of items) {
      const v = it.cells[dateCol.id]
      if (typeof v !== 'string' || !v) continue
      const key = v.slice(0, 10)
      const arr = map.get(key) ?? []
      arr.push(it)
      map.set(key, arr)
    }
    return map
  }, [items, dateCol])

  if (!dateCol) {
    return <EmptyState icon={CalendarDays} title="No date column" description="Add a Date column to see items on the calendar." />
  }

  const labels = statusCol?.settings.labels ?? {}

  return (
    <div className="h-full flex flex-col p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[18px] font-bold text-[#0f172a]">{format(cursor, 'MMMM yyyy')}</h2>
        <div className="flex items-center gap-1">
          <button onClick={() => setCursor((c) => addMonths(c, -1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-[#64748b]">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setCursor(new Date())} className="px-3 h-8 text-[12px] font-semibold rounded-lg hover:bg-white text-[#64748b]">Today</button>
          <button onClick={() => setCursor((c) => addMonths(c, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-[#64748b]">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-[#e2e8f0] rounded-t-xl overflow-hidden">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="bg-white py-2 text-center text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">{d}</div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-px bg-[#e2e8f0] rounded-b-xl overflow-hidden">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayItems = itemsByDay.get(key) ?? []
          const today = isSameDay(day, new Date())
          return (
            <div key={key} className="bg-white p-1.5 overflow-hidden flex flex-col" style={{ opacity: isSameMonth(day, cursor) ? 1 : 0.4 }}>
              <span
                className="text-[11px] font-semibold mb-1 w-5 h-5 flex items-center justify-center rounded-full"
                style={today ? { background: '#0ea5e9', color: '#fff' } : { color: '#64748b' }}
              >
                {format(day, 'd')}
              </span>
              <div className="space-y-1 overflow-y-auto [scrollbar-width:none]">
                {dayItems.slice(0, 3).map((it) => {
                  const status = statusCol ? it.cells[statusCol.id] : null
                  const color = typeof status === 'string' ? (labels[status] as string) : '#0ea5e9'
                  return (
                    <button
                      key={it.id}
                      onClick={() => onOpenItem(it)}
                      className="w-full text-left text-[11px] font-medium text-white px-1.5 py-0.5 rounded truncate"
                      style={{ background: color || '#0ea5e9' }}
                    >
                      {it.name || 'Untitled'}
                    </button>
                  )
                })}
                {dayItems.length > 3 && <span className="text-[10px] text-[#94a3b8] px-1">+{dayItems.length - 3} more</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
