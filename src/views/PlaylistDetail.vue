<!-- src/views/PlaylistDetail.vue -->
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { getValidAccessToken } from '../spotifyAuth.js'

const route = useRoute()
const playlistId = route.params.id
const isLikedSongs = playlistId === 'liked-songs'
const playlistName = ref(isLikedSongs ? 'Liked Songs' : '')
const tracks = ref([])
const currentTrack = ref(null)
const isPlaying = ref(false)
const playerReady = ref(false)
const playerError = ref(null)

let spotifyPlayer = null
let deviceId = null

// ── Spotify Web Playback SDK ──────────────────────────────────────────────────

function loadSDK() {
  return new Promise(resolve => {
    if (window.Spotify) {
      resolve()
      return
    }
    window.onSpotifyWebPlaybackSDKReady = resolve
    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    document.head.appendChild(script)
  })
}

async function initPlayer() {
  await loadSDK()

  spotifyPlayer = new window.Spotify.Player({
    name: 'Vue Grid Player',
    getOAuthToken: async cb => {
      cb(await getValidAccessToken())
    },
    volume: 0.8,
  })

  spotifyPlayer.addListener('ready', ({ device_id }) => {
    deviceId = device_id
    playerReady.value = true
  })

  spotifyPlayer.addListener('not_ready', () => {
    deviceId = null
    playerReady.value = false
  })

  spotifyPlayer.addListener('player_state_changed', state => {
    if (!state) return
    isPlaying.value = !state.paused
    const ct = state.track_window?.current_track
    if (ct) {
      currentTrack.value = {
        id: ct.id,
        uri: ct.uri,
        name: ct.name,
        artists: ct.artists,
        album: ct.album,
      }
    }
  })

  spotifyPlayer.addListener('initialization_error', ({ message }) => {
    playerError.value = `Init error: ${message}`
  })
  spotifyPlayer.addListener('authentication_error', ({ message }) => {
    playerError.value = `Auth error: ${message}`
  })
  spotifyPlayer.addListener('account_error', () => {
    playerError.value = 'Spotify Premium is required for in-browser playback.'
  })

  spotifyPlayer.connect()
}

// ── Tracks ────────────────────────────────────────────────────────────────────

async function fetchPlaylistTracks() {
  const token = await getValidAccessToken()
  if (!token) return

  if (!isLikedSongs) {
    const playlistResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )
    const playlistData = await playlistResponse.json()
    playlistName.value = playlistData.name || 'Playlist'
  }

  let allTracks = []
  let endpoint = isLikedSongs
    ? 'https://api.spotify.com/v1/me/tracks?limit=50'
    : `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`

  // Fetch all pages
  while (endpoint) {
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    allTracks = allTracks.concat(data.items)
    endpoint = data.next // Fetch next page if it exists
  }

  tracks.value = allTracks
}

// ── Playback ──────────────────────────────────────────────────────────────────

async function playTrack(track) {
  if (!playerReady.value || !deviceId) return

  // Toggle pause if clicking the same track
  if (currentTrack.value?.id === track.id) {
    spotifyPlayer.togglePlay()
    return
  }

  const token = await getValidAccessToken()

  // Transfer playback to this browser tab
  await fetch('https://api.spotify.com/v1/me/player', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ device_ids: [deviceId], play: false }),
  })

  // Play the selected track
  await fetch('https://api.spotify.com/v1/me/player/play', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uris: [track.uri], device_id: deviceId }),
  })
}

async function togglePlayback() {
  spotifyPlayer?.togglePlay()
}

async function stopPlayback() {
  if (spotifyPlayer) {
    await spotifyPlayer.pause()
    isPlaying.value = false
    currentTrack.value = null
  }
}

onMounted(async () => {
  await fetchPlaylistTracks()
  await initPlayer()
})

onUnmounted(() => {
  spotifyPlayer?.disconnect()
})
</script>

<template>
  <div class="playlist-detail">
    <h1>{{ playlistName }}</h1>

    <!-- Player error (e.g. non-Premium account) -->
    <p v-if="playerError" class="player-error">⚠️ {{ playerError }}</p>
    <!-- SDK still loading -->
    <p v-else-if="!playerReady" class="player-loading">
      Connecting to Spotify player…
    </p>

    <div class="grid">
      <div
        v-for="track in tracks"
        :key="track.track.id"
        class="grid-item"
        :class="{ playing: currentTrack?.id === track.track.id && isPlaying }"
        @click="playTrack(track.track)"
      >
        <img
          :src="track.track.album.images[0]?.url"
          alt="Track cover"
          class="card-cover"
        />
        <div class="card-overlay">
          <div class="overlay-icon">
            <span v-if="currentTrack?.id === track.track.id && isPlaying"
              >⏸</span
            >
            <span v-else>▶</span>
          </div>
          <p class="track-title">{{ track.track.name }}</p>
          <p class="track-artist">
            {{ track.track.artists.map(a => a.name).join(', ') }}
          </p>
        </div>
      </div>
    </div>

    <!-- Now playing bar -->
    <div v-if="currentTrack" class="now-playing">
      <img
        :src="currentTrack.album.images[0]?.url"
        alt="Album cover"
        class="now-playing-cover"
      />
      <div class="now-playing-info">
        <span class="now-playing-title">{{ currentTrack.name }}</span>
        <span class="now-playing-artist">{{
          currentTrack.artists.map(a => a.name).join(', ')
        }}</span>
      </div>
      <button class="now-playing-btn" @click="togglePlayback">
        {{ isPlaying ? '⏸' : '▶' }}
      </button>
      <button class="now-playing-btn stop-btn" @click="stopPlayback">■</button>
    </div>
  </div>
</template>

<style scoped>
.playlist-detail {
  text-align: center;
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0;
  padding-bottom: 100px;
}

.player-error {
  color: #ff6b6b;
  margin: 0.5rem 0 1rem;
}

.player-loading {
  color: #b3b3b3;
  margin: 0.5rem 0 1rem;
  font-style: italic;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
  margin-top: 8px;
  width: 100%;
}

.grid-item {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  cursor: pointer;
  border-radius: 2px;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.grid-item.playing {
  box-shadow: 0 0 0 3px #1db954;
}

.card-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.card-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
  box-sizing: border-box;
  opacity: 0;
  transition: opacity 0.2s;
}

.grid-item:hover .card-overlay,
.grid-item.playing .card-overlay {
  opacity: 1;
}

.overlay-icon {
  font-size: 1.8rem;
  margin-bottom: 6px;
}

.track-title {
  font-weight: bold;
  font-size: 0.75em;
  margin: 2px 0;
  text-align: center;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.track-artist {
  font-size: 0.7em;
  margin: 2px 0;
  text-align: center;
  color: #ccc;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  width: 100%;
}

.no-preview-text {
  font-size: 0.65em;
  margin-top: 4px;
  opacity: 0.75;
  font-style: italic;
}

/* Now playing bar */
.now-playing {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 72px;
  background: #121212;
  color: white;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0 1.5rem;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.5);
  z-index: 100;
}

.now-playing-cover {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  object-fit: cover;
}

.now-playing-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  text-align: left;
}

.now-playing-title {
  font-weight: 600;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.now-playing-artist {
  font-size: 0.8rem;
  color: #b3b3b3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.now-playing-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 50%;
  transition: background 0.2s;
}

.now-playing-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.stop-btn {
  font-size: 1rem;
  color: #b3b3b3;
}
</style>
