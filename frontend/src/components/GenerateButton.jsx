function GenerateButton({ disabled, isLoading, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      onClick={onClick}
      className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
          Creando playlist...
        </span>
      ) : (
        'Generar mixTape'
      )}
    </button>
  )
}

export default GenerateButton
