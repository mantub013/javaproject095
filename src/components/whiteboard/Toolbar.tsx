import type { Tool } from '@/lib/types'
import {
  MousePointer2,
  Pen,
  Square,
  Circle,
  Minus,
  Type,
  StickyNote,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Sun,
  Moon,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

const COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
]

const BRUSH_SIZES = [2, 4, 8, 16]

interface ToolbarProps {
  tool: Tool
  color: string
  brushSize: number
  darkMode: boolean
  onToolChange: (t: Tool) => void
  onColorChange: (c: string) => void
  onBrushSizeChange: (s: number) => void
  onDarkModeToggle: () => void
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
  onExportPng: () => void
  onExportPdf: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  canUndo: boolean
  canRedo: boolean
}

const tools: { id: Tool; icon: React.FC<any>; label: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select' },
  { id: 'pen', icon: Pen, label: 'Pen' },
  { id: 'rect', icon: Square, label: 'Rectangle' },
  { id: 'circle', icon: Circle, label: 'Circle' },
  { id: 'line', icon: Minus, label: 'Line' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'sticky', icon: StickyNote, label: 'Sticky Note' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' },
]

export function Toolbar({
  tool, color, brushSize, darkMode,
  onToolChange, onColorChange, onBrushSizeChange, onDarkModeToggle,
  onUndo, onRedo, onClear, onExportPng, onExportPdf,
  onZoomIn, onZoomOut, canUndo, canRedo,
}: ToolbarProps) {
  const bg = darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
  const text = darkMode ? 'text-gray-200' : 'text-gray-700'
  const activeBg = darkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white'
  const hoverBg = darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
  const divider = darkMode ? 'border-gray-700' : 'border-gray-200'

  return (
    <div className={`flex flex-col gap-1 p-2 border-r ${bg} ${text} select-none overflow-y-auto`} style={{ width: 56 }}>
      {/* Tools */}
      <div className="flex flex-col gap-1">
        {tools.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            title={label}
            onClick={() => onToolChange(id)}
            className={`p-2 rounded-lg transition-colors ${tool === id ? activeBg : `${text} ${hoverBg}`}`}
          >
            <Icon size={18} />
          </button>
        ))}
      </div>

      <div className={`border-t ${divider} my-1`} />

      {/* Brush sizes */}
      <div className="flex flex-col gap-1 items-center">
        {BRUSH_SIZES.map((s) => (
          <button
            key={s}
            title={`Size ${s}`}
            onClick={() => onBrushSizeChange(s)}
            className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
              brushSize === s ? activeBg : `${text} ${hoverBg}`
            }`}
          >
            <div
              className="rounded-full bg-current"
              style={{ width: Math.min(s, 16), height: Math.min(s, 16) }}
            />
          </button>
        ))}
      </div>

      <div className={`border-t ${divider} my-1`} />

      {/* Color palette */}
      <div className="flex flex-col gap-1 items-center">
        {COLORS.map((c) => (
          <button
            key={c}
            title={c}
            onClick={() => onColorChange(c)}
            className={`w-7 h-7 rounded-full border-2 transition-transform ${
              color === c ? 'border-indigo-500 scale-110' : 'border-gray-300'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
        {/* Custom color */}
        <label title="Custom color" className="w-7 h-7 rounded-full overflow-hidden cursor-pointer border-2 border-dashed border-gray-400">
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="w-full h-full opacity-0 cursor-pointer"
          />
        </label>
      </div>

      <div className={`border-t ${divider} my-1`} />

      {/* Zoom */}
      <button title="Zoom in" onClick={onZoomIn} className={`p-2 rounded-lg ${text} ${hoverBg}`}>
        <ZoomIn size={18} />
      </button>
      <button title="Zoom out" onClick={onZoomOut} className={`p-2 rounded-lg ${text} ${hoverBg}`}>
        <ZoomOut size={18} />
      </button>

      <div className={`border-t ${divider} my-1`} />

      {/* History */}
      <button title="Undo" onClick={onUndo} disabled={!canUndo}
        className={`p-2 rounded-lg transition-colors ${!canUndo ? 'opacity-30' : ''} ${text} ${hoverBg}`}>
        <Undo2 size={18} />
      </button>
      <button title="Redo" onClick={onRedo} disabled={!canRedo}
        className={`p-2 rounded-lg transition-colors ${!canRedo ? 'opacity-30' : ''} ${text} ${hoverBg}`}>
        <Redo2 size={18} />
      </button>
      <button title="Clear board" onClick={onClear}
        className={`p-2 rounded-lg text-red-500 ${hoverBg}`}>
        <Trash2 size={18} />
      </button>

      <div className={`border-t ${divider} my-1`} />

      {/* Export */}
      <button title="Export PNG" onClick={onExportPng} className={`p-2 rounded-lg ${text} ${hoverBg}`}>
        <Download size={18} />
      </button>
      <button title="Export / Print PDF" onClick={onExportPdf} className={`p-2 rounded-lg ${text} ${hoverBg} text-xs font-bold`}>
        PDF
      </button>

      <div className={`border-t ${divider} my-1`} />

      {/* Theme */}
      <button title="Toggle dark mode" onClick={onDarkModeToggle}
        className={`p-2 rounded-lg ${text} ${hoverBg}`}>
        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
  )
}
