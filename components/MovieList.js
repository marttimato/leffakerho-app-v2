const MONTHS = [
  { num: 1, name: 'Tammikuu' }, { num: 2, name: 'Helmikuu' },
  { num: 3, name: 'Maaliskuu' }, { num: 4, name: 'Huhtikuu' },
  { num: 5, name: 'Toukokuu' }, { num: 6, name: 'Kesäkuu' },
  { num: 7, name: 'Heinäkuu' }, { num: 8, name: 'Elokuu' },
  { num: 9, name: 'Syyskuu' }, { num: 10, name: 'Lokakuu' },
  { num: 11, name: 'Marraskuu' }, { num: 12, name: 'Joulukuu' },
]

export default function MovieList({ movies, onDelete }) {
  if (!movies.length) return <div>Ei elokuvia.</div>

  const byYear = movies.reduce((acc, movie) => {
    acc[movie.year] = acc[movie.year] || []
    acc[movie.year].push(movie)
    return acc
  }, {})

  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b)

  const lastYear = years[years.length - 1]
  const byMonthLastYear = byYear[lastYear].reduce((acc, m) => {
    acc[m.month] = acc[m.month] || []
    acc[m.month].push(m)
    return acc
  }, {})

  const lastMonth = Math.max(...Object.keys(byMonthLastYear))
  const latestId = byMonthLastYear[lastMonth].slice(-1)[0]?.id

  return (
    <div className="space-y-10">
      {years.map(year => {
        const byMonth = byYear[year].reduce((acc, m) => {
          acc[m.month] = acc[m.month] || []
          acc[m.month].push(m)
          return acc
        }, {})

        return (
          <section key={year}>
            <h2 className="text-2xl font-semibold mb-4">{year}</h2>

            {MONTHS.map(({ num, name }) =>
              byMonth[num] ? (
                <div key={num} className="mb-6">
                  <h3 className="text-lg font-medium mb-2">{name}</h3>

                  {byMonth[num].map(movie => (
                    <article
                      key={movie.id}
                      className="bg-white p-3 rounded shadow flex justify-between"
                    >
                      <div>
                        <h4
                          className="font-medium"
                          title={
                            movie.releaseYear
                              ? `Julkaisuvuosi: ${movie.releaseYear} (${movie.releaseYearSource})`
                              : 'Julkaisuvuotta ei löytynyt OMDb:stä'
                          }
                        >
                          {movie.title}
                          {movie.releaseYear && (
                            <span className="text-gray-500 font-normal">
                              {' '}({movie.releaseYear})
                            </span>
                          )}
                        </h4>
                        <div className="text-sm text-gray-600">{movie.person}</div>
                      </div>

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
              ) : null
            )}
          </section>
        )
      })}
    </div>
  )
}
