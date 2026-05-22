import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PlaylistHeader from '../src/components/PlaylistHeader.vue'

describe('PlaylistHeader', () => {
  it('renders title and emits shuffle action', async () => {
    const wrapper = mount(PlaylistHeader, {
      props: {
        playlistName: 'Road Trip',
        shuffleEnabled: false,
        isPreparingPlayback: false,
        playerReady: true,
        trackCount: 5,
      },
    })

    expect(wrapper.text()).toContain('Road Trip')
    expect(wrapper.text()).toContain('Shuffle Play')

    await wrapper.find('.shuffle-btn').trigger('click')

    expect(wrapper.emitted('shuffle-play')).toHaveLength(1)
  })

  it('shows preparing label and disables button when preparing', () => {
    const wrapper = mount(PlaylistHeader, {
      props: {
        playlistName: 'Road Trip',
        shuffleEnabled: true,
        isPreparingPlayback: true,
        playerReady: true,
        trackCount: 5,
      },
    })

    expect(wrapper.text()).toContain('Preparing…')
    expect(wrapper.find('.shuffle-btn').attributes('disabled')).toBeDefined()
  })
})
