<script setup>
import { onMounted, ref } from 'vue'
import PlaylistCard from '../components/PlaylistCard.vue'
import TracksLoader from '../components/TracksLoader.vue'
import { useExplorePlaylists } from '../composables/useExplorePlaylists.js'

const searchQuery = ref('')
const {
  featuredPlaylists,
  searchResults,
  browseCategories,
  selectedCategoryId,
  categoryPlaylists,
  isFeaturedLoading,
  isSearchLoading,
  isCategoriesLoading,
  featuredError,
  searchError,
  categoriesError,
  fetchFeaturedPlaylists,
  searchPublicPlaylists,
  fetchCategoryMoodGenrePlaylists,
  selectCategory,
} = useExplorePlaylists()

function refreshFeaturedPlaylists() {
  fetchFeaturedPlaylists({ forceRefresh: true })
}

function onSearchSubmit() {
  searchPublicPlaylists(searchQuery.value)
}

onMounted(fetchFeaturedPlaylists)
onMounted(fetchCategoryMoodGenrePlaylists)
</script>

<template>
  <div class="explore-view">
    <h1>Explore Public Playlists</h1>
    <p class="subtitle">
      Discover featured collections and search Spotify playlists.
    </p>

    <section class="search-section">
      <form class="search-form" @submit.prevent="onSearchSubmit">
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search public playlists..."
          aria-label="Search public playlists"
        />
        <button type="submit" :disabled="isSearchLoading">
          {{ isSearchLoading ? 'Searching...' : 'Search' }}
        </button>
      </form>
      <p v-if="searchError" class="error-text">{{ searchError }}</p>
    </section>

    <section class="results-section" v-if="searchQuery.trim()">
      <h2>Search Results</h2>
      <TracksLoader
        v-if="isSearchLoading"
        :item-count="12"
        loading-text="Loading public playlists..."
      />
      <p v-else-if="!searchResults.length" class="status-text">
        No public playlists found for this query.
      </p>
      <div v-else class="playlist-grid">
        <PlaylistCard
          v-for="playlist in searchResults"
          :key="`search-${playlist.id}`"
          :playlist="playlist"
        />
      </div>
    </section>

    <section class="featured-section">
      <div class="section-header">
        <h2>Featured Right Now ({{ featuredPlaylists.length }})</h2>
        <button
          type="button"
          class="refresh-btn"
          :disabled="isFeaturedLoading"
          @click="refreshFeaturedPlaylists"
        >
          {{ isFeaturedLoading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>
      <p v-if="featuredError" class="error-text">{{ featuredError }}</p>
      <TracksLoader
        v-else-if="isFeaturedLoading"
        :item-count="12"
        loading-text="Loading featured playlists..."
      />
      <p v-else-if="!featuredPlaylists.length" class="status-text">
        No playlists to display yet. Try Refresh.
      </p>
      <div v-else class="playlist-grid">
        <PlaylistCard
          v-for="playlist in featuredPlaylists"
          :key="`featured-${playlist.id}`"
          :playlist="playlist"
        />
      </div>
    </section>

    <section class="categories-section">
      <h2>Category / Mood / Genre Playlists</h2>
      <p class="section-caption">
        Surfaced from browse categories and editorial feeds. These can be
        editorial or partner-curated.
      </p>

      <p v-if="categoriesError" class="error-text">{{ categoriesError }}</p>

      <div v-else-if="browseCategories.length" class="category-tabs">
        <button
          v-for="category in browseCategories"
          :key="category.id"
          type="button"
          class="category-tab-btn"
          :class="{ active: selectedCategoryId === category.id }"
          @click="selectCategory(category.id)"
        >
          {{ category.name }}
        </button>
      </div>

      <TracksLoader
        v-if="isCategoriesLoading"
        :item-count="12"
        loading-text="Loading category playlists..."
      />
      <p
        v-else-if="
          !categoriesError && selectedCategoryId && !categoryPlaylists.length
        "
        class="status-text"
      >
        No playlists available for this category.
      </p>

      <div v-else-if="categoryPlaylists.length" class="playlist-grid">
        <PlaylistCard
          v-for="playlist in categoryPlaylists"
          :key="`category-${playlist.id}`"
          :playlist="playlist"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.explore-view {
  width: 100%;
}

.subtitle {
  margin-top: 0.35rem;
  opacity: 0.8;
}

.search-section,
.results-section,
.featured-section,
.categories-section {
  margin-top: 1rem;
}

.section-caption {
  margin-top: 0.35rem;
  opacity: 0.8;
  font-size: 0.9rem;
}

.search-form {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.search-form input {
  flex: 1;
  min-width: 220px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
}

.search-form button,
.refresh-btn {
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(29, 185, 84, 0.14);
  color: inherit;
  border-radius: 999px;
  padding: 0.5rem 0.9rem;
  font-weight: 600;
  cursor: pointer;
}

.search-form button:disabled,
.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.category-tabs {
  margin-top: 0.65rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.category-tab-btn {
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  font-size: 0.8rem;
  cursor: pointer;
}

.category-tab-btn.active {
  border-color: rgba(29, 185, 84, 0.5);
  background: rgba(29, 185, 84, 0.24);
}

.playlist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 0.8rem;
}

@media (max-width: 420px) {
  .playlist-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
}

.status-text {
  margin-top: 0.7rem;
  opacity: 0.8;
}

.error-text {
  margin-top: 0.7rem;
  color: #ff7a7a;
}
</style>
