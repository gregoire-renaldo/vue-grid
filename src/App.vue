<script setup>
import { RouterLink, RouterView } from 'vue-router'
import HelloWorld from './components/HelloWorld.vue'
import { ref, onMounted } from 'vue'
import {
  redirectToAuthCodeFlow,
  fetchProfile,
  getAccessToken,
  getSpotifyRedirectUri,
} from './spotifyAuth.js'

const profile = ref(null)
const authError = ref('')

async function connectToSpotify() {
  authError.value = ''
  await redirectToAuthCodeFlow()
}

async function loadUserProfile() {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const authProviderError = params.get('error')

  if (authProviderError) {
    authError.value = `Spotify authorization failed: ${authProviderError}. Redirect URI used: ${getSpotifyRedirectUri()}`
    return
  }

  try {
    if (code) {
      await getAccessToken(code)
      window.history.replaceState({}, document.title, '/')
    }

    profile.value = await fetchProfile()
  } catch (error) {
    authError.value =
      error instanceof Error ? error.message : 'Spotify authentication failed.'
  }
}

onMounted(loadUserProfile)
</script>

<template>
  <header>
    <img
      alt="Vue logo"
      class="logo"
      src="@/assets/logo.svg"
      width="125"
      height="125"
    />

    <div class="wrapper">
      <nav>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/about">About</RouterLink>
        <RouterLink to="/playlists">Playlists</RouterLink>
        <!-- New link -->
      </nav>
      <!-- Connect to Spotify button -->
      <button @click="connectToSpotify" class="connect-button">
        {{
          profile
            ? `Connected as ${profile.display_name}`
            : 'Connect to Spotify'
        }}
      </button>
      <p v-if="authError" class="auth-error">{{ authError }}</p>
    </div>
  </header>
  <RouterView />
</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

.connect-button {
  display: block;
  margin: 1rem auto;
  padding: 0.5rem 1rem;
  font-size: 14px;
  color: white;
  background-color: #1db954;
  border: none;
  border-radius: 25px;
  cursor: pointer;
}

.connect-button:hover {
  background-color: #1ed760;
}

.auth-error {
  margin: 0.75rem auto 0;
  color: #b00020;
  font-size: 0.9rem;
  text-align: center;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;
    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
