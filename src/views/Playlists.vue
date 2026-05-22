<!-- src/views/Playlists.vue -->

<script setup>
import { computed, ref, onMounted } from 'vue'
import { getValidAccessToken } from '../spotifyAuth.js'
import PlaylistCard from '../components/PlaylistCard.vue'

const playlists = ref([])
const sortMode = ref('alpha-asc')

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

async function fetchPlaylists() {
  const token = await getValidAccessToken()
  if (token) {
    const response = await fetch('https://api.spotify.com/v1/me/playlists', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await response.json()
    playlists.value = (data.items || []).map((playlist, index) => ({
      ...playlist,
      _fetchedIndex: index,
    }))
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

.playlist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 1rem;
}

.empty-state {
  margin-top: 1rem;
  opacity: 0.75;
}
</style>
