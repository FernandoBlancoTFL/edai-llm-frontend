import { useState, useEffect, useRef } from 'react'

interface UseTypewriterOptions {
  text: string
  speed?: number // Velocidad en ms por carácter
  enabled?: boolean // Controlar si el efecto está activo
  onComplete?: () => void // Callback cuando termina
}

export function useTypewriter({ 
  text, 
  speed = 20, 
  enabled = true,
  onComplete 
}: UseTypewriterOptions) {
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(enabled)
  const currentIndexRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Si el efecto está deshabilitado, mostrar todo el texto inmediatamente
    if (!enabled) {
      setDisplayedText(text)
      setIsTyping(false)
      return
    }

    // Reset cuando cambia el texto
    currentIndexRef.current = 0
    setDisplayedText('')
    setIsTyping(true)

    // Limpiar intervalo anterior si existe
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Crear nuevo intervalo para efecto de escritura
    intervalRef.current = setInterval(() => {
      if (currentIndexRef.current < text.length) {
        setDisplayedText(text.slice(0, currentIndexRef.current + 1))
        currentIndexRef.current++
      } else {
        // Terminó de escribir
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
        setIsTyping(false)
        onComplete?.()
      }
    }, speed)

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [text, speed, enabled, onComplete])

  // Función para saltear la animación y mostrar todo
  const skipAnimation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    setDisplayedText(text)
    setIsTyping(false)
    currentIndexRef.current = text.length
  }

  return {
    displayedText,
    isTyping,
    skipAnimation
  }
}