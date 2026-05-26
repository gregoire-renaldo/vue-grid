import { ref } from 'vue'
import { getValidAccessToken } from '../spotifyAuth.js'
import {
  cacheExploreFeaturedPlaylists,
  cacheExploreSearchResults,
  isCacheStale,
  readCachedExploreFeaturedPlaylists,
  readCachedExploreSearchResults,
} from '../utils/spotifyCache.js'

function normalizePlaylists(items) {
  return (items || [])
    .filter(playlist => playlist && playlist.id)
    .map(playlist => ({
      ...playlist,
      name: playlist.name || 'Untitled playlist',
      images: Array.isArray(playlist.images) ? playlist.images : [],
      tracks: playlist.tracks || { total: 0 },
    }))
}

function normalizeCategories(items) {
  return (items || [])
    .filter(category => category && category.id)
    .map(category => ({
      id: category.id,
      name: category.name || 'Category',
      icons: Array.isArray(category.icons) ? category.icons : [],
    }))
}

async function extractSpotifyMessage(response, fallbackMessage) {
  try {
    const data = await response.json()
    return data?.error?.message || data?.message || fallbackMessage
  } catch {
    return fallbackMessage
  }
}

export function useExplorePlaylists() {
  const featuredPlaylists = ref([])
  const searchResults = ref([])
  const browseCategories = ref([])
  const selectedCategoryId = ref('')
  const categoryPlaylists = ref([])

  const isFeaturedLoading = ref(false)
  const isSearchLoading = ref(false)
  const isCategoriesLoading = ref(false)

  const featuredError = ref('')
  const searchError = ref('')
  const categoriesError = ref('')

  async function fetchPublicPlaylistFallback(token) {
    const response = await fetch(
      'https://api.spotify.com/v1/search?type=playlist&limit=24&q=top%20hits',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    if (!response.ok) {
      throw new Error('Unable to fetch public playlists.')
    }

    const data = await response.json()
    return normalizePlaylists(data?.playlists?.items || [])
  }

  async function fetchFeaturedPlaylistsFromNetwork(token) {
    const response = await fetch(
      'https://api.spotify.com/v1/browse/featured-playlists?limit=24&country=US&locale=en_US',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    let items = []

    if (response.ok) {
      const data = await response.json()
      items = normalizePlaylists(data?.playlists?.items || [])
      if (!items.length) {
        items = await fetchPublicPlaylistFallback(token)
      }
    } else if (response.status === 404) {
      items = await fetchPublicPlaylistFallback(token)
    } else {
      throw new Error('Unable to fetch featured playlists.')
    }

    featuredPlaylists.value = items
    await cacheExploreFeaturedPlaylists(items)

    return items
  }

  async function fetchFeaturedPlaylists(options = {}) {
    const { forceRefresh = false } = options
    isFeaturedLoading.value = true
    featuredError.value = ''

    try {
      const cachedEntry = await readCachedExploreFeaturedPlaylists()
      if (cachedEntry?.value?.playlists?.length) {
        featuredPlaylists.value = normalizePlaylists(
          cachedEntry.value.playlists,
        )
      }

      if (!forceRefresh && cachedEntry && !isCacheStale(cachedEntry)) {
        return cachedEntry.value.playlists
      }

      const token = await getValidAccessToken()
      if (!token) {
        featuredError.value =
          'Connect your Spotify account to explore public playlists.'
        return cachedEntry?.value?.playlists || []
      }

      if (!forceRefresh && cachedEntry?.value?.playlists?.length) {
        void fetchFeaturedPlaylistsFromNetwork(token).catch(error => {
          if (!featuredPlaylists.value.length) {
            featuredError.value =
              error?.message || 'Unable to fetch public playlists.'
          }
        })
        return cachedEntry.value.playlists
      }

      return await fetchFeaturedPlaylistsFromNetwork(token)
    } catch (error) {
      featuredError.value =
        error?.message || 'Unable to fetch public playlists.'
      return []
    } finally {
      isFeaturedLoading.value = false
    }
  }

  async function searchPublicPlaylistsFromNetwork(token, query) {
    const response = await fetch(
      `https://api.spotify.com/v1/search?type=playlist&limit=24&q=${encodeURIComponent(query)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    if (!response.ok) {
      throw new Error('Unable to search public playlists.')
    }

    const data = await response.json()
    const items = normalizePlaylists(data?.playlists?.items || [])
    searchResults.value = items
    await cacheExploreSearchResults(query, items)

    return items
  }

  async function searchPublicPlaylists(query) {
    const trimmedQuery = String(query || '').trim()
    if (!trimmedQuery) {
      searchResults.value = []
      searchError.value = ''
      return
    }

    isSearchLoading.value = true
    searchError.value = ''

    try {
      const cachedEntry = await readCachedExploreSearchResults(trimmedQuery)
      if (cachedEntry?.value?.playlists) {
        searchResults.value = normalizePlaylists(cachedEntry.value.playlists)
      }

      if (cachedEntry && !isCacheStale(cachedEntry)) {
        return cachedEntry.value.playlists
      }

      const token = await getValidAccessToken()
      if (!token) {
        searchError.value =
          'Connect your Spotify account to search public playlists.'
        return cachedEntry?.value?.playlists || []
      }

      if (cachedEntry?.value?.playlists) {
        void searchPublicPlaylistsFromNetwork(token, trimmedQuery).catch(
          error => {
            if (!searchResults.value.length) {
              searchError.value =
                error?.message || 'Unable to search public playlists.'
            }
          },
        )
        return cachedEntry.value.playlists
      }

      return await searchPublicPlaylistsFromNetwork(token, trimmedQuery)
    } catch (error) {
      searchError.value = error?.message || 'Unable to search public playlists.'
      return []
    } finally {
      isSearchLoading.value = false
    }
  }

  async function fetchCategoryPlaylistsFromSearch(token, categoryName) {
    if (!categoryName) return []

    const response = await fetch(
      `https://api.spotify.com/v1/search?type=playlist&limit=24&q=${encodeURIComponent(categoryName)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return normalizePlaylists(data?.playlists?.items || [])
  }

  async function fetchCategoryPlaylists(token, categoryId, categoryName = '') {
    if (!categoryId) {
      categoryPlaylists.value = []
      return []
    }

    const endpoints = [
      `https://api.spotify.com/v1/browse/categories/${encodeURIComponent(categoryId)}/playlists?limit=24&country=US`,
      `https://api.spotify.com/v1/browse/categories/${encodeURIComponent(categoryId)}/playlists?limit=24`,
    ]

    let lastErrorMessage = 'Unable to fetch playlists for this category.'

    for (const endpoint of endpoints) {
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        const items = normalizePlaylists(data?.playlists?.items || [])
        categoryPlaylists.value = items
        return items
      }

      lastErrorMessage = await extractSpotifyMessage(
        response,
        'Unable to fetch playlists for this category.',
      )
    }

    const fallbackItems = await fetchCategoryPlaylistsFromSearch(
      token,
      categoryName,
    )
    if (fallbackItems.length) {
      categoryPlaylists.value = fallbackItems
      return fallbackItems
    }

    throw new Error(lastErrorMessage)
  }

  async function fetchCategoryMoodGenrePlaylists() {
    isCategoriesLoading.value = true
    categoriesError.value = ''

    try {
      const token = await getValidAccessToken()
      if (!token) {
        categoriesError.value =
          'Connect your Spotify account to explore category playlists.'
        return []
      }

      const response = await fetch(
        'https://api.spotify.com/v1/browse/categories?limit=6&country=US&locale=en_US',
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )

      if (!response.ok) {
        throw new Error('Unable to load browse categories.')
      }

      const data = await response.json()
      browseCategories.value = normalizeCategories(
        data?.categories?.items || [],
      )

      if (!selectedCategoryId.value && browseCategories.value.length) {
        selectedCategoryId.value = browseCategories.value[0].id
      }

      if (selectedCategoryId.value) {
        const selectedCategory = browseCategories.value.find(
          category => category.id === selectedCategoryId.value,
        )
        await fetchCategoryPlaylists(
          token,
          selectedCategoryId.value,
          selectedCategory?.name || '',
        )
      }

      return categoryPlaylists.value
    } catch (error) {
      categoriesError.value =
        error?.message || 'Unable to load category playlists.'
      return []
    } finally {
      isCategoriesLoading.value = false
    }
  }

  async function selectCategory(categoryId) {
    if (!categoryId || categoryId === selectedCategoryId.value) return

    selectedCategoryId.value = categoryId
    isCategoriesLoading.value = true
    categoriesError.value = ''

    try {
      const token = await getValidAccessToken()
      if (!token) {
        categoriesError.value =
          'Connect your Spotify account to explore category playlists.'
        categoryPlaylists.value = []
        return
      }

      const selectedCategory = browseCategories.value.find(
        category => category.id === categoryId,
      )
      await fetchCategoryPlaylists(
        token,
        categoryId,
        selectedCategory?.name || '',
      )
    } catch (error) {
      categoriesError.value =
        error?.message || 'Unable to load category playlists.'
    } finally {
      isCategoriesLoading.value = false
    }
  }

  return {
    featuredPlaylists,
    searchResults,
    browseCategories,
    selectedCategoryId,
    categoryPlaylists,
    isFeaturedLoading,
    isSearchLoading,
    isCategoriesLoading,
    featuredError,
    searchError,
    categoriesError,
    fetchFeaturedPlaylists,
    searchPublicPlaylists,
    fetchCategoryMoodGenrePlaylists,
    selectCategory,
  }
}
