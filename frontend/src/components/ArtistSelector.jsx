function ArtistSelector({ results, selectedIds, onSelect }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <h2 className="text-sm font-semibold text-zinc-200">Resultados</h2>

      {results.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-400">No hay resultados para mostrar.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((artist) => {
            const isSelected = selectedIds.has(artist.id)

            return (
              <button
                key={artist.id}
                type="button"
                onClick={() => onSelect(artist)}
                className={`group rounded-xl border p-3 text-left transition ${
                  isSelected
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : 'border-zinc-700 bg-zinc-950 hover:border-zinc-500'
                }`}
              >
                <img
                  src={artist.image}
                  alt={artist.name}
                  className="mx-auto h-16 w-16 rounded-full object-cover ring-1 ring-zinc-700"
                />
                <p className="mt-3 truncate text-center text-sm font-medium text-zinc-100">{artist.name}</p>
                <p className="mt-1 text-center text-xs text-zinc-400">{isSelected ? 'Seleccionado' : 'Agregar'}</p>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default ArtistSelector
