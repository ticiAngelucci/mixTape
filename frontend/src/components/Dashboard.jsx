import { useEffect, useState } from 'react'
import { deleteMixTapeRecord, readMixTapeRecords, updateMixTapeRecordName } from '../utils/mixtapeCrud'
import { enqueueTrackUrisSequentially } from '../utils/spotifyActions'

function Dashboard({ accessToken, refreshToken }) {
  const [records, setRecords] = useState([])
  const [actionError, setActionError] = useState('')
  const [activeId, setActiveId] = useState(null)

  useEffect(() => {
    setRecords(readMixTapeRecords())
  }, [refreshToken])

  const handleEditName = (record) => {
    const nextName = window.prompt('Nuevo nombre del mixTape', record.name)
    if (!nextName || !nextName.trim()) {
      return
    }

    const next = updateMixTapeRecordName(record.id, nextName.trim())
    setRecords(next)
  }

  const handleDelete = (record) => {
    const confirmDelete = window.confirm(`Eliminar "${record.name}" del dashboard?`)
    if (!confirmDelete) {
      return
    }

    if (record.type === 'playlist') {
      alert('Esto lo borra del dashboard, pero debes eliminar la playlist manualmente en Spotify.')
    }

    const next = deleteMixTapeRecord(record.id)
    setRecords(next)
  }

  const handleAction = async (record) => {
    setActionError('')
    setActiveId(record.id)

    try {
      if (record.type === 'radio') {
        await enqueueTrackUrisSequentially(accessToken, record.track_uris || [])
        alert('Se agregaron a tu cola de reproduccion.')
      } else if (record.spotify_playlist_id) {
        window.open(`https://open.spotify.com/playlist/${record.spotify_playlist_id}`, '_blank', 'noopener,noreferrer')
      } else {
        throw new Error('Este registro no tiene playlist de Spotify asociada.')
      }
    } catch (error) {
      setActionError(error.message)
    } finally {
      setActiveId(null)
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-emerald-400">Mi Dashboard</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-100">CRUD de mixTapes</h2>
      </div>

      {records.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-400">Todavia no hay mixTapes guardados.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {records.map((record) => (
            <article key={record.id} className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="line-clamp-2 text-sm font-semibold text-zinc-100">{record.name}</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    record.type === 'radio'
                      ? 'border border-amber-500/30 bg-amber-500/15 text-amber-300'
                      : 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                  }`}
                >
                  {record.type === 'radio' ? 'Radio' : 'Playlist guardada'}
                </span>
              </div>

              <p className="text-xs text-zinc-400">{new Date(record.date).toLocaleString()}</p>
              <p className="text-xs text-zinc-300">Artistas: {(record.artists || []).join(', ') || 'Sin artistas'}</p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleAction(record)}
                  disabled={activeId === record.id}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-100 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:text-zinc-500"
                >
                  {record.type === 'radio' ? 'Reproducir' : 'Abrir playlist'}
                </button>
                <button
                  type="button"
                  onClick={() => handleEditName(record)}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-100 transition hover:border-zinc-500"
                >
                  Editar nombre
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(record)}
                  className="col-span-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {actionError ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{actionError}</p> : null}
    </section>
  )
}

export default Dashboard
