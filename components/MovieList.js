const MONTHS = [
  { num: 1, name: 'Tammikuu' },
  { num: 2, name: 'Helmikuu' },
  { num: 3, name: 'Maaliskuu' },
  { num: 4, name: 'Huhtikuu' },
  { num: 5, name: 'Toukokuu' },
  { num: 6, name: 'Kesäkuu' },
  { num: 7, name: 'Heinäkuu' },
  { num: 8, name: 'Elokuu' },
  { num: 9, name: 'Syyskuu' },
  { num: 10, name: 'Lokakuu' },
  { num: 11, name: 'Marraskuu' },
  { num: 12, name: 'Joulukuu' },
]

export default function MovieList({ movies, onDelete }) {
  if (!movies.length) return <div>Ei elokuvia.</div>

  // Selvitetään uusin elokuva (vain tälle näytetään Poista)
  const latestId = movies.reduce(
    (latest, m) =>
      !latest || new Date(m.createdAt) > new Date(latest.createdAt)
        ? m
        : latest,
    null
  )?.id

  // Ryhmitellään elokuvat vuosittain
  const byYear = movies.reduce((acc, movie) => {
    acc[movie.year] = acc[movie.year] || []
    acc[movie.year].push(movie)
    return acc
  }, {})

  // Vuodet nousevassa järjestyksessä
  const years = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => a - b)

  return (
    <div className="space-y-10">
      {years.map(year => {
        const moviesOfYear = byYear[year]

        // Ryhmitellään kuukaudet vuoden sisällä
        const byMonth = moviesOfYear.reduce((acc, movie) => {
          acc[movie.month] = acc[movie.month] || []
          acc[movie.month].push(movie)
          return acc
        }, {})

        return (
          <section key={year}>
            {/* Vuosiotsikko */}
            <h2 className="text-2xl font-semibold mb-4">{year}</h2>

            {MONTHS.map(({ num, name }) => {
              const list = byMonth[num]
              if (!list) return null

              return (
                <div key={num} className="mb-6">
                  {/* Kuukausiotsikko */}
                  <h3 className="text-lg font-medium mb-2">{name}</h3>

                  <div className="space-y-2">
                    {list.map(movie => (
                      <article
                        key={movie.id}
                        className="bg-white p-3 rounded shadow flex justify-between items-start"
                      >
                        <div>
                          <h4 className="font-medium">{movie.title}</h4>

                          <div className="text-sm text-gray-600">
                            Vuoro: {movie.person}
                          </div>

                          {/* Katselupäivä vain UI:sta lisätyille */}
                          {movie.source === 'ui' && movie.watchDate && (
                            <div className="text-xs text-gray-400 mt-1">
                              Katsottu {movie.watchDate}
                            </div>
                          )}
                        </div>

                        {/* Poista vain uusimmalle elokuvalle */}
                        {movie.id === latestId && (
                          <button
                            onClick={() => onDelete(movie.id)}
                            className="text-red-600 text-sm"
                          >
                            Poista
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
