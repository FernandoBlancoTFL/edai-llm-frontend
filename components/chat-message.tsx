"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { User, Bot, Maximize2 } from "lucide-react"
import Image from "next/image"
import { ImageModal } from "@/components/image-modal"
import { useTypewriter } from "@/hooks/use-typewriter"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

interface ChatMessageProps {
  message: Message
  isLatest?: boolean
}

export function ChatMessage({ message, isLatest = false }: ChatMessageProps) {
  const isUser = message.role === "user"
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)

  const shouldAnimate = !isUser && isLatest && !message.isHistorical

  const { displayedText, isTyping } = useTypewriter({
    text: message.content,
    speed: 10,
    enabled: shouldAnimate
  })

  const contentToShow = shouldAnimate ? displayedText : message.content

  return (
    <>
      <div className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"}`}>
        {!isUser && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
        )}

        <div className={`flex max-w-[80%] min-w-0 flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
          <Card
            className={`px-4 py-3 ${
              isUser 
                ? "bg-primary text-primary-foreground" 
                : "bg-card text-card-foreground border-border max-w-full overflow-x-auto"
            }`}
          >
            {message.type === "table" && message.data?.rows && message.data?.columns ? (
              <div className="space-y-3">
                {/* <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {message.data.columns.map((column, index) => (
                          <TableHead key={index} className="whitespace-nowrap font-semibold">
                            {column}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {message.data.rows.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {message.data.columns?.map((column, colIndex) => (
                            <TableCell key={colIndex} className="whitespace-nowrap">
                              {row[column]}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div> */}
                {message.content && (
                  <div className="text-sm leading-relaxed markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {contentToShow}
                    </ReactMarkdown>
                    {isTyping && <span className="animate-pulse ml-1">▋</span>}
                  </div>
                )}
              </div>
            ) : message.type === "plot" && message.data?.url ? (
              <div className="space-y-3">
                <button
                  onClick={() => setIsImageModalOpen(true)}
                  className="group relative h-96 w-full overflow-hidden rounded-lg bg-muted border border-border transition-all hover:border-primary/50 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  aria-label="Ampliar imagen"
                  style={{ cursor: 'pointer'}}
                >
                  <Image
                    src={message.data.url}
                    alt="Gráfico generado"
                    fill
                    className="object-contain transition-transform group-hover:scale-105"
                    unoptimized
                  />
                  
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <div className="bg-white/90 rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                      <Maximize2 className="h-6 w-6 text-gray-800" />
                    </div>
                  </div>
                </button>
                
                {message.content && (
                  <div className="text-sm leading-relaxed markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {contentToShow}
                    </ReactMarkdown>
                    {isTyping && <span className="animate-pulse ml-1">▋</span>}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm leading-relaxed markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {contentToShow}
                </ReactMarkdown>
                {isTyping && <span className="animate-pulse ml-1">▋</span>}
              </div>
            )}
          </Card>
        </div>

        {isUser && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/10">
            <User className="h-5 w-5 text-secondary" />
          </div>
        )}
      </div>

      {message.type === "plot" && message.data?.url && (
        <ImageModal
          isOpen={isImageModalOpen}
          onClose={() => setIsImageModalOpen(false)}
          imageUrl={message.data.url}
          alt="Gráfico generado ampliado"
        />
      )}
    </>
  )
}