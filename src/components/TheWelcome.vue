<script setup>
</script>

<template>
  <section class="app-intro">
    <h1>Welcome to Vue Grid</h1>
    <p>
      Browse and explore your Spotify playlists with beautiful flip-card animations.
      Connect your Spotify account to get started and discover your music collection in a fresh,
      interactive way.
    </p>
    <p class="features-list">
      <strong>Features:</strong>
      <ul>
        <li>🎵 View all your Spotify playlists</li>
        <li>🎨 Interactive flip-card animations</li>
        <li>📋 Detailed track information and album art</li>
        <li>🔐 Secure OAuth 2.0 authentication</li>
      </ul>
    </p>
    <p class="get-started">
      Click "Connect to Spotify" in the navigation to begin!
    </p>
  </section>
</template>

<style scoped>
.app-intro {
  max-width: 800px;
  margin: 2rem auto;
  padding: 2rem;
  background: linear-gradient(135deg, #1db954 0%, #1ed760 100%);
  color: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(29, 185, 84, 0.2);
  text-align: center;
}

.app-intro h1 {
  margin: 0 0 1rem 0;
  font-size: 2.5rem;
  font-weight: 700;
}

.app-intro p {
  margin: 1rem 0;
  font-size: 1.1rem;
  line-height: 1.6;
}

.app-intro ul {
  list-style: none;
  padding: 0;
  text-align: left;
  display: inline-block;
}

.app-intro li {
  padding: 0.5rem 0;
  font-size: 1rem;
}

.get-started {
  margin-top: 1.5rem;
  font-size: 1.1rem;
  font-weight: 600;
}
</style>
