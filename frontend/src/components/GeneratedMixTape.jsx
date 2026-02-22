import { useEffect, useRef, useState } from 'react'

function GeneratedMixTape({
  tracks,
  onSave,
  onReset,
  isSaving,
  saveError,
  savedPlaylistUrl,
}) {
  const [currentPlayingId, setCurrentPlayingId] = useState(null)
  const [isQueuePlaying, setIsQueuePlaying] = useState(false)
  const currentAudioRef = useRef(null)
  const audioRefs = useRef(new Map())
  const queueTrackIdsRef = useRef([])

  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
      }
    }
  }, [])

  const setAudioRef = (trackId, audioElement) => {
    if (!audioElement) {
      audioRefs.current.delete(trackId)
      return
    }

    audioRefs.current.set(trackId, audioElement)
  }

  const handleTogglePlay = async (trackId) => {
    setIsQueuePlaying(false)
    const audio = audioRefs.current.get(trackId)
    if (!audio) {
      return
    }

    if (currentAudioRef.current && currentAudioRef.current !== audio) {
      currentAudioRef.current.pause()
      currentAudioRef.current.currentTime = 0
    }

    if (audio.paused) {
      try {
        await audio.play()
        currentAudioRef.current = audio
        setCurrentPlayingId(trackId)
      } catch {
        setCurrentPlayingId(null)
      }
      return
    }

    audio.pause()
    setCurrentPlayingId(null)
  }

  const playableTrackIds = tracks.filter((track) => Boolean(track.preview_url)).map((track) => track.id)

  const playTrackById = async (trackId) => {
    const audio = audioRefs.current.get(trackId)
    if (!audio) {
      return false
    }

    if (currentAudioRef.current && currentAudioRef.current !== audio) {
      currentAudioRef.current.pause()
      currentAudioRef.current.currentTime = 0
    }

    try {
      await audio.play()
      currentAudioRef.current = audio
      setCurrentPlayingId(trackId)
      return true
    } catch {
      setCurrentPlayingId(null)
      return false
    }
  }

  const handlePlayQueue = async () => {
    if (playableTrackIds.length === 0) {
      return
    }
    queueTrackIdsRef.current = playableTrackIds
    setIsQueuePlaying(true)
    await playTrackById(playableTrackIds[0])
  }

  const handlePauseQueue = () => {
    setIsQueuePlaying(false)
    queueTrackIdsRef.current = []
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
    }
    setCurrentPlayingId(null)
  }

  const handleTrackEnded = async (trackId) => {
    if (!isQueuePlaying) {
      setCurrentPlayingId((current) => (current === trackId ? null : current))
      return
    }

    const queue = queueTrackIdsRef.current
    const currentIndex = queue.indexOf(trackId)
    const nextTrackId = currentIndex >= 0 ? queue[currentIndex + 1] : null

    if (!nextTrackId) {
      setIsQueuePlaying(false)
      setCurrentPlayingId(null)
      return
    }

    await playTrackById(nextTrackId)
  }

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-emerald-400">Sesion lista</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-100">Tu mixTape Generado</h2>
        <p className="mt-1 text-sm text-zinc-300">Escuchalo ahora en previews o guardalo en tu cuenta de Spotify.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={isQueuePlaying ? handlePauseQueue : handlePlayQueue}
          disabled={playableTrackIds.length === 0}
          className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-100 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:text-zinc-500"
        >
          {isQueuePlaying ? 'Pausar mixTape' : 'Escuchar mixTape'}
        </button>
        {playableTrackIds.length === 0 ? (
          <span className="inline-flex items-center text-xs text-zinc-500">No hay previews disponibles para reproducir.</span>
        ) : null}
      </div>

      <ul className="space-y-2">
        {tracks.map((track) => {
          const coverUrl = track.album.images?.[2]?.url || track.album.images?.[1]?.url || track.album.images?.[0]?.url || ''
          const artistNames = track.artists.map((artist) => artist.name).join(', ')
          const hasPreview = Boolean(track.preview_url)

          return (
            <li key={track.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
              {coverUrl ? (
                <img src={coverUrl} alt={track.album.name} className="h-12 w-12 rounded-lg object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-800 text-xs text-zinc-400">N/A</div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-100">{track.name}</p>
                <p className="truncate text-xs text-zinc-400">{artistNames}</p>
              </div>

              {hasPreview ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleTogglePlay(track.id)}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
                  >
                    {currentPlayingId === track.id ? 'Pause' : 'Play'}
                  </button>
                  <audio
                    ref={(element) => setAudioRef(track.id, element)}
                    src={track.preview_url}
                    onEnded={() => {
                      handleTrackEnded(track.id)
                    }}
                  />
                </>
              ) : (
                <a
                  href={track.external_urls?.spotify || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 transition hover:border-zinc-500"
                >
                  Abrir en Spotify
                </a>
              )}
            </li>
          )
        })}
      </ul>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <button
          type="button"
          disabled={isSaving}
          onClick={onSave}
          className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          {isSaving ? 'Guardando...' : 'Guardar en mi Biblioteca'}
        </button>

        <button
          type="button"
          disabled={isSaving}
          onClick={onReset}
          className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-transparent px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:text-zinc-500"
        >
          Volver a empezar
        </button>
      </div>

      {saveError ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{saveError}</p>
      ) : null}

      {savedPlaylistUrl ? (
        <a
          href={savedPlaylistUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex text-sm font-medium text-emerald-300 underline decoration-emerald-600 underline-offset-4 hover:text-emerald-200"
        >
          Playlist guardada. Abrir en Spotify
        </a>
      ) : null}
    </section>
  )
}

export default GeneratedMixTape
