import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import {
  Plus, List, Kanban, Clock, Search, X,
  LayoutGrid, RefreshCw, CheckSquare, FolderKanban,
  ClipboardList, Palmtree,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useBoard, useColumns, useTasks, useMoveTask, useCreateTask, useCreateColumn } from '@/lib/queries'
import type { Task, Column } from '@/types'
import { TaskModal } from '@/components/tasks/TaskModal'
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal'
import { getInitials } from '@/lib/utils'

const priorityConfig = {
  urgent: { label: 'Urgent', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  strip: '#ef4444' },
  high:   { label: 'High',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', strip: '#f59e0b' },
  medium: { label: 'Medium', color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', strip: '#0ea5e9' },
  low:    { label: 'Low',    color: '#64748b', bg: 'rgba(100,116,139,0.1)', strip: '#475569' },
}

const boardIconMap: Record<string, typeof CheckSquare> = {
  tasks: CheckSquare, projects: FolderKanban, assignments: ClipboardList, vacation: Palmtree,
}
const boardColorMap: Record<string, string> = {
  tasks: '#0ea5e9', projects: '#8b5cf6', assignments: '#f59e0b', vacation: '#22c55e',
}

type View = 'kanban' | 'list'

export function BoardPage() {
  const { boardId = '' } = useParams()
  const { user } = useAuthStore()
  const [view, setView] = useState<View>('kanban')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createColumnId, setCreateColumnId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchExpanded, setSearchExpanded] = useState(false)

  const { data: board, isLoading: boardLoading } = useBoard(boardId)
  const { data: columns = [], isLoading: colsLoading } = useColumns(boardId)
  const { data: tasks = [], isLoading: tasksLoading } = useTasks(boardId)
  const moveTask = useMoveTask()
  const createTask = useCreateTask()
  const createColumn = useCreateColumn()

  const isLoading = boardLoading || colsLoading || tasksLoading
  const hasColumns = columns.length > 0

  const getColumnTasks = (columnId: string) =>
    tasks
      .filter((t) => t.column_id === columnId && (!search || t.title.toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => a.position - b.position)

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return
    moveTask.mutate({ taskId: draggableId, columnId: destination.droppableId, position: destination.index, boardId })
  }

  const handleAddColumn = async () => {
    const name = prompt('Column name:')
    if (!name || !user) return
    createColumn.mutate({ board_id: boardId, name, color: '#64748b', position: columns.length })
  }

  const handleOpenCreate = () => {
    if (!hasColumns) return
    setCreateColumnId(columns[0].id)
    setShowCreate(true)
  }

  const accentColor = board?.type ? boardColorMap[board.type] : (board?.color || '#0ea5e9')
  const BoardIcon = board?.type ? boardIconMap[board.type] : CheckSquare
  const addButtonLabel: Record<string, string> = {
    tasks: 'Add Task', projects: 'Add Project', assignments: 'Add Assignment', vacation: 'Add Vacation',
  }
  const addLabel = board?.type ? (addButtonLabel[board.type] || 'Add Task') : 'Add Task'

  return (
    <div className="flex flex-col h-full" style={{ background: '#0f172a' }}>
      {/* Header */}
      <div
        className="px-4 md:px-8 py-3 md:py-4 flex-shrink-0"
        style={{ background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center justify-between gap-2">
          {/* Board title */}
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            {boardLoading ? (
              <div className="w-9 h-9 rounded-xl animate-pulse flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }} />
            ) : (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: accentColor + '18' }}
              >
                {BoardIcon && <BoardIcon style={{ color: accentColor, width: 18, height: 18 }} />}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-[15px] md:text-[17px] font-bold tracking-tight leading-none text-white truncate">
                {boardLoading
                  ? <div className="h-4 w-28 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.07)' }} />
                  : board?.name}
              </h1>
              {board?.description && (
                <p className="text-[11px] mt-0.5 font-medium hidden sm:block" style={{ color: 'rgba(255,255,255,0.35)' }}>{board.description}</p>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            {/* Mobile search toggle */}
            {!searchExpanded ? (
              <button
                className="md:hidden w-11 h-11 flex items-center justify-center rounded-xl transition-all"
                style={{ color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.05)' }}
                onClick={() => setSearchExpanded(true)}
              >
                <Search className="w-4 h-4" />
              </button>
            ) : (
              <div className="md:hidden relative flex items-center">
                <Search className="absolute left-2.5 w-3.5 h-3.5 pointer-events-none" style={{ color: 'rgba(255,255,255,0.25)' }} />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="pl-8 pr-8 py-2 text-[13px] rounded-xl outline-none text-white placeholder-white/25 w-40"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(14,165,233,0.45)' }}
                  onBlur={() => { if (!search) setSearchExpanded(false) }}
                />
                <button
                  className="absolute right-2"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                  onMouseDown={() => { setSearch(''); setSearchExpanded(false) }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Desktop search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.25)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="pl-8 pr-3 py-2 text-[13px] rounded-xl outline-none transition-all w-44 text-white placeholder-white/25"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(14,165,233,0.45)'; e.target.style.background = 'rgba(255,255,255,0.08)' }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.05)' }}
              />
            </div>

            {/* View toggle */}
            <div
              className="flex items-center rounded-xl p-0.5"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {(['kanban', 'list'] as View[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="w-9 h-9 md:w-auto md:h-auto md:p-2 flex items-center justify-center rounded-lg transition-all"
                  style={view === v
                    ? { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)' }
                    : { color: 'rgba(255,255,255,0.3)' }}
                >
                  {v === 'kanban' ? <Kanban className="w-4 h-4" /> : <List className="w-4 h-4" />}
                </button>
              ))}
            </div>

            {/* Add button — desktop only */}
            <motion.button
              whileHover={{ scale: hasColumns ? 1.02 : 1 }}
              whileTap={{ scale: hasColumns ? 0.98 : 1 }}
              onClick={handleOpenCreate}
              disabled={!hasColumns || isLoading}
              className="hidden md:flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: hasColumns ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` : 'rgba(255,255,255,0.08)',
                boxShadow: hasColumns ? `0 4px 14px ${accentColor}40` : 'none',
              }}
            >
              <Plus className="w-4 h-4" />
              {addLabel}
            </motion.button>
          </div>
        </div>

        {/* Stats bar */}
        {!isLoading && hasColumns && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 md:gap-5 mt-3 pt-3 overflow-x-auto [scrollbar-width:none] [-webkit-overflow-scrolling:touch] flex-nowrap"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            {columns.map((col) => {
              const count = tasks.filter((t) => t.column_id === col.id).length
              return (
                <div key={col.id} className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="w-2 h-2 rounded-full" style={{ background: col.color, boxShadow: `0 0 6px ${col.color}80` }} />
                  <span className="text-[12px] font-medium whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.45)' }}>{col.name}</span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: col.color + '20', color: col.color }}
                  >
                    {count}
                  </span>
                </div>
              )
            })}
            <span className="ml-auto text-[11px] font-medium flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {tasks.length} total
            </span>
          </motion.div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <BoardLoadingSkeleton />
        ) : !hasColumns ? (
          <div className="flex items-center justify-center h-full px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div
                className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg"
                style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80)` }}
              >
                <RefreshCw className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-[18px] font-bold text-white mb-2">Board is setting up</h3>
              <p className="text-[14px] mb-5 max-w-[280px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Run <code className="text-[#0ea5e9] px-1.5 py-0.5 rounded text-[12px] font-mono" style={{ background: 'rgba(14,165,233,0.12)' }}>seed_boards.sql</code> in Supabase to seed columns.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 text-[13px] font-semibold text-white rounded-xl transition-colors min-h-[44px]"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Refresh page
              </button>
            </motion.div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {view === 'kanban' ? (
              <KanbanView
                key="kanban"
                columns={columns}
                getColumnTasks={getColumnTasks}
                onDragEnd={onDragEnd}
                onTaskClick={setSelectedTask}
                onAddTask={(colId) => { setCreateColumnId(colId); setShowCreate(true) }}
                onAddColumn={handleAddColumn}
              />
            ) : (
              <ListView
                key="list"
                columns={columns}
                tasks={tasks.filter((t) => !search || t.title.toLowerCase().includes(search.toLowerCase()))}
                onTaskClick={setSelectedTask}
              />
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Mobile FAB */}
      {hasColumns && !isLoading && (
        <motion.button
          className="fixed bottom-6 right-4 md:hidden z-20 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
            boxShadow: `0 8px 24px ${accentColor}60`,
          }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={handleOpenCreate}
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      )}

      {selectedTask && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}

      {showCreate && hasColumns && (
        <CreateTaskModal
          boardId={boardId}
          boardType={board?.type}
          columnId={createColumnId || columns[0]?.id}
          columns={columns}
          onClose={() => setShowCreate(false)}
          onCreated={async (data) => {
            await createTask.mutateAsync({ ...data, created_by: user?.id })
            setShowCreate(false)
          }}
        />
      )}
    </div>
  )
}

function BoardLoadingSkeleton() {
  const ghost = 'rgba(255,255,255,0.05)'
  const ghostDim = 'rgba(255,255,255,0.03)'
  return (
    <div className="flex gap-4 px-4 md:px-8 py-6 overflow-x-auto">
      {[3, 4, 2, 1].map((count, i) => (
        <div key={i} className="w-[280px] flex-shrink-0">
          <div className="h-9 rounded-xl mb-3 animate-pulse" style={{ background: ghost }} />
          <div className="rounded-2xl p-2 space-y-2" style={{ background: ghostDim }}>
            {Array.from({ length: count }).map((_, j) => (
              <div key={j} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex">
                  <div className="w-1 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }} />
                  <div className="flex-1 p-3.5 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="h-3.5 rounded w-3/4 mb-2" style={{ background: ghost }} />
                    <div className="h-3 rounded w-1/2 mb-3" style={{ background: ghostDim }} />
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-14 rounded-full" style={{ background: ghost }} />
                      <div className="h-5 w-5 rounded-full" style={{ background: ghost }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function KanbanView({
  columns, getColumnTasks, onDragEnd, onTaskClick, onAddTask, onAddColumn,
}: {
  columns: Column[]
  getColumnTasks: (id: string) => Task[]
  onDragEnd: (r: DropResult) => void
  onTaskClick: (t: Task) => void
  onAddTask: (colId: string) => void
  onAddColumn: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full overflow-x-auto [-webkit-overflow-scrolling:touch]"
    >
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 md:gap-5 h-full px-4 md:px-8 py-5 md:py-6 min-w-max">
          {columns.map((col) => {
            const colTasks = getColumnTasks(col.id)
            return (
              <div key={col.id} className="flex flex-col w-[280px] flex-shrink-0">
                {/* Column header */}
                <motion.div
                  className="flex items-center gap-2.5 mb-3 px-3 py-2.5 rounded-xl"
                  style={{
                    background: col.color + '12',
                    border: `1px solid ${col.color}22`,
                  }}
                  whileHover={{ scale: 1.01 }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: col.color, boxShadow: `0 0 8px ${col.color}80` }}
                  />
                  <span className="text-[13px] font-bold flex-1" style={{ color: col.color }}>{col.name}</span>
                  <span
                    className="text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: col.color + '20', color: col.color }}
                  >
                    {colTasks.length}
                  </span>
                </motion.div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex-1 rounded-2xl p-2 transition-all min-h-[120px]"
                      style={snapshot.isDraggingOver
                        ? { background: col.color + '0d', outline: `2px solid ${col.color}35`, outlineOffset: -2, transform: 'scale(1.01)' }
                        : { background: 'rgba(255,255,255,0.025)' }}
                    >
                      {colTasks.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <LayoutGrid className="w-7 h-7 mb-2" style={{ color: 'rgba(255,255,255,0.1)' }} />
                          <p className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.2)' }}>No tasks yet</p>
                        </div>
                      )}

                      {colTasks.map((task, idx) => (
                        <Draggable key={task.id} draggableId={task.id} index={idx}>
                          {(prov, snap) => (
                            <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}>
                              <TaskCard task={task} isDragging={snap.isDragging} onClick={() => onTaskClick(task)} colColor={col.color} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      <button
                        onClick={() => onAddTask(col.id)}
                        className="w-full mt-1.5 py-2.5 flex items-center justify-center gap-1.5 text-[12px] font-medium rounded-xl transition-all min-h-[44px]"
                        style={{ color: 'rgba(255,255,255,0.2)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)' }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.2)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add card
                      </button>
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}

          <div className="flex-shrink-0 w-[280px]">
            <button
              onClick={onAddColumn}
              className="w-full h-12 flex items-center justify-center gap-2 text-[13px] font-medium rounded-2xl transition-all min-h-[44px]"
              style={{
                color: 'rgba(255,255,255,0.2)',
                border: '2px dashed rgba(255,255,255,0.08)',
              }}
              onMouseEnter={(e) => { const b = e.currentTarget; b.style.color = '#0ea5e9'; b.style.borderColor = 'rgba(14,165,233,0.35)'; b.style.background = 'rgba(14,165,233,0.05)' }}
              onMouseLeave={(e) => { const b = e.currentTarget; b.style.color = 'rgba(255,255,255,0.2)'; b.style.borderColor = 'rgba(255,255,255,0.08)'; b.style.background = 'transparent' }}
            >
              <Plus className="w-4 h-4" />
              Add column
            </button>
          </div>
        </div>
      </DragDropContext>
    </motion.div>
  )
}

function TaskCard({ task, isDragging, onClick, colColor }: { task: Task; isDragging: boolean; onClick: () => void; colColor: string }) {
  const p = priorityConfig[task.priority] || priorityConfig.medium
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

  return (
    <motion.div
      layout
      onClick={onClick}
      className="rounded-xl mb-2 cursor-pointer group relative overflow-hidden transition-all"
      style={isDragging
        ? {
            background: '#1e293b',
            border: `1px solid ${colColor}40`,
            boxShadow: `0 24px 56px -8px rgba(0,0,0,0.6), 0 0 0 1px ${colColor}30`,
            transform: 'rotate(1deg) scale(1.03)',
          }
        : {
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
      whileHover={isDragging ? {} : {
        background: 'rgba(255,255,255,0.07)',
        borderColor: 'rgba(255,255,255,0.12)',
        y: -1,
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      }}
    >
      <div className="flex">
        {/* Priority strip */}
        <div className="w-1 flex-shrink-0 rounded-l-xl" style={{ background: p.strip }} />

        <div className="flex-1 p-3.5">
          {task.labels?.length > 0 && (
            <div className="flex gap-1 mb-2 flex-wrap">
              {task.labels.map((l) => (
                <span key={l} className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)' }}>{l}</span>
              ))}
            </div>
          )}

          <p className="text-[13px] font-semibold leading-snug mb-2.5 transition-colors"
            style={{ color: 'rgba(255,255,255,0.85)' }}
          >
            {task.title}
          </p>

          {task.description && (
            <p className="text-[11px] mb-2.5 line-clamp-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>{task.description}</p>
          )}

          <div className="flex items-center justify-between gap-1.5">
            <span
              className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: p.bg, color: p.color }}
            >
              {p.label}
            </span>
            <div className="flex items-center gap-1.5 ml-auto">
              {task.due_date && (
                <div className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md`}
                  style={isOverdue
                    ? { background: 'rgba(239,68,68,0.12)', color: '#ef4444' }
                    : { color: 'rgba(255,255,255,0.3)' }}>
                  <Clock className="w-3 h-3" />
                  {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              )}
              {task.assignee && (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-black ring-1 shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}
                  title={task.assignee.full_name}
                >
                  {getInitials(task.assignee.full_name)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function ListView({ columns, tasks, onTaskClick }: { columns: Column[]; tasks: Task[]; onTaskClick: (t: Task) => void }) {
  const colMap = Object.fromEntries(columns.map((c) => [c.id, c]))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 md:px-8 py-6 overflow-x-auto [-webkit-overflow-scrolling:touch]">
      {tasks.length === 0 ? (
        <div className="rounded-2xl py-14 text-center"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <CheckSquare className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
          <p className="text-[14px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>No tasks yet</p>
          <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.18)' }}>Create your first task using the Add Task button.</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden min-w-[600px]" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-5 py-3 text-[10px] font-bold uppercase tracking-widest"
            style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.25)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span>Task</span><span>Status</span><span>Priority</span><span>Assignee</span><span>Due Date</span>
          </div>
          {tasks.map((task, i) => {
            const p = priorityConfig[task.priority] || priorityConfig.medium
            const col = colMap[task.column_id]
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.025 }}
                onClick={() => onTaskClick(task)}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-5 py-3.5 cursor-pointer transition-all items-center group min-h-[44px]"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3.5 h-3.5 rounded-sm flex-shrink-0 border-2"
                    style={{ borderColor: 'rgba(255,255,255,0.12)', borderLeftColor: p.strip, borderLeftWidth: 3 }}
                  />
                  <span className="text-[13px] font-semibold transition-colors" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {task.title}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {col && <div className="w-1.5 h-1.5 rounded-full" style={{ background: col.color, boxShadow: `0 0 5px ${col.color}80` }} />}
                  <span className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>{col?.name || task.status}</span>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-full font-bold w-fit" style={{ background: p.bg, color: p.color }}>{p.label}</span>
                <div>
                  {task.assignee ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}>
                        {getInitials(task.assignee.full_name)}
                      </div>
                      <span className="text-[12px] truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>{task.assignee.full_name}</span>
                    </div>
                  ) : <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                </div>
                <span className={`text-[12px] flex items-center gap-1 font-medium`}
                  style={isOverdue ? { color: '#ef4444' } : { color: 'rgba(255,255,255,0.35)' }}>
                  {task.due_date
                    ? <><Clock className="w-3 h-3" />{new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                    : <span style={{ color: 'rgba(255,255,255,0.18)' }}>—</span>}
                </span>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
