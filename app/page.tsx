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
  isHistorical?: boolean
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
  const [isServerWarming, setIsServerWarming] = useState(false)
  const [serverWarmupAttempts, setServerWarmupAttempts] = useState(0)
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
      
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 200)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Load documents and chat history on mount
  useEffect(() => {
    const loadInitialData = async () => {
      await fetchDocuments()
      await fetchChatHistory()
    }
    loadInitialData()
  }, [])

  // Mantener el input enfocado
  useEffect(() => {
    const focusInput = () => {
      if (inputRef.current && !isLoading && !isDocumentLoading) {
        inputRef.current.focus()
      }
    }

    focusInput()

    if (!isLoading && !isDocumentLoading) {
      focusInput()
    }

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
    const startTime = Date.now()
    let retryCount = 0
    const maxRetries = 3
    
    const attemptFetch = async (): Promise<any> => {
      try {
        // Mostrar overlay si es el primer intento y está tardando
        if (retryCount === 0) {
          const checkTimer = setTimeout(() => {
            setIsServerWarming(true)
            setServerWarmupAttempts(1)
          }, 3000) // Mostrar después de 3 segundos
          
          const response = await apiClient.getDocuments()
          clearTimeout(checkTimer)
          
          const loadTime = Date.now() - startTime
          
          // Si tarda más de 5 segundos o hubo reintentos, fue un cold start
          if (loadTime > 5000 || retryCount > 0) {
            setIsServerWarming(true)
            setServerWarmupAttempts(retryCount + 1)
            setTimeout(() => {
              setIsServerWarming(false)
              setServerWarmupAttempts(0)
            }, 2000)
          } else {
            setIsServerWarming(false)
            setServerWarmupAttempts(0)
          }
          
          if (response.ok) {
            const data = await response.json()
            setDocuments(data)
            return data
          }
          throw new Error('Failed to fetch documents')
        } else {
          // Reintentos subsecuentes
          setServerWarmupAttempts(retryCount + 1)
          const response = await apiClient.getDocuments()
          
          if (response.ok) {
            const data = await response.json()
            setDocuments(data)
            setIsServerWarming(true)
            setTimeout(() => {
              setIsServerWarming(false)
              setServerWarmupAttempts(0)
            }, 2000)
            return data
          }
          throw new Error('Failed to fetch documents')
        }
      } catch (error) {
        retryCount++
        
        if (retryCount <= maxRetries) {
          // Mostrar overlay durante los reintentos
          setIsServerWarming(true)
          setServerWarmupAttempts(retryCount)
          
          // Esperar antes de reintentar (incrementando el tiempo)
          await new Promise(resolve => setTimeout(resolve, 5000 * retryCount))
          return attemptFetch()
        } else {
          // Falló después de todos los intentos
          setIsServerWarming(false)
          setServerWarmupAttempts(0)
          console.error("Error fetching documents after retries:", error)
          throw error
        }
      }
    }
    
    try {
      await attemptFetch()
    } catch (error) {
      console.error("Final error fetching documents:", error)
    } finally {
      setDocumentLoadingState('idle')
    }
  }

  const fetchChatHistory = async () => {
    try {
      const response = await apiClient.getChatHistory()
      if (response.ok) {
        const data = await response.json()
        
        const historyMessages: Message[] = []
        const conversations = [...data.conversations].reverse()
        
        conversations.forEach((conv: any) => {
          historyMessages.push({
            id: `user-${conv.checkpoint_id}`,
            role: "user",
            content: conv.query,
            isHistorical: true,
          })

          const metadata = conv.response_metadata
          historyMessages.push({
            id: `assistant-${conv.checkpoint_id}`,
            role: "assistant",
            content: conv.llm_response,
            type: metadata?.type || "text",
            data: metadata?.data,
            isHistorical: true,
          })
        })
        
        setMessages(historyMessages)
      }
    } catch (error) {
      console.error("Error fetching chat history:", error)
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

    const startTime = Date.now()
    let retryCount = 0
    const maxRetries = 2

    const attemptSend = async (): Promise<any> => {
      try {
        if (retryCount === 0) {
          const checkTimer = setTimeout(() => {
            setIsServerWarming(true)
            setServerWarmupAttempts(1)
          }, 3000)
          
          const response = await apiClient.chat(input)
          clearTimeout(checkTimer)
          
          const loadTime = Date.now() - startTime

          if (loadTime > 5000 || retryCount > 0) {
            setIsServerWarming(true)
            setServerWarmupAttempts(retryCount + 1)
            setTimeout(() => {
              setIsServerWarming(false)
              setServerWarmupAttempts(0)
            }, 2000)
          } else {
            setIsServerWarming(false)
            setServerWarmupAttempts(0)
          }

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
            return data
          }
          throw new Error("Failed to get response")
        } else {
          setServerWarmupAttempts(retryCount + 1)
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
            setIsServerWarming(true)
            setTimeout(() => {
              setIsServerWarming(false)
              setServerWarmupAttempts(0)
            }, 2000)
            return data
          }
          throw new Error("Failed to get response")
        }
      } catch (error) {
        retryCount++
        
        if (retryCount <= maxRetries) {
          setIsServerWarming(true)
          setServerWarmupAttempts(retryCount)
          await new Promise(resolve => setTimeout(resolve, 5000 * retryCount))
          return attemptSend()
        } else {
          setIsServerWarming(false)
          setServerWarmupAttempts(0)
          throw error
        }
      }
    }

    try {
      await attemptSend()
    } catch (error) {
      console.error("Error sending message:", error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Lo siento, ahora no puedo responderte. Parece que hay un problema de conexión con el servidor.",
      }
      setMessages((prev) => [...prev, errorMessage])
      
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el backend.",
        variant: "destructive",
        className: "bg-red-500 text-white border-red-500",
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
    const startTime = Date.now()
    let retryCount = 0
    const maxRetries = 2
    
    const attemptUpload = async (): Promise<any> => {
      try {
        if (retryCount === 0) {
          const checkTimer = setTimeout(() => {
            setIsServerWarming(true)
            setServerWarmupAttempts(1)
          }, 3000)
          
          const response = await apiClient.uploadDocument(file)
          clearTimeout(checkTimer)
          
          const loadTime = Date.now() - startTime

          if (loadTime > 5000 || retryCount > 0) {
            setIsServerWarming(true)
            setServerWarmupAttempts(retryCount + 1)
            setTimeout(() => {
              setIsServerWarming(false)
              setServerWarmupAttempts(0)
            }, 2000)
          } else {
            setIsServerWarming(false)
            setServerWarmupAttempts(0)
          }

          if (response.ok) {
            const data = await response.json()
            toast({
              title: "Éxito",
              description: data.message || "Archivo cargado correctamente",
              variant: "success"
            })
            await fetchDocuments()
            return data
          } else {
            try {
              const errorData = await response.json()
              toast({
                title: "Error",
                description: errorData.detail || errorData.message || "Error al cargar el archivo",
                variant: "destructive",
              })
            } catch (parseError) {
              toast({
                title: "Error",
                description: `Error al cargar el archivo (${response.status})`,
                variant: "destructive",
              })
            }
            throw new Error('Upload failed')
          }
        } else {
          setServerWarmupAttempts(retryCount + 1)
          const response = await apiClient.uploadDocument(file)
          
          if (response.ok) {
            const data = await response.json()
            toast({
              title: "Éxito",
              description: data.message || "Archivo cargado correctamente",
              variant: "success"
            })
            await fetchDocuments()
            setIsServerWarming(true)
            setTimeout(() => {
              setIsServerWarming(false)
              setServerWarmupAttempts(0)
            }, 2000)
            return data
          }
          throw new Error('Upload failed')
        }
      } catch (error) {
        retryCount++
        
        if (retryCount <= maxRetries) {
          setIsServerWarming(true)
          setServerWarmupAttempts(retryCount)
          await new Promise(resolve => setTimeout(resolve, 5000 * retryCount))
          return attemptUpload()
        } else {
          setIsServerWarming(false)
          setServerWarmupAttempts(0)
          throw error
        }
      }
    }

    try {
      await attemptUpload()
    } catch (error) {
      console.error("Error uploading file:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar el archivo. Verifica la conexión con el backend.",
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
          description: "Documento eliminado correctamente",
          variant: "success"
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
      {/* Server Warming Overlay */}
      {isServerWarming && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="p-8 shadow-2xl max-w-md mx-4 border-2">
            <div className="flex flex-col items-center gap-6 text-center">
              {/* Spinner animado */}
              <div className="relative">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-8 w-8 rounded-full bg-primary/20" />
                </div>
              </div>
              
              {/* Mensaje principal */}
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-foreground">
                  {serverWarmupAttempts === 0 
                    ? "Iniciando servidor..." 
                    : "Conectando con servidor..."}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Esto tomará aproximadamente 30 segundos
                </p>
                {serverWarmupAttempts > 1 && (
                  <p className="text-xs text-muted-foreground/70">
                    Reintento {serverWarmupAttempts} de 3...
                  </p>
                )}
                {serverWarmupAttempts <= 1 && (
                  <p className="text-xs text-muted-foreground/70">
                    Primera carga del día en plan gratuito
                  </p>
                )}
              </div>

              {/* Barra de progreso animada */}
              <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-pulse" style={{
                  animation: 'pulse 1.5s ease-in-out infinite'
                }} />
              </div>
            </div>
          </Card>
        </div>
      )}

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
        <header className="sticky top-0 z-50 flex items-center gap-4 border-b border-border bg-card px-6 py-4 shadow-md lg:static lg:shadow-none">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-foreground">Análisis de Datos con IA</h1>
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
                placeholder="Escribe tu pregunta..."
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