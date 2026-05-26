export const PLAYLIST_CATEGORIES = [
  { id: 'owned', label: 'Owned' },
  { id: 'followed', label: 'Followed' },
  { id: 'collaborative', label: 'Collaborative' },
  { id: 'public', label: 'Public' },
  { id: 'private', label: 'Private' },
  { id: 'made-for-you', label: 'Made for You' },
]

const madeForYouPatterns = [
  /daily\s*mix/i,
  /discover\s*weekly/i,
  /release\s*radar/i,
  /made\s*for\s*you/i,
  /on\s*repeat/i,
  /repeat\s*rewind/i,
  /time\s*capsule/i,
]

export function isMadeForYouPlaylist(playlist) {
  const name = String(playlist?.name || '')
  return madeForYouPatterns.some(pattern => pattern.test(name))
}

export function classifyPlaylistCategories(playlist, currentUserId = '') {
  const tags = []

  const ownerId = String(playlist?.owner?.id || '')
  const normalizedCurrentUserId = String(currentUserId || '')

  if (normalizedCurrentUserId && ownerId === normalizedCurrentUserId) {
    tags.push('owned')
  } else if (ownerId) {
    tags.push('followed')
  }

  if (playlist?.collaborative) {
    tags.push('collaborative')
  }

  if (playlist?.public === true) {
    tags.push('public')
  } else if (playlist?.public === false) {
    tags.push('private')
  }

  if (isMadeForYouPlaylist(playlist)) {
    tags.push('made-for-you')
  }

  return [...new Set(tags)]
}

export function resolveCategoryLabel(id) {
  return PLAYLIST_CATEGORIES.find(category => category.id === id)?.label || id
}
