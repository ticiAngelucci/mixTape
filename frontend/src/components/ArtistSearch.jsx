import { useEffect, useMemo, useState } from 'react'

function ArtistSearch({ accessToken, selectedArtists, onSelectedArtistsChange }) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [query])

  useEffect(() => {
    if (!accessToken) {
      setResults([])
      return
    }

    if (!debouncedQuery) {
      setResults([])
      setError('')
      return
    }

    const controller = new AbortController()

    const searchArtists = async () => {
      setIsLoading(true)
      setError('')

      try {
        const params = new URLSearchParams({
          q: debouncedQuery,
          type: 'artist',
          limit: '5',
        })

        const response = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        })

        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error?.message || 'No se pudo buscar artistas en Spotify.')
        }

        const artists = (payload?.artists?.items || []).map((artist) => ({
          id: artist.id,
          name: artist.name,
          image: artist.images?.[0]?.url || '',
          externalUrl: artist.external_urls?.spotify || '',
        }))

        setResults(artists)
      } catch (searchError) {
        if (searchError.name === 'AbortError') {
          return
        }

        setResults([])
        setError(searchError.message)
      } finally {
        setIsLoading(false)
      }
    }

    searchArtists()

    return () => controller.abort()
  }, [accessToken, debouncedQuery])

  const selectedIds = useMemo(() => new Set(selectedArtists.map((artist) => artist.id)), [selectedArtists])

  const handleSelectArtist = (artist) => {
    if (selectedIds.has(artist.id)) {
      return
    }

    onSelectedArtistsChange([...selectedArtists, artist])
    setQuery('')
    setDebouncedQuery('')
    setResults([])
    setError('')
  }

  const handleRemoveArtist = (artistId) => {
    onSelectedArtistsChange(selectedArtists.filter((artist) => artist.id !== artistId))
  }

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-200">Artistas seleccionados</h2>
        <span className="text-xs text-zinc-400">{selectedArtists.length} seleccionados</span>
      </div>

      {selectedArtists.length === 0 ? (
        <p className="text-sm text-zinc-400">Todavia no agregaste artistas.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {selectedArtists.map((artist) => (
            <li key={artist.id}>
              <button
                type="button"
                onClick={() => handleRemoveArtist(artist.id)}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-500"
              >
                {artist.image ? (
                  <img src={artist.image} alt={artist.name} className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-[10px] text-zinc-200">
                    {artist.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span>{artist.name}</span>
                <span className="text-zinc-500">x</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div>
        <label htmlFor="artist-search" className="mb-2 block text-sm font-medium text-zinc-300">
          Buscar artistas en Spotify
        </label>
        <div className="relative">
          <input
            id="artist-search"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ej: Bad Bunny, Daft Punk, Rosalía..."
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 pr-24 text-base text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none"
          />
          {isLoading ? (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400">Buscando...</span>
          ) : null}
        </div>
        {error ? (
          <p className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>
        ) : null}
      </div>

      {results.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {results.map((artist) => {
            const isSelected = selectedIds.has(artist.id)

            return (
              <li key={artist.id}>
                <button
                  type="button"
                  disabled={isSelected}
                  onClick={() => handleSelectArtist(artist)}
                  className="flex w-full items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-left transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:border-emerald-500/50 disabled:bg-emerald-500/10"
                >
                  {artist.image ? (
                    <img src={artist.image} alt={artist.name} className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-700 text-xs font-semibold text-zinc-200">
                      {artist.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="truncate text-sm font-medium text-zinc-100">{artist.name}</p>
                    <p className="text-xs text-zinc-400">{isSelected ? 'Ya agregado' : 'Agregar artista'}</p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}

export default ArtistSearch
