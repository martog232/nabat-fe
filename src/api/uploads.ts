import { apiClient } from './client'

interface UploadResponse {
  url: string
}

export const uploadsApi = {
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient
      .post<UploadResponse>('/uploads', formData, {
        // apiClient sets a default `Content-Type: application/json`. Axios only fills in
        // `multipart/form-data` (with the required boundary) when the header is unset, so
        // that default was winning and the server received a JSON-typed body with no
        // boundary — an unparseable multipart request. Clearing it per-request lets axios
        // derive the correct header from the FormData body.
        headers: { 'Content-Type': undefined },
      })
      .then((r) => r.data)
  },
}
