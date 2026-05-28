import { computed, ref } from 'vue'

const POSTER_SHARE_URL = 'https://mosaic-covers.vercel.app/'

export function usePlaylistPoster({ tracks }) {
  const showPosterModal = ref(false)

  const posterCoverUrls = computed(() =>
    (tracks?.value || [])
      .map(trackItem => trackItem?.track?.album?.images?.[0]?.url || '')
      .filter(Boolean),
  )

  const posterShareUrl = computed(() => {
    return POSTER_SHARE_URL
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
