import { createFileRoute } from '@tanstack/react-router'
import { getStore } from '@netlify/blobs'
import { getUser } from '@netlify/identity'
import type { BoardData, CursorPosition } from '../../lib/types'

// Sync endpoint: GET returns board state for polling, POST updates cursor position
export const Route = createFileRoute('/api/boards/$boardId/sync')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const user = await getUser()
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

        const url = new URL(request.url)
        const sinceVersion = parseInt(url.searchParams.get('since') || '0', 10)

        const store = getStore('whiteboards')
        const board = await store.get(`board:${user.id}:${params.boardId}`, { type: 'json' }) as BoardData | null
        if (!board) return Response.json({ error: 'Not found' }, { status: 404 })

        // Prune stale cursors (older than 10s)
        const now = Date.now()
        const activeCursors: Record<string, CursorPosition> = {}
        for (const [uid, cursor] of Object.entries(board.cursors || {})) {
          if (now - new Date(cursor.lastSeen).getTime() < 10000) {
            activeCursors[uid] = cursor
          }
        }

        return Response.json({
          version: board.version,
          hasChanges: board.version > sinceVersion,
          board: board.version > sinceVersion ? { ...board, cursors: activeCursors } : null,
          cursors: activeCursors,
        })
      },

      POST: async ({ request, params }) => {
        const user = await getUser()
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const store = getStore('whiteboards')
        const board = await store.get(`board:${user.id}:${params.boardId}`, { type: 'json' }) as BoardData | null
        if (!board) return Response.json({ error: 'Not found' }, { status: 404 })

        // Update cursor position
        const updatedBoard: BoardData = {
          ...board,
          cursors: {
            ...board.cursors,
            [user.id]: {
              x: body.x,
              y: body.y,
              name: user.name || user.email,
              color: body.color || '#6366f1',
              lastSeen: new Date().toISOString(),
            },
          },
        }

        await store.setJSON(`board:${user.id}:${params.boardId}`, updatedBoard)
        return Response.json({ ok: true })
      },
    },
  },
})
