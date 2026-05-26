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

describe('usePlaylists', () => {
  beforeEach(() => {
    __resetSpotifyCacheForTests()
    vi.unstubAllGlobals()
  })

  it('fetches playlists from network and stores fetched ordering index', async () => {
    getValidAccessToken.mockResolvedValue('token')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            { id: 'b', name: 'Beta', images: [], tracks: { total: 2 } },
            { id: 'a', name: 'Alpha', images: [], tracks: { total: 1 } },
          ],
        }),
      }),
    )

    const { state, wrapper } = mountUsePlaylists()
    const result = await state.fetchPlaylists()

    expect(result).toHaveLength(2)
    expect(state.playlists.value).toHaveLength(2)
    expect(state.playlists.value[0]._fetchedIndex).toBe(0)
    expect(state.playlists.value[1]._fetchedIndex).toBe(1)
    expect(fetch).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/me/playlists',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token' },
      }),
    )

    wrapper.unmount()
  })

  it('starts cooldown and refreshes playlists on manual refresh', async () => {
    getValidAccessToken.mockResolvedValue('token')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { state, wrapper } = mountUsePlaylists()
    await state.refreshPlaylists()

    expect(state.isRefreshing.value).toBe(false)
    expect(state.isCoolingDown.value).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })
})
