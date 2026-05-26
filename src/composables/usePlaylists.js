import { ref } from 'vue'
import { getValidAccessToken } from '../spotifyAuth.js'
import { useCooldown } from './useCooldown.js'
import { isMadeForYouPlaylist } from '../utils/playlistCategories.js'
import {
  cachePlaylists,
  isCacheStale,
  readCachedPlaylists,
} from '../utils/spotifyCache.js'

const MADE_FOR_YOU_SEARCH_QUERIES = [
  'daily mix',
  'discover weekly',
  'release radar',
  'on repeat',
  'repeat rewind',
  'time capsule',
]

export function usePlaylists({ cooldownMs = 5000 } = {}) {
  const playlists = ref([])
  const currentUserId = ref('')
  const isPlaylistsLoading = ref(false)
  const isRefreshing = ref(false)
  const {
    isCoolingDown,
    label: refreshLabel,
    startCooldown,
  } = useCooldown(cooldownMs)

  async function fetchPlaylistsFromNetwork(token) {
    let endpoint = 'https://api.spotify.com/v1/me/playlists?limit=50'
    let allPlaylists = []

    while (endpoint) {
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error('Unable to fetch Spotify playlists.')
      }

      const data = await response.json()
      allPlaylists = allPlaylists.concat(data.items || [])
      endpoint = data.next || null
    }

    const madeForYouPlaylists = await fetchMadeForYouPlaylists(token)
    const dedupedPlaylists = new Map()

    allPlaylists.forEach(playlist => {
      if (playlist?.id) {
        dedupedPlaylists.set(playlist.id, playlist)
      }
    })

    madeForYouPlaylists.forEach(playlist => {
      if (playlist?.id && !dedupedPlaylists.has(playlist.id)) {
        dedupedPlaylists.set(playlist.id, playlist)
      }
    })

    const nextPlaylists = [...dedupedPlaylists.values()].map(
      (playlist, index) => ({
        ...playlist,
        _fetchedIndex: index,
      }),
    )

    playlists.value = nextPlaylists
    await cachePlaylists(nextPlaylists)

    return nextPlaylists
  }

  async function fetchMadeForYouPlaylists(token) {
    const collected = []

    for (const query of MADE_FOR_YOU_SEARCH_QUERIES) {
      const response = await fetch(
        `https://api.spotify.com/v1/search?type=playlist&limit=20&q=${encodeURIComponent(query)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )

      if (!response.ok) {
        continue
      }

      const data = await response.json()
      const items = data?.playlists?.items || []
      for (const playlist of items) {
        if (playlist?.id && isMadeForYouPlaylist(playlist)) {
          collected.push(playlist)
        }
      }
    }

    return collected
  }

  async function fetchCurrentUserId(token) {
    if (currentUserId.value) return currentUserId.value

    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      return ''
    }

    const profile = await response.json()
    currentUserId.value = profile?.id || ''
    return currentUserId.value
  }

  async function fetchPlaylists() {
    isPlaylistsLoading.value = true

    try {
      const cachedEntry = await readCachedPlaylists()

      if (cachedEntry?.value?.playlists?.length) {
        playlists.value = cachedEntry.value.playlists
      }

      if (cachedEntry && !isCacheStale(cachedEntry)) {
        return cachedEntry.value.playlists
      }

      const token = await getValidAccessToken()
      if (token) {
        await fetchCurrentUserId(token)

        if (cachedEntry?.value?.playlists?.length) {
          void fetchPlaylistsFromNetwork(token)
          return cachedEntry.value.playlists
        }

        return fetchPlaylistsFromNetwork(token)
      }

      return cachedEntry?.value || null
    } finally {
      isPlaylistsLoading.value = false
    }
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
    currentUserId,
    isPlaylistsLoading,
    isRefreshing,
    isCoolingDown,
    refreshLabel,
    fetchPlaylists,
    refreshPlaylists,
  }
}
