<!-- src/views/Playlists.vue -->

<script setup>
import { computed, ref, onMounted } from 'vue'
import { getValidAccessToken } from '../spotifyAuth.js'

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
      <RouterLink
        to="/playlists/liked-songs"
        class="playlist-card liked-songs-card"
      >
        <div class="playlist-cover liked-songs-cover">❤️</div>
        <div class="playlist-info">
          <h2>Liked Songs</h2>
          <p>Your saved tracks</p>
        </div>
      </RouterLink>

      <RouterLink
        v-for="playlist in sortedPlaylists"
        :key="playlist.id"
        :to="{ name: 'PlaylistDetail', params: { id: playlist.id } }"
        class="playlist-card"
      >
        <img
          v-if="playlist.images[0]?.url"
          :src="playlist.images[0].url"
          alt="Playlist cover"
          class="playlist-cover"
        />
        <div v-else class="playlist-cover playlist-cover-fallback">♫</div>
        <div class="playlist-info">
          <h2>{{ playlist.name }}</h2>
          <p>{{ playlist.tracks?.total ?? 0 }} tracks</p>
        </div>
      </RouterLink>
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

.playlist-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.playlist-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.24);
}

.playlist-cover {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  display: block;
  background: linear-gradient(135deg, #1db954, #1ed760);
}

.playlist-cover-fallback,
.liked-songs-cover {
  display: grid;
  place-items: center;
  font-size: 3rem;
  color: white;
}

.liked-songs-card {
  background: linear-gradient(135deg, #1db954, #1ed760);
}

.playlist-info {
  padding: 0.9rem 1rem 1rem;
}

.playlist-info h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.playlist-info p {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  opacity: 0.78;
}

.empty-state {
  margin-top: 1rem;
  opacity: 0.75;
}
</style>
