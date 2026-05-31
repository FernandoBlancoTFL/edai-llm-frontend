import { useEffect, useState } from "react"

import { apiClient } from "@/lib/api"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"

interface DocumentPreviewModalProps {
  fileId: string | null
  open: boolean
  onClose: () => void
}

interface DocumentPreview {
  file_id: string
  filename: string
  created_at: string
  row_count: number
  column_count: number
  headers: string[]
  sample_rows: Record<string, any>[]
}

export default function DocumentPreviewModal({
  fileId,
  open,
  onClose
}: DocumentPreviewModalProps) {

  const [loading, setLoading] = useState(false)

  const [preview, setPreview] =
    useState<DocumentPreview | null>(null)

  useEffect(() => {

    if (!fileId || !open) return

    const fetchPreview = async () => {

      try {

        setLoading(true)

        const response =
          await apiClient.getDocumentPreview(fileId)

        const data = await response.json()

        setPreview(data)

      } catch (error) {

        console.error(error)

      } finally {

        setLoading(false)

      }
    }

    fetchPreview()

  }, [fileId, open])

  return (
    <Dialog
      open={open}
      onOpenChange={onClose}
    >
      <DialogContent
        className="
          max-w-5xl
          max-h-[80vh]
          overflow-y-auto
        "
      >
        <DialogHeader>
          <DialogTitle>
            Información del documento
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <p>Cargando información...</p>
        )}

        {!loading && preview && (
          <div className="space-y-6">

            <div className="space-y-2">

              <p>
                <strong>Nombre:</strong>{" "}
                {preview.filename}
              </p>

              <p>
                <strong>Fecha de subida:</strong>{" "}
                {new Date(
                  preview.created_at
                ).toLocaleString()}
              </p>

              <p>
                <strong>Filas:</strong>{" "}
                {preview.row_count}
              </p>

              <p>
                <strong>Columnas:</strong>{" "}
                {preview.column_count}
              </p>

            </div>

            <div>

              <h3 className="font-semibold mb-2">
                Encabezados
              </h3>

              <div className="flex flex-wrap gap-2">

                {preview.headers.map(header => (

                  <span
                    key={header}
                    className="
                      rounded
                      bg-muted
                      px-2
                      py-1
                      text-sm
                    "
                  >
                    {header}
                  </span>

                ))}

              </div>

            </div>

            <div>

              <h3 className="font-semibold mb-2">
                Primeras 3 filas
              </h3>

              <div className="overflow-x-auto">

                <table className="w-full border-collapse border">

                  <thead>

                    <tr>

                      {preview.headers.map(header => (

                        <th
                          key={header}
                          className="
                            border
                            p-2
                            text-left
                          "
                        >
                          {header}
                        </th>

                      ))}

                    </tr>

                  </thead>

                  <tbody>

                    {preview.sample_rows.map(
                      (row, rowIndex) => (

                        <tr key={rowIndex}>

                          {preview.headers.map(header => (

                            <td
                              key={header}
                              className="
                                border
                                p-2
                              "
                            >
                              {
                                String(
                                  row[header] ?? ""
                                )
                              }
                            </td>

                          ))}

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            </div>

          </div>
        )}

      </DialogContent>
    </Dialog>
  )
}