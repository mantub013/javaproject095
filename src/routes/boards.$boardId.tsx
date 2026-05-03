import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useRef } from 'react'
import { ArrowLeft, MessageCircle, Users, Save, CheckCircle2 } from 'lucide-react'
import { Canvas } from '@/components/whiteboard/Canvas'
import { Toolbar } from '@/components/whiteboard/Toolbar'
import { ChatPanel } from '@/components/whiteboard/ChatPanel'
import { useIdentity } from '@/lib/identity-context'
import type { DrawingElement, ChatMessage, CursorPosition, Tool, BoardData } from '@/lib/types'
import { v4 as uuidv4 } from 'uuid'

export const Route = createFileRoute('/boards/$boardId')({
  component: WhiteboardPage,
})

const USER_COLORS = ['#6366f1', '#ec4899', '#f97316', '#22c55e', '#06b6d4', '#8b5cf6', '#eab308']
function getUserColor(userId: string) {
  let hash = 0
  for (const c of userId) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff
  return USER_COLORS[hash % USER_COLORS.length]
}

function WhiteboardPage() {
  const { boardId } = Route.useParams()
  const { user, ready } = useIdentity()
  const navigate = useNavigate()

  const [board, setBoard] = useState<BoardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(4)
  const [darkMode, setDarkMode] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [chatOpen, setChatOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [syncVersion, setSyncVersion] = useState(0)

  const undoStack = useRef<DrawingElement[][]>([])
  const redoStack = useRef<DrawingElement[][]>([])
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cursorTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const syncTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastCursor = useRef({ x: 0, y: 0 })
  const userColor = user ? getUserColor(user.id) : '#6366f1'

  // Redirect if not authenticated
  useEffect(() => {
    if (ready && !user) navigate({ to: '/login' })
  }, [ready, user, navigate])

  // Initial load
  useEffect(() => {
    if (!user) return
    fetch(`/api/boards/${boardId}`)
      .then(r => r.ok ? r.json() : Promise.reject('Not found'))
      .then((data: BoardData) => {
        setBoard(data)
        setSyncVersion(data.version)
        setLoading(false)
      })
      .catch(() => { setError('Board not found'); setLoading(false) })
  }, [boardId, user])

  // Cursor sync (send own cursor every 1s)
  useEffect(() => {
    if (!user || !board) return
    cursorTimer.current = setInterval(() => {
      fetch(`/api/boards/${boardId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...lastCursor.current, color: userColor }),
      }).catch(() => {})
    }, 1500)
    return () => { if (cursorTimer.current) clearInterval(cursorTimer.current) }
  }, [user, board, boardId, userColor])

  // Poll for remote changes every 2s
  useEffect(() => {
    if (!user || !board) return
    syncTimer.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/boards/${boardId}/sync?since=${syncVersion}`)
        if (!r.ok) return
        const data = await r.json()
        if (data.hasChanges && data.board) {
          setBoard(prev => {
            if (!prev) return data.board
            // Merge: keep local elements if version matches, accept remote otherwise
            return {
              ...data.board,
              // Preserve local elements if we have unsaved changes beyond remote version
              elements: prev.version > data.board.version ? prev.elements : data.board.elements,
              cursors: data.cursors,
            }
          })
          setSyncVersion(data.board.version)
        } else if (data.cursors) {
          setBoard(prev => prev ? { ...prev, cursors: data.cursors } : prev)
        }
      } catch {}
    }, 2000)
    return () => { if (syncTimer.current) clearInterval(syncTimer.current) }
  }, [user, board, boardId, syncVersion])

  const saveBoard = useCallback(async (elements: DrawingElement[], messages?: ChatMessage[]) => {
    if (!board) return
    setSaving(true)
    try {
      const payload = {
        elements,
        messages: messages ?? board.messages,
        name: board.name,
        background: board.background,
      }
      const r = await fetch(`/api/boards/${boardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (r.ok) {
        const updated = await r.json()
        setSyncVersion(updated.version)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }, [board, boardId])

  const debounceSave = useCallback((elements: DrawingElement[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveBoard(elements), 1500)
  }, [saveBoard])

  const handleElementsChange = useCallback((newElements: DrawingElement[]) => {
    setBoard(prev => {
      if (!prev) return prev
      undoStack.current.push(prev.elements)
      if (undoStack.current.length > 50) undoStack.current.shift()
      redoStack.current = []
      return { ...prev, elements: newElements }
    })
    debounceSave(newElements)
  }, [debounceSave])

  const handleUndo = useCallback(() => {
    if (!undoStack.current.length || !board) return
    const prev = undoStack.current.pop()!
    redoStack.current.push(board.elements)
    setBoard(b => b ? { ...b, elements: prev } : b)
    debounceSave(prev)
  }, [board, debounceSave])

  const handleRedo = useCallback(() => {
    if (!redoStack.current.length || !board) return
    const next = redoStack.current.pop()!
    undoStack.current.push(board.elements)
    setBoard(b => b ? { ...b, elements: next } : b)
    debounceSave(next)
  }, [board, debounceSave])

  const handleClear = useCallback(() => {
    if (!board || !confirm('Clear the entire board?')) return
    handleElementsChange([])
  }, [board, handleElementsChange])

  const handleExportPng = useCallback(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `${board?.name || 'whiteboard'}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [board])

  const handleExportPdf = useCallback(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>${board?.name || 'Whiteboard'}</title>
      <style>body{margin:0}img{width:100%;height:auto}</style></head>
      <body><img src="${dataUrl}" onload="window.print();window.close()" /></body></html>
    `)
    win.document.close()
  }, [board])

  const handleSendChat = useCallback(async (text: string) => {
    if (!board || !user) return
    const msg: ChatMessage = {
      id: uuidv4(),
      userId: user.id,
      userName: user.name || user.email || 'User',
      text,
      timestamp: new Date().toISOString(),
    }
    const newMessages = [...board.messages, msg]
    setBoard(prev => prev ? { ...prev, messages: newMessages } : prev)
    await saveBoard(board.elements, newMessages)
  }, [board, user, saveBoard])

  const handleCursorMove = useCallback((x: number, y: number) => {
    lastCursor.current = { x, y }
  }, [])

  if (!ready || loading) {
    return (
      <div className={`flex items-center justify-center h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading board…</p>
        </div>
      </div>
    )
  }

  if (error || !board) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Board not found'}</p>
          <Link to="/boards" className="text-indigo-600 underline">← Back to boards</Link>
        </div>
      </div>
    )
  }

  const otherCursors: Record<string, CursorPosition> = {}
  for (const [uid, c] of Object.entries(board.cursors || {})) {
    if (uid !== user?.id) otherCursors[uid] = c
  }
  const activeUsers = Object.keys(otherCursors).length + 1

  const bg = darkMode ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'

  return (
    <div className={`flex flex-col h-screen ${bg}`}>
      {/* Header */}
      <div className={`flex items-center gap-3 px-4 py-2 border-b ${darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'} z-10`}>
        <Link to="/boards" className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <ArrowLeft size={18} />
        </Link>
        <h1 className="font-semibold text-sm flex-1 truncate">{board.name}</h1>

        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
          <Users size={12} />
          {activeUsers} online
        </div>

        {saving ? (
          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>Saving…</span>
        ) : saved ? (
          <span className="text-xs text-green-500 flex items-center gap-1"><CheckCircle2 size={12} />Saved</span>
        ) : null}

        <button
          onClick={() => saveBoard(board.elements)}
          className="px-3 py-1.5 text-xs bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
        >
          <Save size={14} />
        </button>

        <button
          onClick={() => setChatOpen(o => !o)}
          className={`relative p-1.5 rounded-lg ${chatOpen ? 'bg-indigo-500 text-white' : darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
        >
          <MessageCircle size={18} />
          {board.messages.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">
              {board.messages.length > 9 ? '9+' : board.messages.length}
            </span>
          )}
        </button>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        <Toolbar
          tool={tool}
          color={color}
          brushSize={brushSize}
          darkMode={darkMode}
          onToolChange={setTool}
          onColorChange={setColor}
          onBrushSizeChange={setBrushSize}
          onDarkModeToggle={() => setDarkMode(d => !d)}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
          onExportPng={handleExportPng}
          onExportPdf={handleExportPdf}
          onZoomIn={() => setZoom(z => Math.min(z + 0.25, 3))}
          onZoomOut={() => setZoom(z => Math.max(z - 0.25, 0.25))}
          canUndo={undoStack.current.length > 0}
          canRedo={redoStack.current.length > 0}
        />

        <Canvas
          elements={board.elements}
          cursors={otherCursors}
          currentUserId={user?.id || ''}
          tool={tool}
          color={color}
          brushSize={brushSize}
          darkMode={darkMode}
          zoom={zoom}
          onElementsChange={handleElementsChange}
          onCursorMove={handleCursorMove}
        />

        {chatOpen && (
          <ChatPanel
            messages={board.messages}
            currentUserId={user?.id || ''}
            darkMode={darkMode}
            onSend={handleSendChat}
            onClose={() => setChatOpen(false)}
          />
        )}
      </div>
    </div>
  )
}
