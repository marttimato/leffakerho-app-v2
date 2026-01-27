const MONTHS = [
  { num: 1, name: 'Tammikuu' }, { num: 2, name: 'Helmikuu' },
  { num: 3, name: 'Maaliskuu' }, { num: 4, name: 'Huhtikuu' },
  { num: 5, name: 'Toukokuu' }, { num: 6, name: 'Kesäkuu' },
  { num: 7, name: 'Heinäkuu' }, { num: 8, name: 'Elokuu' },
  { num: 9, name: 'Syyskuu' }, { num: 10, name: 'Lokakuu' },
  { num: 11, name: 'Marraskuu' }, { num: 12, name: 'Joulukuu' },
]

export default function MovieList({ movies, onDelete }) {
  if (!movies || !movies.length) return <div className="text-center py-10 text-slate-400">Ei elokuvia.</div>

  // Group by year, prioritize watchedAt
  const byYear = movies.reduce((acc, movie) => {
    const date = (movie.watchedAt || movie.watchDate) ? new Date(movie.watchedAt || movie.watchDate) : (movie.created_at ? new Date(movie.created_at) : new Date())
    const y = date.getFullYear()
    acc[y] = acc[y] || []
    acc[y].push({ ...movie, internalDate: date })
    return acc
  }, {})

  const years = Object.keys(byYear)
    .map(Number)
    .filter(y => !isNaN(y))
    .sort((a, b) => b - a) // Latest year first

  const latestId = movies[0]?.id // API already returns newest first

  function formatDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`
  }

  return (
    <div className="space-y-8 pb-10">
      {years.map(year => {
        const byMonth = byYear[year].reduce((acc, m) => {
          const mon = m.internalDate.getMonth() + 1
          acc[mon] = acc[mon] || []
          acc[mon].push(m)
          return acc
        }, {})

        // Sort months descending
        const monthsInYear = Object.keys(byMonth)
          .map(Number)
          .sort((a, b) => b - a)

        return (
          <section key={year} className="relative">
            <div className="sticky top-[4.5rem] z-0 bg-white/90 backdrop-blur-sm py-2 mb-2 border-b border-dashed border-slate-200">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">{year}</h2>
            </div>

            {monthsInYear.map(monNum => {
              const monthData = MONTHS.find(m => m.num === monNum)
              return (
                <div key={monNum} className="mb-6 last:mb-0">
                  <h3 className="text-xs font-semibold text-slate-400 mb-3 pl-1 uppercase tracking-wider">
                    {monthData ? monthData.name : ''}
                  </h3>

                  <div className="space-y-3">
                    {byMonth[monNum].sort((a, b) => b.internalDate - a.internalDate).map(movie => (
                      <article
                        key={movie.id}
                        className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-md transition-all flex justify-between items-start"
                      >
                        <div className="flex-1">
                          <h4
                            className="font-semibold text-slate-800 text-lg leading-tight"
                            title={
                              movie.releaseYear
                                ? `Julkaisuvuosi: ${movie.releaseYear}`
                                : 'Julkaisuvuotta ei löytynyt'
                            }
                          >
                            {movie.title}
                            {movie.releaseYear && (
                              <span className="text-slate-400 font-normal ml-1.5 text-base">
                                ({movie.releaseYear})
                              </span>
                            )}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600">
                              {movie.person}
                            </span>
                            {(movie.watchedAt || movie.watchDate) && (
                              <span className="text-xs text-slate-400">
                                {formatDate(movie.watchedAt || movie.watchDate)}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => onDelete(movie.id)}
                          className={`text-slate-300 hover:text-red-500 transition-colors p-1 -mr-2 -mt-2 group-hover:opacity-100 focus:opacity-100 ${movie.id === latestId ? 'opacity-100 text-slate-400' : 'opacity-0'}`}
                          aria-label="Poista"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                          </svg>
                        </button>
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
