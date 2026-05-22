import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TracksLoader from '../src/components/TracksLoader.vue'

describe('TracksLoader', () => {
  it('renders loading label and default skeleton count', () => {
    const wrapper = mount(TracksLoader)

    expect(wrapper.text()).toContain('Loading tracks...')
    expect(wrapper.findAll('.loader-card')).toHaveLength(16)
  })

  it('renders custom skeleton count', () => {
    const wrapper = mount(TracksLoader, {
      props: {
        itemCount: 6,
      },
    })

    expect(wrapper.findAll('.loader-card')).toHaveLength(6)
  })
})
