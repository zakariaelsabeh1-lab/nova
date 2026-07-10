import { useMemo } from 'react'
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { Kanban as KanbanIcon } from 'lucide-react'
import type { Group, BoardColumn, ItemWithCells, WorkspaceMember, CellValue } from '@/types'
import { getInitials } from '@/lib/utils'
import { EmptyState } from '@/components/ui/EmptyState'

interface Props {
  boardId: string
  groups: Group[]
  columns: BoardColumn[]
  items: ItemWithCells[]
  members: WorkspaceMember[]
  readOnly: boolean
  onSetCell: (itemId: string, columnId: string, value: CellValue, column: BoardColumn, old: CellValue) => void
  onOpenItem: (item: ItemWithCells) => void
}

const NO_STATUS = '__none__'

export function KanbanView({ columns, items, members, readOnly, onSetCell, onOpenItem }: Props) {
  const statusCol = useMemo(() => columns.find((c) => c.type === 'status'), [columns])
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  if (!statusCol) {
    return <EmptyState icon={KanbanIcon} title="No status column" description="Add a Status column in the table view to use the Kanban board." />
  }

  const labels = statusCol.settings.labels ?? {}
  const lanes = [...Object.keys(labels), NO_STATUS]

  const byLane = new Map<string, ItemWithCells[]>()
  for (const l of lanes) byLane.set(l, [])
  for (const it of items) {
    const v = it.cells[statusCol.id]
    const key = typeof v === 'string' && labels[v] ? v : NO_STATUS
    byLane.get(key)!.push(it)
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || readOnly) return
    const itemId = String(active.id)
    const overLane = String(over.data.current?.lane ?? over.id)
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    const current = typeof item.cells[statusCol!.id] === 'string' ? (item.cells[statusCol!.id] as string) : NO_STATUS
    const target = overLane === NO_STATUS ? null : overLane
    if ((current || NO_STATUS) !== overLane) {
      onSetCell(itemId, statusCol!.id, target, statusCol!, item.cells[statusCol!.id] ?? null)
    }
  }

  return (
    <div className="h-full overflow-x-auto [-webkit-overflow-scrolling:touch]">
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
        <div className="flex gap-4 h-full px-4 md:px-6 py-5 min-w-max">
          {lanes.map((lane) => {
            const color = lane === NO_STATUS ? '#cbd5e1' : (labels[lane] as string)
            const laneItems = byLane.get(lane) ?? []
            return (
              <Lane key={lane} lane={lane} color={color} count={laneItems.length}>
                <SortableContext items={laneItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  {laneItems.map((item) => (
                    <KanbanCard key={item.id} item={item} columns={columns} members={members} readOnly={readOnly} onOpen={() => onOpenItem(item)} />
                  ))}
                </SortableContext>
              </Lane>
            )
          })}
        </div>
      </DndContext>
    </div>
  )
}

function Lane({ lane, color, count, children }: { lane: string; color: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: lane, data: { lane } })
  return (
    <div className="flex flex-col w-[280px] flex-shrink-0">
      <div className="flex items-center gap-2 mb-3 px-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        <span className="text-[13px] font-bold text-[#0f172a]">{lane === NO_STATUS ? 'No status' : lane}</span>
        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: color + '22', color }}>{count}</span>
      </div>
      <div
        ref={setNodeRef}
        className="flex-1 rounded-2xl p-2 space-y-2 transition-colors min-h-[120px]"
        style={{ background: isOver ? color + '12' : 'rgba(15,23,42,0.03)', outline: isOver ? `2px solid ${color}44` : 'none' }}
      >
        {children}
      </div>
    </div>
  )
}

function KanbanCard({ item, columns, members, readOnly, onOpen }: { item: ItemWithCells; columns: BoardColumn[]; members: WorkspaceMember[]; readOnly: boolean; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: readOnly })
  const personCol = columns.find((c) => c.type === 'person')
  const dateCol = columns.find((c) => c.type === 'date')
  const priorityCol = columns.find((c) => c.type === 'priority')
  const uid = personCol ? item.cells[personCol.id] : null
  const member = members.find((m) => m.user_id === uid)
  const due = dateCol ? item.cells[dateCol.id] : null
  const priority = priorityCol ? item.cells[priorityCol.id] : null

  return (
    <motion.div
      ref={setNodeRef}
      layout
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className="bg-white rounded-xl p-3 border border-[#e2e8f0] cursor-pointer hover:shadow-md hover:border-[#cbd5e1] transition-all"
    >
      <p className="text-[13px] font-semibold text-[#0f172a] leading-snug mb-2">{item.name || 'Untitled'}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {priority && typeof priority === 'string' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f1f5f9] text-[#64748b] capitalize">{priority}</span>
          )}
          {due && typeof due === 'string' && (
            <span className="text-[10px] font-semibold text-[#94a3b8]">{new Date(due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          )}
        </div>
        {member?.profile && (
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)' }}>
            {getInitials(member.profile.full_name || member.profile.email)}
          </div>
        )}
      </div>
    </motion.div>
  )
}
