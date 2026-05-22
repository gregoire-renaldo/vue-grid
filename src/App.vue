<script setup>
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { computed, ref, onMounted, onUnmounted } from 'vue'
import ConfirmModal from './components/ConfirmModal.vue'
import NowPlayingBar from './components/NowPlayingBar.vue'
import { useSpotifyPlayback } from './composables/useSpotifyPlayback.js'
import {
  redirectToAuthCodeFlow,
  fetchProfile,
  getAccessToken,
  getValidAccessToken,
  getSpotifyRedirectUri,
  signOutSpotify,
} from './spotifyAuth.js'

const profile = ref(null)
const authError = ref('')
const showSignOutModal = ref(false)
const route = useRoute()
const playbackTracks = ref([])
const playbackPlaylistUri = ref('')

const {
  currentTrack,
  currentPosition,
  trackDuration,
  isPlaying,
  showNowPlaying,
  revealNowPlaying,
  togglePlayback,
  seekTrack,
  previousTrack,
  nextTrack,
  stopPlayback,
} = useSpotifyPlayback({
  playlistId: 'app-shell',
  isLikedSongs: false,
  tracks: playbackTracks,
  playlistUri: playbackPlaylistUri,
  getValidAccessToken,
})

const showHomeButtonPlacement = computed(
  () => route.name === 'home' || route.name === 'Callback',
)

async function connectToSpotify() {
  if (profile.value) {
    showSignOutModal.value = true
    return
  }

  authError.value = ''
  await redirectToAuthCodeFlow()
}

function confirmSignOut() {
  signOutSpotify()
  profile.value = null
  authError.value = ''
  showSignOutModal.value = false
}

function cancelSignOut() {
  showSignOutModal.value = false
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

onMounted(() => {
  window.addEventListener('mousemove', revealNowPlaying)
  window.addEventListener('touchstart', revealNowPlaying, { passive: true })
  window.addEventListener('keydown', revealNowPlaying)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', revealNowPlaying)
  window.removeEventListener('touchstart', revealNowPlaying)
  window.removeEventListener('keydown', revealNowPlaying)
})
</script>

<template>
  <header>
    <div class="wrapper">
      <nav>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/playlists">Playlists</RouterLink>
        <RouterLink to="/explore">Explore</RouterLink>

        <button
          v-if="!showHomeButtonPlacement"
          @click="connectToSpotify"
          class="connect-button nav-connect-button"
        >
          {{
            profile
              ? `Connected as ${profile.display_name}`
              : 'Connect to Spotify'
          }}
        </button>
      </nav>
      <button
        v-if="showHomeButtonPlacement"
        @click="connectToSpotify"
        class="connect-button"
      >
        {{
          profile
            ? `Connected as ${profile.display_name}`
            : 'Connect to Spotify'
        }}
      </button>
      <p v-if="authError" class="auth-error">{{ authError }}</p>
    </div>
  </header>
  <main class="app-content" :class="{ 'has-now-playing': currentTrack }">
    <RouterView v-slot="{ Component }">
      <component
        :is="Component"
        v-bind="showHomeButtonPlacement ? { profile } : {}"
      />
    </RouterView>
  </main>

  <NowPlayingBar
    v-if="currentTrack"
    :current-track="currentTrack"
    :current-position="currentPosition"
    :track-duration="trackDuration"
    :is-playing="isPlaying"
    :show-now-playing="showNowPlaying"
    @toggle-playback="togglePlayback"
    @previous-track="previousTrack"
    @next-track="nextTrack"
    @stop-playback="stopPlayback"
    @seek-track="seekTrack"
  />

  <ConfirmModal
    :open="showSignOutModal"
    title="Sign out from Spotify?"
    confirm-text="Sign out"
    cancel-text="Cancel"
    size="sm"
    confirm-variant="danger"
    cancel-variant="secondary"
    @cancel="cancelSignOut"
    @confirm="confirmSignOut"
  >
    <p>
      You are connected as
      <strong>{{ profile?.display_name }}</strong
      >.
    </p>
  </ConfirmModal>
</template>

<style scoped>
header {
  line-height: 1.5;
  width: 100%;
}

.wrapper {
  width: 100%;
}

.app-content {
  width: 100%;
}

.app-content.has-now-playing {
  padding-bottom: 100px;
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

.nav-connect-button {
  display: inline-block;
  margin: 0 0 0 1rem;
  vertical-align: middle;
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
    padding-right: 0;
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

  .nav-connect-button {
    margin-left: 1.25rem;
  }
}
</style>
