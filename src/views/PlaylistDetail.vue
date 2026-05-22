<!-- src/views/PlaylistDetail.vue -->
<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getValidAccessToken } from '../spotifyAuth.js'
import { usePlaylistTracks } from '../composables/usePlaylistTracks.js'
import { useSpotifyPlayback } from '../composables/useSpotifyPlayback.js'
import { formatTime } from '../utils/playlistDetailHelpers.js'

const route = useRoute()
const playlistId = route.params.id
const isLikedSongs = playlistId === 'liked-songs'
const skeletonItems = Array.from({ length: 16 }, (_, index) => index)

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
  currentPosition,
  trackDuration,
  isPlaying,
  shuffleEnabled,
  showNowPlaying,
  playerReady,
  playerError: playbackPlayerError,
  isPreparingPlayback,
  initPlayer,
  disconnectPlayer,
  revealNowPlaying,
  isCurrentTrackCard,
  playTrack,
  shufflePlay,
  togglePlayback,
  seekTrack,
  previousTrack,
  nextTrack,
  stopPlayback,
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

onMounted(async () => {
  await Promise.all([fetchPlaylistTracks(), initPlayer()])

  window.addEventListener('mousemove', revealNowPlaying)
  window.addEventListener('touchstart', revealNowPlaying, { passive: true })
  window.addEventListener('keydown', revealNowPlaying)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', revealNowPlaying)
  window.removeEventListener('touchstart', revealNowPlaying)
  window.removeEventListener('keydown', revealNowPlaying)
  disconnectPlayer()
})
</script>

<template>
  <div class="playlist-detail">
    <div class="playlist-header">
      <h1>{{ playlistName }}</h1>
      <button
        class="shuffle-btn"
        :class="{ active: shuffleEnabled }"
        :disabled="!playerReady || tracks.length === 0 || isPreparingPlayback"
        @click="shufflePlay"
      >
        {{
          isPreparingPlayback
            ? 'Preparing…'
            : shuffleEnabled
              ? 'Shuffle On'
              : 'Shuffle Play'
        }}
      </button>
    </div>

    <!-- Player error (e.g. non-Premium account) -->
    <p v-if="playerError" class="player-error">⚠️ {{ playerError }}</p>
    <!-- SDK still loading -->
    <p v-else-if="!playerReady" class="player-loading">
      Connecting to Spotify player…
    </p>

    <div v-if="tracksLoading" class="loader-wrap" aria-live="polite">
      <div class="loader-badge">
        <span class="loader-spinner" aria-hidden="true" />
        Loading tracks...
      </div>

      <div class="loader-grid">
        <div
          v-for="item in skeletonItems"
          :key="`skeleton-${item}`"
          class="loader-card"
        >
          <div class="loader-shimmer" />
          <div class="loader-lines">
            <span class="loader-line loader-line-main" />
            <span class="loader-line loader-line-sub" />
          </div>
        </div>
      </div>
    </div>

    <div v-else class="grid">
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

.playlist-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.shuffle-btn {
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(29, 185, 84, 0.12);
  color: #e9fff1;
  border-radius: 999px;
  padding: 0.35rem 0.85rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.shuffle-btn.active {
  background: rgba(29, 185, 84, 0.32);
  border-color: rgba(29, 185, 84, 0.95);
  color: #f3fff8;
  box-shadow: 0 0 0 2px rgba(29, 185, 84, 0.25);
}

.shuffle-btn:hover:enabled {
  background: rgba(29, 185, 84, 0.24);
  border-color: rgba(29, 185, 84, 0.7);
  transform: translateY(-1px);
}

.shuffle-btn:disabled {
  opacity: 0.45;
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

.loader-wrap {
  margin-top: 12px;
}

.loader-badge {
  margin: 0 auto 14px;
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.38rem 0.8rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #d6d6d6;
  font-size: 0.82rem;
  letter-spacing: 0.01em;
}

.loader-spinner {
  width: 0.95rem;
  height: 0.95rem;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.18);
  border-top-color: #1db954;
  animation: loader-spin 0.8s linear infinite;
}

.loader-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
  width: 100%;
}

.loader-card {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 4px;
  overflow: hidden;
  background: #171717;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.loader-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    110deg,
    rgba(255, 255, 255, 0.02) 8%,
    rgba(255, 255, 255, 0.11) 18%,
    rgba(255, 255, 255, 0.02) 33%
  );
  background-size: 200% 100%;
  animation: loader-shimmer 1.25s linear infinite;
}

.loader-lines {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 10px;
  z-index: 1;
  display: grid;
  gap: 6px;
}

.loader-line {
  display: block;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
}

.loader-line-main {
  width: 72%;
}

.loader-line-sub {
  width: 46%;
  background: rgba(255, 255, 255, 0.11);
}

@keyframes loader-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes loader-shimmer {
  to {
    background-position-x: -200%;
  }
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
  transition:
    box-shadow 0.25s ease,
    transform 0.25s ease,
    filter 0.25s ease;
}

.grid-item.current {
  box-shadow: 0 0 0 2px rgba(29, 185, 84, 0.95);
  transform: translateY(-1px) scale(1.01);
  filter: saturate(1.06);
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
  animation: focus-line-fade 0.25s ease;
}

@keyframes focus-line-fade {
  from {
    opacity: 0;
    transform: scale(0.985);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
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
