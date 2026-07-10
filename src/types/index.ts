// ============================================================================
// Nova domain types
// ============================================================================

export type UserRole = 'admin' | 'member' | 'viewer'
export type Plan = 'free' | 'pro'

// ── Legacy board model (still present in DB; used by not-yet-migrated views) ─
export type BoardType = 'tasks' | 'projects' | 'assignments' | 'vacation'
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  role: 'admin' | 'member'
  created_at: string
}

// ── Workspace layer ─────────────────────────────────────────────────────────
export interface Workspace {
  id: string
  name: string
  slug: string | null
  owner_id: string | null
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: UserRole
  created_at: string
  profile?: Profile
}

export interface Subscription {
  id: string
  workspace_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: Plan
  status: string
  seats: number
  current_period_end: string | null
  created_at: string
  updated_at: string
}

// ── Board structure ─────────────────────────────────────────────────────────
export interface Board {
  id: string
  workspace_id: string
  name: string
  type: BoardType
  description: string | null
  color: string
  template: string | null
  position: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface Group {
  id: string
  board_id: string
  name: string
  color: string
  position: number
  collapsed: boolean
  created_at: string
}

export type ColumnType =
  | 'text'
  | 'status'
  | 'person'
  | 'date'
  | 'timeline'
  | 'number'
  | 'priority'
  | 'checkbox'
  | 'last_updated'

export interface StatusLabel {
  label: string
  color: string
}

export interface ColumnSettings {
  // status: ordered label→color map, stored as { [label]: color }
  labels?: Record<string, string>
  // number
  unit?: string
  showSum?: boolean
  [key: string]: unknown
}

export interface BoardColumn {
  id: string
  board_id: string
  name: string
  type: ColumnType
  position: number
  width: number
  settings: ColumnSettings
  created_at: string
}

export interface Item {
  id: string
  board_id: string
  group_id: string
  name: string
  position: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Subitem {
  id: string
  parent_item_id: string
  name: string
  position: number
  values: Record<string, unknown>
  created_at: string
  updated_at: string
}

// value is column-type dependent (see cells registry). Stored as jsonb.
export type CellValue = string | number | boolean | { from: string; to: string } | null

export interface Cell {
  item_id: string
  column_id: string
  value: CellValue
  updated_at: string
}

// A denormalized item with its cell map, as consumed by the board views.
export interface ItemWithCells extends Item {
  cells: Record<string, CellValue> // keyed by column_id
}

// ── Collaboration ───────────────────────────────────────────────────────────
export interface Update {
  id: string
  item_id: string
  parent_id: string | null
  user_id: string
  body: string
  mentions: string[]
  created_at: string
  user?: Profile
  replies?: Update[]
}

export interface Activity {
  id: string
  board_id: string
  item_id: string | null
  user_id: string | null
  action: string
  field: string | null
  old_value: unknown
  new_value: unknown
  created_at: string
  user?: Profile
}

export interface FileRecord {
  id: string
  workspace_id: string
  item_id: string | null
  name: string
  path: string
  mime: string | null
  size_bytes: number
  uploaded_by: string | null
  created_at: string
  url?: string
}

// ── Automations ─────────────────────────────────────────────────────────────
export type AutomationTriggerType = 'status_changes'
export type AutomationActionType = 'notify_person' | 'move_to_group' | 'set_date'

export interface AutomationTrigger {
  type: AutomationTriggerType
  columnId: string
  to: string
}

export interface AutomationAction {
  type: AutomationActionType
  columnId?: string
  groupId?: string
  value?: string
}

export interface Automation {
  id: string
  board_id: string
  name: string
  trigger: AutomationTrigger
  actions: AutomationAction[]
  enabled: boolean
  created_by: string | null
  created_at: string
}

export interface AutomationRun {
  id: string
  automation_id: string
  item_id: string | null
  status: 'success' | 'error'
  detail: string | null
  created_at: string
}

// ── Notifications ───────────────────────────────────────────────────────────
export interface Notification {
  id: string
  user_id: string
  workspace_id: string | null
  actor_id: string | null
  type: 'mention' | 'assignment' | 'automation' | 'digest'
  title: string
  body: string
  read: boolean
  item_id: string | null
  board_id: string | null
  task_id: string | null
  link: string | null
  created_at: string
  actor?: Profile
}

// ── Legacy (kept for components not yet migrated) ───────────────────────────
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
