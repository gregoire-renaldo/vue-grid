import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/spotifyAuth.js', () => ({
  getValidAccessToken: vi.fn(),
}))

import Playlists from '../src/views/Playlists.vue'
import { getValidAccessToken } from '../src/spotifyAuth.js'
import { __resetSpotifyCacheForTests } from '../src/utils/spotifyCache.js'

function mountPlaylists() {
  return mount(Playlists, {
    global: {
      stubs: {
        RouterLink: {
          props: ['to'],
          template: '<a><slot /></a>',
        },
      },
    },
  })
}

function createPlaylistsFetchMock({
  userId = 'me-user',
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
        json: async () => ({
          items: playlists,
          next: null,
        }),
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

    return {
      ok: true,
      json: async () => ({}),
    }
  })
}

describe('Playlists view', () => {
  beforeEach(() => {
    __resetSpotifyCacheForTests()
    vi.unstubAllGlobals()
  })

  it('renders the liked songs entry and sorts playlists alphabetically by default', async () => {
    getValidAccessToken.mockResolvedValue('token')
    vi.stubGlobal(
      'fetch',
      createPlaylistsFetchMock({
        playlists: [
          {
            id: '2',
            name: 'Beta',
            images: [],
            tracks: { total: 2 },
          },
          {
            id: '1',
            name: 'Alpha',
            images: [],
            tracks: { total: 1 },
          },
        ],
      }),
    )

    const wrapper = mountPlaylists()
    await flushPromises()

    expect(wrapper.text()).toContain('Liked Songs')
    expect(wrapper.text()).toContain('Alpha')
    expect(wrapper.text()).toContain('Beta')
    expect(fetch).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/me/playlists?limit=50',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token' },
      }),
    )

    const playlistTitles = wrapper
      .findAll('.playlist-info h2')
      .map(node => node.text())
      .filter(title => title !== 'Liked Songs')

    expect(playlistTitles).toEqual(['Alpha', 'Beta'])
  })

  it('reorders playlists when the sort mode changes', async () => {
    getValidAccessToken.mockResolvedValue('token')
    vi.stubGlobal(
      'fetch',
      createPlaylistsFetchMock({
        playlists: [
          {
            id: '2',
            name: 'Beta',
            images: [],
            tracks: { total: 2 },
          },
          {
            id: '1',
            name: 'Alpha',
            images: [],
            tracks: { total: 1 },
          },
        ],
      }),
    )

    const wrapper = mountPlaylists()
    await flushPromises()

    await wrapper.find('#playlist-sort').setValue('alpha-desc')

    const playlistTitles = wrapper
      .findAll('.playlist-info h2')
      .map(node => node.text())
      .filter(title => title !== 'Liked Songs')

    expect(playlistTitles).toEqual(['Beta', 'Alpha'])
  })

  it('filters playlists as the user types in the title search', async () => {
    getValidAccessToken.mockResolvedValue('token')
    vi.stubGlobal(
      'fetch',
      createPlaylistsFetchMock({
        playlists: [
          {
            id: '2',
            name: 'Beta Mix',
            images: [],
            tracks: { total: 2 },
          },
          {
            id: '1',
            name: 'Alpha Vibes',
            images: [],
            tracks: { total: 1 },
          },
        ],
      }),
    )

    const wrapper = mountPlaylists()
    await flushPromises()

    await wrapper.find('.playlist-search').setValue('alpha')

    const playlistTitles = wrapper
      .findAll('.playlist-info h2')
      .map(node => node.text())

    expect(playlistTitles).toContain('Alpha Vibes')
    expect(playlistTitles).not.toContain('Beta Mix')
    expect(playlistTitles).not.toContain('Liked Songs')
  })

  it('shows category tags and filters playlists by selected category', async () => {
    getValidAccessToken.mockResolvedValue('token')
    vi.stubGlobal(
      'fetch',
      createPlaylistsFetchMock({
        playlists: [
          {
            id: 'owned-1',
            name: 'My Playlist',
            owner: { id: 'me-user' },
            public: true,
            collaborative: false,
            images: [],
            tracks: { total: 5 },
          },
        ],
        madeForYouSearchResults: [
          {
            id: 'mfy-1',
            name: 'Daily Mix 1',
            owner: { id: 'spotify' },
            public: false,
            collaborative: false,
            images: [],
            tracks: { total: 20 },
          },
        ],
      }),
    )

    const wrapper = mountPlaylists()
    await flushPromises()

    expect(wrapper.text()).toContain('Owned')
    expect(wrapper.text()).toContain('Made for You')

    const madeForYouFilter = wrapper
      .findAll('.category-filter-btn')
      .find(node => node.text() === 'Made for You')
    await madeForYouFilter.trigger('click')

    const playlistTitles = wrapper
      .findAll('.playlist-info h2')
      .map(node => node.text())

    expect(playlistTitles).toContain('Daily Mix 1')
    expect(playlistTitles).not.toContain('My Playlist')
    expect(playlistTitles).not.toContain('Liked Songs')
  })
})
