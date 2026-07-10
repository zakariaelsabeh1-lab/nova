import type { ReactNode } from 'react'
import { usePlan } from '@/lib/db/workspaces'
import { featureEnabled, type GatedFeature } from '@/lib/plan'
import { Paywall } from './Paywall'

// Renders children when the workspace plan unlocks `feature`, else a paywall.
export function Gate({
  feature,
  workspaceId,
  children,
  fallback,
}: {
  feature: GatedFeature
  workspaceId: string | null
  children: ReactNode
  fallback?: ReactNode
}) {
  const { plan, isLoading } = usePlan(workspaceId)
  if (isLoading) return null
  if (featureEnabled(plan, feature)) return <>{children}</>
  return <>{fallback ?? <Paywall feature={feature} workspaceId={workspaceId} />}</>
}
