<script setup>
import { computed, ref, watch, nextTick } from 'vue'

const POSTER_MIME_TYPE = 'image/webp'
const POSTER_FILE_EXTENSION = 'webp'
const POSTER_EXPORT_QUALITY = 0.82

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  playlistName: {
    type: String,
    default: 'Playlist',
  },
  coverUrls: {
    type: Array,
    default: () => [],
  },
  shareUrl: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['close'])

const isRendering = ref(false)
const renderError = ref('')
const posterDataUrl = ref('')
const selectedCoverCount = ref(36)
const useAllCovers = ref(false)
const includePosterTitle = ref(true)
const avoidRepeatedCovers = ref(true)

const normalizedCoverUrls = computed(() => {
  const urls = (props.coverUrls || []).filter(Boolean)
  if (!avoidRepeatedCovers.value) {
    return urls
  }

  return [...new Set(urls)]
})

const maxCoverCount = computed(() => normalizedCoverUrls.value.length)

const effectiveCoverCount = computed(() => {
  if (!maxCoverCount.value) return 0
  if (useAllCovers.value) return maxCoverCount.value
  return Math.max(1, Math.min(selectedCoverCount.value, maxCoverCount.value))
})

const selectedImageUrls = computed(() => {
  if (!effectiveCoverCount.value) return []
  return normalizedCoverUrls.value.slice(0, effectiveCoverCount.value)
})

const encodedShareUrl = computed(() => encodeURIComponent(props.shareUrl || ''))
const encodedShareText = computed(() =>
  encodeURIComponent(`Check out this playlist poster: ${props.playlistName}`),
)
const canNativeShare = computed(
  () =>
    typeof navigator !== 'undefined' && typeof navigator.share === 'function',
)

const xShareUrl = computed(
  () =>
    `https://twitter.com/intent/tweet?text=${encodedShareText.value}&url=${encodedShareUrl.value}`,
)

const facebookShareUrl = computed(
  () => `https://www.facebook.com/sharer/sharer.php?u=${encodedShareUrl.value}`,
)

const linkedinShareUrl = computed(
  () =>
    `https://www.linkedin.com/sharing/share-offsite/?url=${encodedShareUrl.value}`,
)

const pinterestShareUrl = computed(
  () =>
    `https://pinterest.com/pin/create/button/?url=${encodedShareUrl.value}&description=${encodedShareText.value}`,
)

const instagramShareUrl = computed(() => 'https://www.instagram.com/')

function closeModal() {
  emit('close')
}

function setPresetCount(count) {
  useAllCovers.value = false
  selectedCoverCount.value = Math.max(
    1,
    Math.min(count, maxCoverCount.value || 1),
  )
}

function onCoverCountInput(value) {
  useAllCovers.value = false
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return
  selectedCoverCount.value = Math.max(
    1,
    Math.min(Math.round(parsed), maxCoverCount.value || 1),
  )
}

function loadImage(url) {
  return new Promise(resolve => {
    if (!url) {
      resolve(null)
      return
    }

    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = url
  })
}

function drawImageCover(context, image, x, y, size) {
  const sourceWidth = image.naturalWidth || image.width
  const sourceHeight = image.naturalHeight || image.height

  if (!sourceWidth || !sourceHeight) {
    context.drawImage(image, x, y, size, size)
    return
  }

  const sourceSide = Math.min(sourceWidth, sourceHeight)
  const sourceX = (sourceWidth - sourceSide) / 2
  const sourceY = (sourceHeight - sourceSide) / 2

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSide,
    sourceSide,
    x,
    y,
    size,
    size,
  )
}

async function renderPoster() {
  if (!props.open) return

  isRendering.value = true
  renderError.value = ''

  try {
    const imageCount = selectedImageUrls.value.length
    if (!imageCount) {
      throw new Error('No cover artwork available for this playlist.')
    }

    const canvas = document.createElement('canvas')
    const columns = Math.ceil(Math.sqrt(imageCount))
    const rows = Math.ceil(imageCount / columns)
    const size =
      imageCount <= 9
        ? 1080
        : imageCount <= 25
          ? 1440
          : imageCount <= 49
            ? 2048
            : 3072
    const padding = Math.round(size * 0.05)
    const titleHeight = includePosterTitle.value ? Math.round(size * 0.13) : 0
    const footerHeight = Math.round(size * 0.08)
    const imageAreaTop = padding + titleHeight
    const imageAreaBottom = size - padding - footerHeight
    const imageAreaHeight = imageAreaBottom - imageAreaTop
    const imageAreaWidth = size - padding * 2
    const gap = columns >= 12 ? 4 : columns >= 8 ? 6 : columns >= 5 ? 8 : 12
    const tileSize = Math.floor(
      Math.min(
        (imageAreaWidth - gap * (columns - 1)) / columns,
        (imageAreaHeight - gap * (rows - 1)) / rows,
      ),
    )

    const contentWidth = tileSize * columns + gap * (columns - 1)
    const contentHeight = tileSize * rows + gap * (rows - 1)
    const gridStartX = padding + Math.floor((imageAreaWidth - contentWidth) / 2)
    const gridStartY =
      imageAreaTop + Math.floor((imageAreaHeight - contentHeight) / 2)

    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Unable to render poster.')
    }

    const bgGradient = context.createLinearGradient(0, 0, size, size)
    bgGradient.addColorStop(0, '#0f1412')
    bgGradient.addColorStop(1, '#1a2e23')
    context.fillStyle = bgGradient
    context.fillRect(0, 0, size, size)

    context.fillStyle = 'rgba(255, 255, 255, 0.08)'
    context.fillRect(
      padding - 16,
      imageAreaTop - 16,
      imageAreaWidth + 32,
      imageAreaHeight + 32,
    )

    const imageUrls = [...selectedImageUrls.value]
    while (imageUrls.length < rows * columns) {
      imageUrls.push('')
    }

    const images = await Promise.all(imageUrls.map(loadImage))

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        const index = row * columns + col
        const x = gridStartX + col * (tileSize + gap)
        const y = gridStartY + row * (tileSize + gap)
        const image = images[index]

        if (image) {
          drawImageCover(context, image, x, y, tileSize)
          continue
        }

        const tileGradient = context.createLinearGradient(
          x,
          y,
          x + tileSize,
          y + tileSize,
        )
        tileGradient.addColorStop(0, '#26322d')
        tileGradient.addColorStop(1, '#1a2420')
        context.fillStyle = tileGradient
        context.fillRect(x, y, tileSize, tileSize)
      }
    }

    if (includePosterTitle.value) {
      context.fillStyle = '#f2fff6'
      context.font = `700 ${Math.round(size * 0.052)}px Inter, Arial, sans-serif`
      context.textBaseline = 'top'

      const title = props.playlistName || 'Playlist'
      const maxTitleWidth = size - padding * 2
      let titleToRender = title
      while (
        context.measureText(titleToRender).width > maxTitleWidth &&
        titleToRender.length > 3
      ) {
        titleToRender = `${titleToRender.slice(0, -2)}...`
      }
      context.fillText(titleToRender, padding, padding)
    }

    context.fillStyle = 'rgba(242, 255, 246, 0.78)'
    context.font = `500 ${Math.round(size * 0.028)}px Inter, Arial, sans-serif`
    context.fillText(
      'Created with CoverGrid',
      padding,
      size - padding - Math.round(size * 0.035),
    )

    posterDataUrl.value = canvas.toDataURL(
      POSTER_MIME_TYPE,
      POSTER_EXPORT_QUALITY,
    )
  } catch (error) {
    renderError.value = error?.message || 'Unable to generate playlist poster.'
  } finally {
    isRendering.value = false
  }
}

async function downloadPoster() {
  if (!posterDataUrl.value) return

  const anchor = document.createElement('a')
  const safeName = (props.playlistName || 'playlist')
    .replace(/[^a-z0-9]/gi, '-')
    .toLowerCase()
  anchor.href = posterDataUrl.value
  anchor.download = `${safeName || 'playlist'}-poster.${POSTER_FILE_EXTENSION}`
  anchor.click()
}

async function sharePoster() {
  if (
    !posterDataUrl.value ||
    typeof navigator === 'undefined' ||
    typeof navigator.share !== 'function'
  ) {
    return
  }

  try {
    const response = await fetch(posterDataUrl.value)
    const blob = await response.blob()
    const file = new File([blob], `playlist-poster.${POSTER_FILE_EXTENSION}`, {
      type: POSTER_MIME_TYPE,
    })

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: props.playlistName,
        text: `Check out this playlist poster: ${props.playlistName}`,
        files: [file],
      })
      return
    }

    await navigator.share({
      title: props.playlistName,
      text: `Check out this playlist: ${props.playlistName}`,
      url: props.shareUrl,
    })
  } catch {
    // Ignore abort/share errors.
  }
}

async function shareToInstagram() {
  const supportsMatchMedia =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  const hasCoarsePointer = supportsMatchMedia
    ? window.matchMedia('(hover: none), (pointer: coarse)').matches
    : false
  const hasTouchCapability =
    typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0
  const shouldUseNativeShare =
    canNativeShare.value && (hasCoarsePointer || hasTouchCapability)

  if (shouldUseNativeShare) {
    await sharePoster()
    return
  }

  if (typeof window !== 'undefined') {
    window.open(instagramShareUrl.value, '_blank', 'noopener,noreferrer')
  }
}

watch(
  () => props.open,
  async isOpen => {
    if (!isOpen) return
    if (maxCoverCount.value) {
      selectedCoverCount.value = Math.min(36, maxCoverCount.value)
    }
    useAllCovers.value = false
    includePosterTitle.value = true
    avoidRepeatedCovers.value = true
    await nextTick()
    await renderPoster()
  },
)

watch(
  [
    selectedCoverCount,
    useAllCovers,
    includePosterTitle,
    avoidRepeatedCovers,
    () => props.coverUrls,
  ],
  async () => {
    if (!props.open) return
    await nextTick()
    await renderPoster()
  },
)
</script>

<template>
  <div v-if="props.open" class="poster-modal-overlay" @click.self="closeModal">
    <div
      class="poster-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="poster-modal-title"
    >
      <div class="poster-modal-head">
        <h2 id="poster-modal-title">Share Playlist Poster</h2>
        <button
          type="button"
          class="poster-close-btn"
          aria-label="Close poster modal"
          @click="closeModal"
        >
          x
        </button>
      </div>

      <p class="poster-subtitle">
        Save your cover grid poster or share it directly.
      </p>

      <div class="poster-controls">
        <div class="poster-controls-head">
          <strong>Number of covers</strong>
          <span>{{ effectiveCoverCount }} / {{ maxCoverCount }}</span>
        </div>

        <div class="poster-presets">
          <button type="button" class="preset-btn" @click="setPresetCount(9)">
            9
          </button>
          <button type="button" class="preset-btn" @click="setPresetCount(16)">
            16
          </button>
          <button type="button" class="preset-btn" @click="setPresetCount(25)">
            25
          </button>
          <button type="button" class="preset-btn" @click="setPresetCount(36)">
            36
          </button>
          <button
            type="button"
            class="preset-btn"
            :class="{ active: useAllCovers }"
            @click="useAllCovers = true"
          >
            All covers
          </button>
        </div>

        <div class="poster-count-inputs">
          <input
            type="range"
            :min="1"
            :max="Math.max(1, maxCoverCount)"
            :value="Math.max(1, selectedCoverCount)"
            :disabled="useAllCovers || !maxCoverCount"
            @input="onCoverCountInput($event.target.value)"
          />
          <input
            type="number"
            :min="1"
            :max="Math.max(1, maxCoverCount)"
            :value="Math.max(1, selectedCoverCount)"
            :disabled="useAllCovers || !maxCoverCount"
            @input="onCoverCountInput($event.target.value)"
          />
          <label class="all-covers-toggle">
            <input
              v-model="useAllCovers"
              type="checkbox"
              :disabled="!maxCoverCount"
            />
            Use all covers
          </label>
          <label class="all-covers-toggle">
            <input v-model="avoidRepeatedCovers" type="checkbox" />
            Avoid repeated covers
          </label>
          <label class="all-covers-toggle">
            <input v-model="includePosterTitle" type="checkbox" />
            Include title on poster
          </label>
        </div>
      </div>

      <div class="poster-preview">
        <p v-if="isRendering" class="poster-status">Generating poster...</p>
        <p v-else-if="renderError" class="poster-error">{{ renderError }}</p>
        <img
          v-else-if="posterDataUrl"
          :src="posterDataUrl"
          alt="Playlist cover grid poster preview"
        />
      </div>

      <div class="poster-actions">
        <button
          type="button"
          class="poster-btn primary"
          :disabled="!posterDataUrl || isRendering"
          @click="downloadPoster"
        >
          Save Poster
        </button>
        <button
          type="button"
          class="poster-btn secondary"
          :disabled="!posterDataUrl || isRendering || !canNativeShare"
          @click="sharePoster"
        >
          Share
        </button>
      </div>

      <div class="poster-share-links">
        <a
          class="social-link-btn"
          :href="xShareUrl"
          target="_blank"
          rel="noreferrer"
          aria-label="Share on X"
          title="Share on X"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              fill="currentColor"
              d="M18.146 2h3.308l-7.227 8.26L22.72 22h-6.64l-5.2-6.8L4.93 22H1.62l7.73-8.835L1.2 2h6.8l4.7 6.23L18.146 2Zm-1.16 18h1.833L7.01 3.894H5.044L16.987 20Z"
            />
          </svg>
        </a>

        <a
          class="social-link-btn"
          :href="facebookShareUrl"
          target="_blank"
          rel="noreferrer"
          aria-label="Share on Facebook"
          title="Share on Facebook"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              fill="currentColor"
              d="M13.5 8.5V6.6c0-.7.2-1.1 1.2-1.1H16V2.2h-2.6c-3 0-4.4 1.3-4.4 4.3v2H6.5V12H9v9.8h4.5V12h2.9l.4-3.5h-3.3Z"
            />
          </svg>
        </a>

        <button
          type="button"
          class="social-link-btn"
          aria-label="Share on Instagram"
          title="Share on Instagram"
          @click="shareToInstagram"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              fill="currentColor"
              d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 1.8A3.7 3.7 0 0 0 3.8 7.5v9A3.7 3.7 0 0 0 7.5 20.2h9a3.7 3.7 0 0 0 3.7-3.7v-9a3.7 3.7 0 0 0-3.7-3.7h-9Zm4.5 3.6a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2Zm0 1.8a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Zm4.95-2.1a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z"
            />
          </svg>
        </button>

        <a
          class="social-link-btn"
          :href="pinterestShareUrl"
          target="_blank"
          rel="noreferrer"
          aria-label="Share on Pinterest"
          title="Share on Pinterest"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              fill="currentColor"
              d="M12 2C6.49 2 2 6.34 2 11.67c0 3.86 2.3 6.99 5.58 8.18-.08-.7-.16-1.78.03-2.54.18-.68 1.15-4.35 1.15-4.35s-.29-.58-.29-1.45c0-1.36.81-2.38 1.81-2.38.85 0 1.26.62 1.26 1.37 0 .84-.55 2.1-.83 3.26-.24.98.51 1.77 1.52 1.77 1.82 0 3.22-1.85 3.22-4.53 0-2.37-1.76-4.03-4.27-4.03-2.91 0-4.62 2.12-4.62 4.31 0 .85.34 1.77.77 2.27.08.1.09.18.07.27-.08.31-.25.98-.29 1.12-.04.18-.13.22-.3.13-1.12-.51-1.81-2.05-1.81-3.3 0-2.69 2.01-5.16 5.8-5.16 3.04 0 5.4 2.11 5.4 4.92 0 2.93-1.91 5.29-4.56 5.29-.89 0-1.72-.45-2.01-.98l-.54 2.03c-.2.75-.75 1.69-1.11 2.26.84.25 1.72.39 2.64.39 5.51 0 10-4.33 10-9.67C22 6.34 17.51 2 12 2Z"
            />
          </svg>
        </a>

        <a
          class="social-link-btn"
          :href="linkedinShareUrl"
          target="_blank"
          rel="noreferrer"
          aria-label="Share on LinkedIn"
          title="Share on LinkedIn"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              fill="currentColor"
              d="M6.94 8.73a2.2 2.2 0 1 1 0-4.39 2.2 2.2 0 0 1 0 4.39ZM4.9 20.5h4.08v-10H4.9v10ZM11.36 10.5v10h4.08v-5.22c0-1.38.26-2.72 1.97-2.72 1.68 0 1.7 1.57 1.7 2.8v5.14h4.09v-5.93c0-2.92-.63-5.16-4.04-5.16-1.64 0-2.74.9-3.2 1.75h-.05v-1.5h-3.91Z"
            />
          </svg>
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.poster-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: grid;
  place-items: center;
  padding: 1rem;
  z-index: 999;
}

.poster-modal {
  width: min(840px, 100%);
  max-height: min(90vh, 860px);
  overflow: auto;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: #111714;
  color: #f2fff6;
  padding: 1rem;
  text-align: left;
}

.poster-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.poster-modal-head h2 {
  margin: 0;
}

.poster-close-btn {
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: inherit;
  cursor: pointer;
  width: 34px;
  height: 34px;
}

.poster-subtitle {
  margin-top: 0.35rem;
  opacity: 0.78;
}

.poster-controls {
  margin-top: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 0.65rem;
  background: rgba(255, 255, 255, 0.03);
}

.poster-controls-head {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  align-items: center;
  font-size: 0.88rem;
}

.poster-presets {
  margin-top: 0.55rem;
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.preset-btn {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  padding: 0.3rem 0.7rem;
  cursor: pointer;
  font-weight: 600;
}

.preset-btn.active {
  border-color: rgba(29, 185, 84, 0.7);
  background: rgba(29, 185, 84, 0.24);
}

.poster-count-inputs {
  margin-top: 0.55rem;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.45rem;
  align-items: center;
}

.poster-count-inputs input[type='number'] {
  width: 84px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: inherit;
  padding: 0.35rem 0.5rem;
}

.all-covers-toggle {
  grid-column: 1 / -1;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  opacity: 0.92;
}

.poster-preview {
  margin-top: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  min-height: 240px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.04);
  padding: 0.65rem;
}

.poster-preview img {
  width: min(100%, 560px);
  border-radius: 10px;
  display: block;
}

.poster-status {
  opacity: 0.82;
}

.poster-error {
  color: #ff8686;
}

.poster-actions {
  margin-top: 0.75rem;
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.poster-btn {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  padding: 0.5rem 0.95rem;
  font-weight: 700;
  cursor: pointer;
}

.poster-btn.primary {
  background: #1db954;
  color: #fff;
  border-color: rgba(29, 185, 84, 0.75);
}

.poster-btn.secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #f2fff6;
}

.poster-btn:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.poster-share-links {
  margin-top: 0.75rem;
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.social-link-btn {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  color: #8ee7b3;
  display: grid;
  place-items: center;
  text-decoration: none;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.social-link-btn svg {
  width: 18px;
  height: 18px;
}

.social-link-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(29, 185, 84, 0.5);
  background: rgba(29, 185, 84, 0.14);
}
</style>
