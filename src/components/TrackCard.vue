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
  isAnchored: {
    type: Boolean,
    default: false,
  },
  playingAnimation: {
    type: String,
    default: 'dust',
  },
  isMobileFocused: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['select', 'focus'])

function isMobileEnvironment() {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false
  }

  return window.matchMedia('(hover: none), (pointer: coarse)').matches
}

function onCardClick() {
  if (isMobileEnvironment()) {
    emit('focus', props.track)
    return
  }

  emit('select', props.track)
}

function onPlayClick() {
  emit('select', props.track)
}
</script>

<template>
  <div
    class="grid-item"
    :class="{
      current: props.isCurrent,
      playing: props.isCurrent && props.isPlaying,
      anchored: props.isAnchored,
      'mobile-focused': props.isMobileFocused,
    }"
    @click="onCardClick"
  >
    <img
      :src="props.track.album.images[0]?.url"
      alt="Track cover"
      class="card-cover"
    />
    <div
      v-if="
        props.isCurrent && props.isPlaying && props.playingAnimation === 'dust'
      "
      class="dust-layer"
      aria-hidden="true"
    >
      <span
        v-for="n in 24"
        :key="`dust-${props.track.id}-${n}`"
        class="dust-particle"
        :style="{
          '--x': `${(n * 17) % 100}%`,
          '--size': `${10 + (n % 8)}px`,
          '--delay': `${(n % 8) * 0.22}s`,
          '--duration': `${6.4 + (n % 6) * 0.8}s`,
        }"
      />
    </div>

    <div
      v-if="
        props.isCurrent && props.isPlaying && props.playingAnimation === 'pulse'
      "
      class="pulse-layer"
      aria-hidden="true"
    >
      <span class="pulse-ring ring-1" />
      <span class="pulse-ring ring-2" />
      <span class="pulse-ring ring-3" />
    </div>

    <div
      v-if="
        props.isCurrent &&
        props.isPlaying &&
        props.playingAnimation === 'equalizer'
      "
      class="equalizer-layer"
      aria-hidden="true"
    >
      <span
        v-for="n in 5"
        :key="`eq-${props.track.id}-${n}`"
        class="eq-bar"
        :style="{ '--delay': `${n * 0.08}s` }"
      />
    </div>

    <div
      v-if="
        props.isCurrent && props.isPlaying && props.playingAnimation === 'orbit'
      "
      class="orbit-layer"
      aria-hidden="true"
    >
      <span class="orbit-ring orbit-ring-1"><span class="orbit-dot" /></span>
      <span class="orbit-ring orbit-ring-2"><span class="orbit-dot" /></span>
      <span class="orbit-ring orbit-ring-3"><span class="orbit-dot" /></span>
    </div>
    <div class="card-overlay">
      <button class="overlay-icon play-control-btn" @click.stop="onPlayClick">
        <span v-if="props.isCurrent && props.isPlaying">⏸</span>
        <span v-else>▶</span>
      </button>
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

.grid-item.anchored {
  box-shadow:
    0 0 0 3px rgba(255, 220, 120, 0.95),
    0 0 24px rgba(255, 214, 112, 0.55);
  animation: anchor-pulse 1.2s ease-in-out 2;
}

@keyframes anchor-pulse {
  0%,
  100% {
    transform: translateY(-1px) scale(1.01);
  }

  50% {
    transform: translateY(-1px) scale(1.04);
  }
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

.grid-item.mobile-focused .card-overlay {
  opacity: 1;
}

.overlay-icon {
  font-size: 1.8rem;
  margin-bottom: 6px;
}

.play-control-btn {
  border: 0;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.dust-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 3;
}

.pulse-layer,
.equalizer-layer,
.orbit-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
}

.dust-particle {
  position: absolute;
  left: var(--x, 50%);
  bottom: -8%;
  width: var(--size, 12px);
  height: var(--size, 12px);
  border-radius: 999px;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 1) 0%,
    rgba(178, 255, 214, 0.95) 40%,
    rgba(69, 255, 154, 0.32) 72%,
    rgba(0, 0, 0, 0) 100%
  );
  box-shadow:
    0 0 12px rgba(120, 255, 186, 0.75),
    0 0 20px rgba(74, 255, 153, 0.55);
  will-change: transform, opacity;
  opacity: 0.9;
  animation: dust-float var(--duration, 5.4s) ease-in-out infinite;
  animation-delay: var(--delay, 0s);
}

@keyframes dust-float {
  0% {
    transform: translate3d(0, 0, 0) scale(0.85);
    opacity: 0.72;
  }

  50% {
    opacity: 1;
  }

  100% {
    transform: translate3d(18px, -108%, 0) scale(1.2);
    opacity: 0.78;
  }
}

.pulse-layer {
  display: grid;
  place-items: center;
}

.pulse-ring {
  position: absolute;
  width: 42%;
  aspect-ratio: 1 / 1;
  border-radius: 999px;
  border: 2px solid rgba(120, 255, 186, 0.8);
  box-shadow: 0 0 14px rgba(74, 255, 153, 0.5);
  animation: pulse-expand 2s ease-out infinite;
}

.ring-2 {
  animation-delay: 0.5s;
}

.ring-3 {
  animation-delay: 1s;
}

@keyframes pulse-expand {
  0% {
    transform: scale(0.65);
    opacity: 0.95;
  }

  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}

.equalizer-layer {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 6px;
  padding-bottom: 18%;
}

.eq-bar {
  width: 8px;
  height: 20%;
  border-radius: 999px;
  background: linear-gradient(180deg, #79ffba 0%, #1db954 100%);
  box-shadow: 0 0 12px rgba(84, 255, 164, 0.45);
  animation: eq-bounce 0.9s ease-in-out infinite;
  animation-delay: var(--delay, 0s);
}

@keyframes eq-bounce {
  0%,
  100% {
    height: 14%;
  }

  40% {
    height: 44%;
  }

  70% {
    height: 26%;
  }
}

.orbit-layer {
  display: grid;
  place-items: center;
}

.orbit-ring {
  position: absolute;
  width: 58%;
  aspect-ratio: 1 / 1;
  border-radius: 999px;
  border: 1px solid rgba(121, 255, 186, 0.35);
  animation: orbit-spin 2.8s linear infinite;
}

.orbit-ring-2 {
  width: 44%;
  animation-duration: 2.2s;
  animation-direction: reverse;
}

.orbit-ring-3 {
  width: 30%;
  animation-duration: 1.7s;
}

.orbit-dot {
  position: absolute;
  top: -4px;
  left: 50%;
  width: 8px;
  height: 8px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: #88ffc1;
  box-shadow: 0 0 10px rgba(120, 255, 186, 0.85);
}

@keyframes orbit-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.track-title {
  font-weight: bold;
  font-size: 0.75em;
  margin: 2px 0;
  text-align: center;
  overflow: hidden;
  display: -webkit-box;
  line-clamp: 2;
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

@media (max-width: 768px) {
  .grid-item:hover .card-overlay {
    opacity: 0;
  }

  .grid-item.playing .card-overlay,
  .grid-item.mobile-focused .card-overlay {
    opacity: 1;
  }
}
</style>
