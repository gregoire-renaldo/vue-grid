<!-- src/views/PlaylistDetail.vue -->
<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getValidAccessToken } from '../spotifyAuth.js'

const route = useRoute()
const playlistId = route.params.id
const tracks = ref([])
const player = ref(null) // Holds the Spotify player instance
const currentTrack = ref(null) // Tracks the currently playing track

// Fetches playlist tracks on component mount
async function fetchPlaylistTracks() {
  const token = await getValidAccessToken()
  if (token) {
    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )
    const data = await response.json()
    tracks.value = data.items
  }
}

onMounted(() => {
  fetchPlaylistTracks()
})
</script>

<template>
  <div class="playlist-detail">
    <h1>Playlist Tracks</h1>
    <div class="grid">
      <div v-for="track in tracks" :key="track.track.id" class="grid-item">
        <div class="flip-card">
          <!-- Front of the card: album cover -->
          <div class="flip-card-front">
            <img :src="track.track.album.images[0]?.url" alt="Track cover" />
          </div>
          <!-- Back of the card: track details -->
          <div class="flip-card-back">
            <p class="track-title">{{ track.track.name }}</p>
            <p class="track-album">Album: {{ track.track.album.name }}</p>
            <p class="track-year">
              Year: {{ track.track.album.release_date.slice(0, 4) }}
            </p>
            <p class="track-artist">
              Artist:
              {{ track.track.artists.map(artist => artist.name).join(', ') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.playlist-detail {
  text-align: center;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  margin-top: 20px;
}

.grid-item {
  perspective: 1000px; /* Adds perspective for the 3D flip */
  width: 150px; /* Set a fixed width */
  height: 150px; /* Set a fixed height */
}

.flip-card {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.6s;
}

.grid-item:hover .flip-card {
  transform: rotateY(180deg); /* Flip effect on hover */
}

.flip-card-front,
.flip-card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden; /* Hide back side during flip */
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  box-sizing: border-box;
}

.flip-card-front img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.flip-card-back {
  color: white;
  text-align: center;
  transform: rotateY(180deg); /* Flip back side to align on hover */
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.track-title {
  font-weight: bold;
  margin-bottom: 5px;
}

.track-album,
.track-year,
.track-artist {
  font-size: 0.9em;
  margin: 2px 0;
}

.controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
}

.controls button {
  padding: 10px 20px;
  font-size: 1em;
  border: none;
  border-radius: 5px;
  background-color: #1db954;
  color: white;
  cursor: pointer;
}

.controls button:hover {
  background-color: #1ed760;
}
</style>
