import { useState } from 'react'
import ArtistSearch from './ArtistSearch'
import { addMixTapeRecord } from '../utils/mixtapeCrud'
import {
  enqueueTrackUrisSequentially,
  getPlaybackState,
  startPlaybackWithUri,
  startPlaybackWithUris,
} from '../utils/spotifyActions'

function chunkArray(items, chunkSize) {
  const chunks = []
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }
  return chunks
}

function shuffleArray(items) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]]
  }
  return copy
}

function buildUniqueTrackList(tracks, limit = 20) {
  const unique = []
  const seen = new Set()

  for (const track of tracks) {
    if (!track?.id || seen.has(track.id)) {
      continue
    }
    seen.add(track.id)
    unique.push(track)
    if (unique.length >= limit) {
      break
    }
  }

  return unique
}

function prioritizeTracksForPlayback(tracks) {
  const withPreview = []
  const withoutPreview = []

  for (const track of tracks) {
    if (track?.preview_url) {
      withPreview.push(track)
    } else {
      withoutPreview.push(track)
    }
  }

  return [...shuffleArray(withPreview), ...shuffleArray(withoutPreview)]
}

async function fetchArtistTopTracks(accessToken, artistId, market) {
  const params = new URLSearchParams({ market: market || 'US' })
  const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error?.message || `No se pudo obtener top tracks para ${artistId}.`)
  }

  return payload?.tracks || []
}

async function fetchFallbackTracks(accessToken, artistIds, market) {
  const topTracksPerArtist = await Promise.all(
    artistIds.filter(Boolean).map((artistId) => fetchArtistTopTracks(accessToken, artistId, market)),
  )
  return buildUniqueTrackList(prioritizeTracksForPlayback(topTracksPerArtist.flat()), 20)
}

async function createPlaylist(accessToken, userId, playlistName) {
  const response = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: playlistName,
      description: 'Generada por mixTape',
      public: false,
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'No se pudo crear la playlist.')
  }

  return payload
}

async function addTracksToPlaylist(accessToken, playlistId, uris) {
  const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uris }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'No se pudieron agregar canciones.')
  }

  return payload
}

function MixTapeGenerator({ accessToken, profile, onRecordCreated }) {
  const [selectedArtists, setSelectedArtists] = useState([])
  const [generatedTracks, setGeneratedTracks] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [queueProgress, setQueueProgress] = useState({ completed: 0, total: 0, percent: 0 })
  const [isQueueModeModalOpen, setIsQueueModeModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const hasMixTape = generatedTracks.length > 0

  const persistRecord = ({ name, type, spotifyPlaylistId }) => {
    const trackUris = generatedTracks.map((track) => track.uri).filter(Boolean)
    const artists = selectedArtists.map((artist) => artist.name)

    const record = {
      id: crypto.randomUUID(),
      name,
      artists,
      track_uris: trackUris,
      type,
      spotify_playlist_id: spotifyPlaylistId ?? null,
      date: new Date().toISOString(),
    }

    addMixTapeRecord(record)
    onRecordCreated?.()
  }

  const handleGenerate = async () => {
    if (selectedArtists.length < 2) {
      return
    }

    setIsGenerating(true)
    setError('')
    setInfo('')

    try {
      const artistIds = selectedArtists.map((artist) => artist.id)
      const artistChunks = chunkArray(artistIds.filter(Boolean), 5)
      const perChunkLimit = String(Math.max(1, Math.ceil(20 / Math.max(artistChunks.length, 1))))

      let tracks
      try {
        const recommendationResults = await Promise.all(
          artistChunks.map((chunk) => {
            const params = new URLSearchParams({
              seed_artists: chunk.join(','),
              limit: perChunkLimit,
              market: 'from_token',
            })

            return fetch(`https://api.spotify.com/v1/recommendations?${params.toString()}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            }).then(async (response) => {
              const payload = await response.json().catch(() => ({}))
              if (!response.ok) {
                const apiMessage = payload?.error?.message || payload?.error_description || 'Sin detalle'
                throw new Error(`No se pudieron generar recomendaciones (HTTP ${response.status}): ${apiMessage}`)
              }
              return payload?.tracks || []
            })
          }),
        )

        tracks = buildUniqueTrackList(prioritizeTracksForPlayback(recommendationResults.flat()), 20)
      } catch (recommendationsError) {
        if (!recommendationsError.message.includes('HTTP 404')) {
          throw recommendationsError
        }

        tracks = await fetchFallbackTracks(accessToken, artistIds, profile?.country || 'US')
        setInfo('Spotify bloqueo recomendaciones para esta app. Se usaron top tracks de artistas.')
      }

      if (!tracks.length) {
        throw new Error('No se encontraron canciones para generar el mixTape.')
      }

      setGeneratedTracks(tracks)
    } catch (generationError) {
      setError(generationError.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleListenNow = async (mode) => {
    const uris = generatedTracks.map((track) => track.uri).filter(Boolean)
    if (!uris.length) {
      setError('No hay URIs de canciones para enviar a la cola.')
      return
    }

    const shouldReplaceQueue = mode === 'replace'

    setIsSaving(true)
    setIsQueueModeModalOpen(false)
    setError('')
    setQueueProgress({ completed: 0, total: uris.length, percent: 0 })
    let queueFinished = false

    try {
      if (shouldReplaceQueue) {
        await startPlaybackWithUris(accessToken, uris)
        queueFinished = true
        setQueueProgress({ completed: uris.length, total: uris.length, percent: 100 })
        const name = `mixTape Radio - ${selectedArtists.map((artist) => artist.name).join(' + ')}`
        persistRecord({ name, type: 'radio', spotifyPlaylistId: null })
        alert('mixTape en reproduccion. Se reemplazo la cola anterior.')
        return
      }

      const playbackState = await getPlaybackState(accessToken)
      const shouldAutoplayFirstTrack = !playbackState?.is_playing

      await enqueueTrackUrisSequentially(
        accessToken,
        uris,
        (progress) => {
          setQueueProgress(progress)
        },
        async (firstUri) => {
          if (!shouldAutoplayFirstTrack) {
            return
          }

          try {
            await startPlaybackWithUri(accessToken, firstUri)
          } catch {
            // Si no hay dispositivo activo o Spotify no permite controlar playback,
            // mantenemos el flujo de cola sin romper la accion principal.
          }
        },
      )
      queueFinished = true
      const name = `mixTape Radio - ${selectedArtists.map((artist) => artist.name).join(' + ')}`
      persistRecord({ name, type: 'radio', spotifyPlaylistId: null })
      alert('Se agregaron a tu cola de reproduccion.')
    } catch (queueError) {
      setError(queueError.message)
    } finally {
      setIsSaving(false)
      if (queueFinished) {
        setTimeout(() => {
          setQueueProgress({ completed: 0, total: 0, percent: 0 })
        }, 600)
      }
    }
  }

  const handleListenNowClick = () => {
    if (isSaving) {
      return
    }
    setIsQueueModeModalOpen(true)
  }

  const handleSavePlaylist = async () => {
    const uris = generatedTracks.map((track) => track.uri).filter(Boolean)
    if (!uris.length) {
      setError('No hay URIs validos para guardar.')
      return
    }

    const suggestedName = `mixTape - ${selectedArtists.slice(0, 3).map((artist) => artist.name).join(' + ')}`
    const name = window.prompt('Nombre para tu mixTape', suggestedName)
    if (!name || !name.trim()) {
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const playlist = await createPlaylist(accessToken, profile.id, name.trim())
      await addTracksToPlaylist(accessToken, playlist.id, uris)

      persistRecord({ name: name.trim(), type: 'playlist', spotifyPlaylistId: playlist.id })
      alert('Playlist guardada en tu biblioteca de Spotify.')
    } catch (playlistError) {
      setError(playlistError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setGeneratedTracks([])
    setSelectedArtists([])
    setError('')
    setInfo('')
  }

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-emerald-400">Crear mixTape</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-100">La Fusion</h2>
      </div>

      {hasMixTape ? (
        <>
          <ul className="space-y-2">
            {generatedTracks.map((track) => (
              <li key={track.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                <img
                  src={track.album.images?.[2]?.url || track.album.images?.[1]?.url || track.album.images?.[0]?.url || ''}
                  alt={track.album.name}
                  className="h-11 w-11 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-100">{track.name}</p>
                  <p className="truncate text-xs text-zinc-400">{track.artists.map((artist) => artist.name).join(', ')}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleListenNowClick}
              className="inline-flex items-center justify-center rounded-xl border border-emerald-500 bg-emerald-500/15 px-5 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-500"
            >
              Escuchar ahora (Modo Radio)
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSavePlaylist}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              Guardar en mi Biblioteca
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleReset}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:text-zinc-500"
            >
              Volver a empezar
            </button>
          </div>
          {isSaving && queueProgress.total > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-300">
                <span>Agregando a la cola...</span>
                <span>
                  {queueProgress.completed}/{queueProgress.total} ({queueProgress.percent}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-200"
                  style={{ width: `${queueProgress.percent}%` }}
                />
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <ArtistSearch
            accessToken={accessToken}
            selectedArtists={selectedArtists}
            onSelectedArtistsChange={setSelectedArtists}
          />
          <button
            type="button"
            disabled={selectedArtists.length < 2 || isGenerating}
            onClick={handleGenerate}
            className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            {isGenerating ? 'Generando mixTape...' : 'Generar mixTape'}
          </button>
        </>
      )}

      {info ? <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">{info}</p> : null}
      {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p> : null}

      {isQueueModeModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl">
            <h3 className="text-lg font-bold text-zinc-100">Como queres escuchar este mixTape?</h3>
            <p className="mt-2 text-sm text-zinc-300">Elegi una opcion de reproduccion.</p>

            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={() => handleListenNow('replace')}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400"
              >
                Escuchar ahora y reemplazar cola
              </button>
              <button
                type="button"
                onClick={() => handleListenNow('append')}
                className="inline-flex items-center justify-center rounded-xl border border-zinc-600 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-400"
              >
                Agregar a la cola existente
              </button>
              <button
                type="button"
                onClick={() => setIsQueueModeModalOpen(false)}
                className="inline-flex items-center justify-center rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default MixTapeGenerator
