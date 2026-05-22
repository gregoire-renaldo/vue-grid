import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
import { __resetSpotifyPlaybackSingletonForTests } from '../src/composables/useSpotifyPlayback.js'

function createSpotifyPlayerMock() {
  const listeners = {}
  const togglePlay = vi.fn()
  const getCurrentState = vi.fn(() => null)

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
        return getCurrentState()
      }
      togglePlay() {
        return togglePlay()
      }
      seek() {}
      previousTrack() {}
      nextTrack() {}
      pause() {}
      disconnect() {}
    },
    __mock: {
      listeners,
      togglePlay,
      getCurrentState,
    },
  }
}

describe('PlaylistDetail view', () => {
  beforeEach(() => {
    __resetSpotifyPlaybackSingletonForTests()
    vi.unstubAllGlobals()
  })

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

  it('toggles pause when clicking the currently playing track cover', async () => {
    getValidAccessToken.mockResolvedValue('token')

    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        name: 'Road Trip',
        uri: 'spotify:playlist:roadtrip',
      }),
    })

    fetchMock.mockResolvedValueOnce({
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

    vi.stubGlobal('fetch', fetchMock)
    const spotifySdk = createSpotifyPlayerMock()
    spotifySdk.__mock.getCurrentState.mockReturnValue({
      paused: true,
      shuffle: false,
      position: 0,
      duration: 180000,
      track_window: {
        current_track: {
          id: 'different-id-same-uri',
          uri: 'spotify:track:one',
          name: 'Song One',
          artists: [{ name: 'Artist One' }],
          album: { images: [{ url: 'https://example.com/cover.jpg' }] },
          linked_from: null,
        },
      },
    })
    vi.stubGlobal('Spotify', spotifySdk)

    const wrapper = mount(PlaylistDetail)
    await flushPromises()

    spotifySdk.__mock.listeners.player_state_changed?.({
      paused: false,
      shuffle: false,
      position: 32000,
      duration: 180000,
      track_window: {
        current_track: {
          id: 'different-id-same-uri',
          uri: 'spotify:track:one',
          name: 'Song One',
          artists: [{ name: 'Artist One' }],
          album: { images: [{ url: 'https://example.com/cover.jpg' }] },
          linked_from: null,
        },
      },
    })

    await flushPromises()

    await wrapper.find('.grid-item').trigger('click')
    await flushPromises()

    expect(spotifySdk.__mock.togglePlay).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
