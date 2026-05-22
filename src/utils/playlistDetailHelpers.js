export function getTrackUris(track) {
  const uris = new Set()
  if (!track) return uris

  if (track.uri) uris.add(track.uri)
  if (track.linked_from?.uri) uris.add(track.linked_from.uri)
  if (track.linkedFromUri) uris.add(track.linkedFromUri)

  return uris
}

export function tracksMatch(currentTrack, track) {
  if (!track || !currentTrack) return false

  if (currentTrack.id && track.id && currentTrack.id === track.id) {
    return true
  }

  const currentTrackUris = getTrackUris(currentTrack)
  const cardTrackUris = getTrackUris(track)

  for (const uri of currentTrackUris) {
    if (cardTrackUris.has(uri)) return true
  }

  return false
}

export function isDeviceNotFoundMessage(message) {
  return /device\s+not\s+found/i.test(String(message || ''))
}

export async function extractSpotifyError(response, fallbackMessage) {
  let message = fallbackMessage

  try {
    const data = await response.json()
    message = data?.error?.message || data?.message || message
  } catch {
    // Keep fallback message.
  }

  return {
    status: response.status,
    message,
  }
}

export function formatTime(milliseconds) {
  if (!milliseconds) return '0:00'

  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
