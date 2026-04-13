'use client'

import React, { useState, useRef, useEffect } from 'react'
import { MessageSquare, Send, X, Bot, User, Loader2, Sparkles } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  status?: string
}

export default function Chatbot() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const threadIdRef = useRef<string>(Math.random().toString(36).substring(7))

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, currentStatus])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)
    setCurrentStatus('Thinking...')

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_AGENT_SERVICE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: (session?.user as any)?.id || 'anonymous',
          is_logged_in: !!session,
          prompt: userMessage,
          thread_id: threadIdRef.current,
          longterm_memory: '' 
        }),
      })

      if (!response.ok) throw new Error('Failed to connect to agent')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      let hasAddedAssistantMessage = false

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '').trim()
              
              if (dataStr === '[DONE]') break

              try {
                const data = JSON.parse(dataStr)
                if (data.type === 'message') {
                  // Only add the assistant message once when we get actual content
                  if (!hasAddedAssistantMessage) {
                    setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
                    hasAddedAssistantMessage = true
                  } else {
                    assistantContent += data.content
                    setMessages(prev => {
                      const last = prev[prev.length - 1]
                      if (last.role === 'assistant') {
                        return [...prev.slice(0, -1), { ...last, content: assistantContent }]
                      }
                      return prev
                    })
                  }
                } else if (data.type === 'status') {
                  setCurrentStatus(data.content)
                } else if (data.type === 'error') {
                  console.error('Agent Error:', data.content)
                  setCurrentStatus('Error occurred')
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I am having trouble connecting to the supply chain agent right now.' }])
    } finally {
      setIsLoading(false)
      setCurrentStatus(null)
    }
  }

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev)
    window.addEventListener('toggle-chatbot', handleToggle)
    return () => window.removeEventListener('toggle-chatbot', handleToggle)
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed bottom-6 right-6 w-[90vw] sm:w-[400px] h-[600px] max-h-[85vh] z-[100] flex flex-col bg-white overflow-hidden border border-gray-200 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-bottom-10 duration-300">
      <div className="p-5 flex items-center justify-between bg-emerald-600 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg poppins-bold">SupplyChain AI</h3>
            <p className="text-xs text-emerald-100 poppins-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Agent Online
            </p>
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-gray-50/30">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-60">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 poppins-semibold">Intelligent Logistics Assistant</p>
              <p className="text-sm text-gray-500 max-w-[200px]">Ask me about news, weather, or supply chain routes.</p>
            </div>
          </div>
        )}
        
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                m.role === 'user' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`p-4 rounded-2xl text-sm poppins-regular leading-relaxed ${
                m.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none shadow-md' 
                  : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none shadow-sm'
              }`}>
                {m.content}
              </div>
            </div>
          </div>
        ))}
        
        {currentStatus && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[85%] animate-pulse">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3 bg-white border border-emerald-100 text-emerald-700 text-xs italic rounded-2xl rounded-tl-none flex items-center gap-2 shadow-sm">
                <Loader2 className="w-3 h-3 animate-spin" />
                {currentStatus}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-5 border-t border-gray-100 bg-white shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder={isLoading ? "AI is typing..." : "Type your message..."}
            className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all poppins-medium"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:bg-gray-300 disabled:opacity-50 transition-all shadow-md active:scale-95"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-center text-gray-400 mt-2 poppins-regular">
          Powered by Global Supply Chain Agent
        </p>
      </form>
    </div>
  )
}
