// spotifyAuth.js

const clientId = normalizeEnvValue(import.meta.env.VITE_APP_SPOTIFY_CLIENT_ID)
const configuredRedirectUri = normalizeEnvValue(
  import.meta.env.VITE_APP_SPOTIFY_REDIRECT_URI,
)
const redirectUri = normalizeRedirectUri(
  configuredRedirectUri || 'http://127.0.0.1:5173/callback',
)

function normalizeEnvValue(value) {
  if (!value) return ''
  return String(value)
    .trim()
    .replace(/^['\"]|['\"]$/g, '')
}

function normalizeRedirectUri(value) {
  const url = new URL(value)

  // Spotify is stricter with insecure redirect URIs; loopback IP is safest for local dev.
  if (url.protocol === 'http:' && url.hostname === 'localhost') {
    url.hostname = '127.0.0.1'
  }

  return url.toString().replace(/\/$/, '')
}

function clearStoredAuth() {
  localStorage.removeItem('verifier')
  localStorage.removeItem('spotify_access_token')
  localStorage.removeItem('spotify_refresh_token')
  localStorage.removeItem('spotify_token_expiry')
}

function requireClientId() {
  if (!clientId) {
    throw new Error('Missing VITE_APP_SPOTIFY_CLIENT_ID environment variable.')
  }
}

function requireSecureRedirectUri() {
  const url = new URL(redirectUri)
  const isLoopbackHost = ['localhost', '127.0.0.1'].includes(url.hostname)

  if (url.protocol !== 'https:' && !isLoopbackHost) {
    throw new Error(
      'Spotify redirect URI must use HTTPS unless it points to localhost. Set VITE_APP_SPOTIFY_REDIRECT_URI to a registered HTTPS URL or http://localhost:5173/.',
    )
  }
}

// Redirect to Spotify for authentication
export async function redirectToAuthCodeFlow() {
  requireClientId()
  requireSecureRedirectUri()

  const verifier = generateCodeVerifier(128)
  const challenge = await generateCodeChallenge(verifier)

  localStorage.setItem('verifier', verifier)

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'user-read-private user-read-email streaming',
    code_challenge_method: 'S256',
    code_challenge: challenge,
  })

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`
}

export function getSpotifyRedirectUri() {
  return redirectUri
}

export async function getAccessToken(code) {
  requireClientId()

  const verifier = localStorage.getItem('verifier')

  if (!verifier) {
    throw new Error(
      'Missing PKCE verifier. Start the Spotify sign-in flow again.',
    )
  }

  const params = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  })

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  const data = await response.json()

  if (!response.ok || !data.access_token) {
    clearStoredAuth()
    throw new Error(
      data.error_description ||
        data.error ||
        'Unable to exchange Spotify authorization code.',
    )
  }

  localStorage.setItem('spotify_access_token', data.access_token)
  if (data.refresh_token) {
    localStorage.setItem('spotify_refresh_token', data.refresh_token)
  }
  localStorage.setItem(
    'spotify_token_expiry',
    String(Date.now() + data.expires_in * 1000),
  )
  localStorage.removeItem('verifier')

  return data.access_token
}

export async function refreshAccessToken() {
  requireClientId()

  const refreshToken = localStorage.getItem('spotify_refresh_token')
  if (!refreshToken) return null

  const params = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  const data = await response.json()

  if (!response.ok || !data.access_token) {
    clearStoredAuth()
    return null
  }

  localStorage.setItem('spotify_access_token', data.access_token)
  localStorage.setItem(
    'spotify_token_expiry',
    String(Date.now() + data.expires_in * 1000),
  )

  if (data.refresh_token) {
    localStorage.setItem('spotify_refresh_token', data.refresh_token)
  }

  return data.access_token
}

export async function getValidAccessToken() {
  let token = localStorage.getItem('spotify_access_token')
  const expiry = Number(localStorage.getItem('spotify_token_expiry') || 0)

  if (!token || Date.now() >= expiry - 60_000) {
    token = await refreshAccessToken()
  }

  return token
}

export async function fetchProfile() {
  const token = await getValidAccessToken()
  if (!token) {
    return null
  }

  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredAuth()
      return null
    }

    throw new Error('Unable to fetch Spotify profile.')
  }

  return response.json()
}

// Utility functions for PKCE
function generateCodeVerifier(length) {
  let text = ''
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

async function generateCodeChallenge(codeVerifier) {
  const data = new TextEncoder().encode(codeVerifier)
  const digest = await window.crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}
