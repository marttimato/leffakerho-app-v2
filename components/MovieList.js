const MONTH_NAMES = [
  '', 'Tammikuu', 'Helmikuu', 'Maaliskuu', 'Huhtikuu',
  'Toukokuu', 'Kesäkuu', 'Heinäkuu', 'Elokuu',
  'Syyskuu', 'Lokakuu', 'Marraskuu', 'Joulukuu'
]

export default function MovieList({ movies, onDelete }) {
  if (!movies.length) return <div>Ei elokuvia.</div>

  // Ryhmitellään vuodet
  const grouped = movies.reduce((acc, movie) => {
    acc[movie.year] = acc[movie.year] || []
    acc[movie.year].push(movie)
    return acc
  }, {})

  const years = Object.keys(grouped).sort((a, b) => b - a)

  return (
    <div className="space-y-8">
      {years.map(year => (
        <section key={year}>
          <h2 className="text-xl font-semibold mb-3">{year}</h2>

          {grouped[year]
            .sort((a, b) => a.month - b.month)
            .map(movie => (
              <article
                key={movie.id}
                className="bg-white p-3 rounded shadow mb-2 flex justify-between"
              >
                <div>
                  <h3 className="font-medium">{movie.title}</h3>
                  <div className="text-sm text-gray-600">
                    {MONTH_NAMES[movie.month]}
                  </div>
                  <div className="text-xs text-gray-500">
                    Vuoro: {movie.person}
                  </div>

                  {movie.source === 'ui' && movie.watchDate && (
                    <div className="text-xs text-gray-400 mt-1">
                      Katsottu {movie.watchDate}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onDelete(movie.id)}
                  className="text-red-600 text-sm"
                >
                  Poista
                </button>
              </article>
            ))}
        </section>
      ))}
    </div>
  )
}
