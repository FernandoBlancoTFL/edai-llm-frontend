"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sidebar } from "@/components/sidebar"
import { ChatMessage } from "@/components/chat-message"
import { Send, Menu, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { apiClient } from "@/lib/api"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  type?: "text" | "table" | "plot"
  data?: {
    rows?: any[]
    columns?: string[]
    url?: string
  }
}

interface Document {
  file_id: string
  filename: string
  row_count: number
  column_count: number
  created_at: string
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [documentLoadingState, setDocumentLoadingState] = useState<'idle' | 'uploading' | 'deleting' | 'fetching'>('idle')
  const [documents, setDocuments] = useState<Document[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const viewportRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const isDocumentLoading = documentLoadingState !== 'idle'

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth'
      })
    }, 100)
  }, [messages])

  // Detectar cuando el usuario hace scroll hacia arriba
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = document.documentElement.clientHeight
      
      // Mostrar botón si no está cerca del final (más de 200px del fondo)
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 200)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Load documents on mount
  useEffect(() => {
    fetchDocuments()
  }, [])

  // Mantener el input enfocado
  useEffect(() => {
    const focusInput = () => {
      if (inputRef.current && !isLoading && !isDocumentLoading) {
        inputRef.current.focus()
      }
    }

    // Enfocar al montar el componente
    focusInput()

    // Re-enfocar después de enviar un mensaje
    if (!isLoading && !isDocumentLoading) {
      focusInput()
    }

    // Enfocar cuando el usuario hace click en cualquier parte (excepto elementos interactivos)
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('button') && !target.closest('a') && !target.closest('input')) {
        focusInput()
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [isLoading, isDocumentLoading, messages])

  const fetchDocuments = async () => {
    setDocumentLoadingState('fetching')
    try {
      const response = await apiClient.getDocuments()
      if (response.ok) {
        const data = await response.json()
        setDocuments(data)
      }
    } catch (error) {
      console.error("Error fetching documents:", error)
    } finally {
      setDocumentLoadingState('idle')
    }
  }

  const handleSendMessage = async () => {
  if (!input.trim() || isLoading || isDocumentLoading) return

  const userMessage: Message = {
    id: Date.now().toString(),
    role: "user",
    content: input,
  }

  setMessages((prev) => [...prev, userMessage])
  setInput("")
  setIsLoading(true)

  try {
    const response = await apiClient.chat(input)

    if (response.ok) {
      const data = await response.json()
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "",
        type: data.type || "text",
        data: data.data,
      }
      setMessages((prev) => [...prev, assistantMessage])
    } else {
      throw new Error("Failed to get response")
    }
  } catch (error) {
    console.error("Error sending message:", error)
    toast({
      title: "Error",
      description: "No se pudo enviar el mensaje. Verifica la conexión con el backend.",
      variant: "destructive",
    })
  } finally {
    setIsLoading(false)
  }
}

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading && !isDocumentLoading) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    })
  }

  const handleFileUpload = async (file: File) => {
    setDocumentLoadingState('uploading')
    try {
      const response = await apiClient.uploadDocument(file)

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Éxito",
          description: data.message || "Archivo cargado correctamente",
        })
        await fetchDocuments()
      } else {
        const errorData = await response.json()
        toast({
          title: "Advertencia",
          description: errorData.message || "Error al cargar el archivo",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error uploading file:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar el archivo",
        variant: "destructive",
      })
    } finally {
      setDocumentLoadingState('idle')
    }
  }

  const handleDeleteDocument = async (fileId: string) => {
    setDocumentLoadingState('deleting')
    try {
      const response = await apiClient.deleteDocument(fileId)

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Documento eliminado correctamente"
        })
        await fetchDocuments()
      } else {
        throw new Error("Failed to delete document")
      }
    } catch (error) {
      console.error("Error deleting document:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el documento",
        variant: "destructive",
      })
    } finally {
      setDocumentLoadingState('idle')
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 z-50 w-80 transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0`}
      >
        <Sidebar
          documents={documents}
          onFileUpload={handleFileUpload}
          onDeleteDocument={handleDeleteDocument}
          onClose={() => setIsSidebarOpen(false)}
          loadingState={documentLoadingState}
        />
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col min-h-screen">
        {/* Header */}
        <header className="flex items-center gap-4 border-b border-border bg-card px-6 py-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-foreground">Análisis de Datos con LLM</h1>
            <p className="text-sm text-muted-foreground">Conversa con tus datos de forma inteligente</p>
          </div>
          
        </header>

        {/* Messages Area */}
        <ScrollArea className="flex-1 px-4 py-6">
          <div ref={viewportRef}>
            <div className="mx-auto max-w-4xl space-y-6">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <Card className="border-2 border-dashed border-border bg-muted/30 p-12 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                        />
                      </svg>
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-foreground">Comienza una conversación</h3>
                    <p className="text-sm text-muted-foreground">Sube un documento y pregunta sobre tus datos</p>
                  </Card>
                </div>
              ) : (
                messages.map((message, index) => (
                  <ChatMessage 
                    key={message.id} 
                    message={message} 
                    isLatest={index === messages.length - 1}
                  />
                ))
              )}
              {isLoading && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                  <span className="text-sm">Pensando...</span>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Scroll to Bottom Button */}
        {showScrollButton && (
          <div className="fixed bottom-20 left-3/5 -translate-x-1/2 z-30 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Button
              onClick={scrollToBottom}
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-shadow"
              style={{ cursor: 'pointer'}}
            >
              <svg 
                className="h-5 w-5" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 14l-7 7m0 0l-7-7m7 7V3" 
                />
              </svg>
            </Button>
          </div>
        )}

        {/* Input Area */}
        <div className="sticky bottom-0 border-t border-border bg-card px-4 py-4 z-20 shadow-lg">
          <div className="mx-auto max-w-4xl">
            <div className="flex gap-3">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu pregunta sobre los datos..."
                className="flex-1 bg-background"
                disabled={isLoading || isDocumentLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || isDocumentLoading || !input.trim()}
                size="icon"
                className="shrink-0"
                style={{ cursor: 'pointer'}}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Toaster />
    </div>
  )
}
