import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

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
})
