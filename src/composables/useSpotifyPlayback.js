import { ref } from 'vue'

import {
  extractSpotifyError,
  isDeviceNotFoundMessage,
  tracksMatch,
} from '../utils/playlistDetailHelpers.js'

export function useSpotifyPlayback({
  playlistId,
  isLikedSongs,
  tracks,
  playlistUri,
  getValidAccessToken,
}) {
  const currentTrack = ref(null)
  const currentPosition = ref(0)
  const trackDuration = ref(0)
  const isPlaying = ref(false)
  const shuffleEnabled = ref(false)
  const showNowPlaying = ref(true)
  const playerReady = ref(false)
  const playerError = ref(null)
  const isPreparingPlayback = ref(false)

  let spotifyPlayer = null
  let deviceId = null
  let progressTimer = null
  let inactivityTimer = null
  let lastProgressUpdateAt = 0

  function setCurrentTrackFromTrack(track, playing = true) {
    if (!track) return

    currentTrack.value = {
      id: track.id,
      uri: track.uri,
      linkedFromUri: track.linked_from?.uri || track.linkedFromUri || null,
      name: track.name,
      artists: track.artists || [],
      album: track.album,
    }

    isPlaying.value = playing
    currentPosition.value = 0
    trackDuration.value = track.duration_ms ?? 0
    showNowPlaying.value = true

    if (playing) {
      lastProgressUpdateAt = Date.now()
      startProgressTimer()
      scheduleNowPlayingFade()
    } else {
      stopProgressTimer()
      stopInactivityTimer()
    }
  }

  function applyPlayerState(state) {
    if (!state) return

    isPlaying.value = !state.paused
    if (typeof state.shuffle === 'boolean') {
      shuffleEnabled.value = state.shuffle
    }
    currentPosition.value = state.position ?? 0
    trackDuration.value = state.duration ?? 0
    lastProgressUpdateAt = Date.now()
    showNowPlaying.value = true

    const currentSpotifyTrack = state.track_window?.current_track
    if (currentSpotifyTrack) {
      currentTrack.value = {
        id: currentSpotifyTrack.id,
        uri: currentSpotifyTrack.uri,
        linkedFromUri: currentSpotifyTrack.linked_from?.uri || null,
        name: currentSpotifyTrack.name,
        artists: currentSpotifyTrack.artists,
        album: currentSpotifyTrack.album,
      }
    }

    if (state.paused) {
      stopProgressTimer()
      stopInactivityTimer()
      showNowPlaying.value = true
    } else {
      startProgressTimer()
      scheduleNowPlayingFade()
    }
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  function logPlaybackDiagnostic(step, details = {}) {
    console.debug(`[Playback] ${step}`, {
      playlistId,
      deviceId,
      playerReady: playerReady.value,
      ...details,
    })
  }

  async function waitForPlayerReady(maxWaitMs = 8000) {
    const start = Date.now()

    while (Date.now() - start < maxWaitMs) {
      if (playerReady.value && deviceId) {
        return true
      }
      await wait(100)
    }

    return false
  }

  async function fetchPlayerDevices(token) {
    const response = await fetch(
      'https://api.spotify.com/v1/me/player/devices',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (!response.ok) {
      const error = await extractSpotifyError(
        response,
        'Unable to fetch Spotify devices.',
      )
      throw new Error(error.message)
    }

    const data = await response.json()
    return data?.devices || []
  }

  async function waitForDeviceRegistration(token, maxAttempts = 8) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const devices = await fetchPlayerDevices(token)
      const found = devices.find(device => device.id === deviceId)

      logPlaybackDiagnostic('device-registration-check', {
        attempt,
        found: Boolean(found),
        devices: devices.map(device => ({
          id: device.id,
          is_active: device.is_active,
          name: device.name,
          type: device.type,
        })),
      })

      if (found) return true

      if (attempt === Math.ceil(maxAttempts / 2)) {
        const connected = await spotifyPlayer?.connect?.()
        logPlaybackDiagnostic('device-registration-reconnect', { connected })
      }

      await wait(220 * attempt)
    }

    return false
  }

  async function ensurePlaybackDeviceReady(token) {
    await spotifyPlayer?.activateElement?.()

    if (!playerReady.value || !deviceId) {
      const connected = await spotifyPlayer?.connect?.()
      logPlaybackDiagnostic('ensure-device-connect', { connected })
    }

    const sdkReady = await waitForPlayerReady()
    if (!sdkReady) {
      throw new Error(
        'Spotify player is still connecting. Please wait a second and try again.',
      )
    }

    const registered = await waitForDeviceRegistration(token)
    if (!registered) {
      throw new Error(
        'Spotify player device not available yet. Please try again in a moment.',
      )
    }
  }

  async function transferPlaybackToWebPlayer(token, attempts = 4) {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const transferResponse = await fetch(
        'https://api.spotify.com/v1/me/player',
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ device_ids: [deviceId], play: false }),
        },
      )

      if (transferResponse.ok) {
        logPlaybackDiagnostic('transfer-success', { attempt })
        return
      }

      const error = await extractSpotifyError(
        transferResponse,
        'Unable to activate the Spotify player device.',
      )
      logPlaybackDiagnostic('transfer-failed', {
        attempt,
        status: error.status,
        message: error.message,
      })

      if (isDeviceNotFoundMessage(error.message) && attempt < attempts) {
        await ensurePlaybackDeviceReady(token)
        await wait(250 * attempt)
        continue
      }

      throw new Error(error.message)
    }
  }

  async function startPlaybackRequest(token, body, attempts = 3) {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const playResponse = await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      )

      if (playResponse.ok) {
        logPlaybackDiagnostic('play-success', { attempt })
        return
      }

      const error = await extractSpotifyError(
        playResponse,
        'Unable to start playback.',
      )
      logPlaybackDiagnostic('play-failed', {
        attempt,
        status: error.status,
        message: error.message,
      })

      if (isDeviceNotFoundMessage(error.message) && attempt < attempts) {
        await ensurePlaybackDeviceReady(token)
        await transferPlaybackToWebPlayer(token, 2)
        await wait(300 * attempt)
        continue
      }

      throw new Error(error.message)
    }
  }

  async function syncPlayerState(retries = 5, delayMs = 120) {
    if (!spotifyPlayer) return

    for (let attempt = 0; attempt < retries; attempt++) {
      const state = await spotifyPlayer.getCurrentState()
      if (state) {
        applyPlayerState(state)
        return
      }
      await wait(delayMs)
    }
  }

  function stopInactivityTimer() {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer)
      inactivityTimer = null
    }
  }

  function scheduleNowPlayingFade() {
    stopInactivityTimer()

    inactivityTimer = setTimeout(() => {
      if (isPlaying.value) {
        showNowPlaying.value = false
      }
    }, 5000)
  }

  function revealNowPlaying() {
    showNowPlaying.value = true
    if (isPlaying.value) {
      scheduleNowPlayingFade()
    }
  }

  function stopProgressTimer() {
    if (progressTimer) {
      clearInterval(progressTimer)
      progressTimer = null
    }
    lastProgressUpdateAt = 0
  }

  function startProgressTimer() {
    stopProgressTimer()

    lastProgressUpdateAt = Date.now()

    progressTimer = setInterval(() => {
      if (!isPlaying.value || !trackDuration.value) return

      const now = Date.now()
      const elapsed = Math.max(0, now - lastProgressUpdateAt)
      lastProgressUpdateAt = now

      currentPosition.value = Math.min(
        currentPosition.value + elapsed,
        trackDuration.value,
      )
    }, 200)
  }

  function isCurrentTrackCard(track) {
    return tracksMatch(currentTrack.value, track)
  }

  function loadSDK() {
    return new Promise(resolve => {
      if (window.Spotify) {
        resolve()
        return
      }
      window.onSpotifyWebPlaybackSDKReady = resolve
      const script = document.createElement('script')
      script.src = 'https://sdk.scdn.co/spotify-player.js'
      document.head.appendChild(script)
    })
  }

  async function initPlayer() {
    await loadSDK()

    spotifyPlayer = new window.Spotify.Player({
      name: 'Vue Grid Player',
      getOAuthToken: async cb => {
        cb(await getValidAccessToken())
      },
      volume: 0.8,
    })

    spotifyPlayer.addListener('ready', ({ device_id }) => {
      deviceId = device_id
      playerReady.value = true
      logPlaybackDiagnostic('sdk-ready', { device_id })
    })

    spotifyPlayer.addListener('not_ready', () => {
      logPlaybackDiagnostic('sdk-not-ready')
      deviceId = null
      playerReady.value = false
    })

    spotifyPlayer.addListener('player_state_changed', state => {
      applyPlayerState(state)
    })

    spotifyPlayer.addListener('initialization_error', ({ message }) => {
      playerError.value = `Init error: ${message}`
    })

    spotifyPlayer.addListener('authentication_error', ({ message }) => {
      playerError.value = `Auth error: ${message}`
    })

    spotifyPlayer.addListener('account_error', () => {
      playerError.value = 'Spotify Premium is required for in-browser playback.'
    })

    const connected = await spotifyPlayer.connect()
    logPlaybackDiagnostic('sdk-connect-result', { connected })
  }

  async function playTrack(track) {
    if (isPreparingPlayback.value) return

    if (isCurrentTrackCard(track)) {
      if (!playerReady.value || !spotifyPlayer) return
      revealNowPlaying()
      await togglePlayback()
      return
    }

    const token = await getValidAccessToken()
    if (!token) {
      playerError.value =
        'Spotify session expired. Please reconnect your account.'
      return
    }

    playerError.value = null
    isPreparingPlayback.value = true

    try {
      await ensurePlaybackDeviceReady(token)
      logPlaybackDiagnostic('ready-check', { ready: true, trackId: track.id })

      await transferPlaybackToWebPlayer(token)

      const selectedTrackIndex = tracks.value.findIndex(
        playlistTrack => playlistTrack.track.id === track.id,
      )

      const playBody = isLikedSongs
        ? {
            uris: [track.uri],
          }
        : {
            context_uri: playlistUri.value,
            offset: { position: Math.max(selectedTrackIndex, 0) },
          }

      await startPlaybackRequest(token, playBody)

      setCurrentTrackFromTrack(track, true)
      await syncPlayerState()
    } catch (error) {
      playerError.value = error?.message || 'Unable to start playback.'
    } finally {
      isPreparingPlayback.value = false
    }
  }

  async function shufflePlay() {
    if (isPreparingPlayback.value || tracks.value.length === 0) return

    const token = await getValidAccessToken()
    if (!token) {
      playerError.value =
        'Spotify session expired. Please reconnect your account.'
      return
    }

    playerError.value = null
    isPreparingPlayback.value = true

    try {
      if (shuffleEnabled.value) {
        const disableShuffleResponse = await fetch(
          `https://api.spotify.com/v1/me/player/shuffle?state=false&device_id=${encodeURIComponent(deviceId)}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        if (!disableShuffleResponse.ok) {
          const error = await extractSpotifyError(
            disableShuffleResponse,
            'Unable to disable shuffle mode.',
          )
          throw new Error(error.message)
        }

        shuffleEnabled.value = false
        await syncPlayerState()
        return
      }

      await ensurePlaybackDeviceReady(token)

      await transferPlaybackToWebPlayer(token)

      const shuffleResponse = await fetch(
        `https://api.spotify.com/v1/me/player/shuffle?state=true&device_id=${encodeURIComponent(deviceId)}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!shuffleResponse.ok) {
        const error = await extractSpotifyError(
          shuffleResponse,
          'Unable to enable shuffle mode.',
        )
        throw new Error(error.message)
      }

      shuffleEnabled.value = true

      const randomIndex = Math.floor(Math.random() * tracks.value.length)
      const randomTrack = tracks.value[randomIndex]?.track
      if (!randomTrack) return

      const playBody = isLikedSongs
        ? {
            uris: [randomTrack.uri],
          }
        : {
            context_uri: playlistUri.value,
            offset: { position: randomIndex },
          }

      await startPlaybackRequest(token, playBody)

      setCurrentTrackFromTrack(randomTrack, true)
      await syncPlayerState()
    } catch (error) {
      playerError.value = error?.message || 'Unable to start shuffled playback.'
    } finally {
      isPreparingPlayback.value = false
    }
  }

  async function togglePlayback() {
    await spotifyPlayer?.togglePlay()
    await syncPlayerState()
  }

  async function seekTrack(event) {
    if (!playerReady.value || !spotifyPlayer) return

    revealNowPlaying()
    const nextPosition = Number(event.target.value)
    currentPosition.value = nextPosition
    lastProgressUpdateAt = Date.now()
    await spotifyPlayer.seek(nextPosition)
  }

  async function previousTrack() {
    if (!playerReady.value) return
    revealNowPlaying()
    await spotifyPlayer?.previousTrack()
    await syncPlayerState()
  }

  async function nextTrack() {
    if (!playerReady.value) return
    revealNowPlaying()
    await spotifyPlayer?.nextTrack()
    await syncPlayerState()
  }

  async function stopPlayback() {
    if (spotifyPlayer) {
      await spotifyPlayer.pause()
      isPlaying.value = false
      currentTrack.value = null
      currentPosition.value = 0
      trackDuration.value = 0
      stopProgressTimer()
      stopInactivityTimer()
      showNowPlaying.value = true
    }
  }

  function disconnectPlayer() {
    stopProgressTimer()
    stopInactivityTimer()
    spotifyPlayer?.disconnect()
  }

  return {
    currentTrack,
    currentPosition,
    trackDuration,
    isPlaying,
    shuffleEnabled,
    showNowPlaying,
    playerReady,
    playerError,
    isPreparingPlayback,
    initPlayer,
    disconnectPlayer,
    revealNowPlaying,
    isCurrentTrackCard,
    playTrack,
    shufflePlay,
    togglePlayback,
    seekTrack,
    previousTrack,
    nextTrack,
    stopPlayback,
  }
}
