import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'
import type { ChatMessage } from '@/lib/types'

interface ChatPanelProps {
  messages: ChatMessage[]
  currentUserId: string
  darkMode: boolean
  onSend: (text: string) => void
  onClose: () => void
}

export function ChatPanel({ messages, currentUserId, darkMode, onSend, onClose }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const bg = darkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
  const inputBg = darkMode ? 'bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900'
  const bubbleOwn = 'bg-indigo-500 text-white rounded-br-none'
  const bubbleOther = darkMode ? 'bg-gray-700 text-gray-100 rounded-bl-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'

  const handleSend = () => {
    const text = input.trim()
    if (!text) return
    onSend(text)
    setInput('')
  }

  return (
    <div className={`flex flex-col h-full border-l ${bg}`} style={{ width: 280 }}>
      <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2 font-semibold">
          <MessageCircle size={16} />
          Chat
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {messages.length === 0 && (
          <p className={`text-center text-sm mt-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            No messages yet. Start the conversation!
          </p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.userId === currentUserId
          return (
            <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
              {!isOwn && (
                <span className={`text-xs mb-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {msg.userName}
                </span>
              )}
              <div className={`px-3 py-2 rounded-2xl text-sm max-w-[85%] break-words ${isOwn ? bubbleOwn : bubbleOther}`}>
                {msg.text}
              </div>
              <span className={`text-xs mt-0.5 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className={`p-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex gap-2">
          <input
            className={`flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 ${inputBg}`}
            placeholder="Type a message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          />
          <button
            onClick={handleSend}
            className="p-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50"
            disabled={!input.trim()}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
