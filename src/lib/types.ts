export type Tool = 'select' | 'pen' | 'rect' | 'circle' | 'line' | 'text' | 'sticky' | 'eraser'

export interface PathElement {
  id: string
  type: 'path'
  points: [number, number][]
  color: string
  strokeWidth: number
  userId: string
}

export interface RectElement {
  id: string
  type: 'rect'
  x: number
  y: number
  width: number
  height: number
  color: string
  strokeWidth: number
  fill: string
  userId: string
}

export interface CircleElement {
  id: string
  type: 'circle'
  cx: number
  cy: number
  rx: number
  ry: number
  color: string
  strokeWidth: number
  fill: string
  userId: string
}

export interface LineElement {
  id: string
  type: 'line'
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  strokeWidth: number
  userId: string
}

export interface TextElement {
  id: string
  type: 'text'
  x: number
  y: number
  text: string
  color: string
  fontSize: number
  userId: string
}

export interface StickyElement {
  id: string
  type: 'sticky'
  x: number
  y: number
  width: number
  height: number
  text: string
  fill: string
  userId: string
}

export type DrawingElement =
  | PathElement
  | RectElement
  | CircleElement
  | LineElement
  | TextElement
  | StickyElement

export interface CursorPosition {
  x: number
  y: number
  name: string | undefined
  color: string
  lastSeen: string
}

export interface ChatMessage {
  id: string
  userId: string
  userName: string
  text: string
  timestamp: string
}

export interface BoardData {
  id: string
  name: string
  ownerId: string
  createdAt: string
  updatedAt: string
  version: number
  elements: DrawingElement[]
  background: string
  messages: ChatMessage[]
  cursors: Record<string, CursorPosition>
}

export interface BoardMeta {
  id: string
  name: string
  ownerId: string
  createdAt: string
  updatedAt: string
}
