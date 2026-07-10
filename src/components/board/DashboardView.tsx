import { useMemo } from 'react'
import { PieChart, Pie, Cell as RCell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { isBefore, parseISO, startOfToday } from 'date-fns'
import { AlertCircle } from 'lucide-react'
import type { BoardColumn, ItemWithCells, WorkspaceMember } from '@/types'
import { getInitials } from '@/lib/utils'

export function DashboardView({
  columns,
  items,
  members,
}: {
  columns: BoardColumn[]
  items: ItemWithCells[]
  members: WorkspaceMember[]
}) {
  const statusCol = columns.find((c) => c.type === 'status')
  const personCol = columns.find((c) => c.type === 'person')
  const dateCol = columns.find((c) => c.type === 'date')
  const numberCols = columns.filter((c) => c.type === 'number')

  const statusData = useMemo(() => {
    if (!statusCol) return []
    const labels = statusCol.settings.labels ?? {}
    const counts = new Map<string, number>()
    for (const it of items) {
      const v = it.cells[statusCol.id]
      const key = typeof v === 'string' && labels[v] ? v : 'No status'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value, color: (labels[name] as string) ?? '#cbd5e1' }))
  }, [items, statusCol])

  const workloadData = useMemo(() => {
    if (!personCol) return []
    const counts = new Map<string, number>()
    for (const it of items) {
      const v = it.cells[personCol.id]
      const uid = typeof v === 'string' ? v : 'unassigned'
      counts.set(uid, (counts.get(uid) ?? 0) + 1)
    }
    return Array.from(counts.entries()).map(([uid, value]) => {
      const m = members.find((mm) => mm.user_id === uid)
      return { name: m?.profile?.full_name?.split(' ')[0] ?? 'Unassigned', value }
    })
  }, [items, personCol, members])

  const overdue = useMemo(() => {
    if (!dateCol) return []
    return items.filter((it) => {
      const v = it.cells[dateCol.id]
      return typeof v === 'string' && v && isBefore(parseISO(v), startOfToday())
    })
  }, [items, dateCol])

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-[1100px] mx-auto">
        {/* Status donut */}
        <Widget title="Status breakdown">
          {statusData.length ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2}>
                    {statusData.map((d) => (
                      <RCell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 flex-1">
                {statusData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-[12px]">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="text-[#64748b] flex-1">{d.name}</span>
                    <span className="font-bold text-[#0f172a]">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Empty />
          )}
        </Widget>

        {/* Workload */}
        <Widget title="Workload by person">
          {workloadData.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={workloadData}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={24} />
                <Tooltip cursor={{ fill: 'rgba(14,165,233,0.06)' }} />
                <Bar dataKey="value" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </Widget>

        {/* Numbers rollup */}
        <Widget title="Totals">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Items" value={items.length} />
            {numberCols.map((c) => (
              <Stat
                key={c.id}
                label={c.name}
                value={`${c.settings.unit ?? ''}${items.reduce((s, it) => s + (Number(it.cells[c.id]) || 0), 0)}`}
              />
            ))}
          </div>
        </Widget>

        {/* Overdue list */}
        <Widget title={`Overdue (${overdue.length})`}>
          {overdue.length ? (
            <div className="space-y-2 max-h-[180px] overflow-y-auto">
              {overdue.map((it) => {
                const v = dateCol ? it.cells[dateCol.id] : null
                const uid = personCol ? it.cells[personCol.id] : null
                const m = members.find((mm) => mm.user_id === uid)
                return (
                  <div key={it.id} className="flex items-center gap-2 p-2 rounded-lg bg-red-50">
                    <AlertCircle className="w-3.5 h-3.5 text-[#ef4444] flex-shrink-0" />
                    <span className="text-[12px] font-medium text-[#0f172a] flex-1 truncate">{it.name || 'Untitled'}</span>
                    {typeof v === 'string' && <span className="text-[11px] text-[#ef4444] font-semibold">{new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                    {m?.profile && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold" style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)' }}>
                        {getInitials(m.profile.full_name || m.profile.email)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-[13px] text-[#94a3b8] py-6 text-center">Nothing overdue 🎉</div>
          )}
        </Widget>
      </div>
    </div>
  )
}

function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5 shadow-sm">
      <h3 className="text-[14px] font-bold text-[#0f172a] mb-4">{title}</h3>
      {children}
    </div>
  )
}
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-[#f8fafc] p-3">
      <div className="text-[22px] font-black text-[#0f172a] tabular-nums leading-none">{value}</div>
      <div className="text-[12px] text-[#94a3b8] mt-1 truncate">{label}</div>
    </div>
  )
}
function Empty() {
  return <div className="text-[13px] text-[#94a3b8] py-6 text-center">No data yet</div>
}
