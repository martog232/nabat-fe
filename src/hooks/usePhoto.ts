import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { photosApi, storedPhotoName } from '../api/uploads'

/**
 * A report's photo as an object URL for `<img src>`, or null while there is none to show.
 * A stored photo never changes — the server serves it as immutable — so it is fetched once
 * per session. The object URL lives as long as the component showing it.
 */
export function usePhoto(photoUrl: string | null | undefined) {
  const name = storedPhotoName(photoUrl)
  const query = useQuery({
    queryKey: ['photo', name],
    queryFn: () => photosApi.load(name!),
    enabled: !!name,
    staleTime: Infinity,
    retry: 1,
  })

  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    if (!query.data) {
      setSrc(null)
      return
    }
    const url = URL.createObjectURL(query.data)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [query.data])

  return { hasPhoto: !!name, src, isLoading: query.isLoading, isError: query.isError }
}
