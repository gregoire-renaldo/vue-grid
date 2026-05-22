<!-- src/views/PlaylistDetail.vue -->
<script setup>
import { nextTick, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getValidAccessToken } from '../spotifyAuth.js'
import { usePlaylistTracks } from '../composables/usePlaylistTracks.js'
import { useSpotifyPlayback } from '../composables/useSpotifyPlayback.js'
import PlaylistHeader from '../components/PlaylistHeader.vue'
import TracksLoader from '../components/TracksLoader.vue'
import TrackCard from '../components/TrackCard.vue'

const route = useRoute()
const playlistId = route.params.id
const isLikedSongs = playlistId === 'liked-songs'
const gridRef = ref(null)

const playerError = ref(null)

const {
  playlistName,
  playlistUri,
  tracks,
  tracksLoading,
  fetchPlaylistTracks,
} = usePlaylistTracks({
  playlistId,
  isLikedSongs,
  getValidAccessToken,
  onError: message => {
    playerError.value = message
  },
})

const {
  currentTrack,
  isPlaying,
  shuffleEnabled,
  playerReady,
  playerError: playbackPlayerError,
  isPreparingPlayback,
  initPlayer,
  disconnectPlayer,
  isCurrentTrackCard,
  playTrack,
  shufflePlay,
} = useSpotifyPlayback({
  playlistId,
  isLikedSongs,
  tracks,
  playlistUri,
  getValidAccessToken,
})

watch(
  playbackPlayerError,
  message => {
    if (message) {
      playerError.value = message
    }
  },
  { immediate: true },
)

async function scrollToCurrentTrackCard() {
  await nextTick()

  const currentTrackIndex = tracks.value.findIndex(trackItem =>
    isCurrentTrackCard(trackItem.track),
  )
  if (currentTrackIndex < 0) return

  const gridCards = gridRef.value?.querySelectorAll('.grid-item')
  const targetCard = gridCards?.[currentTrackIndex]
  if (!targetCard) return

  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight
  const rect = targetCard.getBoundingClientRect()
  const fullyVisible = rect.top >= 0 && rect.bottom <= viewportHeight

  if (!fullyVisible) {
    targetCard.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    })
  }
}

watch(
  [() => currentTrack.value?.id, isPlaying],
  ([currentTrackId, playing], [previousTrackId]) => {
    if (!playing || !currentTrackId) return
    if (currentTrackId === previousTrackId) return
    scrollToCurrentTrackCard()
  },
)

onMounted(async () => {
  await Promise.all([fetchPlaylistTracks(), initPlayer()])
})

onUnmounted(() => {
  disconnectPlayer()
})
</script>

<template>
  <div class="playlist-detail">
    <PlaylistHeader
      :playlist-name="playlistName"
      :shuffle-enabled="shuffleEnabled"
      :is-preparing-playback="isPreparingPlayback"
      :player-ready="playerReady"
      :track-count="tracks.length"
      @shuffle-play="shufflePlay"
    />

    <!-- Player error (e.g. non-Premium account) -->
    <p v-if="playerError" class="player-error">⚠️ {{ playerError }}</p>
    <!-- SDK still loading -->
    <p v-else-if="!playerReady" class="player-loading">
      Connecting to Spotify player…
    </p>

    <TracksLoader v-if="tracksLoading" />

    <div v-else ref="gridRef" class="grid">
      <TrackCard
        v-for="track in tracks"
        :key="track.track.id"
        :track="track.track"
        :is-current="isCurrentTrackCard(track.track)"
        :is-playing="isPlaying"
        @select="playTrack"
      />
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
</style>
