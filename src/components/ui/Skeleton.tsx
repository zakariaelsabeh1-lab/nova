import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse bg-[#e2e8f0] rounded-lg', className)} />
  )
}

export function BoardSkeleton() {
  return (
    <div className="flex gap-4 px-8 py-6">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="w-[280px] flex-shrink-0">
          <div className="flex items-center gap-2 mb-3 px-1">
            <Skeleton className="w-2 h-2 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-4 w-6 rounded-full" />
          </div>
          <div className="bg-[#f1f5f9] rounded-2xl p-2 space-y-2">
            {Array.from({ length: i === 0 ? 3 : i === 1 ? 4 : i === 2 ? 2 : 1 }).map((_, j) => (
              <div key={j} className="bg-white rounded-xl p-3.5 border border-[#e2e8f0]">
                <Skeleton className="h-3 w-3/4 mb-2.5" />
                <Skeleton className="h-3 w-1/2 mb-3" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-12 rounded-full" />
                  <Skeleton className="h-5 w-5 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto px-8 py-8">
      <Skeleton className="h-8 w-64 mb-2" />
      <Skeleton className="h-4 w-80 mb-8" />
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-[#e2e8f0] rounded-2xl p-5">
            <div className="flex items-start justify-between mb-4">
              <Skeleton className="w-9 h-9 rounded-xl" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-8 w-16 mb-1.5" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
