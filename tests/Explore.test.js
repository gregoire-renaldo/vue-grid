import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/spotifyAuth.js', () => ({
  getValidAccessToken: vi.fn(),
}))

import Explore from '../src/views/Explore.vue'
import { getValidAccessToken } from '../src/spotifyAuth.js'
import { __resetSpotifyCacheForTests } from '../src/utils/spotifyCache.js'

describe('Explore view', () => {
  beforeEach(() => {
    __resetSpotifyCacheForTests()
    vi.unstubAllGlobals()
  })

  it('renders featured public playlists on mount', async () => {
    getValidAccessToken.mockResolvedValue('token')

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        playlists: {
          items: [
            {
              id: 'featured-1',
              name: 'Top Hits',
              images: [{ url: 'https://example.com/cover.jpg' }],
              tracks: { total: 48 },
            },
          ],
        },
      }),
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
  })

  it('searches public playlists when submitting a query', async () => {
    getValidAccessToken.mockResolvedValue('token')

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ playlists: { items: [] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          playlists: {
            items: [
              {
                id: 'featured-fallback-1',
                name: 'Top Hits Fallback',
                images: [{ url: 'https://example.com/chill.jpg' }],
                tracks: { total: 30 },
              },
            ],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          playlists: {
            items: [
              {
                id: 'search-1',
                name: 'Chill Vibes',
                images: [{ url: 'https://example.com/chill.jpg' }],
                tracks: { total: 30 },
              },
            ],
          },
        }),
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

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[2][0]).toContain('/v1/search?type=playlist')
    expect(fetchMock.mock.calls[2][0]).toContain('q=chill')
    expect(wrapper.text()).toContain('Chill Vibes')
  })
})
