function SearchBar({ value, onChange, isLoading }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <label htmlFor="artist-search" className="mb-2 block text-sm font-medium text-zinc-300">
        Buscar artistas
      </label>
      <div className="relative">
        <input
          id="artist-search"
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Ej: Daft Punk, Rosalía, Arctic Monkeys..."
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 pr-24 text-base text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none"
        />
        {isLoading ? (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400">Buscando...</span>
        ) : null}
      </div>
    </div>
  )
}

export default SearchBar
