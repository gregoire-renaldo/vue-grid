import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/spotifyAuth.js', () => ({
  getValidAccessToken: vi.fn(),
}))

import Explore from '../src/views/Explore.vue'
import { getValidAccessToken } from '../src/spotifyAuth.js'
import { __resetSpotifyCacheForTests } from '../src/utils/spotifyCache.js'

function createExploreFetchMock({
  featuredPlaylists = [],
  searchPlaylists = [],
  categories = [],
  categoryPlaylists = [],
} = {}) {
  return vi.fn(async url => {
    const requestUrl = String(url)

    if (requestUrl.includes('/v1/browse/featured-playlists')) {
      return {
        ok: true,
        json: async () => ({
          playlists: { items: featuredPlaylists },
        }),
      }
    }

    if (requestUrl.includes('/v1/browse/categories?')) {
      return {
        ok: true,
        json: async () => ({
          categories: { items: categories },
        }),
      }
    }

    if (
      requestUrl.includes('/v1/browse/categories/') &&
      requestUrl.includes('/playlists')
    ) {
      return {
        ok: true,
        json: async () => ({
          playlists: { items: categoryPlaylists },
        }),
      }
    }

    if (requestUrl.includes('/v1/search?type=playlist')) {
      return {
        ok: true,
        json: async () => ({
          playlists: { items: searchPlaylists },
        }),
      }
    }

    return {
      ok: true,
      json: async () => ({}),
    }
  })
}

describe('Explore view', () => {
  beforeEach(() => {
    __resetSpotifyCacheForTests()
    vi.unstubAllGlobals()
  })

  it('renders featured public playlists on mount', async () => {
    getValidAccessToken.mockResolvedValue('token')

    const fetchMock = createExploreFetchMock({
      featuredPlaylists: [
        {
          id: 'featured-1',
          name: 'Top Hits',
          images: [{ url: 'https://example.com/cover.jpg' }],
          tracks: { total: 48 },
        },
      ],
      categories: [
        {
          id: 'pop',
          name: 'Pop',
          icons: [{ url: 'https://example.com/pop.jpg' }],
        },
      ],
      categoryPlaylists: [
        {
          id: 'cat-1',
          name: 'Pop Rising',
          images: [{ url: 'https://example.com/pop-rising.jpg' }],
          tracks: { total: 20 },
        },
      ],
    })

    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mount(Explore, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Explore Public Playlists')
    expect(wrapper.text()).toContain('Top Hits')
    expect(wrapper.text()).toContain('Category / Mood / Genre Playlists')
    expect(wrapper.text()).toContain('Pop Rising')
  })

  it('searches public playlists when submitting a query', async () => {
    getValidAccessToken.mockResolvedValue('token')

    const fetchMock = createExploreFetchMock({
      featuredPlaylists: [
        {
          id: 'featured-1',
          name: 'Top Hits',
          images: [{ url: 'https://example.com/top-hits.jpg' }],
          tracks: { total: 40 },
        },
      ],
      categories: [
        {
          id: 'mood',
          name: 'Mood',
          icons: [{ url: 'https://example.com/mood.jpg' }],
        },
      ],
      categoryPlaylists: [
        {
          id: 'cat-2',
          name: 'Mood Booster',
          images: [{ url: 'https://example.com/mood-booster.jpg' }],
          tracks: { total: 18 },
        },
      ],
      searchPlaylists: [
        {
          id: 'search-1',
          name: 'Chill Vibes',
          images: [{ url: 'https://example.com/chill.jpg' }],
          tracks: { total: 30 },
        },
      ],
    })

    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mount(Explore, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    })
    await flushPromises()

    await wrapper.find('input[type="search"]').setValue('chill')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    const searchCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/v1/search?type=playlist'),
    )
    expect(searchCall?.[0]).toContain('/v1/search?type=playlist')
    expect(searchCall?.[0]).toContain('q=chill')
    expect(wrapper.text()).toContain('Chill Vibes')
  })
})
