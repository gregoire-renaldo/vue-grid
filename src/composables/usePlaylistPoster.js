import { computed, ref } from 'vue'

export function usePlaylistPoster({ tracks, route }) {
  const showPosterModal = ref(false)

  const posterCoverUrls = computed(() =>
    (tracks?.value || [])
      .map(trackItem => trackItem?.track?.album?.images?.[0]?.url || '')
      .filter(Boolean),
  )

  const posterShareUrl = computed(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/`
  })

  function openPosterModal() {
    showPosterModal.value = true
  }

  function closePosterModal() {
    showPosterModal.value = false
  }

  return {
    showPosterModal,
    posterCoverUrls,
    posterShareUrl,
    openPosterModal,
    closePosterModal,
  }
}
