<script setup>
import { onMounted, ref } from 'vue'
import PlaylistCard from '../components/PlaylistCard.vue'
import { getValidAccessToken } from '../spotifyAuth.js'

const featuredPlaylists = ref([])
const searchResults = ref([])
const searchQuery = ref('')

const isFeaturedLoading = ref(false)
const isSearchLoading = ref(false)
const featuredError = ref('')
const searchError = ref('')

function normalizePlaylists(items) {
  return (items || [])
    .filter(playlist => playlist && playlist.id)
    .map(playlist => ({
      ...playlist,
      name: playlist.name || 'Untitled playlist',
      images: Array.isArray(playlist.images) ? playlist.images : [],
      tracks: playlist.tracks || { total: 0 },
    }))
}

async function fetchPublicPlaylistFallback(token) {
  const response = await fetch(
    'https://api.spotify.com/v1/search?type=playlist&limit=24&q=top%20hits',
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  )

  if (!response.ok) {
    throw new Error('Unable to fetch public playlists.')
  }

  const data = await response.json()
  return normalizePlaylists(data?.playlists?.items || [])
}

async function fetchFeaturedPlaylists() {
  isFeaturedLoading.value = true
  featuredError.value = ''

  try {
    const token = await getValidAccessToken()
    if (!token) {
      featuredError.value =
        'Connect your Spotify account to explore public playlists.'
      return
    }

    const response = await fetch(
      'https://api.spotify.com/v1/browse/featured-playlists?limit=24&country=US&locale=en_US',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    if (response.ok) {
      const data = await response.json()
      const items = normalizePlaylists(data?.playlists?.items || [])

      if (items.length) {
        featuredPlaylists.value = items
        return
      }
    }

    if (response.status === 404 || response.ok) {
      featuredPlaylists.value = await fetchPublicPlaylistFallback(token)
      return
    }

    throw new Error('Unable to fetch featured playlists.')
  } catch (error) {
    featuredError.value = error?.message || 'Unable to fetch public playlists.'
  } finally {
    isFeaturedLoading.value = false
  }
}

async function searchPublicPlaylists() {
  const trimmedQuery = searchQuery.value.trim()
  if (!trimmedQuery) {
    searchResults.value = []
    searchError.value = ''
    return
  }

  isSearchLoading.value = true
  searchError.value = ''

  try {
    const token = await getValidAccessToken()
    if (!token) {
      searchError.value =
        'Connect your Spotify account to search public playlists.'
      return
    }

    const response = await fetch(
      `https://api.spotify.com/v1/search?type=playlist&limit=24&q=${encodeURIComponent(trimmedQuery)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    if (!response.ok) {
      throw new Error('Unable to search public playlists.')
    }

    const data = await response.json()
    searchResults.value = normalizePlaylists(data?.playlists?.items || [])
  } catch (error) {
    searchError.value = error?.message || 'Unable to search public playlists.'
  } finally {
    isSearchLoading.value = false
  }
}

function onSearchSubmit() {
  searchPublicPlaylists()
}

onMounted(fetchFeaturedPlaylists)
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
      <p v-if="isSearchLoading" class="status-text">
        Loading public playlists...
      </p>
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
          @click="fetchFeaturedPlaylists"
        >
          {{ isFeaturedLoading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>
      <p v-if="featuredError" class="error-text">{{ featuredError }}</p>
      <p v-else-if="isFeaturedLoading" class="status-text">
        Loading featured playlists...
      </p>
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
.featured-section {
  margin-top: 1rem;
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

.playlist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 0.8rem;
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
