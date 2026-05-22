import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: 'playlist-123' },
  }),
}))

vi.mock('../src/spotifyAuth.js', () => ({
  getValidAccessToken: vi.fn(),
}))

import PlaylistDetail from '../src/views/PlaylistDetail.vue'
import { getValidAccessToken } from '../src/spotifyAuth.js'

function createSpotifyPlayerMock() {
  const listeners = {}

  return {
    Player: class MockPlayer {
      constructor() {
        this.listeners = listeners
      }

      addListener(event, callback) {
        this.listeners[event] = callback
      }

      async connect() {
        queueMicrotask(() => {
          this.listeners.ready?.({ device_id: 'device-123' })
        })
        return true
      }

      activateElement() {}
      getCurrentState() {
        return null
      }
      togglePlay() {}
      seek() {}
      previousTrack() {}
      nextTrack() {}
      pause() {}
      disconnect() {}
    },
  }
}

describe('PlaylistDetail view', () => {
  it('shows a loader while tracks are being fetched and then renders the tracks', async () => {
    getValidAccessToken.mockResolvedValue('token')

    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        name: 'Road Trip',
        uri: 'spotify:playlist:roadtrip',
      }),
    })

    let resolveTracksResponse
    const tracksResponsePromise = new Promise(resolve => {
      resolveTracksResponse = resolve
    })

    fetchMock.mockReturnValueOnce(tracksResponsePromise)
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('Spotify', createSpotifyPlayerMock())

    const wrapper = mount(PlaylistDetail, {
      global: {},
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Loading tracks...')

    resolveTracksResponse({
      ok: true,
      json: async () => ({
        items: [
          {
            track: {
              id: 'track-1',
              name: 'Song One',
              uri: 'spotify:track:one',
              duration_ms: 180000,
              album: { images: [{ url: 'https://example.com/cover.jpg' }] },
              artists: [{ name: 'Artist One' }],
            },
          },
        ],
        next: null,
      }),
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Song One')
    expect(wrapper.text()).toContain('Artist One')
    expect(wrapper.text()).not.toContain('Loading tracks...')
  })
})
