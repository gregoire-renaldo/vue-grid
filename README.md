# vue-grid

A Vue 3 + Vite application that displays your Spotify playlists in an interactive grid with flip-card animations. Authenticate with Spotify, browse your playlists, and view detailed track information.

## Features

- Spotify OAuth 2.0 authentication with PKCE flow
- View all your Spotify playlists
- Interactive flip-card animations displaying album art and track details
- Automatic token refresh
- Secure local storage management

## Prerequisites

- Node.js (v16+)
- A Spotify Developer account and registered app

## Spotify Setup

1. **Create a Spotify App:**

   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Log in or create a Spotify account
   - Create a new app and accept the terms
   - Copy your **Client ID**

2. **Configure Redirect URI:**

   - In your app settings, add this **Redirect URI**:

     ```
     http://127.0.0.1:5173/callback
     ```

   - Save your changes

3. **Set Local Environment Variables:**

   - Create or update `.env` in the project root:

     ```env
     VITE_APP_SPOTIFY_CLIENT_ID=your_client_id_here
     VITE_APP_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/callback
     ```

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

The app will be available at `http://127.0.0.1:5173/`

**Important:** Always use `127.0.0.1` (not `localhost`) to match Spotify's requirements for HTTP redirects.

### Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## Project Structure

- `src/spotifyAuth.js` — Spotify OAuth flow with PKCE and token management
- `src/App.vue` — Main app component with auth UI
- `src/router/` — Vue Router configuration
- `src/views/` — Page components (Home, Playlists, PlaylistDetail)
- `src/components/` — Reusable UI components

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Customize Configuration

See [Vite Configuration Reference](https://vite.dev/config/).
