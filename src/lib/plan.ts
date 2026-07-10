import type { Plan } from '@/types'

// ── Feature flags gated by plan ─────────────────────────────────────────────
export type GatedFeature =
  | 'timeline_view'
  | 'dashboard_view'
  | 'csv_export'
  | 'unlimited_boards'
  | 'unlimited_members'
  | 'unlimited_automations'

export interface PlanLimits {
  boards: number // -1 = unlimited
  members: number
  automations: number
  storageBytes: number
  timelineView: boolean
  dashboardView: boolean
  csvExport: boolean
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    boards: 2,
    members: 3,
    automations: 5,
    storageBytes: 100 * 1024 * 1024, // 100 MB
    timelineView: false,
    dashboardView: false,
    csvExport: false,
  },
  pro: {
    boards: -1,
    members: -1,
    automations: -1,
    storageBytes: 10 * 1024 * 1024 * 1024, // 10 GB
    timelineView: true,
    dashboardView: true,
    csvExport: true,
  },
}

export const PRO_PRICE_MONTHLY = 12 // USD / user / month

export function featureEnabled(plan: Plan, feature: GatedFeature): boolean {
  const l = PLAN_LIMITS[plan]
  switch (feature) {
    case 'timeline_view':
      return l.timelineView
    case 'dashboard_view':
      return l.dashboardView
    case 'csv_export':
      return l.csvExport
    case 'unlimited_boards':
      return l.boards === -1
    case 'unlimited_members':
      return l.members === -1
    case 'unlimited_automations':
      return l.automations === -1
  }
}

export const FEATURE_COPY: Record<GatedFeature, { title: string; blurb: string }> = {
  timeline_view: {
    title: 'Timeline & Gantt',
    blurb: 'Visualize your work on a timeline with dependency-ready bars and a today marker.',
  },
  dashboard_view: {
    title: 'Dashboards',
    blurb: 'Real-time charts — status breakdowns, workload by person, and number rollups.',
  },
  csv_export: {
    title: 'CSV Export',
    blurb: 'Export any board to CSV for reporting and backups.',
  },
  unlimited_boards: {
    title: 'Unlimited boards',
    blurb: 'Create as many boards as your team needs.',
  },
  unlimited_members: {
    title: 'Unlimited members',
    blurb: 'Invite your whole team without seat limits.',
  },
  unlimited_automations: {
    title: 'Unlimited automations',
    blurb: 'Automate every workflow without hitting a cap.',
  },
}
