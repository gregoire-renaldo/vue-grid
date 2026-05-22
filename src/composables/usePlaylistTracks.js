import { ref } from 'vue'
import {
  cachePlaylistTracks,
  isCacheStale,
  readCachedPlaylistTracks,
} from '../utils/spotifyCache.js'

export function usePlaylistTracks({
  playlistId,
  isLikedSongs,
  getValidAccessToken,
  onError,
}) {
  const playlistName = ref(isLikedSongs ? 'Liked Songs' : '')
  const playlistUri = ref('')
  const tracks = ref([])
  const tracksLoading = ref(false)

  function applyCachedPlaylistTracks(cachedEntry) {
    if (!cachedEntry?.value) return false

    playlistName.value = cachedEntry.value.playlistName || playlistName.value
    playlistUri.value = cachedEntry.value.playlistUri || playlistUri.value
    tracks.value = cachedEntry.value.tracks || []

    return true
  }

  async function fetchPlaylistTracksFromNetwork(token) {
    const playlistData = {
      playlistName: playlistName.value,
      playlistUri: playlistUri.value,
      tracks: [],
    }

    if (!isLikedSongs) {
      const playlistResponse = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      const playlistJson = await playlistResponse.json()
      playlistName.value = playlistJson.name || 'Playlist'
      playlistUri.value = playlistJson.uri || ''
      playlistData.playlistName = playlistName.value
      playlistData.playlistUri = playlistUri.value
    }

    let allTracks = []
    let endpoint = isLikedSongs
      ? 'https://api.spotify.com/v1/me/tracks?limit=50'
      : `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`

    while (endpoint) {
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      allTracks = allTracks.concat(data.items || [])
      endpoint = data.next
    }

    tracks.value = allTracks
    playlistData.tracks = allTracks
    await cachePlaylistTracks(playlistId, playlistData)

    return playlistData
  }

  async function fetchPlaylistTracks(options = {}) {
    const { forceRefresh = false } = options
    tracksLoading.value = true

    const cachedEntry = await readCachedPlaylistTracks(playlistId)
    const hasCachedValue = applyCachedPlaylistTracks(cachedEntry)

    if (!forceRefresh && cachedEntry && !isCacheStale(cachedEntry)) {
      tracksLoading.value = false
      return cachedEntry.value
    }

    const token = await getValidAccessToken()
    if (!token) {
      tracksLoading.value = false
      return cachedEntry?.value || null
    }

    if (hasCachedValue && !forceRefresh) {
      tracksLoading.value = false
      void fetchPlaylistTracksFromNetwork(token)
      return cachedEntry?.value || null
    }

    try {
      return await fetchPlaylistTracksFromNetwork(token)
    } catch (error) {
      onError?.(error?.message || 'Unable to fetch playlist tracks.')
      return cachedEntry?.value || null
    } finally {
      tracksLoading.value = false
    }
  }

  return {
    playlistName,
    playlistUri,
    tracks,
    tracksLoading,
    fetchPlaylistTracks,
  }
}
