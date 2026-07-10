import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { List, Kanban, Calendar, GanttChartSquare, PieChart, Star, Search, Lock } from 'lucide-react'
import { useBoard } from '@/lib/db/boards'
import { useFavorites, useToggleFavorite } from '@/lib/db/boards'
import {
  useBoardData, useSetCell, useCreateItem, useUpdateItem, useDeleteItem, useReorderItems,
  useCreateGroup, useUpdateGroup, useDeleteGroup, useReorderGroups,
  useCreateColumn, useUpdateColumn, useDeleteColumn, useReorderColumns,
} from '@/lib/db/board-data'
import { useMembers, useMyRole, usePlan } from '@/lib/db/workspaces'
import { useAutomations, runAutomationsForStatusChange } from '@/lib/db/automations'
import { useCurrentWorkspaceId } from '@/lib/db/workspaces'
import { supabase } from '@/lib/supabase'
import { TableView } from '@/components/board/TableView'
import { KanbanView } from '@/components/board/KanbanView'
import { CalendarView } from '@/components/board/CalendarView'
import { TimelineView } from '@/components/board/TimelineView'
import { DashboardView } from '@/components/board/DashboardView'
import { ItemPanel } from '@/components/board/ItemPanel'
import { Gate } from '@/components/premium/Gate'
import { notifyError, errorMessage } from '@/lib/toast'
import type { ItemWithCells, BoardColumn, CellValue, ColumnType, Group } from '@/types'

type ViewId = 'table' | 'kanban' | 'calendar' | 'timeline' | 'dashboard'
const VIEWS: { id: ViewId; label: string; icon: typeof List; pro?: boolean }[] = [
  { id: 'table', label: 'Table', icon: List },
  { id: 'kanban', label: 'Kanban', icon: Kanban },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'timeline', label: 'Timeline', icon: GanttChartSquare, pro: true },
  { id: 'dashboard', label: 'Dashboard', icon: PieChart, pro: true },
]

export function BoardView() {
  const { boardId = '' } = useParams()
  const workspaceId = useCurrentWorkspaceId()
  const { data: board } = useBoard(boardId)
  const { groups, columns, items, isLoading } = useBoardData(boardId)
  const { data: members = [] } = useMembers(workspaceId)
  const role = useMyRole(workspaceId)
  const { plan } = usePlan(workspaceId)
  const readOnly = role === 'viewer'

  const { data: favorites } = useFavorites()
  const toggleFav = useToggleFavorite()
  const { data: automations = [] } = useAutomations(boardId)

  const [view, setView] = useState<ViewId>('table')
  const [search, setSearch] = useState('')
  const [openItem, setOpenItem] = useState<ItemWithCells | null>(null)

  // mutations
  const setCell = useSetCell(boardId)
  const createItem = useCreateItem(boardId)
  const updateItem = useUpdateItem(boardId)
  const deleteItem = useDeleteItem(boardId)
  const reorderItems = useReorderItems(boardId)
  const createGroup = useCreateGroup(boardId)
  const updateGroup = useUpdateGroup(boardId)
  const deleteGroup = useDeleteGroup(boardId)
  const reorderGroups = useReorderGroups(boardId)
  const createColumn = useCreateColumn(boardId)
  const updateColumn = useUpdateColumn(boardId)
  const deleteColumn = useDeleteColumn(boardId)
  const reorderColumns = useReorderColumns(boardId)

  const isFav = favorites?.has(boardId) ?? false
  const accent = board?.color || '#0ea5e9'

  const filteredItems = search
    ? items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : items

  // ── Cell change with automation execution on status change ────────────────
  const handleSetCell = async (itemId: string, columnId: string, value: CellValue, column: BoardColumn, old: CellValue) => {
    setCell.mutate({ itemId, columnId, value, _meta: { columnName: column.name, old } })
    if (column.type === 'status' && typeof value === 'string' && value) {
      const item = items.find((i) => i.id === itemId)
      if (!item) return
      await runAutomationsForStatusChange({
        boardId,
        automations,
        item: { ...item, cells: { ...item.cells, [columnId]: value } },
        columnId,
        newStatus: value,
        ownerFromColumn: (it, colId) => {
          const v = it.cells[colId]
          return typeof v === 'string' ? v : null
        },
        setCell: async (iid, cid, v) => { await supabase.from('cell_values').upsert({ item_id: iid, column_id: cid, value: v }) },
        moveToGroup: async (iid, gid) => { await supabase.from('items').update({ group_id: gid }).eq('id', iid) },
      })
    }
  }

  const handlers = {
    onSetCell: handleSetCell,
    onCreateItem: (groupId: string, name: string) =>
      createItem.mutate({ groupId, name, position: items.filter((i) => i.group_id === groupId).length }),
    onUpdateItem: (id: string, name: string) => updateItem.mutate({ id, name }),
    onDeleteItem: (id: string) => deleteItem.mutate(id),
    onMoveItems: (updates: { id: string; group_id: string; position: number }[]) =>
      reorderItems.mutate(updates, { onError: (e: unknown) => notifyError(errorMessage(e)) }),
    onCreateGroup: () =>
      createGroup.mutate({ name: 'New Group', color: '#0ea5e9', position: groups.length }),
    onUpdateGroup: (id: string, patch: Partial<Group>) => updateGroup.mutate({ id, ...patch }),
    onDeleteGroup: (id: string) => deleteGroup.mutate(id),
    onReorderGroups: (updates: { id: string; position: number }[]) => reorderGroups.mutate(updates),
    onCreateColumn: (name: string, type: ColumnType) =>
      createColumn.mutate(
        { name, type, position: columns.length, settings: type === 'status' ? { labels: { 'Not started': '#94a3b8', Done: '#22c55e' } } : {} },
        { onError: (e: unknown) => notifyError(errorMessage(e)) }
      ),
    onUpdateColumn: (id: string, patch: Partial<BoardColumn>) => updateColumn.mutate({ id, ...patch }),
    onDeleteColumn: (id: string) => deleteColumn.mutate(id),
    onReorderColumns: (updates: { id: string; position: number }[]) => reorderColumns.mutate(updates),
    onOpenItem: (item: ItemWithCells) => setOpenItem(item),
  }

  return (
    <div className="flex flex-col h-full bg-[#f1f5f9]">
      {/* Header */}
      <div className="px-4 md:px-6 pt-3 md:pt-4 bg-white border-b border-[#e2e8f0] flex-shrink-0">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: accent + '18' }}>
              <div className="w-3.5 h-3.5 rounded" style={{ background: accent }} />
            </div>
            <h1 className="text-[17px] font-bold text-[#0f172a] tracking-tight truncate">{board?.name ?? 'Board'}</h1>
            <button
              onClick={() => toggleFav.mutate({ boardId, on: !isFav })}
              className="p-1 flex-shrink-0"
              title={isFav ? 'Unfavorite' : 'Favorite'}
            >
              <Star className="w-4 h-4" style={{ fill: isFav ? '#f59e0b' : 'transparent', color: isFav ? '#f59e0b' : '#cbd5e1' }} />
            </button>
          </div>
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              className="pl-8 pr-3 py-1.5 text-[13px] bg-[#f1f5f9] rounded-lg outline-none w-44 focus:ring-2 focus:ring-[#0ea5e9]/30"
            />
          </div>
        </div>

        {/* View tabs */}
        <div className="flex items-center gap-0.5 overflow-x-auto [scrollbar-width:none]">
          {VIEWS.map((v) => {
            const locked = v.pro && plan === 'free'
            return (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className="relative flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold whitespace-nowrap transition-colors"
                style={{ color: view === v.id ? '#0f172a' : '#94a3b8' }}
              >
                <v.icon className="w-3.5 h-3.5" />
                {v.label}
                {locked && <Lock className="w-3 h-3 text-[#f59e0b]" />}
                {view === v.id && (
                  <motion.div layoutId="board-view-tab" className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: accent }} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* View body */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <TableSkeleton />
        ) : view === 'table' ? (
          <TableView boardId={boardId} groups={groups} columns={columns} items={filteredItems} members={members} readOnly={readOnly} {...handlers} />
        ) : view === 'kanban' ? (
          <KanbanView boardId={boardId} groups={groups} columns={columns} items={filteredItems} members={members} readOnly={readOnly} onSetCell={handleSetCell} onOpenItem={setOpenItem} />
        ) : view === 'calendar' ? (
          <CalendarView columns={columns} items={filteredItems} onOpenItem={setOpenItem} />
        ) : view === 'timeline' ? (
          <Gate feature="timeline_view" workspaceId={workspaceId}>
            <TimelineView columns={columns} items={filteredItems} groups={groups} onOpenItem={setOpenItem} />
          </Gate>
        ) : (
          <Gate feature="dashboard_view" workspaceId={workspaceId}>
            <DashboardView columns={columns} items={filteredItems} members={members} />
          </Gate>
        )}
      </div>

      {openItem && (
        <ItemPanel
          item={items.find((i) => i.id === openItem.id) ?? openItem}
          boardId={boardId}
          workspaceId={workspaceId}
          columns={columns}
          members={members}
          readOnly={readOnly}
          onClose={() => setOpenItem(null)}
          onSetCell={handleSetCell}
          onRename={(name) => updateItem.mutate({ id: openItem.id, name })}
        />
      )}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="px-6 py-6 space-y-4">
      {[0, 1].map((g) => (
        <div key={g}>
          <div className="h-4 w-32 bg-[#e2e8f0] rounded animate-pulse mb-3" />
          <div className="bg-white rounded-lg border border-[#e8edf3] overflow-hidden">
            {[0, 1, 2].map((r) => (
              <div key={r} className="h-11 border-b border-[#f1f5f9] flex items-center px-4 gap-4">
                <div className="h-3 w-40 bg-[#f1f5f9] rounded animate-pulse" />
                <div className="h-5 w-20 bg-[#f1f5f9] rounded-full animate-pulse" />
                <div className="h-5 w-5 bg-[#f1f5f9] rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
