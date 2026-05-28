import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import PlaylistPosterModal from '../src/components/PlaylistPosterModal.vue'

function createCanvasContextMock() {
  return {
    fillStyle: '',
    font: '',
    textBaseline: 'top',
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 160 })),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  }
}

class MockImage {
  constructor() {
    this.naturalWidth = 400
    this.naturalHeight = 400
    this.onload = null
    this.onerror = null
  }

  set src(_value) {
    if (this.onload) {
      this.onload()
    }
  }
}

describe('PlaylistPosterModal', () => {
  beforeEach(() => {
    vi.stubGlobal('Image', MockImage)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() =>
      createCanvasContextMock(),
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/webp;base64,mock',
    )
  })

  it('emits close when clicking modal backdrop', async () => {
    const wrapper = mount(PlaylistPosterModal, {
      props: {
        open: true,
        playlistName: 'Road Trip',
        coverUrls: ['https://example.com/cover-1.jpg'],
        shareUrl: 'https://example.com/playlists/road-trip',
      },
    })

    await wrapper.find('.poster-modal-overlay').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('shows social icons with pinterest and linkedin as last', async () => {
    const wrapper = mount(PlaylistPosterModal, {
      props: {
        open: true,
        playlistName: 'Road Trip',
        coverUrls: ['https://example.com/cover-1.jpg'],
        shareUrl: 'https://example.com/playlists/road-trip',
      },
    })

    await flushPromises()

    const socialItems = wrapper.findAll('.poster-share-links > *')
    expect(socialItems.length).toBeGreaterThanOrEqual(5)

    const titles = socialItems.map(node => node.attributes('title'))
    expect(titles).toContain('Share on Pinterest')
    expect(titles.at(-1)).toBe('Share on LinkedIn')
  })

  it('updates max/effective covers when duplicate filtering is toggled', async () => {
    const wrapper = mount(PlaylistPosterModal, {
      props: {
        open: true,
        playlistName: 'Road Trip',
        coverUrls: [
          'https://example.com/cover-1.jpg',
          'https://example.com/cover-1.jpg',
          'https://example.com/cover-2.jpg',
        ],
        shareUrl: 'https://example.com/playlists/road-trip',
      },
    })

    await flushPromises()
    expect(wrapper.text()).toContain('2 / 2')

    const toggles = wrapper.findAll('.all-covers-toggle input[type="checkbox"]')
    const avoidRepeatedToggle = toggles[1]
    await avoidRepeatedToggle.setValue(false)
    await flushPromises()

    expect(wrapper.text()).toContain('3 / 3')
  })
})
