# Vue Grid

Vue Grid is a Vue 3 Spotify companion app with a visual, cover-first experience for listening and discovery.

## Features

### Authentication

- Spotify OAuth Authorization Code + PKCE flow
- Auto token refresh when access token is near expiry
- Secure sign out with confirmation modal

### Library Browsing

- Personal playlists page (your account playlists)
- Dedicated Liked Songs entry
- Playlist sorting:
  - Alphabetical (A to Z)
  - Alphabetical (Z to A)
  - Creation date (most recent first)
  - Creation date (oldest first)

### Playlist Detail Experience

- Grid of track cards with cover, title, and artist
- Shuffle controls with enable/disable behavior
- Smooth auto-scroll to the currently playing track card
- Refresh button with cooldown to force data refresh

### Persistent Playback

- Spotify Web Playback SDK integration
- Singleton player state across route navigation
- Bottom now-playing bar available app-wide
- Playback controls:
  - Play/pause
  - Previous/next
  - Stop
  - Seek bar with elapsed/duration
- Auto-hide controls while playing, reveal on user activity

### Explore (Public Playlists)

- Explore page for public playlist discovery (separate from personal playlists)
- Featured playlists fetch with fallback strategy
- Public playlist search
- Refresh button for featured results

### Caching and Refresh Policy

- IndexedDB-backed cache with in-memory hot cache
- Global cache budget: 100 MB
- LRU eviction when budget is exceeded
- TTL policy:
  - Playlists list: 30 minutes
  - Playlist tracks: 12 hours
- Stale-while-revalidate behavior where applicable
- Manual refresh buttons with 5-second cooldown

### Quality and Testing

- Unit/integration-style tests with Vitest + Vue Test Utils
- Coverage across views, composables, helpers, and UI components

## Screenshots

Add screenshots below to show the app experience.

- Home page
  - ![Home page screenshot](./docs/screenshots/home.png)
- Playlists page
  - ![Playlists page screenshot](./docs/screenshots/playlists.png)
- Playlist detail page
  - ![Playlist detail screenshot](./docs/screenshots/playlist-detail.png)

## Tech Stack

- Vue 3
- Vue Router
- Vite
- Vitest + Vue Test Utils
- Spotify Web API + Spotify Web Playback SDK

## Local Setup

Requirements:

- Node.js 18+
- npm
- Spotify Developer account

1. Create a Spotify app in the Spotify Developer Dashboard:
   [https://developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)

2. In your app settings, add this redirect URI:

```text
http://127.0.0.1:5173/callback
```

3. Create or update `.env` in the project root:

```dotenv
VITE_APP_SPOTIFY_CLIENT_ID=your_spotify_client_id
VITE_APP_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/callback
```

4. Install dependencies and start dev server:

```sh
npm install
npm run dev
```

Local app URL:

```text
http://127.0.0.1:5173/
```

Important: use `127.0.0.1` (not `localhost`) to keep callback behavior consistent.

## Scripts

```sh
npm run dev
npm run build
npm run preview
npm run lint
npm run format
npm run test
npm run test:watch
npm run test:run
npm run test:coverage
```
