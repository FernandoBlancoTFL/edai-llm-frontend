interface ChatSuggestionsProps {
  onSelectSuggestion: (text: string) => void
}

export function ChatSuggestions({ onSelectSuggestion }: ChatSuggestionsProps) {
  const suggestions = [
    "¿Cuántas filas tiene el dataset?",
    "Mostrá un resumen estadístico",
    "Generá un histograma",
    "¿Qué columnas tiene el dataset?",
    "Ayuda"
  ]

  return (
    <div className="mt-6 flex flex-wrap justify-center gap-2">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelectSuggestion(suggestion)}
          className="px-4 py-2 rounded-full border border-border bg-background hover:bg-muted transition text-sm"
          style={{ cursor: "pointer" }}
        >
          {suggestion}
        </button>
      ))}
    </div>
  )
}