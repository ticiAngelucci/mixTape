function SuccessCard({ playlistUrl, playlistName }) {
  if (!playlistUrl) {
    return null
  }

  return (
    <aside className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
      <h3 className="text-sm font-semibold text-emerald-300">Playlist creada con éxito</h3>
      <p className="mt-1 text-sm text-zinc-200">{playlistName}</p>
      <a
        href={playlistUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex text-sm font-medium text-emerald-300 underline decoration-emerald-600 underline-offset-4 hover:text-emerald-200"
      >
        Abrir en Spotify
      </a>
    </aside>
  )
}

export default SuccessCard
