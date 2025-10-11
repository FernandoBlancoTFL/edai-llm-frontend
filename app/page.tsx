"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sidebar } from "@/components/sidebar"
import { ChatMessage } from "@/components/chat-message"
import { ThemeToggle } from "@/components/theme-toggle"
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
  const [documents, setDocuments] = useState<Document[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Load documents on mount
  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const response = await apiClient.getDocuments()
      if (response.ok) {
        const data = await response.json()
        setDocuments(data)
      }
    } catch (error) {
      console.error("Error fetching documents:", error)
    }
  }

  const handleSendMessage = async () => {
  if (!input.trim() || isLoading) return

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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleFileUpload = async (file: File) => {
    try {
      const response = await apiClient.uploadDocument(file)

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Éxito",
          description: data.message || "Archivo cargado correctamente",
        })
        fetchDocuments()
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
    }
  }

  const handleDeleteDocument = async (fileId: string) => {
    try {
      const response = await apiClient.deleteDocument(fileId)

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Documento eliminado correctamente",
        })
        fetchDocuments()
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
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 z-50 w-80 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0`}
      >
        <Sidebar
          documents={documents}
          onFileUpload={handleFileUpload}
          onDeleteDocument={handleDeleteDocument}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center gap-4 border-b border-border bg-card px-6 py-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-foreground">Análisis de Datos con LLM</h1>
            <p className="text-sm text-muted-foreground">Conversa con tus datos de forma inteligente</p>
          </div>
          {/* Theme Toggle Button */}
          <ThemeToggle />
        </header>

        {/* Messages Area */}
        <ScrollArea className="flex-1 px-4 py-6" ref={scrollRef}>
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
              messages.map((message) => <ChatMessage key={message.id} message={message} />)
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
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border bg-card px-4 py-4">
          <div className="mx-auto max-w-4xl">
            <div className="flex gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu pregunta sobre los datos..."
                className="flex-1 bg-background"
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim()}
                size="icon"
                className="shrink-0"
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
