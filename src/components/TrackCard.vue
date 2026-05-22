<script setup>
const props = defineProps({
  track: {
    type: Object,
    required: true,
  },
  isCurrent: {
    type: Boolean,
    required: true,
  },
  isPlaying: {
    type: Boolean,
    required: true,
  },
})

defineEmits(['select'])
</script>

<template>
  <div
    class="grid-item"
    :class="{
      current: props.isCurrent,
      playing: props.isCurrent && props.isPlaying,
    }"
    @click="$emit('select', props.track)"
  >
    <img
      :src="props.track.album.images[0]?.url"
      alt="Track cover"
      class="card-cover"
    />
    <div
      v-if="props.isCurrent && props.isPlaying"
      class="dust-layer"
      aria-hidden="true"
    >
      <span
        v-for="n in 12"
        :key="`dust-${props.track.id}-${n}`"
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
        <span v-if="props.isCurrent && props.isPlaying">⏸</span>
        <span v-else>▶</span>
      </div>
      <p class="track-title">{{ props.track.name }}</p>
      <p class="track-artist">
        {{ props.track.artists.map(artist => artist.name).join(', ') }}
      </p>
    </div>
  </div>
</template>

<style scoped>
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
</style>
