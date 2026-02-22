function LoginCard({ onConnect, isLoading, errorMessage }) {
  return (
    <section className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-2xl backdrop-blur">
      <h1 className="text-4xl font-black tracking-tight text-white">mixTape <span aria-hidden="true">📼</span></h1>
      <p className="mt-4 text-sm leading-relaxed text-zinc-300">
        Conectá tu cuenta de Spotify, elegí artistas y armá una playlist automática con sus mejores temas.
      </p>
      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{errorMessage}</p>
      ) : null}
      <button
        type="button"
        disabled={isLoading}
        onClick={onConnect}
        className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
      >
        {isLoading ? 'Conectando...' : 'Conectar con Spotify'}
      </button>
    </section>
  )
}

export default LoginCard
