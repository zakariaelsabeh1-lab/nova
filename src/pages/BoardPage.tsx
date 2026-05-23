import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import { Plus, List, Kanban, MoreHorizontal, Clock, Search, Filter, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useBoard, useColumns, useTasks, useMoveTask, useCreateTask, useCreateColumn } from '@/lib/queries'
import type { Task, Column } from '@/types'
import { TaskModal } from '@/components/tasks/TaskModal'
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal'
import { getInitials } from '@/lib/utils'

const priorityConfig = {
  urgent: { label: 'Urgent', color: '#ef4444', bg: '#fef2f2' },
  high: { label: 'High', color: '#f59e0b', bg: '#fffbeb' },
  medium: { label: 'Medium', color: '#0ea5e9', bg: '#f0f9ff' },
  low: { label: 'Low', color: '#94a3b8', bg: '#f8fafc' },
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

  const getColumnTasks = (columnId: string) =>
    tasks
      .filter((t) => t.column_id === columnId && (!search || t.title.toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => a.position - b.position)

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    moveTask.mutate({
      taskId: draggableId,
      columnId: destination.droppableId,
      position: destination.index,
      boardId,
    })
  }

  const handleAddColumn = async () => {
    const name = prompt('Column name:')
    if (!name || !user) return
    createColumn.mutate({ board_id: boardId, name, color: '#94a3b8', position: columns.length })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 text-[#94a3b8] animate-spin" />
      </div>
    )
  }

  const accentColor = board?.color || '#0ea5e9'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-5 bg-white border-b border-[#e2e8f0] flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ background: accentColor }} />
            <h1 className="text-[19px] font-bold text-[#0f172a] tracking-tight">{board?.name}</h1>
            {board?.description && (
              <>
                <span className="text-[13px] text-[#94a3b8]">—</span>
                <span className="text-[13px] text-[#64748b]">{board.description}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="pl-8 pr-3 py-2 text-[13px] bg-[#f1f5f9] border border-[#e2e8f0] rounded-xl text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#0ea5e9]/50 transition-colors w-48"
              />
            </div>

            <button className="flex items-center gap-1.5 px-3 py-2 text-[13px] text-[#64748b] bg-[#f1f5f9] border border-[#e2e8f0] rounded-xl hover:bg-[#e2e8f0] transition-colors">
              <Filter className="w-3.5 h-3.5" />
              Filter
            </button>

            <div className="flex items-center bg-[#f1f5f9] border border-[#e2e8f0] rounded-xl p-0.5">
              <button
                onClick={() => setView('kanban')}
                className={`p-1.5 rounded-lg transition-all ${view === 'kanban' ? 'bg-white shadow-sm text-[#0f172a]' : 'text-[#94a3b8]'}`}
              >
                <Kanban className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-1.5 rounded-lg transition-all ${view === 'list' ? 'bg-white shadow-sm text-[#0f172a]' : 'text-[#94a3b8]'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setCreateColumnId(columns[0]?.id || null); setShowCreate(true) }}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white rounded-xl"
              style={{ background: accentColor, boxShadow: `0 2px 8px ${accentColor}40` }}
            >
              <Plus className="w-4 h-4" />
              Add Task
            </motion.button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
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
      </div>

      {/* Task detail modal */}
      {selectedTask && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}

      {/* Create task modal */}
      {showCreate && (
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

function KanbanView({
  columns,
  getColumnTasks,
  onDragEnd,
  onTaskClick,
  onAddTask,
  onAddColumn,
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
        <div className="flex gap-4 h-full px-8 py-6 min-w-max">
          {columns.map((col) => {
            const colTasks = getColumnTasks(col.id)
            return (
              <div key={col.id} className="flex flex-col w-[280px] flex-shrink-0">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                  <span className="text-[13px] font-semibold text-[#0f172a]">{col.name}</span>
                  <span className="ml-auto text-[11px] font-medium text-[#94a3b8] bg-[#f1f5f9] px-2 py-0.5 rounded-full">
                    {colTasks.length}
                  </span>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 rounded-2xl p-2 transition-colors min-h-[80px] ${
                        snapshot.isDraggingOver ? 'bg-[#e2e8f0]' : 'bg-[#f1f5f9]'
                      }`}
                    >
                      {colTasks.map((task, idx) => (
                        <Draggable key={task.id} draggableId={task.id} index={idx}>
                          {(prov, snap) => (
                            <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}>
                              <TaskCard task={task} isDragging={snap.isDragging} onClick={() => onTaskClick(task)} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      <button
                        onClick={() => onAddTask(col.id)}
                        className="w-full mt-2 py-2 flex items-center justify-center gap-1.5 text-[12px] text-[#94a3b8] hover:text-[#64748b] hover:bg-white/60 rounded-xl transition-all"
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
              className="w-full py-3 flex items-center justify-center gap-2 text-[13px] text-[#94a3b8] border-2 border-dashed border-[#e2e8f0] rounded-2xl hover:border-[#0ea5e9]/50 hover:text-[#0ea5e9] transition-all"
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

function TaskCard({ task, isDragging, onClick }: { task: Task; isDragging: boolean; onClick: () => void }) {
  const p = priorityConfig[task.priority] || priorityConfig.medium
  return (
    <motion.div
      layout
      onClick={onClick}
      className={`bg-white rounded-xl p-3.5 mb-2 border border-[#e2e8f0] cursor-pointer group relative transition-all ${
        isDragging ? 'shadow-xl rotate-1 border-[#0ea5e9]/30 scale-[1.02]' : 'hover:shadow-md hover:border-[#0ea5e9]/20'
      }`}
    >
      {task.labels?.length > 0 && (
        <div className="flex gap-1.5 mb-2.5 flex-wrap">
          {task.labels.map((l) => (
            <span key={l} className="text-[10px] px-2 py-0.5 bg-[#f1f5f9] text-[#64748b] rounded-full font-medium">{l}</span>
          ))}
        </div>
      )}

      <p className="text-[13px] font-medium text-[#0f172a] leading-snug mb-3">{task.title}</p>

      <div className="flex items-center justify-between">
        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: p.bg, color: p.color }}>
          {p.label}
        </span>
        <div className="flex items-center gap-2">
          {task.due_date && (
            <div className="flex items-center gap-1 text-[11px] text-[#94a3b8]">
              <Clock className="w-3 h-3" />
              {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          )}
          {task.assignee && (
            <div
              className="w-5 h-5 rounded-full bg-[#0ea5e9] flex items-center justify-center text-white text-[9px] font-semibold"
              title={task.assignee.full_name}
            >
              {getInitials(task.assignee.full_name)}
            </div>
          )}
        </div>
      </div>

      <button className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[#94a3b8]">
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  )
}

function ListView({ columns, tasks, onTaskClick }: { columns: Column[]; tasks: Task[]; onTaskClick: (t: Task) => void }) {
  const colMap = Object.fromEntries(columns.map((c) => [c.id, c]))

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-8 py-6"
    >
      <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-5 py-3 border-b border-[#f1f5f9] text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider">
          <span>Task</span><span>Status</span><span>Priority</span><span>Assignee</span><span>Due Date</span>
        </div>
        {tasks.length === 0 ? (
          <div className="px-5 py-10 text-center text-[13px] text-[#94a3b8]">No tasks found.</div>
        ) : (
          tasks.map((task, i) => {
            const p = priorityConfig[task.priority] || priorityConfig.medium
            const col = colMap[task.column_id]
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => onTaskClick(task)}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-5 py-3.5 border-b border-[#f8fafc] last:border-0 hover:bg-[#f8fafc] cursor-pointer transition-colors items-center"
              >
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded border border-[#e2e8f0] flex-shrink-0" />
                  <span className="text-[13px] font-medium text-[#0f172a]">{task.title}</span>
                  {task.labels?.slice(0, 2).map((l) => (
                    <span key={l} className="text-[10px] px-1.5 py-0.5 bg-[#f1f5f9] text-[#64748b] rounded-md">{l}</span>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  {col && <div className="w-1.5 h-1.5 rounded-full" style={{ background: col.color }} />}
                  <span className="text-[12px] text-[#64748b]">{col?.name || task.status}</span>
                </div>
                <span className="text-[11px] px-2 py-1 rounded-full font-medium w-fit" style={{ background: p.bg, color: p.color }}>
                  {p.label}
                </span>
                <div>
                  {task.assignee ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#0ea5e9] flex items-center justify-center text-white text-[10px] font-semibold">
                        {getInitials(task.assignee.full_name)}
                      </div>
                      <span className="text-[12px] text-[#64748b]">{task.assignee.full_name}</span>
                    </div>
                  ) : <span className="text-[12px] text-[#94a3b8]">—</span>}
                </div>
                <span className="text-[12px] text-[#64748b]">
                  {task.due_date
                    ? <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    : '—'}
                </span>
              </motion.div>
            )
          })
        )}
      </div>
    </motion.div>
  )
}
