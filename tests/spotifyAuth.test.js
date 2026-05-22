import { describe, expect, it, vi } from 'vitest'

async function loadSpotifyAuth() {
  vi.resetModules()
  vi.stubEnv('VITE_APP_SPOTIFY_CLIENT_ID', 'client-id')
  vi.stubEnv('VITE_APP_SPOTIFY_REDIRECT_URI', 'http://127.0.0.1:5173/callback')
  return import('../src/spotifyAuth.js')
}

describe('spotifyAuth', () => {
  it('exchanges an authorization code and stores the resulting tokens', async () => {
    const spotifyAuth = await loadSpotifyAuth()
    localStorage.setItem('verifier', 'pkce-verifier')

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_in: 3600,
        }),
      }),
    )

    const token = await spotifyAuth.getAccessToken('auth-code')

    expect(token).toBe('access-token')
    expect(localStorage.getItem('spotify_access_token')).toBe('access-token')
    expect(localStorage.getItem('spotify_refresh_token')).toBe('refresh-token')
    expect(localStorage.getItem('verifier')).toBeNull()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('clears stored auth when token exchange fails', async () => {
    const spotifyAuth = await loadSpotifyAuth()
    localStorage.setItem('verifier', 'pkce-verifier')
    localStorage.setItem('spotify_access_token', 'old-token')
    localStorage.setItem('spotify_refresh_token', 'old-refresh')

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error_description: 'bad code',
        }),
      }),
    )

    await expect(spotifyAuth.getAccessToken('bad-code')).rejects.toThrow(
      'bad code',
    )

    expect(localStorage.getItem('spotify_access_token')).toBeNull()
    expect(localStorage.getItem('spotify_refresh_token')).toBeNull()
    expect(localStorage.getItem('verifier')).toBeNull()
  })
})
