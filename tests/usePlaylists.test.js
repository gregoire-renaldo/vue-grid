import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/spotifyAuth.js', () => ({
  getValidAccessToken: vi.fn(),
}))

import { usePlaylists } from '../src/composables/usePlaylists.js'
import { getValidAccessToken } from '../src/spotifyAuth.js'
import { __resetSpotifyCacheForTests } from '../src/utils/spotifyCache.js'

function mountUsePlaylists() {
  let state

  const wrapper = mount({
    template: '<div />',
    setup() {
      state = usePlaylists()
      return {}
    },
  })

  return { state, wrapper }
}

function createPlaylistsFetchMock({
  userId = 'user-123',
  playlists = [],
  madeForYouSearchResults = [],
} = {}) {
  return vi.fn(async url => {
    const requestUrl = String(url)

    if (requestUrl === 'https://api.spotify.com/v1/me') {
      return {
        ok: true,
        json: async () => ({ id: userId }),
      }
    }

    if (requestUrl.startsWith('https://api.spotify.com/v1/me/playlists')) {
      return {
        ok: true,
        json: async () => ({ items: playlists, next: null }),
      }
    }

    if (
      requestUrl.startsWith('https://api.spotify.com/v1/search?type=playlist')
    ) {
      return {
        ok: true,
        json: async () => ({
          playlists: {
            items: madeForYouSearchResults,
          },
        }),
      }
    }

    return { ok: true, json: async () => ({}) }
  })
}

describe('usePlaylists', () => {
  beforeEach(() => {
    __resetSpotifyCacheForTests()
    vi.unstubAllGlobals()
  })

  it('fetches playlists from network and stores fetched ordering index', async () => {
    getValidAccessToken.mockResolvedValue('token')
    vi.stubGlobal(
      'fetch',
      createPlaylistsFetchMock({
        playlists: [
          { id: 'b', name: 'Beta', images: [], tracks: { total: 2 } },
          { id: 'a', name: 'Alpha', images: [], tracks: { total: 1 } },
        ],
      }),
    )

    const { state, wrapper } = mountUsePlaylists()
    const result = await state.fetchPlaylists()

    expect(result).toHaveLength(2)
    expect(state.playlists.value).toHaveLength(2)
    expect(state.currentUserId.value).toBe('user-123')
    expect(state.playlists.value[0]._fetchedIndex).toBe(0)
    expect(state.playlists.value[1]._fetchedIndex).toBe(1)
    expect(fetch).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/me/playlists?limit=50',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token' },
      }),
    )

    wrapper.unmount()
  })

  it('starts cooldown and refreshes playlists on manual refresh', async () => {
    getValidAccessToken.mockResolvedValue('token')
    const fetchMock = createPlaylistsFetchMock({ playlists: [] })
    vi.stubGlobal('fetch', fetchMock)

    const { state, wrapper } = mountUsePlaylists()
    await state.refreshPlaylists()

    expect(state.isRefreshing.value).toBe(false)
    expect(state.isCoolingDown.value).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/me/playlists?limit=50',
      expect.any(Object),
    )

    wrapper.unmount()
  })

  it('merges made-for-you playlists returned by search when missing in /me/playlists', async () => {
    getValidAccessToken.mockResolvedValue('token')
    vi.stubGlobal(
      'fetch',
      createPlaylistsFetchMock({
        playlists: [
          { id: 'owned-1', name: 'My Playlist', tracks: { total: 2 } },
        ],
        madeForYouSearchResults: [
          {
            id: 'mfy-1',
            name: 'Daily Mix 1',
            owner: { id: 'spotify' },
            tracks: { total: 50 },
          },
        ],
      }),
    )

    const { state, wrapper } = mountUsePlaylists()
    await state.fetchPlaylists()

    expect(state.playlists.value.map(playlist => playlist.name)).toContain(
      'Daily Mix 1',
    )

    wrapper.unmount()
  })
})
