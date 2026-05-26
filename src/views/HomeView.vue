<script setup>
import TheWelcome from '../components/TheWelcome.vue'
import heroDesktop from '../assets/hero_desktop.png'
import heroMobile from '../assets/hero_mobile.png'

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
      <RouterLink to="/playlists" class="home-cta-button">
        Go to your playlists
      </RouterLink>
    </div>

    <div class="home-hero">
      <picture>
        <source :srcset="heroDesktop" media="(min-width: 768px)" />
        <img
          :src="heroMobile"
          alt="Vue Grid hero artwork"
          class="home-hero-image"
        />
      </picture>
    </div>
  </main>
</template>

<style scoped>
.home-hero {
  max-width: 1100px;
  margin: 0 auto 1.5rem;
}

.home-hero picture {
  display: block;
}

.home-hero-image {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 14px;
}

.home-cta {
  max-width: 800px;
  margin: 1.5rem auto;
  padding: 1.25rem 1.5rem;
  border-radius: 12px;
  background: rgba(29, 185, 84, 0.12);
  border: 1px solid rgba(29, 185, 84, 0.28);
  text-align: center;
}

.home-cta-text {
  margin: 0 0 1.25rem;
  font-size: 1rem;
}

.home-cta-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  margin: 0 auto;
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
