import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import {
  __resetSpotifyPlaybackSingletonForTests,
  useSpotifyPlayback,
} from '../src/composables/useSpotifyPlayback.js'

function createSpotifySdkMock() {
  const listeners = {}
  const togglePlay = vi.fn()
  const getCurrentState = vi.fn(() => null)
  const disconnect = vi.fn()
  const instanceCount = { value: 0 }

  return {
    Player: class MockPlayer {
      constructor() {
        this.listeners = listeners
        instanceCount.value += 1
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
      disconnect() {
        return disconnect()
      }
    },
    __mock: {
      listeners,
      togglePlay,
      getCurrentState,
      disconnect,
      instanceCount,
    },
  }
}

describe('useSpotifyPlayback', () => {
  beforeEach(() => {
    __resetSpotifyPlaybackSingletonForTests()
    vi.unstubAllGlobals()
  })

  it('initializes spotify player and becomes ready', async () => {
    const getValidAccessToken = vi.fn().mockResolvedValue('token')
    const tracks = ref([])
    const playlistUri = ref('spotify:playlist:roadtrip')

    const sdk = createSpotifySdkMock()
    vi.stubGlobal('Spotify', sdk)

    const playback = useSpotifyPlayback({
      playlistId: 'playlist-123',
      isLikedSongs: false,
      tracks,
      playlistUri,
      getValidAccessToken,
    })

    await playback.initPlayer()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(playback.playerReady.value).toBe(true)
  })

  it('toggles playback when playTrack is called on current track', async () => {
    const getValidAccessToken = vi.fn().mockResolvedValue('token')
    const track = {
      id: 'track-1',
      uri: 'spotify:track:one',
      name: 'Song One',
      artists: [{ name: 'Artist One' }],
      album: { images: [{ url: 'https://example.com/cover.jpg' }] },
      duration_ms: 180000,
    }

    const tracks = ref([{ track }])
    const playlistUri = ref('spotify:playlist:roadtrip')

    const sdk = createSpotifySdkMock()
    sdk.__mock.getCurrentState.mockReturnValue({
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

    vi.stubGlobal('Spotify', sdk)

    const playback = useSpotifyPlayback({
      playlistId: 'playlist-123',
      isLikedSongs: false,
      tracks,
      playlistUri,
      getValidAccessToken,
    })

    await playback.initPlayer()
    await new Promise(resolve => setTimeout(resolve, 0))

    sdk.__mock.listeners.player_state_changed?.({
      paused: false,
      shuffle: false,
      position: 1000,
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

    await playback.playTrack(track)

    expect(sdk.__mock.togglePlay).toHaveBeenCalledTimes(1)
  })

  it('disables shuffle when shuffle is already enabled', async () => {
    const getValidAccessToken = vi.fn().mockResolvedValue('token')
    const track = {
      id: 'track-1',
      uri: 'spotify:track:one',
      name: 'Song One',
      artists: [{ name: 'Artist One' }],
      album: { images: [{ url: 'https://example.com/cover.jpg' }] },
      duration_ms: 180000,
    }

    const tracks = ref([{ track }])
    const playlistUri = ref('spotify:playlist:roadtrip')

    const sdk = createSpotifySdkMock()
    sdk.__mock.getCurrentState.mockReturnValue({
      paused: false,
      shuffle: false,
      position: 0,
      duration: 180000,
      track_window: {
        current_track: {
          id: 'track-1',
          uri: 'spotify:track:one',
          name: 'Song One',
          artists: [{ name: 'Artist One' }],
          album: { images: [{ url: 'https://example.com/cover.jpg' }] },
          linked_from: null,
        },
      },
    })

    vi.stubGlobal('Spotify', sdk)

    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const playback = useSpotifyPlayback({
      playlistId: 'playlist-123',
      isLikedSongs: false,
      tracks,
      playlistUri,
      getValidAccessToken,
    })

    await playback.initPlayer()
    await new Promise(resolve => setTimeout(resolve, 0))

    sdk.__mock.listeners.player_state_changed?.({
      paused: false,
      shuffle: true,
      position: 32000,
      duration: 180000,
      track_window: {
        current_track: {
          id: 'track-1',
          uri: 'spotify:track:one',
          name: 'Song One',
          artists: [{ name: 'Artist One' }],
          album: { images: [{ url: 'https://example.com/cover.jpg' }] },
          linked_from: null,
        },
      },
    })

    await playback.shufflePlay()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/me/player/shuffle?state=false&device_id=device-123',
      expect.objectContaining({
        method: 'PUT',
        headers: { Authorization: 'Bearer token' },
      }),
    )
    expect(playback.shuffleEnabled.value).toBe(false)
  })

  it('keeps player alive on regular disconnect and tears down only when forced', async () => {
    const getValidAccessToken = vi.fn().mockResolvedValue('token')
    const tracks = ref([])
    const playlistUri = ref('spotify:playlist:roadtrip')

    const sdk = createSpotifySdkMock()
    vi.stubGlobal('Spotify', sdk)

    const playback = useSpotifyPlayback({
      playlistId: 'playlist-123',
      isLikedSongs: false,
      tracks,
      playlistUri,
      getValidAccessToken,
    })

    await playback.initPlayer()
    await new Promise(resolve => setTimeout(resolve, 0))

    playback.disconnectPlayer()
    expect(sdk.__mock.disconnect).not.toHaveBeenCalled()

    await playback.initPlayer()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(sdk.__mock.instanceCount.value).toBe(1)

    playback.disconnectPlayer({ force: true })
    expect(sdk.__mock.disconnect).toHaveBeenCalledTimes(1)
  })
})
