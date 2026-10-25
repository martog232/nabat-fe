import { describe, it, expect } from 'vitest'
import { storedPhotoName } from './uploads'

describe('storedPhotoName', () => {
  it('takes the name from nabat’s own upload URL', () => {
    expect(storedPhotoName('/api/v1/uploads/3f2a9c1e-77b0-4d1a-9a55-0c1d2e3f4a5b.jpg'))
      .toBe('3f2a9c1e-77b0-4d1a-9a55-0c1d2e3f4a5b.jpg')
  })

  it('has nothing for no photo', () => {
    expect(storedPhotoName(undefined)).toBeNull()
    expect(storedPhotoName(null)).toBeNull()
    expect(storedPhotoName('')).toBeNull()
  })

  it('refuses anything that is not a plain stored name', () => {
    expect(storedPhotoName('https://evil.example/steal.jpg')).toBeNull()
    expect(storedPhotoName('/api/v1/uploads/../auth/me')).toBeNull()
    expect(storedPhotoName('/api/v1/uploads/a.jpg?x=1')).toBeNull()
  })
})
