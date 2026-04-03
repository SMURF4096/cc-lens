import { NextResponse } from 'next/server'
import { readStatsCache, getSessions, readAllFacets, readHistory } from '@/lib/claude-reader'
import type { ExportPayload } from '@/types/claude'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { dateRange } = body as { dateRange?: { from?: string; to?: string } }

  const [stats, sessions, facets, history] = await Promise.all([
    readStatsCache(),
    getSessions(),
    readAllFacets(),
    readHistory(10_000),
  ])

  // Filter by date range if provided
  const fromMs = dateRange?.from ? new Date(dateRange.from).getTime() : null
  const toMs = dateRange?.to ? new Date(dateRange.to + 'T23:59:59.999Z').getTime() : null
  const filteredSessions = sessions.filter(s => {
    if (!s.start_time) return true
    const t = new Date(s.start_time).getTime()
    if (fromMs !== null && t < fromMs) return false
    if (toMs !== null && t > toMs) return false
    return true
  })

  const sessionIds = new Set(filteredSessions.map(s => s.session_id))
  const filteredFacets = facets.filter(f => sessionIds.has(f.session_id))

  const payload: ExportPayload = {
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    stats,
    sessions: filteredSessions,
    facets: filteredFacets,
    history,
  }

  return NextResponse.json(payload)
}
