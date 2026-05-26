import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import TrackCard from '../src/components/TrackCard.vue'

const track = {
  id: 'track-1',
  name: 'Song One',
  artists: [{ name: 'Artist One' }],
  album: { images: [{ url: 'https://example.com/cover.jpg' }] },
}

describe('TrackCard', () => {
  it('renders track info and play icon by default', () => {
    const wrapper = mount(TrackCard, {
      props: {
        track,
        isCurrent: false,
        isPlaying: false,
      },
    })

    expect(wrapper.text()).toContain('Song One')
    expect(wrapper.text()).toContain('Artist One')
    expect(wrapper.text()).toContain('▶')
  })

  it('shows pause icon and emits select on click', async () => {
    const wrapper = mount(TrackCard, {
      props: {
        track,
        isCurrent: true,
        isPlaying: true,
      },
    })

    expect(wrapper.text()).toContain('⏸')
    expect(wrapper.find('.dust-layer').exists()).toBe(true)
    expect(wrapper.findAll('.dust-particle')).toHaveLength(24)

    await wrapper.find('.grid-item').trigger('click')

    expect(wrapper.emitted('select')).toHaveLength(1)
    expect(wrapper.emitted('select')[0]).toEqual([track])
  })

  it('renders equalizer animation when configured', () => {
    const wrapper = mount(TrackCard, {
      props: {
        track,
        isCurrent: true,
        isPlaying: true,
        playingAnimation: 'equalizer',
      },
    })

    expect(wrapper.find('.equalizer-layer').exists()).toBe(true)
    expect(wrapper.findAll('.eq-bar')).toHaveLength(5)
    expect(wrapper.find('.dust-layer').exists()).toBe(false)
  })

  it('uses focus interaction on mobile and triggers select from play button', async () => {
    const matchMediaSpy = vi
      .spyOn(window, 'matchMedia')
      .mockImplementation(() => ({
        matches: true,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

    const wrapper = mount(TrackCard, {
      props: {
        track,
        isCurrent: false,
        isPlaying: false,
        isMobileFocused: true,
      },
    })

    await wrapper.find('.grid-item').trigger('click')
    expect(wrapper.emitted('focus')).toHaveLength(1)
    expect(wrapper.emitted('select')).toBeUndefined()

    await wrapper.find('.play-control-btn').trigger('click')
    expect(wrapper.emitted('select')).toHaveLength(1)
    expect(wrapper.emitted('select')[0]).toEqual([track])

    matchMediaSpy.mockRestore()
  })
})
