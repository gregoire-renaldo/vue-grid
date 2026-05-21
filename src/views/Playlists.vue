<!-- src/views/Playlists.vue -->

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getValidAccessToken } from '../spotifyAuth.js'

const playlists = ref([])
const router = useRouter()

async function fetchPlaylists() {
  const token = await getValidAccessToken()
  if (token) {
    const response = await fetch('https://api.spotify.com/v1/me/playlists', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await response.json()
    playlists.value = data.items
  }
}

onMounted(fetchPlaylists)
</script>

<template>
  <div class="playlists">
    <h1>Your Playlists</h1>

    <!-- Liked Songs (special collection) -->
    <div class="liked-songs-card">
      <div class="liked-songs-cover">❤️</div>
      <RouterLink to="/playlists/liked-songs" class="liked-songs-link">
        Liked Songs
      </RouterLink>
    </div>

    <!-- Regular playlists -->
    <ul v-if="playlists.length">
      <li v-for="playlist in playlists" :key="playlist.id">
        <img
          :src="playlist.images[0]?.url"
          alt="Playlist cover"
          width="50"
          height="50"
        />
        <RouterLink
          :to="{ name: 'PlaylistDetail', params: { id: playlist.id } }"
        >
          {{ playlist.name }}
        </RouterLink>
      </li>
    </ul>
    <p v-else>No playlists found.</p>
  </div>
</template>

<style scoped>
.liked-songs-card {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
  padding: 12px;
  background: linear-gradient(135deg, #1db954, #1ed760);
  border-radius: 8px;
  transition: transform 0.2s;
}

.liked-songs-card:hover {
  transform: scale(1.02);
}

.liked-songs-cover {
  font-size: 2.5rem;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.liked-songs-link {
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  text-decoration: none;
}

.liked-songs-link:hover {
  text-decoration: underline;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>
