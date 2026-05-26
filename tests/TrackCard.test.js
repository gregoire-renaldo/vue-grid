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
    const wrapper = mount(TrackCard, {
      props: {
        track,
        isCurrent: false,
        isPlaying: false,
        isMobileFocused: true,
        useFocusInteraction: true,
      },
    })

    await wrapper.find('.grid-item').trigger('click')
    expect(wrapper.emitted('focus')).toHaveLength(1)
    expect(wrapper.emitted('select')).toBeUndefined()

    await wrapper.find('.play-control-btn').trigger('click')
    expect(wrapper.emitted('select')).toHaveLength(1)
    expect(wrapper.emitted('select')[0]).toEqual([track])
  })

  it('plays immediately on first mobile tap in play hotspot', async () => {
    const wrapper = mount(TrackCard, {
      props: {
        track,
        isCurrent: false,
        isPlaying: false,
        isMobileFocused: false,
        useFocusInteraction: true,
        enableMobilePlayHotspot: true,
      },
    })

    const gridItem = wrapper.find('.grid-item')
    gridItem.element.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 180,
      height: 180,
      right: 180,
      bottom: 180,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    await gridItem.trigger('click', { clientX: 90, clientY: 68 })

    expect(wrapper.emitted('select')).toHaveLength(1)
    expect(wrapper.emitted('select')[0]).toEqual([track])
    expect(wrapper.emitted('focus')).toBeUndefined()
  })

  it('does not use hotspot on first mobile tap when setting is disabled', async () => {
    const wrapper = mount(TrackCard, {
      props: {
        track,
        isCurrent: false,
        isPlaying: false,
        isMobileFocused: false,
        useFocusInteraction: true,
        enableMobilePlayHotspot: false,
      },
    })

    const gridItem = wrapper.find('.grid-item')
    gridItem.element.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 180,
      height: 180,
      right: 180,
      bottom: 180,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    await gridItem.trigger('click', { clientX: 90, clientY: 68 })

    expect(wrapper.emitted('select')).toBeUndefined()
    expect(wrapper.emitted('focus')).toHaveLength(1)
  })
})
