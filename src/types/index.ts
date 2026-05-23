export type UserRole = 'admin' | 'member'

export type BoardType = 'tasks' | 'projects' | 'assignments' | 'vacation'

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  role: UserRole
  created_at: string
}

export interface Board {
  id: string
  name: string
  type: BoardType
  description: string | null
  color: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface Column {
  id: string
  board_id: string
  name: string
  color: string
  position: number
  created_at: string
}

export interface Task {
  id: string
  board_id: string
  column_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assignee_id: string | null
  created_by: string
  due_date: string | null
  position: number
  labels: string[]
  created_at: string
  updated_at: string
  assignee?: Profile
  creator?: Profile
  comments?: Comment[]
}

export interface Comment {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  user?: Profile
}

export interface Notification {
  id: string
  user_id: string
  type: 'mention' | 'assignment' | 'digest'
  title: string
  body: string
  read: boolean
  task_id: string | null
  created_at: string
}

export interface Invite {
  id: string
  email: string
  role: UserRole
  token: string
  invited_by: string
  used: boolean
  expires_at: string
  created_at: string
}
