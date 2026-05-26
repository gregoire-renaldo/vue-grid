<!-- src/views/Playlists.vue -->

<script setup>
import { computed, ref, onMounted } from 'vue'
import PlaylistCard from '../components/PlaylistCard.vue'
import { usePlaylists } from '../composables/usePlaylists.js'

const sortMode = ref('alpha-asc')
const searchQuery = ref('')
const {
  playlists,
  isRefreshing,
  isCoolingDown,
  refreshLabel,
  fetchPlaylists,
  refreshPlaylists,
} = usePlaylists()

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

const normalizedSearchQuery = computed(() =>
  searchQuery.value.trim().toLowerCase(),
)

const filteredPlaylists = computed(() => {
  if (!normalizedSearchQuery.value) {
    return sortedPlaylists.value
  }

  return sortedPlaylists.value.filter(playlist =>
    (playlist.name || '').toLowerCase().includes(normalizedSearchQuery.value),
  )
})

const showLikedSongsCard = computed(() => {
  if (!normalizedSearchQuery.value) {
    return true
  }

  return 'liked songs'.includes(normalizedSearchQuery.value)
})

const hasSearchQuery = computed(() => normalizedSearchQuery.value.length > 0)

onMounted(fetchPlaylists)
</script>

<template>
  <div class="playlists">
    <div class="title-row">
      <h1>Your Playlists</h1>
      <input
        v-model="searchQuery"
        type="search"
        class="playlist-search"
        placeholder="Search by title"
        aria-label="Search playlists by title"
      />
    </div>

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
      <PlaylistCard v-if="showLikedSongsCard" liked-songs />

      <PlaylistCard
        v-for="playlist in filteredPlaylists"
        :key="playlist.id"
        :playlist="playlist"
      />
    </div>

    <p v-if="!playlists.length" class="empty-state">No playlists found.</p>
    <p
      v-else-if="hasSearchQuery && !filteredPlaylists.length"
      class="empty-state"
    >
      No playlists match your search.
    </p>
  </div>
</template>

<style scoped>
.playlists {
  width: 100%;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: nowrap;
}

.title-row h1 {
  white-space: nowrap;
}

.playlist-search {
  width: auto;
  flex: 1;
  min-width: 130px;
  max-width: 260px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  border-radius: 8px;
  padding: 0.4rem 0.6rem;
  font-size: 0.88rem;
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
