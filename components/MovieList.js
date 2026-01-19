export default function MovieList({ movies = [], onDelete }) {
  if (!movies.length) return <div className="text-gray-600">Ei elokuvia.</div>
  return (
    <div className="space-y-3">
      {movies.map(m => (
        <article key={m.id} className="bg-white p-3 rounded shadow flex justify-between items-start">
          <div>
            <h3 className="font-semibold">{m.title} {m.year ? <span className="text-sm text-gray-500">({m.year})</span> : null}</h3>
            <div className="text-sm text-gray-600">{m.watchDate || 'Katselupäivää ei määritelty'}</div>
            <div className="text-xs text-gray-500 mt-1">Vuoro: {m.person || '—'}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button onClick={() => onDelete?.(m.id)} className="text-red-600 text-sm">Poista</button>
            <div className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleString()}</div>
          </div>
        </article>
      ))}
    </div>
  )
}
