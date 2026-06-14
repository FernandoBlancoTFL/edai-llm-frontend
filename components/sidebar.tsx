"use client"

import type React from "react"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Upload, FileText, Trash2, X, Eye } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import Swal from 'sweetalert2'
import DocumentPreviewModal from "./DocumentPreviewModal"

interface Document {
  file_id: string
  filename: string
  row_count: number
  column_count: number
  created_at: string
  loadingState?: 'idle' | 'uploading' | 'deleting' | 'fetching'
}

interface SidebarProps {
  documents: Document[]
  chats: Chat[]

  onFileUpload: (file: File) => void

  onDeleteDocument: (
    fileId: string
  ) => void

  onClose?: () => void

  loadingState?: 'idle' | 'uploading' | 'deleting' | 'fetching'

  selectedChat: string

  onChatChange: (
    chatId: string
  ) => void

  onCreateChat: () => void

  onDeleteChat: (
    chatId: string
  ) => void
}

interface Chat {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export function Sidebar({
  documents,
  chats,
  onFileUpload,
  onDeleteDocument,
  onClose,
  loadingState = 'idle',
  selectedChat,
  onChatChange,
  onCreateChat,
  onDeleteChat
}: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileUpload(file)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const handleDeleteClick = async (fileId: string, filename: string) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: `¿Deseas eliminar el documento "${filename}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    })

    if (result.isConfirmed) {
      onDeleteDocument(fileId)
    }
  }

  const handlePreviewClick = (fileId: string) => {
    setSelectedFileId(fileId)
    setPreviewOpen(true)
  }

  return (
    <div className="flex h-full flex-col border-r border-border bg-sidebar overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sidebar-border px-6 py-4 sidebar-header" style={{ height: 81}}>
        <h2 className="text-lg font-semibold text-sidebar-foreground">Documentos</h2>
        {/* Theme Toggle Button */}
          <ThemeToggle />
      </div>

      {/* Upload Button */}
      <div className="p-4">
        <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" accept=".csv,.xlsx,.xls" />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={loadingState !== 'idle'}
          className="w-full"
          style={{ cursor: 'pointer' }}
        >
          {loadingState === 'uploading' ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
              Subiendo...
            </>
          ) : loadingState === 'deleting' ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
              Eliminando...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Subir Archivo
            </>
          )}
        </Button>
      </div>
        <div className="px-4 pb-4">

          <div className="flex items-center justify-between mb-2">

            <span className="text-xs font-semibold text-muted-foreground">
              Chats
            </span>

            <Button
              size="sm"
              onClick={onCreateChat}
            >
              +
            </Button>

          </div>

          <div className="space-y-2">

            {chats.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No hay chats creados
              </p>
            )}

            {chats.map(chat => (

              <div
                key={chat.id}
                className="flex gap-2"
              >

                <Button
                  variant={
                    selectedChat === chat.id
                      ? "default"
                      : "outline"
                  }
                  className="flex-1 justify-start"
                  onClick={() =>
                    onChatChange(chat.id)
                  }
                >
                  {chat.name}
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    onDeleteChat(chat.id)
                  }
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>
      </div>

      {/* Documents List */}
      <ScrollArea className="flex-1 px-4 overflow-y-auto">
        <div className="space-y-3 pb-4">
          {documents.length === 0 ? (
            <Card className="border-dashed bg-sidebar-accent/50 p-6 text-center">
              <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No hay documentos cargados</p>
            </Card>
          ) : (
            documents.map((doc) => (
              <Card
                key={doc.file_id}
                className="group relative overflow-hidden bg-sidebar-accent p-4 transition-all hover:bg-sidebar-accent/80"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <h3
                        className="text-sm font-medium text-sidebar-foreground"
                        style={{
                          maxWidth: '180px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {doc.filename}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {doc.row_count} fila{doc.row_count !== 1 ? "s" : ""}
                      </span>
                      <span>
                        {doc.column_count} columna{doc.column_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(doc.created_at)}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePreviewClick(doc.file_id)}
                      className="h-8 w-8 shrink-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(doc.file_id, doc.filename)}
                      className="h-8 w-8 shrink-0"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
      <DocumentPreviewModal
        fileId={selectedFileId}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  )
}
