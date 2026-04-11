"use client"

import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog"
import { X, Download } from "lucide-react"
import Image from "next/image"

interface ImageModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  alt?: string
}

export function ImageModal({ isOpen, onClose, imageUrl, alt = "Imagen" }: ImageModalProps) {

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = imageUrl
    link.download = imageUrl.split("/").pop() || "image.png"
    link.target = "_blank"

    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="something max-w-[95vw] sm:max-w-[1000px] max-h-[95vh] sm:max-h-[600px] p-0 overflow-hidden border-none bg-transparent shadow-2xl">
        <DialogClose style={{ cursor: 'pointer'}} className="absolute right-0 top-0 z-50 rounded-full bg-black/50 p-2 text-white opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-5 w-5" />
            <span className="sr-only">Cerrar</span>
        </DialogClose>
        <button
          onClick={handleDownload}
          className="absolute right-12 top-0 z-50 rounded-full bg-black/50 p-2 text-white opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
        >
          <Download className="h-5 w-5" />
          <span className="sr-only">Descargar</span>
        </button>
        {/* Imagen adaptativa */}
        <div className="relative w-full h-[80vh] sm:h-[600px] bg-black/90 overflow-hidden">
            <Image
            src={imageUrl}
            alt={alt}
            fill
            className="object-contain p-2 sm:p-4"
            unoptimized
            priority
            />
        </div>
        </DialogContent>
    </Dialog>
    )
}