<script setup>
const props = defineProps({
  itemCount: {
    type: Number,
    default: 16,
  },
})

const skeletonItems = Array.from(
  { length: props.itemCount },
  (_, index) => index,
)
</script>

<template>
  <div class="loader-wrap" aria-live="polite">
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
</template>

<style scoped>
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
</style>
