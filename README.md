# Vue Grid

Vue Grid is a Spotify companion app that lets you connect your account and explore your playlists in a visual, cover-first interface.

## For Users

### What You Can Do

- Connect your Spotify account in one click
- Browse your playlists as large visual cards
- Open any playlist and see track covers in a full grid
- See the real playlist title on the detail page
- Access your Liked Songs directly
- Play and pause tracks from inside the app
- Sign out anytime with a clear confirmation modal

### How It Works

1. Open the app
2. Click Connect to Spotify
3. Authorize with your Spotify account
4. Browse playlists and open details
5. Play tracks and enjoy

### Screenshots

Add screenshots below to show the app experience.

- Home page
  - ![Home page screenshot](./docs/screenshots/home.png)
- Playlists page
  - ![Playlists page screenshot](./docs/screenshots/playlists.png)
- Playlist detail page
  - ![Playlist detail screenshot](./docs/screenshots/playlist-detail.png)

## For Developers

### Local Setup 

Use this section only if you want to run or contribute to the project.

Requirements:

- Node.js 18+
- npm
- Spotify Developer account

1. Create a Spotify app in the Spotify Developer Dashboard:
   [https://developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)

2. In your app settings, add this Redirect URI:

```text
http://127.0.0.1:5173/callback
```

1. Create or update .env in the project root:

```dotenv
VITE_APP_SPOTIFY_CLIENT_ID=your_spotify_client_id
VITE_APP_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/callback
```

1. Install dependencies and start dev server:

```sh
npm install
npm run dev
```

Local app URL:

```text
http://127.0.0.1:5173/
```

Important: use 127.0.0.1 (not localhost) to keep callback behavior consistent.

### Scripts

```sh
npm run dev
npm run build
npm run lint
```
