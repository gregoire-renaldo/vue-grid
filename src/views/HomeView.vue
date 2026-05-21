<script setup>
import TheWelcome from '../components/TheWelcome.vue'

defineProps({
  profile: {
    type: Object,
    default: null,
  },
})
</script>

<template>
  <main>
    <TheWelcome />

    <div v-if="profile" class="home-cta">
      <p class="home-cta-text">
        You are connected as <strong>{{ profile.display_name }}</strong
        >.
      </p>
      <RouterLink to="/playlists" class="home-cta-button">
        Go to your playlists
      </RouterLink>
    </div>
  </main>
</template>

<style scoped>
.home-cta {
  max-width: 800px;
  margin: 1.5rem auto 0;
  padding: 1.25rem 1.5rem;
  border-radius: 12px;
  background: rgba(29, 185, 84, 0.12);
  border: 1px solid rgba(29, 185, 84, 0.28);
  text-align: center;
}

.home-cta-text {
  margin: 0 0 1rem;
  font-size: 1rem;
}

.home-cta-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.25rem;
  border-radius: 999px;
  background: #1db954;
  color: white;
  font-weight: 700;
  text-decoration: none;
  transition:
    background-color 0.2s ease,
    transform 0.2s ease;
}

.home-cta-button:hover {
  background: #1ed760;
  transform: translateY(-1px);
}
</style>
