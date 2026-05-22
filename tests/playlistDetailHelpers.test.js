import { describe, expect, it } from 'vitest'

import {
  extractSpotifyError,
  formatTime,
  isDeviceNotFoundMessage,
  tracksMatch,
} from '../src/utils/playlistDetailHelpers.js'

describe('playlistDetailHelpers', () => {
  it('matches tracks by id', () => {
    const current = { id: 'track-1', uri: 'spotify:track:one' }
    const next = { id: 'track-1', uri: 'spotify:track:other' }

    expect(tracksMatch(current, next)).toBe(true)
  })

  it('matches tracks by uri and linked uri', () => {
    const current = {
      id: 'track-live-id',
      uri: 'spotify:track:live',
      linkedFromUri: 'spotify:track:studio',
    }
    const next = {
      id: 'track-studio-id',
      uri: 'spotify:track:studio',
    }

    expect(tracksMatch(current, next)).toBe(true)
  })

  it('returns false for unrelated tracks', () => {
    const current = { id: 'track-1', uri: 'spotify:track:one' }
    const next = { id: 'track-2', uri: 'spotify:track:two' }

    expect(tracksMatch(current, next)).toBe(false)
  })

  it('detects device not found message', () => {
    expect(isDeviceNotFoundMessage('Device not found')).toBe(true)
    expect(isDeviceNotFoundMessage('DEVICE   NOT   FOUND')).toBe(true)
    expect(isDeviceNotFoundMessage('Something else failed')).toBe(false)
  })

  it('formats milliseconds as m:ss', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(65_000)).toBe('1:05')
    expect(formatTime(3_599_000)).toBe('59:59')
  })

  it('extracts spotify error message when available', async () => {
    const response = {
      status: 404,
      json: async () => ({
        error: { message: 'Device not found' },
      }),
    }

    await expect(
      extractSpotifyError(response, 'Unable to start playback.'),
    ).resolves.toEqual({
      status: 404,
      message: 'Device not found',
    })
  })

  it('falls back to provided message when response body is unreadable', async () => {
    const response = {
      status: 500,
      json: async () => {
        throw new Error('Invalid JSON')
      },
    }

    await expect(
      extractSpotifyError(response, 'Unable to start playback.'),
    ).resolves.toEqual({
      status: 500,
      message: 'Unable to start playback.',
    })
  })
})
