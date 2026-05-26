import { describe, expect, it } from 'vitest'
import { reactive, ref } from 'vue'

import { usePlaylistPoster } from '../src/composables/usePlaylistPoster.js'

describe('usePlaylistPoster', () => {
  it('derives cover urls, share url, and toggles modal state', () => {
    const tracks = ref([
      {
        track: {
          album: { images: [{ url: 'https://example.com/cover-1.jpg' }] },
        },
      },
      {
        track: {
          album: { images: [{ url: 'https://example.com/cover-2.jpg' }] },
        },
      },
    ])
    const route = reactive({ fullPath: '/playlists/playlist-123' })

    const state = usePlaylistPoster({ tracks, route })

    expect(state.showPosterModal.value).toBe(false)
    expect(state.posterCoverUrls.value).toEqual([
      'https://example.com/cover-1.jpg',
      'https://example.com/cover-2.jpg',
    ])
    expect(state.posterShareUrl.value).toContain('/playlists/playlist-123')

    state.openPosterModal()
    expect(state.showPosterModal.value).toBe(true)

    state.closePosterModal()
    expect(state.showPosterModal.value).toBe(false)
  })

  it('reacts to tracks updates', () => {
    const tracks = ref([])
    const route = reactive({ fullPath: '/playlists/liked-songs' })

    const state = usePlaylistPoster({ tracks, route })

    expect(state.posterCoverUrls.value).toEqual([])

    tracks.value = [
      {
        track: {
          album: { images: [{ url: 'https://example.com/new-cover.jpg' }] },
        },
      },
    ]

    expect(state.posterCoverUrls.value).toEqual([
      'https://example.com/new-cover.jpg',
    ])
  })
})
