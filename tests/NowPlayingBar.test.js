import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import NowPlayingBar from '../src/components/NowPlayingBar.vue'

const currentTrack = {
  id: 'track-1',
  name: 'Song One',
  artists: [{ name: 'Artist One' }],
  album: { images: [{ url: 'https://example.com/cover.jpg' }] },
  playlistName: 'Road Trip',
  sourcePlaylistId: 'playlist-123',
  focusTrackId: 'track-1',
}

describe('NowPlayingBar', () => {
  it('renders now playing metadata and formatted timer', () => {
    const wrapper = mount(NowPlayingBar, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a><slot /></a>',
          },
        },
      },
      props: {
        currentTrack,
        currentPosition: 65_000,
        trackDuration: 180_000,
        isPlaying: true,
        showNowPlaying: true,
      },
    })

    expect(wrapper.text()).toContain('Song One')
    expect(wrapper.text()).toContain('Artist One')
    expect(wrapper.text()).toContain('From: Road Trip')
    expect(wrapper.text()).toContain('1:05')
    expect(wrapper.text()).toContain('3:00')
  })

  it('emits playback control events', async () => {
    const wrapper = mount(NowPlayingBar, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a><slot /></a>',
          },
        },
      },
      props: {
        currentTrack,
        currentPosition: 0,
        trackDuration: 180_000,
        isPlaying: false,
        showNowPlaying: true,
      },
    })

    await wrapper.findAll('.now-playing-btn')[0].trigger('click')
    await wrapper.find('[aria-label="Previous track"]').trigger('click')
    await wrapper.find('[aria-label="Next track"]').trigger('click')
    await wrapper.findAll('.now-playing-btn')[3].trigger('click')
    await wrapper.find('.seek-bar').setValue(30_000)

    expect(wrapper.emitted('toggle-playback')).toHaveLength(1)
    expect(wrapper.emitted('previous-track')).toHaveLength(1)
    expect(wrapper.emitted('next-track')).toHaveLength(1)
    expect(wrapper.emitted('stop-playback')).toHaveLength(1)
    expect(wrapper.emitted('seek-track')).toHaveLength(1)
  })
})
