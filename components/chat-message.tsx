import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { User, Bot } from "lucide-react"
import Image from "next/image"

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

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-5 w-5 text-primary" />
        </div>
      )}

      <div className={`flex max-w-[80%] flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
        <Card
          className={`px-4 py-3 ${
            isUser ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground border-border"
          }`}
        >
          {message.type === "table" && message.data?.rows && message.data?.columns ? (
            <div className="overflow-x-auto">
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
            </div>
          ) : message.type === "plot" && message.data?.url ? (
            <div className="space-y-3">
              <div className="relative h-96 w-full overflow-hidden rounded-lg bg-muted border border-border">
                <Image
                  src={message.data.url}
                  alt="Gráfico generado"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              {message.content && (
                <p className="text-sm leading-relaxed text-balance whitespace-pre-wrap">
                  {message.content}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-balance whitespace-pre-wrap">{message.content}</p>
          )}
        </Card>
      </div>

      {isUser && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/10">
          <User className="h-5 w-5 text-secondary" />
        </div>
      )}
    </div>
  )
}
