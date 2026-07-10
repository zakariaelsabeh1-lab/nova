import type { Group, BoardColumn, ItemWithCells, CellValue } from '@/types'

function cellToText(value: CellValue, col: BoardColumn): string {
  if (value === null || value === undefined || value === '') return ''
  if (col.type === 'timeline' && typeof value === 'object') {
    const r = value as { from: string; to: string }
    return `${r.from ?? ''} - ${r.to ?? ''}`
  }
  if (col.type === 'checkbox') return value === true ? 'Yes' : 'No'
  return String(value)
}

function escapeCsv(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

// Builds a CSV string for a board and triggers a download.
export function exportBoardCsv(
  boardName: string,
  groups: Group[],
  columns: BoardColumn[],
  items: ItemWithCells[]
) {
  const cols = [...columns].sort((a, b) => a.position - b.position)
  const header = ['Group', 'Item', ...cols.map((c) => c.name)]
  const rows: string[][] = [header]
  const groupById = new Map(groups.map((g) => [g.id, g]))

  for (const it of items) {
    const group = groupById.get(it.group_id)
    rows.push([group?.name ?? '', it.name, ...cols.map((c) => cellToText(it.cells[c.id] ?? null, c))])
  }

  const csv = rows.map((r) => r.map((c) => escapeCsv(c)).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${boardName.replace(/\s+/g, '-').toLowerCase()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
