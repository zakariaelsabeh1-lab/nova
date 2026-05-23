import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import {
  Plus, List, Kanban, Clock, Search,
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
  urgent: { label: 'Urgent', color: '#ef4444', bg: '#fef2f2', strip: '#ef4444' },
  high:   { label: 'High',   color: '#f59e0b', bg: '#fffbeb', strip: '#f59e0b' },
  medium: { label: 'Medium', color: '#0ea5e9', bg: '#f0f9ff', strip: '#0ea5e9' },
  low:    { label: 'Low',    color: '#94a3b8', bg: '#f8fafc', strip: '#cbd5e1' },
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

  const accentColor = board?.type ? boardColorMap[board.type] : (board?.color || '#0ea5e9')
  const BoardIcon = board?.type ? boardIconMap[board.type] : CheckSquare

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      {/* Header */}
      <div className="px-8 py-4 bg-white border-b border-[#e2e8f0] flex-shrink-0 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {boardLoading ? (
              <div className="w-8 h-8 bg-[#f1f5f9] rounded-xl animate-pulse" />
            ) : (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: accentColor + '15' }}
              >
                {BoardIcon && <BoardIcon style={{ color: accentColor, width: 18, height: 18 }} />}
              </div>
            )}
            <div>
              <h1 className="text-[17px] font-bold text-[#0f172a] tracking-tight leading-none">
                {boardLoading ? <div className="h-4 w-28 bg-[#f1f5f9] rounded animate-pulse" /> : board?.name}
              </h1>
              {board?.description && (
                <p className="text-[11px] text-[#94a3b8] mt-0.5 font-medium">{board.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="pl-8 pr-3 py-2 text-[13px] bg-[#f1f5f9] border border-transparent rounded-xl text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#0ea5e9]/40 focus:bg-white transition-all w-44"
              />
            </div>

            <div className="flex items-center bg-[#f1f5f9] border border-[#e2e8f0] rounded-xl p-0.5">
              {(['kanban', 'list'] as View[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`p-2 rounded-lg transition-all ${view === v ? 'bg-white shadow-sm text-[#0f172a]' : 'text-[#94a3b8] hover:text-[#64748b]'}`}
                >
                  {v === 'kanban' ? <Kanban className="w-4 h-4" /> : <List className="w-4 h-4" />}
                </button>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: hasColumns ? 1.02 : 1 }}
              whileTap={{ scale: hasColumns ? 0.98 : 1 }}
              onClick={() => {
                if (!hasColumns) return
                setCreateColumnId(columns[0].id)
                setShowCreate(true)
              }}
              disabled={!hasColumns || isLoading}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              style={{
                background: hasColumns ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` : '#94a3b8',
                boxShadow: hasColumns ? `0 4px 12px ${accentColor}40` : 'none',
              }}
            >
              <Plus className="w-4 h-4" />
              Add Task
            </motion.button>
          </div>
        </div>

        {/* Stats bar */}
        {!isLoading && hasColumns && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-5 mt-3 pt-3 border-t border-[#f1f5f9]"
          >
            {columns.map((col) => {
              const count = tasks.filter((t) => t.column_id === col.id).length
              return (
                <div key={col.id} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                  <span className="text-[12px] text-[#64748b] font-medium">{col.name}</span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: col.color + '18', color: col.color }}
                  >
                    {count}
                  </span>
                </div>
              )
            })}
            <span className="ml-auto text-[11px] text-[#94a3b8] font-medium">
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
          <div className="flex items-center justify-center h-full">
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
              <h3 className="text-[18px] font-bold text-[#0f172a] mb-2">Board is setting up</h3>
              <p className="text-[14px] text-[#64748b] mb-5 max-w-[280px]">
                Run <code className="text-[#0ea5e9] bg-sky-50 px-1.5 py-0.5 rounded text-[12px] font-mono">migration_fix.sql</code> in Supabase to seed columns.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 text-[13px] font-semibold text-white bg-[#0f172a] rounded-xl hover:bg-[#1e293b] transition-colors shadow-sm"
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

      {selectedTask && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}

      {showCreate && hasColumns && (
        <CreateTaskModal
          boardId={boardId}
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
  return (
    <div className="flex gap-4 px-8 py-6 overflow-x-auto">
      {[3, 4, 2, 1].map((count, i) => (
        <div key={i} className="w-[280px] flex-shrink-0">
          <div className="h-9 bg-[#f1f5f9] rounded-xl mb-3 animate-pulse" />
          <div className="bg-[#f1f5f9]/60 rounded-2xl p-2 space-y-2">
            {Array.from({ length: count }).map((_, j) => (
              <div key={j} className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
                <div className="flex">
                  <div className="w-1 flex-shrink-0 bg-[#e2e8f0]" />
                  <div className="flex-1 p-3.5 animate-pulse">
                    <div className="h-3.5 bg-[#f1f5f9] rounded w-3/4 mb-2" />
                    <div className="h-3 bg-[#f8fafc] rounded w-1/2 mb-3" />
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-14 bg-[#f1f5f9] rounded-full" />
                      <div className="h-5 w-5 bg-[#f1f5f9] rounded-full" />
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
      className="h-full overflow-x-auto"
    >
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-5 h-full px-8 py-6 min-w-max">
          {columns.map((col) => {
            const colTasks = getColumnTasks(col.id)
            return (
              <div key={col.id} className="flex flex-col w-[280px] flex-shrink-0">
                {/* Column header */}
                <motion.div
                  className="flex items-center gap-2.5 mb-3 px-3 py-2.5 rounded-xl border"
                  style={{
                    background: col.color + '0e',
                    borderColor: col.color + '25',
                  }}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: col.color, boxShadow: `0 0 8px ${col.color}80` }} />
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
                      className={`flex-1 rounded-2xl p-2 transition-all min-h-[120px] ${
                        snapshot.isDraggingOver
                          ? 'ring-2 scale-[1.01]'
                          : 'bg-[#f1f5f9]/60'
                      }`}
                      style={snapshot.isDraggingOver ? {
                        background: col.color + '10',
                      } : {}}
                    >
                      {colTasks.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <LayoutGrid className="w-7 h-7 text-[#cbd5e1] mb-2" />
                          <p className="text-[11px] text-[#94a3b8] font-medium">No tasks yet</p>
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
                        className="w-full mt-1.5 py-2 flex items-center justify-center gap-1.5 text-[12px] text-[#94a3b8] hover:text-[#64748b] hover:bg-white/80 rounded-xl transition-all font-medium"
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
              className="w-full h-12 flex items-center justify-center gap-2 text-[13px] font-medium text-[#94a3b8] border-2 border-dashed border-[#e2e8f0] rounded-2xl hover:border-[#0ea5e9]/40 hover:text-[#0ea5e9] hover:bg-white/60 transition-all"
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
      className={`bg-white rounded-xl mb-2 cursor-pointer group relative overflow-hidden transition-all ${
        isDragging
          ? 'shadow-2xl rotate-[1deg] scale-[1.03] border border-[#0ea5e9]/30'
          : 'border border-[#e2e8f0] hover:shadow-lg hover:border-transparent hover:-translate-y-0.5'
      }`}
      style={isDragging ? { boxShadow: `0 20px 48px -8px ${colColor}40` } : {}}
    >
      <div className="flex">
        {/* Priority color strip — left edge */}
        <div
          className="w-1 flex-shrink-0 rounded-l-xl"
          style={{ background: p.strip }}
        />

        <div className="flex-1 p-3.5">
          {task.labels?.length > 0 && (
            <div className="flex gap-1 mb-2 flex-wrap">
              {task.labels.map((l) => (
                <span key={l} className="text-[10px] px-1.5 py-0.5 bg-[#f1f5f9] text-[#64748b] rounded-md font-semibold">{l}</span>
              ))}
            </div>
          )}

          <p className="text-[13px] font-semibold text-[#0f172a] leading-snug mb-2.5 group-hover:text-[#0ea5e9] transition-colors">
            {task.title}
          </p>

          {task.description && (
            <p className="text-[11px] text-[#94a3b8] mb-2.5 line-clamp-2 leading-relaxed">{task.description}</p>
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
                <div className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                  isOverdue ? 'bg-red-50 text-red-400' : 'text-[#94a3b8]'
                }`}>
                  <Clock className="w-3 h-3" />
                  {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              )}
              {task.assignee && (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-black ring-2 ring-white shadow-sm"
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-8 py-6">
      {tasks.length === 0 ? (
        <div className="bg-white border border-[#e2e8f0] rounded-2xl py-14 text-center shadow-sm">
          <CheckSquare className="w-10 h-10 text-[#e2e8f0] mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-[#94a3b8] mb-1">No tasks yet</p>
          <p className="text-[12px] text-[#cbd5e1]">Create your first task using the Add Task button.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-5 py-3 border-b border-[#f1f5f9] text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest bg-[#f8fafc]">
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
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-5 py-3.5 border-b border-[#f8fafc] last:border-0 hover:bg-[#fafafa] cursor-pointer transition-colors items-center group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3.5 h-3.5 rounded-sm border-2 border-[#e2e8f0] flex-shrink-0 group-hover:border-[#0ea5e9]/60 transition-colors"
                    style={{ borderLeftColor: p.strip, borderLeftWidth: 3 }}
                  />
                  <span className="text-[13px] font-semibold text-[#0f172a] group-hover:text-[#0ea5e9] transition-colors">{task.title}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {col && <div className="w-1.5 h-1.5 rounded-full" style={{ background: col.color, boxShadow: `0 0 5px ${col.color}80` }} />}
                  <span className="text-[12px] text-[#64748b] font-medium">{col?.name || task.status}</span>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-full font-bold w-fit" style={{ background: p.bg, color: p.color }}>{p.label}</span>
                <div>
                  {task.assignee ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}>
                        {getInitials(task.assignee.full_name)}
                      </div>
                      <span className="text-[12px] text-[#64748b] truncate">{task.assignee.full_name}</span>
                    </div>
                  ) : <span className="text-[12px] text-[#94a3b8]">—</span>}
                </div>
                <span className={`text-[12px] flex items-center gap-1 font-medium ${isOverdue ? 'text-red-400' : 'text-[#64748b]'}`}>
                  {task.due_date
                    ? <><Clock className="w-3 h-3" />{new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                    : <span className="text-[#94a3b8]">—</span>}
                </span>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
