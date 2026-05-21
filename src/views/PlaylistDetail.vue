<!-- src/views/PlaylistDetail.vue -->
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { getValidAccessToken } from '../spotifyAuth.js'

const route = useRoute()
const playlistId = route.params.id
const isLikedSongs = playlistId === 'liked-songs'
const playlistName = ref(isLikedSongs ? 'Liked Songs' : '')
const playlistUri = ref('')
const tracks = ref([])
const currentTrack = ref(null)
const currentPosition = ref(0)
const trackDuration = ref(0)
const isPlaying = ref(false)
const showNowPlaying = ref(true)
const playerReady = ref(false)
const playerError = ref(null)

let spotifyPlayer = null
let deviceId = null
let progressTimer = null
let inactivityTimer = null

function applyPlayerState(state) {
  if (!state) return

  isPlaying.value = !state.paused
  currentPosition.value = state.position ?? 0
  trackDuration.value = state.duration ?? 0
  showNowPlaying.value = true

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

  if (state.paused) {
    stopProgressTimer()
    stopInactivityTimer()
    showNowPlaying.value = true
  } else {
    startProgressTimer()
    scheduleNowPlayingFade()
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function syncPlayerState(retries = 5, delayMs = 120) {
  if (!spotifyPlayer) return

  for (let attempt = 0; attempt < retries; attempt++) {
    const state = await spotifyPlayer.getCurrentState()
    if (state) {
      applyPlayerState(state)
      return
    }
    await wait(delayMs)
  }
}

function stopInactivityTimer() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer)
    inactivityTimer = null
  }
}

function scheduleNowPlayingFade() {
  stopInactivityTimer()

  inactivityTimer = setTimeout(() => {
    if (isPlaying.value) {
      showNowPlaying.value = false
    }
  }, 5000)
}

function revealNowPlaying() {
  showNowPlaying.value = true
  if (isPlaying.value) {
    scheduleNowPlayingFade()
  }
}

function stopProgressTimer() {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
}

function startProgressTimer() {
  stopProgressTimer()

  progressTimer = setInterval(() => {
    if (!isPlaying.value || !trackDuration.value) return

    currentPosition.value = Math.min(
      currentPosition.value + 1000,
      trackDuration.value,
    )
  }, 1000)
}

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
    applyPlayerState(state)
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
    playlistUri.value = playlistData.uri || ''
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
  if (!token) {
    playerError.value =
      'Spotify session expired. Please reconnect your account.'
    return
  }

  playerError.value = null

  // Some browsers require this user-gesture activation before remote playback commands.
  await spotifyPlayer.activateElement?.()

  // Transfer playback to this browser tab
  const transferResponse = await fetch('https://api.spotify.com/v1/me/player', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ device_ids: [deviceId], play: false }),
  })

  if (!transferResponse.ok) {
    let message = 'Unable to activate the Spotify player device.'
    try {
      const data = await transferResponse.json()
      message = data?.error?.message || message
    } catch {
      // Ignore JSON parsing errors and keep fallback message.
    }
    playerError.value = message
    return
  }

  const selectedTrackIndex = tracks.value.findIndex(
    playlistTrack => playlistTrack.track.id === track.id,
  )

  // Play the selected track in playlist context so Spotify can continue to the next one
  const playResponse = await fetch(
    `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        isLikedSongs
          ? {
              uris: [track.uri],
            }
          : {
              context_uri: playlistUri.value,
              offset: { position: Math.max(selectedTrackIndex, 0) },
            },
      ),
    },
  )

  if (!playResponse.ok) {
    let message = 'Unable to start playback.'
    try {
      const data = await playResponse.json()
      message = data?.error?.message || message
    } catch {
      // Ignore JSON parsing errors and keep fallback message.
    }
    playerError.value = message
    return
  }

  await syncPlayerState()
}

async function togglePlayback() {
  await spotifyPlayer?.togglePlay()
  await syncPlayerState()
}

async function seekTrack(event) {
  if (!playerReady.value || !spotifyPlayer) return

  revealNowPlaying()
  const nextPosition = Number(event.target.value)
  currentPosition.value = nextPosition
  await spotifyPlayer.seek(nextPosition)
}

async function previousTrack() {
  if (!playerReady.value) return
  revealNowPlaying()
  await spotifyPlayer?.previousTrack()
  await syncPlayerState()
}

async function nextTrack() {
  if (!playerReady.value) return
  revealNowPlaying()
  await spotifyPlayer?.nextTrack()
  await syncPlayerState()
}

async function stopPlayback() {
  if (spotifyPlayer) {
    await spotifyPlayer.pause()
    isPlaying.value = false
    currentTrack.value = null
    currentPosition.value = 0
    trackDuration.value = 0
    stopProgressTimer()
    stopInactivityTimer()
    showNowPlaying.value = true
  }
}

function formatTime(milliseconds) {
  if (!milliseconds) return '0:00'

  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function isCurrentTrackCard(track) {
  if (!track || !currentTrack.value) return false

  if (currentTrack.value.id && track.id) {
    return currentTrack.value.id === track.id
  }

  return Boolean(
    currentTrack.value.uri && track.uri && currentTrack.value.uri === track.uri,
  )
}

onMounted(async () => {
  await fetchPlaylistTracks()
  await initPlayer()

  window.addEventListener('mousemove', revealNowPlaying)
  window.addEventListener('touchstart', revealNowPlaying, { passive: true })
  window.addEventListener('keydown', revealNowPlaying)
})

onUnmounted(() => {
  stopProgressTimer()
  stopInactivityTimer()
  window.removeEventListener('mousemove', revealNowPlaying)
  window.removeEventListener('touchstart', revealNowPlaying)
  window.removeEventListener('keydown', revealNowPlaying)
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
        :class="{
          current: isCurrentTrackCard(track.track),
          playing: isCurrentTrackCard(track.track) && isPlaying,
        }"
        @click="playTrack(track.track)"
      >
        <img
          :src="track.track.album.images[0]?.url"
          alt="Track cover"
          class="card-cover"
        />
        <div
          v-if="isCurrentTrackCard(track.track) && isPlaying"
          class="dust-layer"
          aria-hidden="true"
        >
          <span
            v-for="n in 12"
            :key="`dust-${track.track.id}-${n}`"
            class="dust-particle"
            :style="{
              '--x': `${(n * 17) % 100}%`,
              '--size': `${2 + (n % 3)}px`,
              '--delay': `${(n % 6) * 0.55}s`,
              '--duration': `${5.2 + (n % 5) * 0.7}s`,
            }"
          />
        </div>
        <div class="card-overlay">
          <div class="overlay-icon">
            <span v-if="isCurrentTrackCard(track.track) && isPlaying">⏸</span>
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

      <div class="now-playing-controls" :class="{ faded: !showNowPlaying }">
        <div class="seek-row">
          <span class="seek-time">{{ formatTime(currentPosition) }}</span>
          <input
            class="seek-bar"
            type="range"
            :min="0"
            :max="trackDuration || 0"
            :value="currentPosition"
            step="1000"
            :disabled="!trackDuration"
            @input="seekTrack"
          />
          <span class="seek-time">{{ formatTime(trackDuration) }}</span>
        </div>

        <button class="now-playing-btn" @click="togglePlayback">
          {{ isPlaying ? '⏸' : '▶' }}
        </button>
        <button
          class="now-playing-btn"
          @click="previousTrack"
          aria-label="Previous track"
        >
          ⏮
        </button>
        <button
          class="now-playing-btn"
          @click="nextTrack"
          aria-label="Next track"
        >
          ⏭
        </button>
        <button class="now-playing-btn stop-btn" @click="stopPlayback">
          ■
        </button>
      </div>
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

.grid-item.current {
  box-shadow: 0 0 0 2px rgba(29, 185, 84, 0.95);
}

.grid-item.playing {
  box-shadow: 0 0 0 3px #1db954;
}

.grid-item.current::after {
  content: '';
  position: absolute;
  inset: 6px;
  border: 1px solid rgba(29, 185, 84, 0.75);
  pointer-events: none;
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
  z-index: 2;
}

.grid-item:hover .card-overlay,
.grid-item.playing .card-overlay {
  opacity: 1;
}

.overlay-icon {
  font-size: 1.8rem;
  margin-bottom: 6px;
}

.dust-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 1;
}

.dust-particle {
  position: absolute;
  left: var(--x);
  bottom: -8%;
  width: var(--size);
  height: var(--size);
  border-radius: 999px;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.72) 0%,
    rgba(229, 229, 229, 0.45) 60%,
    rgba(205, 205, 205, 0.05) 100%
  );
  animation: dust-float var(--duration) linear infinite;
  animation-delay: var(--delay);
  opacity: 0;
}

@keyframes dust-float {
  0% {
    transform: translate3d(0, 0, 0) scale(0.7);
    opacity: 0;
  }

  10% {
    opacity: 0.45;
  }

  65% {
    opacity: 0.3;
  }

  100% {
    transform: translate3d(12px, -120%, 0) scale(1.15);
    opacity: 0;
  }
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
  opacity: 1;
  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
  transform: translateY(0);
}

.now-playing-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  transition: opacity 0.35s ease;
  opacity: 1;
}

.now-playing-controls.faded {
  opacity: 0;
  pointer-events: none;
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

.seek-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.35rem;
}

.seek-time {
  font-size: 0.75rem;
  color: #b3b3b3;
  min-width: 2.8rem;
}

.seek-bar {
  flex: 1;
  accent-color: #1db954;
  cursor: pointer;
}

.seek-bar:disabled {
  cursor: default;
  opacity: 0.45;
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
