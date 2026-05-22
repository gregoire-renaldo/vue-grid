import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/spotifyAuth.js', () => ({
  getValidAccessToken: vi.fn(),
}))

import Playlists from '../src/views/Playlists.vue'
import { getValidAccessToken } from '../src/spotifyAuth.js'

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

describe('Playlists view', () => {
  it('renders the liked songs entry and sorts playlists alphabetically by default', async () => {
    getValidAccessToken.mockResolvedValue('token')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
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
      }),
    )

    const wrapper = mountPlaylists()
    await flushPromises()

    expect(wrapper.text()).toContain('Liked Songs')
    expect(wrapper.text()).toContain('Alpha')
    expect(wrapper.text()).toContain('Beta')
    expect(fetch).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/me/playlists',
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
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
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
})
