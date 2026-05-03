import {
  useRef, useEffect, useState, useCallback,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { v4 as uuidv4 } from 'uuid'
import type {
  Tool, DrawingElement, PathElement, RectElement,
  CircleElement, LineElement, TextElement, StickyElement,
  CursorPosition,
} from '@/lib/types'

interface CanvasProps {
  elements: DrawingElement[]
  cursors: Record<string, CursorPosition>
  currentUserId: string
  tool: Tool
  color: string
  brushSize: number
  darkMode: boolean
  zoom: number
  onElementsChange: (els: DrawingElement[]) => void
  onCursorMove: (x: number, y: number) => void
}

function getCanvasPos(canvas: HTMLCanvasElement, e: { clientX: number; clientY: number }, zoom: number) {
  const rect = canvas.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left) / zoom,
    y: (e.clientY - rect.top) / zoom,
  }
}

function drawElement(ctx: CanvasRenderingContext2D, el: DrawingElement) {
  ctx.save()
  switch (el.type) {
    case 'path': {
      if (el.points.length < 2) break
      ctx.beginPath()
      ctx.strokeStyle = el.color
      ctx.lineWidth = el.strokeWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.moveTo(el.points[0][0], el.points[0][1])
      for (let i = 1; i < el.points.length; i++) {
        ctx.lineTo(el.points[i][0], el.points[i][1])
      }
      ctx.stroke()
      break
    }
    case 'rect': {
      ctx.strokeStyle = el.color
      ctx.lineWidth = el.strokeWidth
      if (el.fill && el.fill !== 'transparent') {
        ctx.fillStyle = el.fill
        ctx.fillRect(el.x, el.y, el.width, el.height)
      }
      ctx.strokeRect(el.x, el.y, el.width, el.height)
      break
    }
    case 'circle': {
      ctx.beginPath()
      ctx.strokeStyle = el.color
      ctx.lineWidth = el.strokeWidth
      ctx.ellipse(el.cx, el.cy, Math.abs(el.rx), Math.abs(el.ry), 0, 0, Math.PI * 2)
      if (el.fill && el.fill !== 'transparent') {
        ctx.fillStyle = el.fill
        ctx.fill()
      }
      ctx.stroke()
      break
    }
    case 'line': {
      ctx.beginPath()
      ctx.strokeStyle = el.color
      ctx.lineWidth = el.strokeWidth
      ctx.lineCap = 'round'
      ctx.moveTo(el.x1, el.y1)
      ctx.lineTo(el.x2, el.y2)
      ctx.stroke()
      break
    }
    case 'text': {
      ctx.font = `${el.fontSize}px sans-serif`
      ctx.fillStyle = el.color
      const lines = el.text.split('\n')
      lines.forEach((line, i) => {
        ctx.fillText(line, el.x, el.y + i * (el.fontSize + 4))
      })
      break
    }
    case 'sticky': {
      // Background
      ctx.fillStyle = el.fill || '#fef08a'
      ctx.shadowColor = 'rgba(0,0,0,0.15)'
      ctx.shadowBlur = 8
      ctx.shadowOffsetY = 2
      ctx.beginPath()
      ctx.roundRect(el.x, el.y, el.width, el.height, 4)
      ctx.fill()
      ctx.shadowColor = 'transparent'
      // Text
      ctx.fillStyle = '#1f2937'
      ctx.font = '14px sans-serif'
      ctx.textBaseline = 'top'
      const words = el.text.split(' ')
      let line = ''
      let lineY = el.y + 12
      const maxWidth = el.width - 24
      for (const word of words) {
        const test = line + word + ' '
        if (ctx.measureText(test).width > maxWidth && line) {
          ctx.fillText(line.trim(), el.x + 12, lineY)
          line = word + ' '
          lineY += 18
        } else {
          line = test
        }
      }
      if (line) ctx.fillText(line.trim(), el.x + 12, lineY)
      break
    }
  }
  ctx.restore()
}

function drawCursors(
  ctx: CanvasRenderingContext2D,
  cursors: Record<string, CursorPosition>,
  excludeId: string,
) {
  for (const [uid, cursor] of Object.entries(cursors)) {
    if (uid === excludeId) continue
    ctx.save()
    ctx.beginPath()
    ctx.arc(cursor.x, cursor.y, 6, 0, Math.PI * 2)
    ctx.fillStyle = cursor.color
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.font = '12px sans-serif'
    ctx.fillStyle = cursor.color
    const label = cursor.name || 'User'
    const metrics = ctx.measureText(label)
    ctx.fillStyle = cursor.color
    ctx.beginPath()
    ctx.roundRect(cursor.x + 10, cursor.y - 18, metrics.width + 10, 18, 4)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.fillText(label, cursor.x + 15, cursor.y - 5)
    ctx.restore()
  }
}

const STICKY_COLORS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecdd3', '#e9d5ff']

export function Canvas({
  elements, cursors, currentUserId, tool, color, brushSize,
  darkMode, zoom, onElementsChange, onCursorMove,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const drawing = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })
  const currentPath = useRef<[number, number][]>([])
  const [tempElement, setTempElement] = useState<DrawingElement | null>(null)
  const [editingText, setEditingText] = useState<{ id: string | null; x: number; y: number; text: string } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null)

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Background
    ctx.fillStyle = darkMode ? '#1e1e2e' : '#fafafa'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Grid
    ctx.strokeStyle = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'
    ctx.lineWidth = 1
    const gridSize = 30
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
    }

    // Elements
    for (const el of elements) {
      if (el.type === 'path' && tool === 'eraser') {
        // already handled
      }
      drawElement(ctx, el)

      // Selection highlight
      if (el.id === selectedId && tool === 'select') {
        ctx.save()
        ctx.strokeStyle = '#6366f1'
        ctx.lineWidth = 2
        ctx.setLineDash([4, 4])
        const pad = 6
        switch (el.type) {
          case 'rect':
            ctx.strokeRect(el.x - pad, el.y - pad, el.width + pad * 2, el.height + pad * 2)
            break
          case 'circle':
            ctx.beginPath()
            ctx.ellipse(el.cx, el.cy, el.rx + pad, el.ry + pad, 0, 0, Math.PI * 2)
            ctx.stroke()
            break
          case 'text':
          case 'sticky':
            ctx.strokeRect(el.x - pad, el.y - pad, (el as any).width ? (el as any).width + pad * 2 : 150, ((el as any).height || 40) + pad * 2)
            break
          default:
            break
        }
        ctx.restore()
      }
    }

    // Temp element being drawn
    if (tempElement) drawElement(ctx, tempElement)

    // Cursors
    drawCursors(ctx, cursors, currentUserId)
  }, [elements, tempElement, cursors, darkMode, selectedId, tool, currentUserId])

  const getPos = useCallback((e: ReactMouseEvent<HTMLCanvasElement> | { clientX: number; clientY: number }) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    return getCanvasPos(canvasRef.current, e, zoom)
  }, [zoom])

  const handleMouseMove = useCallback((e: ReactMouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getPos(e)
    onCursorMove(x, y)

    if (!drawing.current) {
      if (dragging) {
        const dx = x - dragging.startX
        const dy = y - dragging.startY
        onElementsChange(elements.map(el => {
          if (el.id !== dragging.id) return el
          switch (el.type) {
            case 'path': return { ...el, points: el.points.map(([px, py]) => [px + dx, py + dy] as [number, number]) }
            case 'rect': return { ...el, x: dragging.origX + dx, y: dragging.origY + dy }
            case 'circle': return { ...el, cx: dragging.origX + dx, cy: dragging.origY + dy }
            case 'line': {
              return { ...el, x1: dragging.origX + dx, y1: dragging.origY + dy, x2: (dragging as any).origX2 + dx, y2: (dragging as any).origY2 + dy }
            }
            case 'text':
            case 'sticky':
              return { ...el, x: dragging.origX + dx, y: dragging.origY + dy }
            default: return el
          }
        }))
      }
      return
    }

    const { x: sx, y: sy } = startPos.current

    if (tool === 'pen') {
      currentPath.current.push([x, y])
      setTempElement({
        id: 'temp', type: 'path',
        points: [...currentPath.current],
        color, strokeWidth: brushSize, userId: currentUserId,
      } as PathElement)
    } else if (tool === 'eraser') {
      // Remove elements near cursor
      const radius = brushSize * 3
      const toRemove = new Set<string>()
      for (const el of elements) {
        if (el.type === 'path') {
          for (const [px, py] of el.points) {
            if (Math.hypot(px - x, py - y) < radius) { toRemove.add(el.id); break }
          }
        }
      }
      if (toRemove.size > 0) {
        onElementsChange(elements.filter(el => !toRemove.has(el.id)))
      }
    } else if (tool === 'rect') {
      setTempElement({
        id: 'temp', type: 'rect',
        x: Math.min(sx, x), y: Math.min(sy, y),
        width: Math.abs(x - sx), height: Math.abs(y - sy),
        color, strokeWidth: brushSize, fill: 'transparent', userId: currentUserId,
      } as RectElement)
    } else if (tool === 'circle') {
      setTempElement({
        id: 'temp', type: 'circle',
        cx: (sx + x) / 2, cy: (sy + y) / 2,
        rx: Math.abs(x - sx) / 2, ry: Math.abs(y - sy) / 2,
        color, strokeWidth: brushSize, fill: 'transparent', userId: currentUserId,
      } as CircleElement)
    } else if (tool === 'line') {
      setTempElement({
        id: 'temp', type: 'line',
        x1: sx, y1: sy, x2: x, y2: y,
        color, strokeWidth: brushSize, userId: currentUserId,
      } as LineElement)
    }
  }, [tool, color, brushSize, elements, currentUserId, onElementsChange, onCursorMove, getPos, dragging])

  const handleMouseDown = useCallback((e: ReactMouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return
    const { x, y } = getPos(e)
    startPos.current = { x, y }

    if (tool === 'select') {
      // Hit test elements (reverse order = top first)
      const hit = [...elements].reverse().find(el => {
        switch (el.type) {
          case 'rect': return x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height
          case 'circle': return Math.hypot((x - el.cx) / el.rx, (y - el.cy) / el.ry) <= 1
          case 'text': case 'sticky': return x >= el.x && y >= el.y && x <= el.x + ((el as any).width || 200) && y <= el.y + ((el as any).height || 60)
          case 'path': return el.points.some(([px, py]) => Math.hypot(px - x, py - y) < 10)
          case 'line': {
            const d = Math.abs((el.y2 - el.y1) * x - (el.x2 - el.x1) * y + el.x2 * el.y1 - el.y2 * el.x1) /
              Math.hypot(el.y2 - el.y1, el.x2 - el.x1)
            return d < 8
          }
          default: return false
        }
      })
      if (hit) {
        setSelectedId(hit.id)
        const origX = (hit as any).x ?? (hit as any).cx ?? (hit as any).x1 ?? 0
        const origY = (hit as any).y ?? (hit as any).cy ?? (hit as any).y1 ?? 0
        setDragging({ id: hit.id, startX: x, startY: y, origX, origY, ...(hit.type === 'line' ? { origX2: hit.x2, origY2: hit.y2 } : {}) } as any)
      } else {
        setSelectedId(null)
      }
      return
    }

    if (tool === 'text') {
      setEditingText({ id: uuidv4(), x, y, text: '' })
      return
    }

    if (tool === 'sticky') {
      const id = uuidv4()
      const fill = STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)]
      const newEl: StickyElement = { id, type: 'sticky', x, y, width: 200, height: 120, text: 'New note', fill, userId: currentUserId }
      onElementsChange([...elements, newEl])
      setEditingText({ id, x, y, text: 'New note' })
      return
    }

    drawing.current = true
    if (tool === 'pen') {
      currentPath.current = [[x, y]]
    }
  }, [tool, elements, currentUserId, onElementsChange, getPos])

  const handleMouseUp = useCallback((e: ReactMouseEvent<HTMLCanvasElement>) => {
    setDragging(null)
    if (!drawing.current) return
    drawing.current = false
    const { x, y } = getPos(e)
    const { x: sx, y: sy } = startPos.current
    const id = uuidv4()

    let newEl: DrawingElement | null = null
    if (tool === 'pen' && currentPath.current.length > 1) {
      newEl = { id, type: 'path', points: [...currentPath.current], color, strokeWidth: brushSize, userId: currentUserId } as PathElement
      currentPath.current = []
    } else if (tool === 'rect') {
      newEl = { id, type: 'rect', x: Math.min(sx, x), y: Math.min(sy, y), width: Math.abs(x - sx), height: Math.abs(y - sy), color, strokeWidth: brushSize, fill: 'transparent', userId: currentUserId } as RectElement
    } else if (tool === 'circle') {
      newEl = { id, type: 'circle', cx: (sx + x) / 2, cy: (sy + y) / 2, rx: Math.abs(x - sx) / 2, ry: Math.abs(y - sy) / 2, color, strokeWidth: brushSize, fill: 'transparent', userId: currentUserId } as CircleElement
    } else if (tool === 'line') {
      newEl = { id, type: 'line', x1: sx, y1: sy, x2: x, y2: y, color, strokeWidth: brushSize, userId: currentUserId } as LineElement
    }

    if (newEl) onElementsChange([...elements, newEl])
    setTempElement(null)
  }, [tool, color, brushSize, elements, currentUserId, onElementsChange, getPos])

  const commitText = useCallback(() => {
    if (!editingText) return
    const { id, x, y, text } = editingText
    if (text.trim()) {
      // Check if existing sticky
      const existing = elements.find(el => el.id === id)
      if (existing && existing.type === 'sticky') {
        onElementsChange(elements.map(el => el.id === id ? { ...el, text } as StickyElement : el))
      } else if (!existing) {
        const newEl: TextElement = { id: id!, type: 'text', x, y, text, color, fontSize: brushSize * 3 + 12, userId: currentUserId }
        onElementsChange([...elements, newEl])
      }
    }
    setEditingText(null)
  }, [editingText, elements, color, brushSize, currentUserId, onElementsChange])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedId && tool === 'select' && !editingText) {
        onElementsChange(elements.filter(el => el.id !== selectedId))
        setSelectedId(null)
      }
    }
    if (e.key === 'Escape') {
      setEditingText(null)
      setSelectedId(null)
    }
  }, [selectedId, tool, elements, editingText, onElementsChange])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Resize canvas to container
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return
    const ro = new ResizeObserver(() => {
      canvas.width = container.clientWidth / zoom
      canvas.height = container.clientHeight / zoom
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [zoom])

  const cursorStyle: React.CSSProperties = {
    cursor: tool === 'pen' ? 'crosshair'
      : tool === 'eraser' ? 'cell'
      : tool === 'text' ? 'text'
      : tool === 'select' ? 'default'
      : 'crosshair',
  }

  return (
    <div ref={containerRef} className="relative flex-1 overflow-hidden" style={{ touchAction: 'none' }}>
      <canvas
        ref={canvasRef}
        style={{ ...cursorStyle, width: '100%', height: '100%', display: 'block', transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { drawing.current = false; setTempElement(null) }}
      />

      {/* Inline text editor overlay */}
      {editingText && (
        <textarea
          autoFocus
          className="absolute bg-transparent border-2 border-indigo-400 rounded outline-none resize-none text-sm p-1"
          style={{
            left: editingText.x * zoom,
            top: editingText.y * zoom,
            color: darkMode ? '#fff' : '#000',
            fontSize: brushSize * 3 + 12,
            minWidth: 120,
            minHeight: 40,
          }}
          value={editingText.text}
          onChange={(e) => setEditingText(prev => prev ? { ...prev, text: e.target.value } : null)}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.preventDefault(); setEditingText(null) }
            if (e.key === 'Enter' && !e.shiftKey && editingText && !elements.find(el => el.id === editingText.id && el.type === 'sticky')) {
              e.preventDefault()
              commitText()
            }
          }}
        />
      )}
    </div>
  )
}
