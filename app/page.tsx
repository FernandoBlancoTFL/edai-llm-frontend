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
import { ChatSuggestions } from "@/components/chat-suggestions"
import { jsPDF } from "jspdf"

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
  responseTime?: number
}

interface Document {
  file_id: string
  filename: string
  row_count: number
  column_count: number
  created_at: string
}

interface Chat {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [documentLoadingState, setDocumentLoadingState] = useState<'idle' | 'uploading' | 'deleting' | 'fetching'>('idle')
  const [documents, setDocuments] = useState<Document[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isServerWarming, setIsServerWarming] = useState(true) // Inicia como true
  const [serverWarmupAttempts, setServerWarmupAttempts] = useState(0)
  const [isServerReady, setIsServerReady] = useState(false)
  const viewportRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const isDocumentLoading = documentLoadingState !== 'idle'
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChat, setSelectedChat] = useState("")

  useEffect(() => {
    fetchChatHistory()
  }, [selectedChat])

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

  // Verificación continua del servidor hasta que responda
  useEffect(() => {
    let isMounted = true
    let retryCount = 0

    const checkServerHealth = async () => {
      while (isMounted && !isServerReady) {
        retryCount++
        setServerWarmupAttempts(retryCount)
        
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos timeout
          
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/health`, {
            signal: controller.signal,
          })
          
          clearTimeout(timeoutId)
          
          if (response.ok) {
            // Servidor respondió correctamente
            console.log('✅ Servidor activo, cargando datos...')
            setIsServerReady(true)
            
            // Cargar datos iniciales primero
            try {
              await loadInitialData()
              console.log('✅ Datos cargados correctamente')
            } catch (error) {
              console.error('❌ Error cargando datos:', error)
            }
            
            // Ocultar overlay después de cargar datos
            setTimeout(() => {
              setIsServerWarming(false)
            }, 1000)
            
            return
          }
        } catch (error) {
          console.log(`Intento ${retryCount} - Servidor no disponible, reintentando...`)
        }
        
        // Esperar 10 segundos antes del próximo intento
        await new Promise(resolve => setTimeout(resolve, 10000))
      }
    }

    checkServerHealth()

    return () => {
      isMounted = false
    }
  }, [])

  const loadInitialData = async () => {
    console.log('📊 Cargando documentos...')
    await fetchDocuments()
    console.log('💬 Cargando historial de chat...')
    await fetchChats()
    console.log('✅ Carga completa')
  }

  // Mantener el input enfocado
  useEffect(() => {
    if (!isServerReady) return // No enfocar si el servidor no está listo

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
  }, [isLoading, isDocumentLoading, messages, isServerReady])

  const fetchDocuments = async () => {
    setDocumentLoadingState('fetching')
    try {
      console.log('🔍 Obteniendo documentos del servidor...')
      const response = await apiClient.getDocuments()
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ ${data.length} documentos cargados`)
        console.log(data)
        setDocuments(data)
      } else {
        console.error('❌ Error en respuesta de documentos:', response.status)
      }
    } catch (error) {
      console.error("❌ Error fetching documents:", error)
    } finally {
      setDocumentLoadingState('idle')
    }
  }

  const fetchChatHistory = async () => {
    try {
      console.log('💬 Obteniendo historial de chat...')
      const response = await apiClient.getChatHistory(selectedChat)
      if (response.ok) {
        const data = await response.json()
        
        const historyMessages: Message[] = []
        const conversations = [...data.conversations].reverse()
        
        console.log(`📝 ${conversations.length} conversaciones encontradas`)
        
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
        console.log(`✅ ${historyMessages.length} mensajes cargados`)
      } else {
        console.error('❌ Error en respuesta de historial:', response.status)
      }
    } catch (error) {
      console.error("❌ Error fetching chat history:", error)
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || isDocumentLoading || !isServerReady) return

    const startTime = Date.now()

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await apiClient.chat(input, selectedChat)

      if (response.ok) {
        const data = await response.json()

        const endTime = Date.now()
        const duration = endTime - startTime

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response || "",
          type: data.type || "text",
          data: data.data,
          responseTime: duration
        }
        setMessages((prev) => [...prev, assistantMessage])
      } else {
        throw new Error("Failed to get response")
      }
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
    if (e.key === "Enter" && !e.shiftKey && !isLoading && !isDocumentLoading && isServerReady) {
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
    if (!isServerReady) {
      console.warn('⚠️ Intento de subir archivo con servidor no listo')
      return
    }
    
    setDocumentLoadingState('uploading')
    
    try {
      const response = await apiClient.uploadDocument(file)

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Éxito",
          description: data.message || "Archivo cargado correctamente",
          variant: "success"
        })
        await fetchDocuments()
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
      }
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
    if (!isServerReady) {
      console.warn('⚠️ Intento de eliminar documento con servidor no listo')
      return
    }
    
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

  const transformChatHistory = (data: any) => {
    const conversations = data.conversations || []

    const total = conversations.length
    const successful = conversations.filter((c: any) => c.success).length

    const typeCount: Record<string, number> = {}

    conversations.forEach((c: any) => {
      const type = c.response_metadata?.type || "text"
      typeCount[type] = (typeCount[type] || 0) + 1
    })

    const mostFrequentType =
      Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown"

    return {
      thread_id: data.thread_id,
      exported_at: new Date().toISOString(),
      total_conversations: total,
      summary: {
        total_queries: total,
        successful_queries: successful,
        most_frequent_type: mostFrequentType,
      },
      conversations: conversations.map((conv: any) => ({
        timestamp: conv.timestamp,
        query: conv.query,
        response: conv.llm_response,
        type: conv.response_metadata?.type || "text",
        success: conv.success,
        chart: conv.response_metadata?.data
          ? {
              url: conv.response_metadata.data.url,
              filename: conv.response_metadata.data.filename,
            }
          : null,
      })),
    }
  }

  const downloadJSON = (data: any) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    })

    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.download = `chat_history_${new Date().toISOString()}.json`
    link.click()

    URL.revokeObjectURL(url)
  }

  const handleExportHistory = async () => {
    try {
      const response = await apiClient.getChatHistory(selectedChat)

      if (!response.ok) {
        throw new Error("Failed to fetch history")
      }

      const data = await response.json()
      const transformed = transformChatHistory(data)

      downloadJSON(transformed)

      toast({
        title: "Exportación exitosa",
        description: "El historial se descargó correctamente",
        variant: "success",
      })
    } catch (error) {
      console.error(error)

      toast({
        title: "Error",
        description: "No se pudo exportar el historial",
        variant: "destructive",
      })
    }
  }

  const groupByDataset = (conversations) => {
    const groups = {}

    conversations.forEach((conv) => {
      const key = conv.dataset || "general"

      if (!groups[key]) {
        groups[key] = []
      }

      groups[key].push(conv)
    })

    return groups
  }

  const removeMarkdown = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "$1") // **texto**
      .replace(/\*(.*?)\*/g, "$1")     // *texto*
      .replace(/#+\s/g, "")            // # títulos
      .replace(/`(.*?)`/g, "$1")       // código
  }

  const handleExportPDF = async () => {
    try {
      const response = await apiClient.getChatHistory("single_user_persistent_thread")

      if (!response.ok) throw new Error("Failed")

      const data = await response.json()
      const conversations = data.conversations

      const grouped = groupByDataset(conversations)

      const pdf = new jsPDF()

      let y = 10

      for (const dataset in grouped) {
        // 🔹 Título de sección
        pdf.setFontSize(16)
        pdf.text(`Dataset: ${dataset}`, 10, y)
        y += 10

        for (const conv of grouped[dataset]) {
          pdf.line(10, y, 200, y)
          y += 8
          // 🔸 Query
          pdf.setFontSize(12)
          pdf.setFont("helvetica", "bold")
          pdf.text("Consulta:", 10, y)

          pdf.setFont("helvetica", "normal")

          const splitQuery = pdf.splitTextToSize(conv.query, 180)

          pdf.text(splitQuery, 10, y + 6)

          y += (splitQuery.length * 6) + 10

          // 🔸 Respuesta
          pdf.setFont("helvetica", "bold")
          pdf.text("Respuesta del modelo de IA:", 10, y)

          y += 6

          pdf.setFont("helvetica", "normal")
          const cleanText = removeMarkdown(conv.llm_response)

          const splitText = pdf.splitTextToSize(cleanText, 180)
          pdf.text(splitText, 10, y)

          //spacing
          const lineHeight = 5
          pdf.text(splitText, 10, y)
          y += splitText.length * lineHeight

          // 🔸 Imagen (si existe)
          if (conv.response_metadata?.data?.url) {
            const imgUrl = conv.response_metadata.data.url + "?t=" + Date.now()

            const imgData = await loadImageAsBase64(imgUrl)

            pdf.addImage(imgData, "PNG", 10, y, 180, 80)
            y += 90
          }

          y += 10

          // Salto de página si se llena
          if (y > 270) {
            pdf.addPage()
            y = 10
          }
        }

        y += 10
      }

      pdf.save("chat-history.pdf")

    } catch (err) {
      console.error(err)
    }
  }

  const loadImageAsBase64 = async (url) => {
    const res = await fetch(url)
    const blob = await res.blob()

    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  }

  const fetchChats = async () => {
    try {

      const response =
        await apiClient.getChats()

      if (!response.ok) {
        throw new Error(
          "Error obteniendo chats"
        )
      }

      const data =
        await response.json()

      setChats(data)

      if (data.length > 0) {
        setSelectedChat(data[0].id)
      }

    } catch (error) {

      console.error(
        "Error obteniendo chats:",
        error
      )

    }
  }

  const handleCreateChat = async () => {
    try {

      const response =
        await apiClient.createChat(
          "Nuevo chat"
        )

      if (!response.ok) {
        throw new Error(
          "Error creando chat"
        )
      }

      const chat =
        await response.json()

      setChats(prev => [
        chat,
        ...prev
      ])

      setSelectedChat(chat.id)

      setMessages([])

    } catch (error) {

      console.error(
        "Error creando chat:",
        error
      )

    }
  }

  const handleDeleteChat = async (
    chatId: string
  ) => {

    try {

      const response =
        await apiClient.deleteChat(
          chatId
        )

      if (!response.ok) {
        throw new Error(
          "Error eliminando chat"
        )
      }

      const updatedChats =
        chats.filter(
          chat => chat.id !== chatId
        )

      setChats(updatedChats)

      if (
        selectedChat === chatId
      ) {

        setMessages([])

        setSelectedChat(
          updatedChats[0]?.id ?? ""
        )

      }

    } catch (error) {

      console.error(
        "Error eliminando chat:",
        error
      )

    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Server Warming Overlay - Bloquea toda la aplicación */}
      {isServerWarming && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/95 dark:bg-black/95 backdrop-blur-md">
          <Card className="p-8 shadow-2xl max-w-md mx-4 border-2">
            <div className="flex flex-col items-center gap-6 text-center">
              {/* Spinner animado */}
              <div className="relative">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-8 w-8 rounded-full bg-primary/20 animate-pulse" />
                </div>
              </div>
              
              {/* Mensaje principal */}
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-foreground">
                  {serverWarmupAttempts === 0 || serverWarmupAttempts === 1
                    ? "Iniciando servidor..." 
                    : "Esperando respuesta del servidor..."}
                </h3>
                
                <p className="text-sm text-muted-foreground">
                  Esto puede tomar hasta 30-40 segundos
                </p>
                
                {serverWarmupAttempts > 1 && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      Intento {serverWarmupAttempts}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Reintentando cada 10 segundos...
                    </p>
                  </div>
                )}
                
                {serverWarmupAttempts <= 1 && (
                  <p className="text-xs text-muted-foreground/70">
                    No va a poder visualizar los gráficos cargados. Lo invito a generar uno nuevo.
                  </p>
                )}
              </div>

              {/* Barra de progreso animada */}
              <div className="w-full space-y-2">
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-1000 ease-in-out"
                    style={{
                      width: '100%',
                      animation: 'slide 2s ease-in-out infinite'
                    }}
                  />
                </div>
                <p className="text-xs text-center text-muted-foreground/60">
                  Por favor, no cierres esta ventana
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Resto de la aplicación - Solo visible cuando el servidor está listo */}
      {isServerReady && (
        <>
          {/* Sidebar */}
          <div
            className={`${
              isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            } fixed inset-y-0 left-0 z-50 w-80 transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0`}
          >
            <Sidebar
              documents={documents}
              chats={chats}
              onFileUpload={handleFileUpload}
              onDeleteDocument={handleDeleteDocument}
              onClose={() => setIsSidebarOpen(false)}
              loadingState={documentLoadingState}
              selectedChat={selectedChat}
              onChatChange={setSelectedChat}
              onCreateChat={handleCreateChat}
              onDeleteChat={handleDeleteChat}
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
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleExportHistory}
                  disabled={!isServerReady}
                  className="cursor-pointer disabled:cursor-not-allowed"
                >
                  Exportar JSON
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportPDF}
                  disabled={!isServerReady}
                  className="cursor-pointer disabled:cursor-not-allowed"
                >
                  Exportar PDF
                </Button>
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
                        <h3 className="mb-2 text-lg font-semibold text-foreground">
                          Comienza una conversación
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Sube un documento y pregunta sobre tus datos
                        </p>
                        <div className="mb-3 flex flex-wrap gap-2">
                          <ChatSuggestions onSelectSuggestion={(text) => {
                            setInput(text)
                            inputRef.current?.focus()
                          }} />
                        </div>
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
        </>
      )}

      <Toaster />
      
      {/* CSS para la animación de la barra */}
      <style jsx global>{`
        @keyframes slide {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </div>
  )
}