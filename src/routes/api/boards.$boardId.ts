import { createFileRoute } from '@tanstack/react-router'
import { getStore } from '@netlify/blobs'
import { getUser } from '@netlify/identity'
import type { BoardData } from '../../lib/types'

async function findBoard(boardId: string, userId: string, store: ReturnType<typeof getStore>): Promise<BoardData | null> {
  // Try owner key
  const owned = await store.get(`board:${userId}:${boardId}`, { type: 'json' }) as BoardData | null
  if (owned) return owned
  // Try shared boards (scan by boardId suffix - limited but workable for demo)
  return null
}

export const Route = createFileRoute('/api/boards/$boardId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const user = await getUser()
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

        const store = getStore('whiteboards')
        const board = await findBoard(params.boardId, user.id, store)
        if (!board) return Response.json({ error: 'Not found' }, { status: 404 })

        return Response.json(board)
      },

      PUT: async ({ request, params }) => {
        const user = await getUser()
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

        const store = getStore('whiteboards')
        const existing = await findBoard(params.boardId, user.id, store)
        if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

        const body = await request.json()
        const updated: BoardData = {
          ...existing,
          ...body,
          id: existing.id,
          ownerId: existing.ownerId,
          updatedAt: new Date().toISOString(),
          version: (existing.version || 0) + 1,
        }

        await store.setJSON(`board:${existing.ownerId}:${existing.id}`, updated)
        return Response.json(updated)
      },

      DELETE: async ({ params }) => {
        const user = await getUser()
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

        const store = getStore('whiteboards')
        const board = await findBoard(params.boardId, user.id, store)
        if (!board) return Response.json({ error: 'Not found' }, { status: 404 })
        if (board.ownerId !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 })

        await store.delete(`board:${user.id}:${params.boardId}`)
        return new Response(null, { status: 204 })
      },
    },
  },
})
