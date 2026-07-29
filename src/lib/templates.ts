import type { ColumnType } from '@/types'

// Board templates used by "+ Add board". Each provisions groups, typed columns,
// a few sample items, and prebuilt automations (created in automations layer).
export interface TemplateColumn {
  name: string
  type: ColumnType
  width?: number
  settings?: Record<string, unknown>
}
export interface TemplateGroup {
  name: string
  color: string
  items: { name: string; cells?: Record<string, unknown> }[]
}
export interface BoardTemplate {
  key: string
  label: string
  description: string
  color: string
  icon: string // lucide icon name
  columns: TemplateColumn[]
  groups: TemplateGroup[]
}

const STATUS = (labels: Record<string, string>) => ({
  name: 'Status',
  type: 'status' as ColumnType,
  width: 150,
  settings: { labels },
})

export const TEMPLATES: BoardTemplate[] = [
  {
    key: 'project_plan',
    label: 'Project Plan',
    description: 'Plan phases, owners, and timelines for a project.',
    color: '#0ea5e9',
    icon: 'FolderKanban',
    columns: [
      STATUS({ 'Not started': '#94a3b8', 'Working on it': '#f59e0b', Stuck: '#ef4444', Done: '#22c55e' }),
      { name: 'Owner', type: 'person', width: 140 },
      { name: 'Timeline', type: 'timeline', width: 200 },
      { name: 'Priority', type: 'priority', width: 120 },
      { name: 'Budget', type: 'number', width: 120, settings: { unit: '$', showSum: true } },
    ],
    groups: [
      {
        name: 'Discovery',
        color: '#0ea5e9',
        items: [
          { name: 'Kickoff & requirements' },
          { name: 'Stakeholder interviews' },
        ],
      },
      {
        name: 'Execution',
        color: '#8b5cf6',
        items: [{ name: 'Build MVP' }, { name: 'Internal review' }],
      },
      { name: 'Launch', color: '#22c55e', items: [{ name: 'Ship v1' }] },
    ],
  },
  {
    key: 'sprint',
    label: 'Sprint',
    description: 'Track a two-week sprint from backlog to done.',
    color: '#6366f1',
    icon: 'Zap',
    columns: [
      STATUS({ Backlog: '#94a3b8', 'In progress': '#0ea5e9', Review: '#8b5cf6', Done: '#22c55e' }),
      { name: 'Assignee', type: 'person', width: 140 },
      { name: 'Story points', type: 'number', width: 130, settings: { showSum: true } },
      { name: 'Due', type: 'date', width: 140 },
      { name: 'Priority', type: 'priority', width: 120 },
    ],
    groups: [
      {
        name: 'This sprint',
        color: '#6366f1',
        items: [{ name: 'Auth flow' }, { name: 'Board drag & drop' }, { name: 'Dashboard charts' }],
      },
      { name: 'Backlog', color: '#94a3b8', items: [{ name: 'Mobile polish' }, { name: 'Timeline view' }] },
    ],
  },
  {
    key: 'crm',
    label: 'CRM Pipeline',
    description: 'Manage leads through your sales stages.',
    color: '#f59e0b',
    icon: 'ClipboardList',
    columns: [
      STATUS({ New: '#94a3b8', Contacted: '#0ea5e9', Negotiating: '#f59e0b', Won: '#22c55e', Lost: '#ef4444' }),
      { name: 'Owner', type: 'person', width: 140 },
      { name: 'Deal size', type: 'number', width: 130, settings: { unit: '$', showSum: true } },
      { name: 'Close date', type: 'date', width: 140 },
    ],
    groups: [
      {
        name: 'Hot leads',
        color: '#f59e0b',
        items: [{ name: 'Acme Corp' }, { name: 'Globex' }],
      },
      { name: 'Warm', color: '#0ea5e9', items: [{ name: 'Initech' }] },
    ],
  },
  {
    key: 'content',
    label: 'Content Calendar',
    description: 'Schedule and publish content across channels.',
    color: '#22c55e',
    icon: 'CheckSquare',
    columns: [
      STATUS({ Idea: '#94a3b8', Draft: '#0ea5e9', 'In review': '#f59e0b', Published: '#22c55e' }),
      { name: 'Writer', type: 'person', width: 140 },
      { name: 'Publish date', type: 'date', width: 150 },
      { name: 'Channel', type: 'text', width: 140 },
    ],
    groups: [
      {
        name: 'This week',
        color: '#22c55e',
        items: [{ name: 'Launch announcement' }, { name: 'Feature deep-dive' }],
      },
      { name: 'Ideas', color: '#94a3b8', items: [{ name: 'Customer story' }] },
    ],
  },
  {
    key: 'vacation',
    label: 'Vacation / Time Off',
    description: 'Track team time-off: status, leave type, dates and day counts.',
    color: '#14b8a6',
    icon: 'Palmtree',
    columns: [
      STATUS({ Requested: '#f59e0b', Approved: '#22c55e', Declined: '#ef4444' }),
      { name: 'Employee', type: 'person', width: 150 },
      // second status column = colored "tags" for the kind of leave
      {
        name: 'Leave type',
        type: 'status',
        width: 140,
        settings: { labels: { Vacation: '#0ea5e9', Sick: '#8b5cf6', Personal: '#f59e0b', Unpaid: '#94a3b8' } },
      },
      { name: 'Dates', type: 'timeline', width: 210 }, // shows on Calendar + Timeline views
      { name: 'Days', type: 'number', width: 90, settings: { showSum: true } },
      { name: 'Notes', type: 'text', width: 160 },
    ],
    groups: [
      { name: 'Pending requests', color: '#f59e0b', items: [{ name: 'Time-off request' }] },
      { name: 'Approved', color: '#22c55e', items: [] },
      { name: 'This year', color: '#0ea5e9', items: [] },
    ],
  },
  {
    key: 'tasks',
    label: 'Team Tasks',
    description: 'A simple task tracker with owners, due dates and priority.',
    color: '#0ea5e9',
    icon: 'CheckSquare',
    columns: [
      STATUS({ 'To do': '#94a3b8', 'In progress': '#0ea5e9', 'In review': '#8b5cf6', Done: '#22c55e' }),
      { name: 'Owner', type: 'person', width: 140 },
      { name: 'Priority', type: 'priority', width: 120 },
      { name: 'Due date', type: 'date', width: 140 },
      { name: 'Done', type: 'checkbox', width: 80 },
    ],
    groups: [
      { name: 'This week', color: '#0ea5e9', items: [{ name: 'Finish onboarding flow' }, { name: 'Review pull requests' }] },
      { name: 'Later', color: '#94a3b8', items: [{ name: 'Plan next quarter' }] },
    ],
  },
]

export function getTemplate(key: string): BoardTemplate | undefined {
  return TEMPLATES.find((t) => t.key === key)
}
