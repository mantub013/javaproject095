import { createFileRoute } from '@tanstack/react-router'
import { getStore } from '@netlify/blobs'
import { getUser } from '@netlify/identity'
import { v4 as uuidv4 } from 'uuid'
import type { BoardData, BoardMeta } from '../../lib/types'

export const Route = createFileRoute('/api/boards')({
  server: {
    handlers: {
      GET: async () => {
        const user = await getUser()
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

        const store = getStore('whiteboards')
        const { blobs } = await store.list({ prefix: `board:${user.id}:` })

        const boards: BoardMeta[] = []
        for (const blob of blobs) {
          const data = await store.get(blob.key, { type: 'json' }) as BoardData | null
          if (data) {
            boards.push({
              id: data.id,
              name: data.name,
              ownerId: data.ownerId,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            })
          }
        }

        boards.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        return Response.json(boards)
      },

      POST: async ({ request }) => {
        const user = await getUser()
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const id = uuidv4()
        const now = new Date().toISOString()

        const board: BoardData = {
          id,
          name: body.name || 'Untitled Board',
          ownerId: user.id,
          createdAt: now,
          updatedAt: now,
          version: 1,
          elements: [],
          background: '#ffffff',
          messages: [],
          cursors: {},
        }

        const store = getStore('whiteboards')
        await store.setJSON(`board:${user.id}:${id}`, board)

        return Response.json(board, { status: 201 })
      },
    },
  },
})
