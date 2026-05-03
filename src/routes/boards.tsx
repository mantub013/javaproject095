import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Clock, Layout, LogOut, Sun, Moon } from 'lucide-react'
import { useIdentity } from '@/lib/identity-context'
import type { BoardMeta } from '@/lib/types'

export const Route = createFileRoute('/boards')({
  component: BoardsPage,
})

function BoardsPage() {
  const { user, ready, logout } = useIdentity()
  const navigate = useNavigate()
  const [boards, setBoards] = useState<BoardMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    if (ready && !user) navigate({ to: '/login' })
  }, [ready, user, navigate])

  useEffect(() => {
    if (!user) return
    fetch('/api/boards')
      .then(r => r.json())
      .then(data => { setBoards(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [user])

  const handleCreate = async () => {
    const name = newName.trim() || 'Untitled Board'
    setCreating(true)
    try {
      const r = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (r.ok) {
        const board = await r.json()
        navigate({ to: '/boards/$boardId', params: { boardId: board.id } })
      }
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this board?')) return
    await fetch(`/api/boards/${id}`, { method: 'DELETE' })
    setBoards(prev => prev.filter(b => b.id !== id))
  }

  const handleLogout = async () => {
    await logout()
    navigate({ to: '/login' })
  }

  const bg = darkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'
  const cardBg = darkMode ? 'bg-gray-900 border-gray-800 hover:border-indigo-500' : 'bg-white border-gray-200 hover:border-indigo-300'
  const headerBg = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'

  if (!ready || (ready && !user)) {
    return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Header */}
      <header className={`border-b ${headerBg} px-6 py-4`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <Layout size={16} className="text-white" />
            </div>
            <h1 className="text-xl font-bold">Collaboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {user?.name || user?.email}
            </span>
            <button onClick={() => setDarkMode(d => !d)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={handleLogout} className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}>
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">My Boards</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            <Plus size={16} />
            New Board
          </button>
        </div>

        {/* Create dialog */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-xl p-6 w-full max-w-sm shadow-2xl`}>
              <h3 className="font-semibold text-lg mb-4">Create New Board</h3>
              <input
                autoFocus
                className={`w-full border rounded-lg px-3 py-2 mb-4 outline-none focus:ring-2 focus:ring-indigo-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                placeholder="Board name…"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowCreate(false) }}
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowCreate(false)} className={`px-4 py-2 rounded-lg text-sm ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                  Cancel
                </button>
                <button onClick={handleCreate} disabled={creating}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600 disabled:opacity-50">
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : boards.length === 0 ? (
          <div className={`text-center py-20 rounded-2xl border-2 border-dashed ${darkMode ? 'border-gray-800 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
            <Layout size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium mb-2">No boards yet</p>
            <p className="text-sm mb-4">Create your first collaborative whiteboard</p>
            <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600">
              Create Board
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {boards.map(board => (
              <Link
                key={board.id}
                to="/boards/$boardId"
                params={{ boardId: board.id }}
                className={`group relative border rounded-xl p-5 transition-all cursor-pointer ${cardBg}`}
              >
                <div className={`w-full h-24 rounded-lg mb-3 flex items-center justify-center ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <Layout size={28} className="text-indigo-400 opacity-60" />
                </div>
                <h3 className="font-medium truncate">{board.name}</h3>
                <div className={`flex items-center gap-1 text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  <Clock size={11} />
                  {new Date(board.updatedAt).toLocaleDateString()}
                </div>
                <button
                  onClick={(e) => handleDelete(board.id, e)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
