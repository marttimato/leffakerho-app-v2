export default function MovieList({ movies, onDelete }) {
  if (!movies.length) return <div>Ei elokuvia.</div>

  return (
    <div className="space-y-2">
      {movies.map(movie => (
        <div
          key={movie.id}
          className="bg-white p-3 rounded shadow flex justify-between"
        >
          <div>
            <div className="font-medium">
              {movie.title}
              {movie.releaseYear && ` (${movie.releaseYear})`}
            </div>
            <div className="text-sm text-gray-600">{movie.person}</div>
          </div>

          <button
            onClick={() => onDelete(movie.id)}
            className="text-red-600 text-sm"
          >
            Poista
          </button>
        </div>
      ))}
    </div>
  )
}
