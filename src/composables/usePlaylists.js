import { ref } from 'vue'
import { getValidAccessToken } from '../spotifyAuth.js'
import { useCooldown } from './useCooldown.js'
import {
  cachePlaylists,
  isCacheStale,
  readCachedPlaylists,
} from '../utils/spotifyCache.js'

export function usePlaylists({ cooldownMs = 5000 } = {}) {
  const playlists = ref([])
  const isRefreshing = ref(false)
  const {
    isCoolingDown,
    label: refreshLabel,
    startCooldown,
  } = useCooldown(cooldownMs)

  async function fetchPlaylistsFromNetwork(token) {
    const response = await fetch('https://api.spotify.com/v1/me/playlists', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await response.json()
    const nextPlaylists = (data.items || []).map((playlist, index) => ({
      ...playlist,
      _fetchedIndex: index,
    }))

    playlists.value = nextPlaylists
    await cachePlaylists(nextPlaylists)

    return nextPlaylists
  }

  async function fetchPlaylists() {
    const cachedEntry = await readCachedPlaylists()

    if (cachedEntry?.value?.playlists?.length) {
      playlists.value = cachedEntry.value.playlists
    }

    if (cachedEntry && !isCacheStale(cachedEntry)) {
      return cachedEntry.value.playlists
    }

    const token = await getValidAccessToken()
    if (token) {
      if (cachedEntry?.value?.playlists?.length) {
        void fetchPlaylistsFromNetwork(token)
        return cachedEntry.value.playlists
      }

      return fetchPlaylistsFromNetwork(token)
    }

    return cachedEntry?.value || null
  }

  async function refreshPlaylists() {
    if (isRefreshing.value || isCoolingDown.value) return

    isRefreshing.value = true
    startCooldown()

    try {
      await fetchPlaylists()
    } finally {
      isRefreshing.value = false
    }
  }

  return {
    playlists,
    isRefreshing,
    isCoolingDown,
    refreshLabel,
    fetchPlaylists,
    refreshPlaylists,
  }
}
