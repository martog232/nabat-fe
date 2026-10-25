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

/**
 * The stored name in a report's `photoUrl` (`/api/v1/uploads/<uuid>.jpg`), or null for
 * anything else. Only a name is ever sent back, to nabat's own `/uploads`: the URL is what
 * a client submitted, and following it as given would hand the bearer token to whatever
 * host it names.
 */
export function storedPhotoName(photoUrl: string | null | undefined): string | null {
  if (!photoUrl) return null
  const match = /\/uploads\/([A-Za-z0-9_-]+\.[A-Za-z0-9]+)$/.exec(photoUrl)
  return match ? match[1] : null
}

export const photosApi = {
  /**
   * The photo's bytes. Fetched rather than put in an `<img src>`, because the endpoint wants
   * the bearer token and an image request cannot carry one.
   */
  load: (name: string) =>
    apiClient
      .get<Blob>(`/uploads/${encodeURIComponent(name)}`, { responseType: 'blob' })
      .then((r) => r.data),
}
