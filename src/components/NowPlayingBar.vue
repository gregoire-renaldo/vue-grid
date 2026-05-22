<script setup>
import { formatTime } from '../utils/playlistDetailHelpers.js'

const props = defineProps({
  currentTrack: {
    type: Object,
    required: true,
  },
  currentPosition: {
    type: Number,
    required: true,
  },
  trackDuration: {
    type: Number,
    required: true,
  },
  isPlaying: {
    type: Boolean,
    required: true,
  },
  showNowPlaying: {
    type: Boolean,
    required: true,
  },
})

defineEmits([
  'toggle-playback',
  'previous-track',
  'next-track',
  'stop-playback',
  'seek-track',
])
</script>

<template>
  <div class="now-playing">
    <img
      :src="props.currentTrack.album.images[0]?.url"
      alt="Album cover"
      class="now-playing-cover"
    />
    <div class="now-playing-info">
      <span class="now-playing-title">{{ props.currentTrack.name }}</span>
      <span class="now-playing-artist">
        {{ props.currentTrack.artists.map(artist => artist.name).join(', ') }}
      </span>
    </div>

    <div class="now-playing-controls" :class="{ faded: !props.showNowPlaying }">
      <div class="seek-row">
        <span class="seek-time">{{ formatTime(props.currentPosition) }}</span>
        <input
          class="seek-bar"
          type="range"
          :min="0"
          :max="props.trackDuration || 0"
          :value="props.currentPosition"
          step="1000"
          :disabled="!props.trackDuration"
          @input="$emit('seek-track', $event)"
        />
        <span class="seek-time">{{ formatTime(props.trackDuration) }}</span>
      </div>

      <button class="now-playing-btn" @click="$emit('toggle-playback')">
        {{ props.isPlaying ? '⏸' : '▶' }}
      </button>
      <button
        class="now-playing-btn"
        aria-label="Previous track"
        @click="$emit('previous-track')"
      >
        ⏮
      </button>
      <button
        class="now-playing-btn"
        aria-label="Next track"
        @click="$emit('next-track')"
      >
        ⏭
      </button>
      <button class="now-playing-btn stop-btn" @click="$emit('stop-playback')">
        ■
      </button>
    </div>
  </div>
</template>

<style scoped>
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
