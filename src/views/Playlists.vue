<!-- src/views/Playlists.vue -->

<script setup>
import { computed, ref, onMounted } from 'vue'
import { getValidAccessToken } from '../spotifyAuth.js'
import PlaylistCard from '../components/PlaylistCard.vue'
import { useCooldown } from '../composables/useCooldown.js'
import {
  cachePlaylists,
  isCacheStale,
  readCachedPlaylists,
} from '../utils/spotifyCache.js'

const playlists = ref([])
const sortMode = ref('alpha-asc')
const isRefreshing = ref(false)
const { isCoolingDown, label: refreshLabel, startCooldown } = useCooldown(5000)

const sortedPlaylists = computed(() => {
  const items = [...playlists.value]

  switch (sortMode.value) {
    case 'alpha-desc':
      return items.sort((a, b) => b.name.localeCompare(a.name))
    case 'recent-old':
      return items.sort((a, b) => a._fetchedIndex - b._fetchedIndex)
    case 'old-recent':
      return items.sort((a, b) => b._fetchedIndex - a._fetchedIndex)
    case 'alpha-asc':
    default:
      return items.sort((a, b) => a.name.localeCompare(b.name))
  }
})

async function fetchPlaylistsFromNetwork(token) {
  const response = await fetch('https://api.spotify.com/v1/me/playlists', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await response.json()
  const nextPlaylists = (data.items || []).map((playlist, index) => ({
    ...playlist,
    _fetchedIndex: index,
  }))

  playlists.value = nextPlaylists
  await cachePlaylists(nextPlaylists)

  return nextPlaylists
}

async function fetchPlaylists() {
  const cachedEntry = await readCachedPlaylists()

  if (cachedEntry?.value?.playlists?.length) {
    playlists.value = cachedEntry.value.playlists
  }

  if (cachedEntry && !isCacheStale(cachedEntry)) {
    return cachedEntry.value.playlists
  }

  const token = await getValidAccessToken()
  if (token) {
    if (cachedEntry?.value?.playlists?.length) {
      void fetchPlaylistsFromNetwork(token)
      return cachedEntry.value.playlists
    }

    return fetchPlaylistsFromNetwork(token)
  }

  return cachedEntry?.value || null
}

async function refreshPlaylists() {
  if (isRefreshing.value || isCoolingDown.value) return

  isRefreshing.value = true
  startCooldown()

  try {
    await fetchPlaylists()
  } finally {
    isRefreshing.value = false
  }
}

onMounted(fetchPlaylists)
</script>

<template>
  <div class="playlists">
    <h1>Your Playlists</h1>

    <div class="sort-controls">
      <label for="playlist-sort">Sort by</label>
      <select id="playlist-sort" v-model="sortMode">
        <option value="alpha-asc">Alphabetical (A to Z)</option>
        <option value="alpha-desc">Alphabetical (Z to A)</option>
        <option value="recent-old">Creation date (most recent first)</option>
        <option value="old-recent">Creation date (oldest first)</option>
      </select>
      <button
        class="refresh-btn"
        :disabled="isRefreshing || isCoolingDown"
        @click="refreshPlaylists"
      >
        {{ isRefreshing ? 'Refreshing…' : refreshLabel }}
      </button>
    </div>

    <div class="playlist-grid">
      <PlaylistCard liked-songs />

      <PlaylistCard
        v-for="playlist in sortedPlaylists"
        :key="playlist.id"
        :playlist="playlist"
      />
    </div>

    <p v-if="!playlists.length" class="empty-state">No playlists found.</p>
  </div>
</template>

<style scoped>
.playlists {
  width: 100%;
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.5rem;
}

.sort-controls label {
  font-weight: 600;
}

.sort-controls select {
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  border-radius: 8px;
  padding: 0.45rem 0.6rem;
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

.playlist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 1rem;
}

@media (max-width: 420px) {
  .playlist-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
}

.empty-state {
  margin-top: 1rem;
  opacity: 0.75;
}
</style>
