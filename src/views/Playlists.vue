<!-- src/views/Playlists.vue -->

<script setup>
import { computed, ref, onMounted } from 'vue'
import PlaylistCard from '../components/PlaylistCard.vue'
import TracksLoader from '../components/TracksLoader.vue'
import { usePlaylists } from '../composables/usePlaylists.js'
import {
  classifyPlaylistCategories,
  PLAYLIST_CATEGORIES,
  resolveCategoryLabel,
} from '../utils/playlistCategories.js'

const sortMode = ref('alpha-asc')
const searchQuery = ref('')
const activeCategory = ref('all')
const {
  playlists,
  currentUserId,
  isPlaylistsLoading,
  isRefreshing,
  isCoolingDown,
  refreshLabel,
  fetchPlaylists,
  refreshPlaylists,
} = usePlaylists()

const categoryFilters = computed(() => [
  { id: 'all', label: 'All' },
  ...PLAYLIST_CATEGORIES,
])

const playlistsWithTags = computed(() =>
  playlists.value.map(playlist => {
    const categoryIds = classifyPlaylistCategories(
      playlist,
      currentUserId.value,
    )
    return {
      ...playlist,
      categoryIds,
      categoryLabels: categoryIds.map(resolveCategoryLabel),
    }
  }),
)

const sortedPlaylists = computed(() => {
  const items = [...playlistsWithTags.value]

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

const categoryFilteredPlaylists = computed(() => {
  if (activeCategory.value === 'all') {
    return sortedPlaylists.value
  }

  return sortedPlaylists.value.filter(playlist =>
    playlist.categoryIds.includes(activeCategory.value),
  )
})

const filteredPlaylists = computed(() => {
  if (!normalizedSearchQuery.value) {
    return categoryFilteredPlaylists.value
  }

  return categoryFilteredPlaylists.value.filter(playlist =>
    (playlist.name || '').toLowerCase().includes(normalizedSearchQuery.value),
  )
})

const showLikedSongsCard = computed(() => {
  if (activeCategory.value !== 'all') {
    return false
  }

  if (!normalizedSearchQuery.value) {
    return true
  }

  return 'liked songs'.includes(normalizedSearchQuery.value)
})

const hasSearchQuery = computed(() => normalizedSearchQuery.value.length > 0)
const hasCategoryFilter = computed(() => activeCategory.value !== 'all')

const emptyStateMessage = computed(() => {
  if (hasSearchQuery.value || hasCategoryFilter.value) {
    return 'No playlists match your current filters.'
  }

  return 'No playlists found.'
})

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

    <div class="category-filters" role="group" aria-label="Filter playlists">
      <button
        v-for="category in categoryFilters"
        :key="category.id"
        type="button"
        class="category-filter-btn"
        :class="{ active: activeCategory === category.id }"
        @click="activeCategory = category.id"
      >
        {{ category.label }}
      </button>
    </div>

    <p class="explore-hint">
      Browse category/mood/genre playlists from the Explore tab.
    </p>

    <TracksLoader
      v-if="isPlaylistsLoading && !playlists.length"
      :item-count="12"
      loading-text="Loading playlists..."
    />

    <div v-else class="playlist-grid">
      <PlaylistCard v-if="showLikedSongsCard" liked-songs />

      <PlaylistCard
        v-for="playlist in filteredPlaylists"
        :key="playlist.id"
        :playlist="playlist"
        :tags="playlist.categoryLabels"
      />
    </div>

    <p
      v-if="
        !isPlaylistsLoading && (!playlists.length || !filteredPlaylists.length)
      "
      class="empty-state"
    >
      {{ emptyStateMessage }}
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
  justify-content: flex-start;
  gap: 0.75rem;
  flex-wrap: nowrap;
}

.title-row h1 {
  white-space: nowrap;
}

.playlist-search {
  width: 100%;
  flex: 0 1 260px;
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

.category-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.7rem;
}

.category-filter-btn {
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  border-radius: 999px;
  padding: 0.32rem 0.65rem;
  font-size: 0.78rem;
  cursor: pointer;
}

.category-filter-btn.active {
  background: rgba(29, 185, 84, 0.28);
  border-color: rgba(29, 185, 84, 0.5);
}

.explore-hint {
  margin-top: 0.55rem;
  font-size: 0.8rem;
  opacity: 0.75;
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
