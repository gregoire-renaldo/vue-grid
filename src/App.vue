<script setup>
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { computed, provide, ref, onMounted, onUnmounted } from 'vue'
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

const THEME_STORAGE_KEY = 'vue-grid-theme'
const TRACK_ANIMATION_STORAGE_KEY = 'vue-grid-track-animation'
const MOBILE_PLAY_HOTSPOT_STORAGE_KEY = 'vue-grid-mobile-play-hotspot-enabled'
const AVAILABLE_TRACK_ANIMATIONS = ['dust', 'pulse', 'equalizer', 'orbit']

const profile = ref(null)
const authError = ref('')
const showSignOutModal = ref(false)
const showSettingsMenu = ref(false)
const darkModeEnabled = ref(false)
const nowPlayingAnimation = ref('dust')
const mobilePlayHotspotEnabled = ref(false)
const isMobileDevice = ref(false)
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

provide('nowPlayingAnimation', nowPlayingAnimation)
provide('mobilePlayHotspotEnabled', mobilePlayHotspotEnabled)
provide('isMobileDevice', isMobileDevice)

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

function applyTheme(enabled) {
  const theme = enabled ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', theme)
}

function initializeTheme() {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
  if (storedTheme === 'dark') {
    darkModeEnabled.value = true
  } else if (storedTheme === 'light') {
    darkModeEnabled.value = false
  } else {
    darkModeEnabled.value = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches
  }

  applyTheme(darkModeEnabled.value)
}

function initializeTrackAnimation() {
  const storedAnimation = localStorage.getItem(TRACK_ANIMATION_STORAGE_KEY)
  if (storedAnimation && AVAILABLE_TRACK_ANIMATIONS.includes(storedAnimation)) {
    nowPlayingAnimation.value = storedAnimation
    return
  }

  nowPlayingAnimation.value = 'dust'
}

function syncMobileDeviceState() {
  if (typeof window === 'undefined') {
    isMobileDevice.value = false
    return
  }

  const supportsMatchMedia = typeof window.matchMedia === 'function'
  const hasCoarsePointer = supportsMatchMedia
    ? window.matchMedia('(hover: none), (pointer: coarse)').matches
    : false
  const hasTouchCapability =
    typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0

  isMobileDevice.value = hasCoarsePointer || hasTouchCapability
}

function initializeMobilePlayHotspotSetting() {
  const storedValue = localStorage.getItem(MOBILE_PLAY_HOTSPOT_STORAGE_KEY)
  mobilePlayHotspotEnabled.value = storedValue === 'true'
}

function setMobilePlayHotspotEnabled(enabled) {
  mobilePlayHotspotEnabled.value = enabled
  localStorage.setItem(
    MOBILE_PLAY_HOTSPOT_STORAGE_KEY,
    enabled ? 'true' : 'false',
  )
}

function onMobilePlayHotspotChange(event) {
  setMobilePlayHotspotEnabled(Boolean(event?.target?.checked))
}

function toggleSettingsMenu() {
  showSettingsMenu.value = !showSettingsMenu.value
}

function setDarkMode(enabled) {
  darkModeEnabled.value = enabled
  localStorage.setItem(THEME_STORAGE_KEY, enabled ? 'dark' : 'light')
  applyTheme(enabled)
}

function onDarkModeChange(event) {
  setDarkMode(event.target.checked)
}

function closeSettingsMenu() {
  showSettingsMenu.value = false
}

function setTrackAnimation(animation) {
  if (!AVAILABLE_TRACK_ANIMATIONS.includes(animation)) return
  nowPlayingAnimation.value = animation
  localStorage.setItem(TRACK_ANIMATION_STORAGE_KEY, animation)
}

onMounted(loadUserProfile)

onMounted(() => {
  initializeTheme()
  initializeTrackAnimation()
  initializeMobilePlayHotspotSetting()
  syncMobileDeviceState()
  window.addEventListener('mousemove', revealNowPlaying)
  window.addEventListener('touchstart', revealNowPlaying, { passive: true })
  window.addEventListener('keydown', revealNowPlaying)
  window.addEventListener('resize', syncMobileDeviceState)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', revealNowPlaying)
  window.removeEventListener('touchstart', revealNowPlaying)
  window.removeEventListener('keydown', revealNowPlaying)
  window.removeEventListener('resize', syncMobileDeviceState)
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
          {{ profile ? `Connected` : 'Connect to Spotify' }}
        </button>

        <div class="settings-anchor">
          <button
            class="settings-wheel"
            aria-label="Open settings"
            @click="toggleSettingsMenu"
          >
            ⚙
          </button>

          <div v-if="showSettingsMenu" class="settings-menu" role="menu">
            <div class="settings-menu-header">Display</div>
            <label class="settings-item">
              <span>Dark mode</span>
              <input
                type="checkbox"
                :checked="darkModeEnabled"
                @change="onDarkModeChange"
              />
            </label>

            <div class="settings-section-title">Now Playing animation</div>
            <div
              class="settings-options"
              role="radiogroup"
              aria-label="Now playing animation"
            >
              <label class="settings-item settings-item-radio">
                <span>Dust</span>
                <input
                  type="radio"
                  name="track-animation"
                  value="dust"
                  :checked="nowPlayingAnimation === 'dust'"
                  @change="setTrackAnimation('dust')"
                />
              </label>
              <label class="settings-item settings-item-radio">
                <span>Pulse Rings</span>
                <input
                  type="radio"
                  name="track-animation"
                  value="pulse"
                  :checked="nowPlayingAnimation === 'pulse'"
                  @change="setTrackAnimation('pulse')"
                />
              </label>
              <label class="settings-item settings-item-radio">
                <span>Equalizer Bars</span>
                <input
                  type="radio"
                  name="track-animation"
                  value="equalizer"
                  :checked="nowPlayingAnimation === 'equalizer'"
                  @change="setTrackAnimation('equalizer')"
                />
              </label>
              <label class="settings-item settings-item-radio">
                <span>Orbit Glow</span>
                <input
                  type="radio"
                  name="track-animation"
                  value="orbit"
                  :checked="nowPlayingAnimation === 'orbit'"
                  @change="setTrackAnimation('orbit')"
                />
              </label>
            </div>

            <div v-if="isMobileDevice" class="settings-section-title">
              Mobile interactions
            </div>
            <label v-if="isMobileDevice" class="settings-item">
              <span>Tap hotspot to play instantly</span>
              <input
                type="checkbox"
                :checked="mobilePlayHotspotEnabled"
                @change="onMobilePlayHotspotChange"
              />
            </label>

            <button
              class="settings-close"
              type="button"
              @click="closeSettingsMenu"
            >
              Close
            </button>
          </div>
        </div>
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
        :key="$route.path"
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
  display: flex;
  align-items: center;
  width: 100%;
  font-size: 12px;
  text-align: left;
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

.settings-anchor {
  position: relative;
  margin-left: auto;
  z-index: 120;
}

.settings-wheel {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  color: var(--color-text);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.28);
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
}

.settings-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  width: 220px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-background-soft);
  color: var(--color-text);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
  padding: 0.75rem;
}

.settings-menu-header {
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.settings-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.settings-item-radio {
  font-size: 0.9rem;
}

.settings-section-title {
  margin-top: 0.85rem;
  margin-bottom: 0.4rem;
  font-weight: 700;
  font-size: 0.9rem;
}

.settings-options {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.settings-close {
  margin-top: 0.75rem;
  width: 100%;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
  border-radius: 8px;
  padding: 0.35rem 0.5rem;
  cursor: pointer;
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
