// URL base de tu backend - ajusta según tu configuración
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000"

export const apiClient = {

  // ==========================
  // CHAT IA
  // ==========================

  async chat(
    message: string,
    chatId: string
  ) {

    const response = await fetch(
      `${API_BASE_URL}/api/chat/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          chat_id: chatId,
        }),
      }
    )

    return response
  },

  async getChatHistory(
    threadId: string
  ) {

    const response = await fetch(
      `${API_BASE_URL}/api/chat/chat-history?thread_id=${threadId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    )

    return response
  },

  // ==========================
  // GESTIÓN DE CHATS
  // ==========================

  async getChats() {

    const response = await fetch(
      `${API_BASE_URL}/api/chats`
    )

    return response
  },

  async createChat(name: string) {

    const response = await fetch(
      `${API_BASE_URL}/api/chats`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
        }),
      }
    )

    return response
  },

  async updateChat(
    chatId: string,
    name: string
  ) {

    const response = await fetch(
      `${API_BASE_URL}/api/chats/${chatId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
        }),
      }
    )

    return response
  },

  async deleteChat(chatId: string) {

    const response = await fetch(
      `${API_BASE_URL}/api/chats/${chatId}`,
      {
        method: "DELETE",
      }
    )

    return response
  },

  // ==========================
  // DOCUMENTOS
  // ==========================

  async getDocuments() {

    const response = await fetch(
      `${API_BASE_URL}/api/documents`
    )

    return response
  },

  async getDocumentPreview(
    fileId: string
  ) {

    const response = await fetch(
      `${API_BASE_URL}/api/documents/${fileId}/preview`
    )

    return response
  },

  async uploadDocument(file: File) {

    const formData = new FormData()

    formData.append(
      "file",
      file
    )

    const response = await fetch(
      `${API_BASE_URL}/api/documents/upload`,
      {
        method: "POST",
        body: formData,
      }
    )

    return response
  },

  async deleteDocument(
    fileId: string
  ) {

    const response = await fetch(
      `${API_BASE_URL}/api/documents/${fileId}`,
      {
        method: "DELETE",
      }
    )

    return response
  },
}