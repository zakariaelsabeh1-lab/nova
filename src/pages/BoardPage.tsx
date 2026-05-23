import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import {
  Plus,
  List,
  Kanban,
  MoreHorizontal,
  Clock,
  Search,
  Filter,
} from 'lucide-react'
import type { TaskPriority } from '@/types'

const boardConfig: Record<string, { name: string; color: string; description: string }> = {
  tasks: { name: 'Tasks', color: '#0ea5e9', description: 'Daily operational tasks' },
  projects: { name: 'Projects', color: '#8b5cf6', description: 'Active project pipelines' },
  assignments: { name: 'Assignments', color: '#f59e0b', description: 'Team assignments & reviews' },
  vacation: { name: 'Vacation', color: '#22c55e', description: 'Time-off & leave requests' },
}

const priorityConfig: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  urgent: { label: 'Urgent', color: '#ef4444', bg: '#fef2f2' },
  high: { label: 'High', color: '#f59e0b', bg: '#fffbeb' },
  medium: { label: 'Medium', color: '#0ea5e9', bg: '#f0f9ff' },
  low: { label: 'Low', color: '#94a3b8', bg: '#f8fafc' },
}

interface KanbanTask {
  id: string
  title: string
  priority: TaskPriority
  assignee: string | null
  due: string | null
  labels: string[]
}

interface KanbanColumn {
  id: string
  name: string
  color: string
  tasks: KanbanTask[]
}

const initialColumns: KanbanColumn[] = [
  {
    id: 'todo',
    name: 'To Do',
    color: '#94a3b8',
    tasks: [
      { id: 't1', title: 'Design system audit', priority: 'high', assignee: 'AL', due: 'May 26', labels: ['design'] },
      { id: 't2', title: 'Set up CI/CD pipeline', priority: 'medium', assignee: 'TM', due: 'May 28', labels: ['devops'] },
      { id: 't3', title: 'Write API documentation', priority: 'low', assignee: null, due: null, labels: ['docs'] },
    ],
  },
  {
    id: 'in_progress',
    name: 'In Progress',
    color: '#0ea5e9',
    tasks: [
      { id: 't4', title: 'Dashboard redesign', priority: 'urgent', assignee: 'SK', due: 'May 24', labels: ['design', 'frontend'] },
      { id: 't5', title: 'Auth flow implementation', priority: 'high', assignee: 'AL', due: 'May 25', labels: ['backend'] },
    ],
  },
  {
    id: 'review',
    name: 'Review',
    color: '#8b5cf6',
    tasks: [
      { id: 't6', title: 'Mobile responsive fixes', priority: 'medium', assignee: 'TM', due: 'May 23', labels: ['frontend'] },
    ],
  },
  {
    id: 'done',
    name: 'Done',
    color: '#22c55e',
    tasks: [
      { id: 't7', title: 'Initial project setup', priority: 'low', assignee: 'SK', due: null, labels: [] },
      { id: 't8', title: 'Database schema design', priority: 'high', assignee: 'AL', due: null, labels: ['backend'] },
    ],
  },
]

type View = 'kanban' | 'list'

export function BoardPage() {
  const { boardId = 'tasks' } = useParams()
  const config = boardConfig[boardId] || boardConfig.tasks
  const [view, setView] = useState<View>('kanban')
  const [columns, setColumns] = useState<KanbanColumn[]>(initialColumns)
  const [search, setSearch] = useState('')

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const newCols = columns.map((col) => ({ ...col, tasks: [...col.tasks] }))
    const srcCol = newCols.find((c) => c.id === source.droppableId)!
    const dstCol = newCols.find((c) => c.id === destination.droppableId)!
    const [moved] = srcCol.tasks.splice(source.index, 1)
    dstCol.tasks.splice(destination.index, 0, moved)
    setColumns(newCols)
  }

  const filteredColumns = columns.map((col) => ({
    ...col,
    tasks: search
      ? col.tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
      : col.tasks,
  }))

  return (
    <div className="flex flex-col h-full">
      {/* Board header */}
      <div className="px-8 py-5 bg-white border-b border-[#e2e8f0]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ background: config.color }} />
            <h1 className="text-[19px] font-bold text-[#0f172a] tracking-tight">{config.name}</h1>
            <span className="text-[13px] text-[#94a3b8]">—</span>
            <span className="text-[13px] text-[#64748b]">{config.description}</span>
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
                className={`p-1.5 rounded-lg transition-all ${view === 'kanban' ? 'bg-white shadow-sm text-[#0f172a]' : 'text-[#94a3b8] hover:text-[#64748b]'}`}
              >
                <Kanban className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-1.5 rounded-lg transition-all ${view === 'list' ? 'bg-white shadow-sm text-[#0f172a]' : 'text-[#94a3b8] hover:text-[#64748b]'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white rounded-xl transition-colors shadow-sm"
              style={{ background: config.color, boxShadow: `0 2px 8px ${config.color}40` }}
            >
              <Plus className="w-4 h-4" />
              Add Task
            </motion.button>
          </div>
        </div>
      </div>

      {/* Board content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {view === 'kanban' ? (
            <KanbanView
              key="kanban"
              columns={filteredColumns}
              onDragEnd={onDragEnd}
              accentColor={config.color}
            />
          ) : (
            <ListView
              key="list"
              columns={filteredColumns}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function KanbanView({
  columns,
  onDragEnd,
  accentColor: _accentColor,
}: {
  columns: KanbanColumn[]
  onDragEnd: (result: DropResult) => void
  accentColor: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="h-full overflow-x-auto"
    >
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 h-full px-8 py-6 min-w-max">
          {columns.map((col) => (
            <div key={col.id} className="flex flex-col w-[280px] flex-shrink-0">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                <span className="text-[13px] font-semibold text-[#0f172a]">{col.name}</span>
                <span className="ml-auto text-[11px] font-medium text-[#94a3b8] bg-[#f1f5f9] px-2 py-0.5 rounded-full">
                  {col.tasks.length}
                </span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 rounded-2xl p-2 transition-colors min-h-[100px] ${
                      snapshot.isDraggingOver ? 'bg-[#e2e8f0]' : 'bg-[#f1f5f9]'
                    }`}
                  >
                    {col.tasks.map((task, idx) => (
                      <Draggable key={task.id} draggableId={task.id} index={idx}>
                        {(prov, snap) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                          >
                            <TaskCard task={task} isDragging={snap.isDragging} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    <button className="w-full mt-2 py-2 flex items-center justify-center gap-1.5 text-[12px] text-[#94a3b8] hover:text-[#64748b] hover:bg-white/60 rounded-xl transition-all">
                      <Plus className="w-3.5 h-3.5" />
                      Add card
                    </button>
                  </div>
                )}
              </Droppable>
            </div>
          ))}

          <div className="flex-shrink-0 w-[280px]">
            <button className="w-full py-3 flex items-center justify-center gap-2 text-[13px] text-[#94a3b8] border-2 border-dashed border-[#e2e8f0] rounded-2xl hover:border-[#0ea5e9]/50 hover:text-[#0ea5e9] transition-all">
              <Plus className="w-4 h-4" />
              Add column
            </button>
          </div>
        </div>
      </DragDropContext>
    </motion.div>
  )
}

function TaskCard({ task, isDragging }: { task: KanbanTask; isDragging: boolean }) {
  const p = priorityConfig[task.priority]
  return (
    <motion.div
      layout
      className={`bg-white rounded-xl p-3.5 mb-2 border border-[#e2e8f0] cursor-pointer group relative transition-all ${
        isDragging ? 'shadow-xl rotate-1 border-[#0ea5e9]/30' : 'hover:shadow-md hover:border-[#0ea5e9]/20'
      }`}
    >
      {task.labels.length > 0 && (
        <div className="flex gap-1.5 mb-2.5 flex-wrap">
          {task.labels.map((l) => (
            <span key={l} className="text-[10px] px-2 py-0.5 bg-[#f1f5f9] text-[#64748b] rounded-full font-medium">
              {l}
            </span>
          ))}
        </div>
      )}

      <p className="text-[13px] font-medium text-[#0f172a] leading-snug mb-3">{task.title}</p>

      <div className="flex items-center justify-between">
        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: p.bg, color: p.color }}>
          {p.label}
        </span>
        <div className="flex items-center gap-2">
          {task.due && (
            <div className="flex items-center gap-1 text-[11px] text-[#94a3b8]">
              <Clock className="w-3 h-3" />
              {task.due}
            </div>
          )}
          {task.assignee && (
            <div className="w-5 h-5 rounded-full bg-[#0ea5e9] flex items-center justify-center text-white text-[9px] font-semibold">
              {task.assignee}
            </div>
          )}
        </div>
      </div>

      <button className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[#94a3b8] hover:text-[#64748b]">
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  )
}

function ListView({ columns }: { columns: KanbanColumn[] }) {
  const allTasks = columns.flatMap((col) =>
    col.tasks.map((t) => ({ ...t, columnName: col.name, columnColor: col.color }))
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="px-8 py-6"
    >
      <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-5 py-3 border-b border-[#f1f5f9] text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider">
          <span>Task</span>
          <span>Status</span>
          <span>Priority</span>
          <span>Assignee</span>
          <span>Due Date</span>
        </div>

        {allTasks.map((task, i) => {
          const p = priorityConfig[task.priority]
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-5 py-3.5 border-b border-[#f8fafc] last:border-0 hover:bg-[#f8fafc] cursor-pointer transition-colors items-center"
            >
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded border border-[#e2e8f0] flex-shrink-0" />
                <span className="text-[13px] font-medium text-[#0f172a]">{task.title}</span>
                {task.labels.slice(0, 2).map((l) => (
                  <span key={l} className="text-[10px] px-1.5 py-0.5 bg-[#f1f5f9] text-[#64748b] rounded-md">
                    {l}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: task.columnColor }} />
                <span className="text-[12px] text-[#64748b]">{task.columnName}</span>
              </div>
              <span className="text-[11px] px-2 py-1 rounded-full font-medium w-fit" style={{ background: p.bg, color: p.color }}>
                {p.label}
              </span>
              <div>
                {task.assignee ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#0ea5e9] flex items-center justify-center text-white text-[10px] font-semibold">
                      {task.assignee}
                    </div>
                  </div>
                ) : (
                  <span className="text-[12px] text-[#94a3b8]">—</span>
                )}
              </div>
              <span className="text-[12px] text-[#64748b]">
                {task.due ? (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {task.due}
                  </span>
                ) : '—'}
              </span>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
