import { describe, expect, it } from 'vitest'
import { avatarFileProblem, centerSquare, MAX_AVATAR_FILE_BYTES } from './image'

describe('avatar file checks', () => {
  it('accepts common photo types', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) expect(avatarFileProblem({ type, size: 1000 })).toBeNull()
  })
  it('refuses other files', () => {
    expect(avatarFileProblem({ type: 'application/pdf', size: 1000 })).toMatch(/JPG, PNG or WebP/)
    expect(avatarFileProblem({ type: 'image/svg+xml', size: 1000 })).toMatch(/JPG, PNG or WebP/)
  })
  it('refuses very large files', () => {
    expect(avatarFileProblem({ type: 'image/jpeg', size: MAX_AVATAR_FILE_BYTES + 1 })).toMatch(/too large/)
    expect(avatarFileProblem({ type: 'image/jpeg', size: MAX_AVATAR_FILE_BYTES })).toBeNull()
  })
})

describe('square crop', () => {
  it('cuts the middle of a wide picture', () => expect(centerSquare(1600, 900)).toEqual({ sx: 350, sy: 0, side: 900 }))
  it('cuts the middle of a tall picture', () => expect(centerSquare(600, 1000)).toEqual({ sx: 0, sy: 200, side: 600 }))
  it('leaves a square alone', () => expect(centerSquare(500, 500)).toEqual({ sx: 0, sy: 0, side: 500 }))
})
