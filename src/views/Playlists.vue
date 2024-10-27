<!-- src/views/Playlists.vue -->

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getValidAccessToken } from '../spotifyAuth.js';

const playlists = ref([]);
const router = useRouter();

async function fetchPlaylists() {
  const token = await getValidAccessToken();
  if (token) {
    const response = await fetch('https://api.spotify.com/v1/me/playlists', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    playlists.value = data.items;
  }
}

onMounted(fetchPlaylists);
</script>

<template>
  <div class="playlists">
    <h1>Your Playlists</h1>
    <ul v-if="playlists.length">
      <li v-for="playlist in playlists" :key="playlist.id">
        <img :src="playlist.images[0]?.url" alt="Playlist cover" width="50" height="50" />
        <RouterLink :to="{ name: 'PlaylistDetail', params: { id: playlist.id }}">
          {{ playlist.name }}
        </RouterLink>
      </li>
    </ul>
    <p v-else>No playlists found.</p>
  </div>
</template>
