const DB_NAME = 'vue-grid-spotify-cache'
const DB_VERSION = 1
const STORE_NAME = 'entries'
const MEMORY_ENTRY_LIMIT = 4

export const MAX_CACHE_BYTES = 100 * 1024 * 1024
export const PLAYLISTS_TTL_MS = 30 * 60 * 1000
export const TRACKS_TTL_MS = 12 * 60 * 60 * 1000
export const EXPLORE_TTL_MS = 30 * 60 * 1000

const hotCache = new Map()
let dbPromise = null

function now() {
  return Date.now()
}

function isIndexedDbAvailable() {
  return typeof indexedDB !== 'undefined'
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function openDatabase() {
  if (!isIndexedDbAvailable()) return null
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
        store.createIndex('lastAccessedAt', 'lastAccessedAt')
        store.createIndex('expiresAt', 'expiresAt')
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return dbPromise
}

function createEntry(key, value, ttlMs, scope) {
  const currentTime = now()
  const serialized = JSON.stringify(value)

  return {
    key,
    scope,
    value,
    sizeBytes: new Blob([serialized]).size,
    updatedAt: currentTime,
    lastAccessedAt: currentTime,
    expiresAt: currentTime + ttlMs,
  }
}

function isExpired(entry) {
  return entry.expiresAt <= now()
}

function touchHotCache(entry) {
  hotCache.delete(entry.key)
  hotCache.set(entry.key, entry)

  while (hotCache.size > MEMORY_ENTRY_LIMIT) {
    const oldestKey = hotCache.keys().next().value
    hotCache.delete(oldestKey)
  }
}

async function readAllEntries(db) {
  const transaction = db.transaction(STORE_NAME, 'readonly')
  const store = transaction.objectStore(STORE_NAME)
  return requestToPromise(store.getAll())
}

async function writeEntryToDatabase(entry) {
  const db = await openDatabase()
  if (!db) return

  const transaction = db.transaction(STORE_NAME, 'readwrite')
  const store = transaction.objectStore(STORE_NAME)
  await requestToPromise(store.put(entry))
}

async function deleteEntry(key) {
  const db = await openDatabase()
  if (!db) return

  const transaction = db.transaction(STORE_NAME, 'readwrite')
  const store = transaction.objectStore(STORE_NAME)
  await requestToPromise(store.delete(key))
}

async function enforceBudget() {
  const db = await openDatabase()
  if (!db) return

  const entries = (await readAllEntries(db)) || []
  const activeEntries = []

  for (const entry of entries) {
    if (isExpired(entry)) {
      await deleteEntry(entry.key)
      hotCache.delete(entry.key)
      continue
    }

    activeEntries.push(entry)
  }

  let totalBytes = activeEntries.reduce(
    (sum, entry) => sum + (entry.sizeBytes || 0),
    0,
  )

  if (totalBytes <= MAX_CACHE_BYTES) return

  const evictionCandidates = [...activeEntries].sort(
    (a, b) => a.lastAccessedAt - b.lastAccessedAt,
  )

  for (const entry of evictionCandidates) {
    if (totalBytes <= MAX_CACHE_BYTES) break
    await deleteEntry(entry.key)
    hotCache.delete(entry.key)
    totalBytes -= entry.sizeBytes || 0
  }
}

async function readEntry(key) {
  const hotEntry = hotCache.get(key)
  if (hotEntry) {
    if (isExpired(hotEntry)) {
      hotCache.delete(key)
      await deleteEntry(key)
      return null
    }

    const updatedEntry = {
      ...hotEntry,
      lastAccessedAt: now(),
    }
    touchHotCache(updatedEntry)
    void writeEntryToDatabase(updatedEntry)
    return updatedEntry
  }

  const db = await openDatabase()
  if (!db) return null

  const transaction = db.transaction(STORE_NAME, 'readonly')
  const store = transaction.objectStore(STORE_NAME)
  const entry = await requestToPromise(store.get(key))

  if (!entry) return null

  if (isExpired(entry)) {
    await deleteEntry(key)
    return null
  }

  const updatedEntry = {
    ...entry,
    lastAccessedAt: now(),
  }
  touchHotCache(updatedEntry)
  void writeEntryToDatabase(updatedEntry)

  return updatedEntry
}

async function writeEntry(key, value, ttlMs, scope) {
  const entry = createEntry(key, value, ttlMs, scope)
  touchHotCache(entry)
  await writeEntryToDatabase(entry)
  await enforceBudget()
  return entry
}

export function createPlaylistsCacheKey() {
  return 'playlists:list'
}

export function createPlaylistTracksCacheKey(playlistId) {
  return `playlist:${playlistId}:tracks`
}

export function createExploreFeaturedCacheKey() {
  return 'explore:featured'
}

export function createExploreSearchCacheKey(query) {
  const normalizedQuery = String(query || '').trim().toLowerCase()
  return `explore:search:${normalizedQuery}`
}

export function readCachedPlaylists() {
  return readEntry(createPlaylistsCacheKey())
}

export function readCachedPlaylistTracks(playlistId) {
  return readEntry(createPlaylistTracksCacheKey(playlistId))
}

export function readCachedExploreFeaturedPlaylists() {
  return readEntry(createExploreFeaturedCacheKey())
}

export function readCachedExploreSearchResults(query) {
  return readEntry(createExploreSearchCacheKey(query))
}

export function cachePlaylists(playlists) {
  return writeEntry(
    createPlaylistsCacheKey(),
    { playlists },
    PLAYLISTS_TTL_MS,
    'playlists',
  )
}

export function cachePlaylistTracks(playlistId, playlistData) {
  return writeEntry(
    createPlaylistTracksCacheKey(playlistId),
    playlistData,
    TRACKS_TTL_MS,
    'tracks',
  )
}

export function cacheExploreFeaturedPlaylists(playlists) {
  return writeEntry(
    createExploreFeaturedCacheKey(),
    { playlists },
    EXPLORE_TTL_MS,
    'explore-featured',
  )
}

export function cacheExploreSearchResults(query, playlists) {
  return writeEntry(
    createExploreSearchCacheKey(query),
    { playlists },
    EXPLORE_TTL_MS,
    'explore-search',
  )
}

export function isCacheStale(entry) {
  return !entry || isExpired(entry)
}

export function __resetSpotifyCacheForTests() {
  hotCache.clear()
  dbPromise = null
}
