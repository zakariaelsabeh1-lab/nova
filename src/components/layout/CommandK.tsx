import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, LayoutGrid, CircleDot, CornerDownLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCurrentWorkspaceId } from '@/lib/db/workspaces'
import { useWorkspaceBoards } from '@/lib/db/boards'

interface Hit {
  type: 'board' | 'item'
  id: string
  title: string
  subtitle: string
  color: string
  boardId: string
}

export function CommandK() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const navigate = useNavigate()
  const workspaceId = useCurrentWorkspaceId()
  const { data: boards = [] } = useWorkspaceBoards(workspaceId)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (!open) { setQuery(''); setActive(0) }
  }, [open])

  const { data: itemHits = [] } = useQuery({
    queryKey: ['cmdk-items', workspaceId, query],
    enabled: open && query.length >= 2 && !!workspaceId,
    queryFn: async () => {
      const boardIds = boards.map((b) => b.id)
      if (!boardIds.length) return []
      const { data } = await supabase
        .from('items')
        .select('id, name, board_id')
        .in('board_id', boardIds)
        .ilike('name', `%${query}%`)
        .limit(20)
      return data ?? []
    },
  })

  const hits: Hit[] = useMemo(() => {
    const boardMap = new Map(boards.map((b) => [b.id, b]))
    const boardHits: Hit[] = boards
      .filter((b) => !query || b.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 6)
      .map((b) => ({ type: 'board', id: b.id, title: b.name, subtitle: 'Board', color: b.color, boardId: b.id }))
    const iHits: Hit[] = (itemHits as { id: string; name: string; board_id: string }[]).map((it) => ({
      type: 'item',
      id: it.id,
      title: it.name || 'Untitled',
      subtitle: boardMap.get(it.board_id)?.name ?? 'Item',
      color: boardMap.get(it.board_id)?.color ?? '#0ea5e9',
      boardId: it.board_id,
    }))
    return [...boardHits, ...iHits]
  }, [boards, itemHits, query])

  const go = (hit: Hit) => {
    navigate(`/board/${hit.boardId}`)
    setOpen(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            className="relative w-full max-w-[560px] bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 border-b border-[#f1f5f9]">
              <Search className="w-4 h-4 text-[#94a3b8]" />
              <input
                autoFocus
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActive(0) }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)) }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
                  if (e.key === 'Enter' && hits[active]) go(hits[active])
                }}
                placeholder="Search boards and items…"
                className="flex-1 py-4 text-[15px] text-[#0f172a] placeholder-[#94a3b8] outline-none bg-transparent"
              />
              <kbd className="text-[10px] font-bold text-[#94a3b8] bg-[#f1f5f9] px-1.5 py-0.5 rounded">ESC</kbd>
            </div>
            <div className="max-h-[340px] overflow-y-auto p-2">
              {hits.length === 0 ? (
                <p className="text-center text-[13px] text-[#94a3b8] py-8">{query.length < 2 ? 'Type to search…' : 'No results'}</p>
              ) : (
                hits.map((hit, i) => (
                  <button
                    key={`${hit.type}-${hit.id}`}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(hit)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors"
                    style={{ background: active === i ? '#f1f5f9' : 'transparent' }}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: hit.color + '18' }}>
                      {hit.type === 'board' ? <LayoutGrid className="w-3.5 h-3.5" style={{ color: hit.color }} /> : <CircleDot className="w-3.5 h-3.5" style={{ color: hit.color }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#0f172a] truncate">{hit.title}</p>
                      <p className="text-[11px] text-[#94a3b8]">{hit.subtitle}</p>
                    </div>
                    {active === i && <CornerDownLeft className="w-3.5 h-3.5 text-[#cbd5e1]" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
