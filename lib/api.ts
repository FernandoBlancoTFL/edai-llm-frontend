// URL base de tu backend - ajusta según tu configuración
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export const apiClient = {
  async chat(message: string) {
    const response = await fetch(`${API_BASE_URL}/api/chat/`, {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
    })
    return response
    },
  
    getChatHistory: async () => {
      return fetch(`${API_BASE_URL}/api/chat/chat-history`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
    },

  async getDocuments() {
    const response = await fetch(`${API_BASE_URL}/api/documents`)
    return response
  },

  async getDocumentPreview(fileId: string) {
    const response = await fetch(
      `${API_BASE_URL}/api/documents/${fileId}/preview`
    )

    return response
  },

  async uploadDocument(file: File) {
    const formData = new FormData()
    formData.append("file", file)
    const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
      method: "POST",
      body: formData,
    })
    return response
  },

  async deleteDocument(fileId: string) {
    const response = await fetch(`${API_BASE_URL}/api/documents/${fileId}`, {
      method: "DELETE",
    })
    return response
  },
}