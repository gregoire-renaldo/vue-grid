import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PlaylistCard from '../src/components/PlaylistCard.vue'

function mountCard(props) {
  return mount(PlaylistCard, {
    props,
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

describe('PlaylistCard', () => {
  it('renders liked songs card variant', () => {
    const wrapper = mountCard({ likedSongs: true })

    expect(wrapper.text()).toContain('Liked Songs')
    expect(wrapper.text()).toContain('Your saved tracks')
  })

  it('renders a regular playlist card', () => {
    const wrapper = mountCard({
      playlist: {
        id: 'playlist-1',
        name: 'Road Trip',
        images: [{ url: 'https://example.com/cover.jpg' }],
        tracks: { total: 42 },
      },
    })

    expect(wrapper.text()).toContain('Road Trip')
    expect(wrapper.text()).toContain('42 tracks')
    expect(wrapper.find('img').exists()).toBe(true)
  })
})
