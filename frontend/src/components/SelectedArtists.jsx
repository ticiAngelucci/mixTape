function SelectedArtists({ artists, onRemove }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-200">Artistas Seleccionados</h2>
        <span className="text-xs text-zinc-400">{artists.length} seleccionados</span>
      </div>

      {artists.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-400">Todavía no seleccionaste artistas.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {artists.map((artist) => (
            <li key={artist.id}>
              <button
                type="button"
                onClick={() => onRemove(artist.id)}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-500"
                title="Quitar artista"
              >
                <img src={artist.image} alt={artist.name} className="h-5 w-5 rounded-full object-cover" />
                {artist.name}
                <span className="text-zinc-500">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default SelectedArtists
