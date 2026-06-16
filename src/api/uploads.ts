import { apiClient } from './client'

interface UploadResponse {
  url: string
}

export const uploadsApi = {
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient
      .post<UploadResponse>('/uploads', formData)
      .then((r) => r.data)
  },
}
