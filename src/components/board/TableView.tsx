import { useMemo, useState, useRef, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown, ChevronRight, Plus, GripVertical, Trash2, MoreHorizontal, X,
} from 'lucide-react'
import type { Group, BoardColumn, ItemWithCells, WorkspaceMember, CellValue, ColumnType } from '@/types'
import { Cell } from './cells'
import { AddColumnMenu, ColumnHeaderMenu } from './ColumnMenus'

interface TableViewProps {
  boardId: string
  groups: Group[]
  columns: BoardColumn[]
  items: ItemWithCells[]
  members: WorkspaceMember[]
  readOnly: boolean
  onSetCell: (itemId: string, columnId: string, value: CellValue, column: BoardColumn, old: CellValue) => void
  onCreateItem: (groupId: string, name: string) => void
  onUpdateItem: (id: string, name: string) => void
  onDeleteItem: (id: string) => void
  onMoveItems: (updates: { id: string; group_id: string; position: number }[]) => void
  onCreateGroup: () => void
  onUpdateGroup: (id: string, patch: Partial<Group>) => void
  onDeleteGroup: (id: string) => void
  onReorderGroups: (updates: { id: string; position: number }[]) => void
  onCreateColumn: (name: string, type: ColumnType) => void
  onUpdateColumn: (id: string, patch: Partial<BoardColumn>) => void
  onDeleteColumn: (id: string) => void
  onReorderColumns: (updates: { id: string; position: number }[]) => void
  onOpenItem: (item: ItemWithCells) => void
}

const NAME_W = 260
const HANDLE_W = 34

export function TableView(props: TableViewProps) {
  const { groups, columns, items, readOnly } = props

  // Local ordering state so drag feels instant; resynced from props when idle.
  const [order, setOrder] = useState<ItemWithCells[]>(items)
  const [activeId, setActiveId] = useState<string | null>(null)
  const dragging = useRef(false)
  useEffect(() => {
    if (!dragging.current) setOrder(items)
  }, [items])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const itemsByGroup = useMemo(() => {
    const map = new Map<string, ItemWithCells[]>()
    for (const g of groups) map.set(g.id, [])
    for (const it of order) {
      const arr = map.get(it.group_id)
      if (arr) arr.push(it)
    }
    return map
  }, [order, groups])

  const activeItem = order.find((i) => i.id === activeId) ?? null

  function findGroupOfItem(id: string): string | null {
    return order.find((i) => i.id === id)?.group_id ?? null
  }

  function onDragStart(e: DragStartEvent) {
    if (e.active.data.current?.type === 'item') {
      dragging.current = true
      setActiveId(String(e.active.id))
    }
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e
    if (!over || active.data.current?.type !== 'item') return
    const activeIdStr = String(active.id)
    const overId = String(over.id)
    const activeGroup = findGroupOfItem(activeIdStr)
    // over can be an item or a group droppable
    const overGroup = over.data.current?.type === 'group' ? overId : findGroupOfItem(overId)
    if (!activeGroup || !overGroup || activeGroup === overGroup) return

    setOrder((prev) => {
      const moving = prev.find((i) => i.id === activeIdStr)
      if (!moving) return prev
      const without = prev.filter((i) => i.id !== activeIdStr)
      const overIdx = without.findIndex((i) => i.id === overId)
      const insertAt = overIdx === -1 ? without.length : overIdx
      const next = [...without]
      next.splice(insertAt, 0, { ...moving, group_id: overGroup })
      return next
    })
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    dragging.current = false
    setActiveId(null)
    if (!over) return

    if (active.data.current?.type === 'group') {
      const oldIdx = groups.findIndex((g) => g.id === active.id)
      const newIdx = groups.findIndex((g) => g.id === over.id)
      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        const reordered = arrayMove(groups, oldIdx, newIdx)
        props.onReorderGroups(reordered.map((g, i) => ({ id: g.id, position: i })))
      }
      return
    }

    // item drop — reindex within its (possibly new) group
    const activeIdStr = String(active.id)
    const overId = String(over.id)
    const group = findGroupOfItem(activeIdStr)
    if (!group) return
    let next = order
    const overGroup = over.data.current?.type === 'group' ? overId : findGroupOfItem(overId)
    if (overGroup === group && overId !== activeIdStr) {
      const groupItems = order.filter((i) => i.group_id === group)
      const oldIdx = groupItems.findIndex((i) => i.id === activeIdStr)
      const newIdx = groupItems.findIndex((i) => i.id === overId)
      if (oldIdx !== -1 && newIdx !== -1) {
        const moved = arrayMove(groupItems, oldIdx, newIdx)
        const others = order.filter((i) => i.group_id !== group)
        next = [...others, ...moved]
        setOrder(next)
      }
    }
    // recompute positions for every group touched by this drag
    const touched = new Set<string>([group])
    const src = order.find((i) => i.id === activeIdStr)?.group_id
    if (src) touched.add(src)
    const updates: { id: string; group_id: string; position: number }[] = []
    for (const gid of touched) {
      next.filter((i) => i.group_id === gid).forEach((i, idx) => updates.push({ id: i.id, group_id: gid, position: idx }))
    }
    props.onMoveItems(updates)
  }

  const sortedCols = [...columns].sort((a, b) => a.position - b.position)
  const gridTemplate = `${HANDLE_W}px ${NAME_W}px ${sortedCols.map((c) => `${c.width}px`).join(' ')} ${HANDLE_W}px`

  return (
    <div className="h-full overflow-auto [-webkit-overflow-scrolling:touch] pb-24">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={groups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
          <div className="px-4 md:px-6 py-4 space-y-5 min-w-max">
            {groups.map((group) => (
              <GroupBlock
                key={group.id}
                {...props}
                group={group}
                columns={sortedCols}
                items={itemsByGroup.get(group.id) ?? []}
                gridTemplate={gridTemplate}
              />
            ))}
            {!readOnly && (
              <button
                onClick={props.onCreateGroup}
                className="flex items-center gap-2 px-3 py-2 text-[13px] font-semibold text-[#64748b] hover:text-[#0f172a] rounded-xl hover:bg-white transition-colors"
              >
                <Plus className="w-4 h-4" /> Add group
              </button>
            )}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeItem ? (
            <div className="bg-white rounded-lg shadow-2xl border border-[#0ea5e9]/40 px-4 py-2.5 text-[13px] font-semibold text-[#0f172a]">
              {activeItem.name || 'Untitled item'}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

// ── Group block ─────────────────────────────────────────────────────────────
function GroupBlock(
  props: TableViewProps & { group: Group; columns: BoardColumn[]; items: ItemWithCells[]; gridTemplate: string }
) {
  const { group, columns, items, readOnly, gridTemplate } = props
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.id,
    data: { type: 'group' },
    disabled: readOnly,
  })
  const [collapsed, setCollapsed] = useState(group.collapsed)
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(group.name)
  const [menuOpen, setMenuOpen] = useState(false)
  const [newItem, setNewItem] = useState('')

  useEffect(() => setName(group.name), [group.name])

  const numberCols = columns.filter((c) => c.type === 'number' && c.settings.showSum)

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="rounded-xl overflow-hidden"
    >
      {/* Group header */}
      <div className="flex items-center gap-1.5 mb-1.5">
        {!readOnly && (
          <button {...attributes} {...listeners} className="p-1 text-[#cbd5e1] hover:text-[#94a3b8] cursor-grab active:cursor-grabbing">
            <GripVertical className="w-4 h-4" />
          </button>
        )}
        <button onClick={() => setCollapsed((c) => !c)} className="p-0.5" style={{ color: group.color }}>
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {editingName && !readOnly ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => { setEditingName(false); if (name !== group.name) props.onUpdateGroup(group.id, { name }) }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setName(group.name); setEditingName(false) } }}
            className="text-[15px] font-bold outline-none bg-white ring-2 ring-[#0ea5e9]/40 rounded px-1.5"
            style={{ color: group.color }}
          />
        ) : (
          <button onClick={() => !readOnly && setEditingName(true)} className="text-[15px] font-bold px-1" style={{ color: group.color }}>
            {group.name}
          </button>
        )}
        <span className="text-[12px] text-[#94a3b8] font-medium">{items.length}</span>
        {!readOnly && (
          <div className="relative ml-1">
            <button onClick={() => setMenuOpen((o) => !o)} className="p-1 text-[#cbd5e1] hover:text-[#64748b] rounded">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute left-0 top-7 z-20 w-44 bg-white rounded-xl shadow-xl border border-[#e2e8f0] p-1.5">
                  <p className="px-2 py-1 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Group color</p>
                  <div className="flex flex-wrap gap-1.5 px-2 py-1.5">
                    {['#0ea5e9', '#8b5cf6', '#f59e0b', '#22c55e', '#ef4444', '#ec4899', '#64748b'].map((c) => (
                      <button key={c} onClick={() => { props.onUpdateGroup(group.id, { color: c }); setMenuOpen(false) }} className="w-5 h-5 rounded-full" style={{ background: c }} />
                    ))}
                  </div>
                  <button
                    onClick={() => { props.onDeleteGroup(group.id); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] text-[#ef4444] hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete group
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="rounded-lg overflow-hidden border border-[#e8edf3]" style={{ borderLeft: `3px solid ${group.color}` }}>
              {/* Column header */}
              <ColumnHeaderRow {...props} gridTemplate={gridTemplate} />

              {/* Item rows */}
              <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <GroupDroppable groupId={group.id}>
                  {items.map((item) => (
                    <ItemRow key={item.id} {...props} item={item} gridTemplate={gridTemplate} />
                  ))}
                </GroupDroppable>
              </SortableContext>

              {/* Sum row */}
              {numberCols.length > 0 && items.length > 0 && (
                <div className="grid items-center bg-[#f8fafc] border-t border-[#e8edf3] text-[12px]" style={{ gridTemplateColumns: gridTemplate }}>
                  <div />
                  <div className="px-3 text-[#94a3b8] font-semibold">Sum</div>
                  {columns.map((c) => (
                    <div key={c.id} className="px-3 text-right font-bold text-[#0f172a] tabular-nums h-9 flex items-center justify-end">
                      {c.type === 'number' && c.settings.showSum
                        ? `${c.settings.unit ?? ''}${items.reduce((s, it) => s + (Number(it.cells[c.id]) || 0), 0)}`
                        : ''}
                    </div>
                  ))}
                  <div />
                </div>
              )}

              {/* Add item */}
              {!readOnly && (
                <div className="grid items-center border-t border-[#e8edf3]" style={{ gridTemplateColumns: gridTemplate }}>
                  <div />
                  <div className="col-span-full px-3 py-1.5">
                    <input
                      value={newItem}
                      onChange={(e) => setNewItem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newItem.trim()) { props.onCreateItem(group.id, newItem.trim()); setNewItem('') }
                      }}
                      placeholder="+ Add item"
                      className="w-full text-[13px] text-[#0f172a] placeholder-[#94a3b8] outline-none bg-transparent py-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function GroupDroppable({ groupId, children }: { groupId: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: groupId, data: { type: 'group' } })
  return (
    <div ref={setNodeRef} className="min-h-[8px]">
      {children}
    </div>
  )
}

// ── Column header (sortable + resizable) ────────────────────────────────────
function ColumnHeaderRow(props: TableViewProps & { columns: BoardColumn[]; gridTemplate: string }) {
  const { columns, readOnly, gridTemplate } = props
  return (
    <div className="grid items-stretch bg-[#f8fafc] border-b border-[#e8edf3] h-9" style={{ gridTemplateColumns: gridTemplate }}>
      <div />
      <div className="px-3 flex items-center text-[11px] font-bold text-[#64748b] uppercase tracking-wider">Item</div>
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={(e) => {
          const { active, over } = e
          if (!over || active.id === over.id) return
          const oldIdx = columns.findIndex((c) => c.id === active.id)
          const newIdx = columns.findIndex((c) => c.id === over.id)
          if (oldIdx === -1 || newIdx === -1) return
          const reordered = arrayMove(columns, oldIdx, newIdx)
          props.onReorderColumns(reordered.map((c, i) => ({ id: c.id, position: i })))
        }}
      >
        <SortableContext items={columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
          {columns.map((col) => (
            <ColumnHeaderCell key={col.id} column={col} readOnly={readOnly} onUpdate={props.onUpdateColumn} onDelete={props.onDeleteColumn} />
          ))}
        </SortableContext>
      </DndContext>
      {!readOnly ? (
        <AddColumnMenu onAdd={props.onCreateColumn} />
      ) : (
        <div />
      )}
    </div>
  )
}

function ColumnHeaderCell({
  column,
  readOnly,
  onUpdate,
  onDelete,
}: {
  column: BoardColumn
  readOnly: boolean
  onUpdate: (id: string, patch: Partial<BoardColumn>) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    disabled: readOnly,
  })
  const resizing = useRef<{ startX: number; startW: number } | null>(null)

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="relative flex items-center px-2 border-l border-[#e8edf3] group/col"
    >
      <span
        {...attributes}
        {...listeners}
        className="flex-1 text-[11px] font-bold text-[#64748b] uppercase tracking-wider truncate cursor-grab active:cursor-grabbing"
      >
        {column.name}
      </span>
      {!readOnly && <ColumnHeaderMenu column={column} onUpdate={onUpdate} onDelete={onDelete} />}
      {!readOnly && (
        <div
          onPointerDown={(e) => {
            resizing.current = { startX: e.clientX, startW: column.width }
            const move = (ev: PointerEvent) => {
              if (!resizing.current) return
              const w = Math.max(80, resizing.current.startW + (ev.clientX - resizing.current.startX))
              onUpdate(column.id, { width: Math.round(w) })
            }
            const up = () => {
              resizing.current = null
              document.removeEventListener('pointermove', move)
              document.removeEventListener('pointerup', up)
            }
            document.addEventListener('pointermove', move)
            document.addEventListener('pointerup', up)
          }}
          className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize opacity-0 group-hover/col:opacity-100 hover:bg-[#0ea5e9]/40"
        />
      )}
    </div>
  )
}

// ── Item row ────────────────────────────────────────────────────────────────
function ItemRow(props: TableViewProps & { item: ItemWithCells; columns: BoardColumn[]; gridTemplate: string }) {
  const { item, columns, members, readOnly, gridTemplate } = props
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: 'item' },
    disabled: readOnly,
  })
  const [name, setName] = useState(item.name)
  const [editingName, setEditingName] = useState(false)
  useEffect(() => setName(item.name), [item.name])

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, gridTemplateColumns: gridTemplate }}
      className="grid items-stretch bg-white border-b border-[#f1f5f9] last:border-0 hover:bg-[#fafcff] group/row h-11"
    >
      {/* drag handle */}
      <div className="flex items-center justify-center">
        {!readOnly && (
          <button {...attributes} {...listeners} className="p-1 text-transparent group-hover/row:text-[#cbd5e1] hover:!text-[#94a3b8] cursor-grab active:cursor-grabbing">
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {/* name (sticky-ish first col) */}
      <div className="flex items-center px-3 gap-2 border-l border-[#f1f5f9]">
        {editingName && !readOnly ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => { setEditingName(false); if (name !== item.name) props.onUpdateItem(item.id, name) }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setName(item.name); setEditingName(false) } }}
            className="flex-1 text-[13px] font-medium text-[#0f172a] outline-none bg-white ring-2 ring-[#0ea5e9]/40 rounded px-1"
          />
        ) : (
          <button onClick={() => !readOnly && setEditingName(true)} className="flex-1 text-left text-[13px] font-medium text-[#0f172a] truncate">
            {item.name || <span className="text-[#cbd5e1]">Untitled</span>}
          </button>
        )}
        <button
          onClick={() => props.onOpenItem(item)}
          className="opacity-0 group-hover/row:opacity-100 text-[11px] font-semibold text-[#0ea5e9] px-1.5 py-0.5 rounded hover:bg-[#0ea5e9]/10 transition-opacity flex-shrink-0"
        >
          Open
        </button>
      </div>
      {/* cells */}
      {columns.map((col) => (
        <div key={col.id} className="border-l border-[#f1f5f9] overflow-hidden">
          <Cell
            column={col}
            item={item}
            members={members}
            value={item.cells[col.id] ?? null}
            readOnly={readOnly}
            onChange={(v) => props.onSetCell(item.id, col.id, v, col, item.cells[col.id] ?? null)}
          />
        </div>
      ))}
      {/* trailing delete */}
      <div className="flex items-center justify-center border-l border-[#f1f5f9]">
        {!readOnly && (
          <button onClick={() => props.onDeleteItem(item.id)} className="p-1 text-transparent group-hover/row:text-[#cbd5e1] hover:!text-[#ef4444]">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
