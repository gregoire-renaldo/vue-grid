<script setup>
</script>

<template>
  <section class="app-intro">
    <h1>Explore your Spotify collection</h1>
    <p>
      Vue Grid turns your Spotify playlists into a visual experience with large
      cover cards, a clean playlist view, and a track grid that makes browsing
      music feel fast and simple.
    </p>
    <p class="features-list">
      <strong>Features:</strong>
      <ul>
        <li>🎵 View your Spotify playlists as large cards</li>
        <li>🖼️ Open a playlist and see its tracks in a cover grid</li>
        <li>▶️ Play tracks directly in the app</li>
        <li>🔐 Connect securely with your Spotify account</li>
      </ul>
    </p>
    <p class="get-started">
      Connect from the navigation, then jump straight into your playlists.
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
