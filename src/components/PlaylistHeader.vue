<script setup>
const props = defineProps({
  playlistName: {
    type: String,
    required: true,
  },
  shuffleEnabled: {
    type: Boolean,
    required: true,
  },
  isPreparingPlayback: {
    type: Boolean,
    required: true,
  },
  playerReady: {
    type: Boolean,
    required: true,
  },
  trackCount: {
    type: Number,
    required: true,
  },
})

defineEmits(['shuffle-play', 'open-poster'])
</script>

<template>
  <div class="playlist-header">
    <h1>{{ props.playlistName }}</h1>
    <button
      class="poster-btn"
      type="button"
      aria-label="Create and share playlist poster"
      @click="$emit('open-poster')"
    >
      <span aria-hidden="true">&#128247;</span>
    </button>
    <button
      class="shuffle-btn"
      :class="{ active: props.shuffleEnabled }"
      :disabled="
        !props.playerReady ||
        props.trackCount === 0 ||
        props.isPreparingPlayback
      "
      @click="$emit('shuffle-play')"
    >
      {{
        props.isPreparingPlayback
          ? 'Preparing…'
          : props.shuffleEnabled
            ? 'Disable Shuffle'
            : 'Enable Shuffle'
      }}
    </button>
  </div>
</template>

<style scoped>
.playlist-header {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  width: 100%;
  max-width: 100%;
}

.playlist-header h1 {
  margin: 0;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
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

.poster-btn {
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  color: #e9fff1;
  border-radius: 999px;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 1.05rem;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.poster-btn:hover {
  background: rgba(29, 185, 84, 0.2);
  border-color: rgba(29, 185, 84, 0.5);
  transform: translateY(-1px);
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
</style>
