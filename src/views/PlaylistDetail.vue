<!-- src/views/PlaylistDetail.vue -->
<script setup>
import { inject, nextTick, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getValidAccessToken } from '../spotifyAuth.js'
import { usePlaylistTracks } from '../composables/usePlaylistTracks.js'
import { useSpotifyPlayback } from '../composables/useSpotifyPlayback.js'
import { useCooldown } from '../composables/useCooldown.js'
import { usePlaylistPoster } from '../composables/usePlaylistPoster.js'
import PlaylistHeader from '../components/PlaylistHeader.vue'
import TracksLoader from '../components/TracksLoader.vue'
import TrackCard from '../components/TrackCard.vue'
import PlaylistPosterModal from '../components/PlaylistPosterModal.vue'

const route = useRoute()
const router = useRouter()
const playlistId = route.params.id
const isLikedSongs = playlistId === 'liked-songs'
const gridRef = ref(null)
const isRefreshing = ref(false)
const nowPlayingAnimation = inject('nowPlayingAnimation', ref('dust'))
const mobilePlayHotspotEnabled = inject('mobilePlayHotspotEnabled', ref(false))
const isMobileDevice = inject('isMobileDevice', ref(false))
const anchoredTrackId = ref('')
const focusedTrackId = ref('')
const { isCoolingDown, label: refreshLabel, startCooldown } = useCooldown(5000)

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
  syncPlayerState,
} = useSpotifyPlayback({
  playlistId,
  isLikedSongs,
  tracks,
  playlistUri,
  playlistName,
  getValidAccessToken,
})

const {
  showPosterModal,
  posterCoverUrls,
  posterShareUrl,
  openPosterModal,
  closePosterModal,
} = usePlaylistPoster({ tracks, route })

async function refreshPlaylist() {
  if (isRefreshing.value || isCoolingDown.value) return

  isRefreshing.value = true
  startCooldown()

  try {
    await Promise.all([
      fetchPlaylistTracks({ forceRefresh: true }),
      syncPlayerState(),
    ])
  } finally {
    isRefreshing.value = false
  }
}

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

async function scrollToTrackCardById(trackId, options = {}) {
  const { anchor = false } = options
  if (!trackId) return

  await nextTick()

  const targetIndex = tracks.value.findIndex(
    trackItem => trackItem.track?.id === trackId,
  )
  if (targetIndex < 0) return

  const gridCards = gridRef.value?.querySelectorAll('.grid-item')
  const targetCard = gridCards?.[targetIndex]
  if (!targetCard) return

  targetCard.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'nearest',
  })

  if (anchor) {
    anchoredTrackId.value = trackId
    window.setTimeout(() => {
      if (anchoredTrackId.value === trackId) {
        anchoredTrackId.value = ''
      }
    }, 2500)
  }
}

function handleTrackFocus(track) {
  const trackId = track?.id || ''
  if (!trackId) return

  const sourcePlaylistId = currentTrack.value?.sourcePlaylistId
  const isSourcePlaylistDifferent =
    sourcePlaylistId &&
    sourcePlaylistId !== 'app-shell' &&
    sourcePlaylistId !== String(playlistId)

  if (isSourcePlaylistDifferent && isCurrentTrackCard(track)) {
    router.push({
      name: 'PlaylistDetail',
      params: { id: sourcePlaylistId },
      query: {
        focusTrack:
          currentTrack.value?.focusTrackId ||
          currentTrack.value?.id ||
          track.id,
      },
    })
    return
  }

  focusedTrackId.value = focusedTrackId.value === trackId ? '' : trackId
}

async function handleTrackSelect(track) {
  const sourcePlaylistId = currentTrack.value?.sourcePlaylistId
  const isSourcePlaylistDifferent =
    sourcePlaylistId &&
    sourcePlaylistId !== 'app-shell' &&
    sourcePlaylistId !== String(playlistId)

  if (isSourcePlaylistDifferent && isCurrentTrackCard(track)) {
    await router.push({
      name: 'PlaylistDetail',
      params: { id: sourcePlaylistId },
      query: {
        focusTrack:
          currentTrack.value?.focusTrackId ||
          currentTrack.value?.id ||
          track.id,
      },
    })
    return
  }

  await playTrack(track)
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
  await nextTick()

  const focusTrack =
    typeof route.query?.focusTrack === 'string' ? route.query.focusTrack : ''
  if (focusTrack) {
    await scrollToTrackCardById(focusTrack, { anchor: true })
  }
})

watch(
  () => route.query?.focusTrack,
  focusTrack => {
    if (typeof focusTrack !== 'string' || !focusTrack) return
    scrollToTrackCardById(focusTrack, { anchor: true })
  },
)

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
      @open-poster="openPosterModal"
    />

    <div class="page-actions">
      <button
        class="refresh-btn"
        :disabled="isRefreshing || isCoolingDown"
        @click="refreshPlaylist"
      >
        {{ isRefreshing ? 'Refreshing…' : refreshLabel }}
      </button>
    </div>

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
        :is-anchored="anchoredTrackId === track.track.id"
        :is-mobile-focused="focusedTrackId === track.track.id"
        :use-focus-interaction="isMobileDevice"
        :enable-mobile-play-hotspot="mobilePlayHotspotEnabled"
        :playing-animation="nowPlayingAnimation"
        @select="handleTrackSelect"
        @focus="handleTrackFocus"
      />
    </div>

    <PlaylistPosterModal
      :open="showPosterModal"
      :playlist-name="playlistName"
      :cover-urls="posterCoverUrls"
      :share-url="posterShareUrl"
      @close="closePosterModal"
    />
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

.page-actions {
  display: flex;
  justify-content: center;
  margin: 0.75rem 0 0.5rem;
}

.refresh-btn {
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(29, 185, 84, 0.14);
  color: inherit;
  border-radius: 999px;
  padding: 0.45rem 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
