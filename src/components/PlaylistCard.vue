<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  playlist: {
    type: Object,
    default: null,
  },
  likedSongs: {
    type: Boolean,
    default: false,
  },
  tags: {
    type: Array,
    default: () => [],
  },
})

const to = computed(() => {
  if (props.likedSongs) {
    return '/playlists/liked-songs'
  }

  return {
    name: 'PlaylistDetail',
    params: { id: props.playlist?.id },
  }
})
</script>

<template>
  <RouterLink
    :to="to"
    class="playlist-card"
    :class="{ 'liked-songs-card': props.likedSongs }"
  >
    <template v-if="props.likedSongs">
      <div class="playlist-cover liked-songs-cover">❤️</div>
      <div class="playlist-info">
        <h2>Liked Songs</h2>
        <p>Your saved tracks</p>
      </div>
    </template>

    <template v-else>
      <img
        v-if="props.playlist?.images?.[0]?.url"
        :src="props.playlist.images[0].url"
        alt="Playlist cover"
        class="playlist-cover"
      />
      <div v-else class="playlist-cover playlist-cover-fallback">♫</div>
      <div class="playlist-info">
        <h2>{{ props.playlist?.name }}</h2>
        <p>{{ props.playlist?.tracks?.total ?? 0 }} tracks</p>
        <div v-if="props.tags.length" class="playlist-tags">
          <span v-for="tag in props.tags" :key="tag" class="playlist-tag">
            {{ tag }}
          </span>
        </div>
      </div>
    </template>
  </RouterLink>
</template>

<style scoped>
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

.playlist-tags {
  margin-top: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.playlist-tag {
  font-size: 0.68rem;
  line-height: 1;
  padding: 0.22rem 0.45rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.26);
  background: rgba(255, 255, 255, 0.08);
}
</style>
