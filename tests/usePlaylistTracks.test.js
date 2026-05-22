import { describe, expect, it, vi } from 'vitest'

import { usePlaylistTracks } from '../src/composables/usePlaylistTracks.js'

describe('usePlaylistTracks', () => {
  it('fetches playlist metadata and all paginated tracks', async () => {
    const getValidAccessToken = vi.fn().mockResolvedValue('token')
    const onError = vi.fn()

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          json: async () => ({
            name: 'Road Trip',
            uri: 'spotify:playlist:roadtrip',
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            items: [{ track: { id: 'track-1' } }],
            next: 'https://api.spotify.com/v1/playlists/playlist-123/tracks?offset=50&limit=50',
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            items: [{ track: { id: 'track-2' } }],
            next: null,
          }),
        }),
    )

    const state = usePlaylistTracks({
      playlistId: 'playlist-123',
      isLikedSongs: false,
      getValidAccessToken,
      onError,
    })

    await state.fetchPlaylistTracks()

    expect(state.playlistName.value).toBe('Road Trip')
    expect(state.playlistUri.value).toBe('spotify:playlist:roadtrip')
    expect(state.tracks.value).toHaveLength(2)
    expect(state.tracks.value[0].track.id).toBe('track-1')
    expect(state.tracks.value[1].track.id).toBe('track-2')
    expect(state.tracksLoading.value).toBe(false)
    expect(onError).not.toHaveBeenCalled()
  })

  it('fetches liked songs without playlist metadata request', async () => {
    const getValidAccessToken = vi.fn().mockResolvedValue('token')

    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        items: [{ track: { id: 'liked-1' } }],
        next: null,
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const state = usePlaylistTracks({
      playlistId: 'liked-songs',
      isLikedSongs: true,
      getValidAccessToken,
    })

    await state.fetchPlaylistTracks()

    expect(state.playlistName.value).toBe('Liked Songs')
    expect(state.playlistUri.value).toBe('')
    expect(state.tracks.value).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/me/tracks?limit=50',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token' },
      }),
    )
  })

  it('reports fetch errors via onError callback', async () => {
    const getValidAccessToken = vi.fn().mockResolvedValue('token')
    const onError = vi.fn()

    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network unavailable')),
    )

    const state = usePlaylistTracks({
      playlistId: 'playlist-123',
      isLikedSongs: false,
      getValidAccessToken,
      onError,
    })

    await state.fetchPlaylistTracks()

    expect(onError).toHaveBeenCalledWith('Network unavailable')
    expect(state.tracksLoading.value).toBe(false)
  })
})
