import { ref } from 'vue'

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

  async function fetchPlaylistTracks() {
    tracksLoading.value = true

    const token = await getValidAccessToken()
    if (!token) {
      tracksLoading.value = false
      return
    }

    try {
      if (!isLikedSongs) {
        const playlistResponse = await fetch(
          `https://api.spotify.com/v1/playlists/${playlistId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        )
        const playlistData = await playlistResponse.json()
        playlistName.value = playlistData.name || 'Playlist'
        playlistUri.value = playlistData.uri || ''
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
    } catch (error) {
      onError?.(error?.message || 'Unable to fetch playlist tracks.')
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
