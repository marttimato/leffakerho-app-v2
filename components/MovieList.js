const MONTHS = [
  { num: 1, name: 'Tammikuu' }, { num: 2, name: 'Helmikuu' },
  { num: 3, name: 'Maaliskuu' }, { num: 4, name: 'Huhtikuu' },
  { num: 5, name: 'Toukokuu' }, { num: 6, name: 'Kesäkuu' },
  { num: 7, name: 'Heinäkuu' }, { num: 8, name: 'Elokuu' },
  { num: 9, name: 'Syyskuu' }, { num: 10, name: 'Lokakuu' },
  { num: 11, name: 'Marraskuu' }, { num: 12, name: 'Joulukuu' },
]

export default function MovieList({ movies, onDelete, onSelect, onEdit, isFiltered }) {
  if (!movies || !movies.length) {
    return (
      <div className="text-center py-20 px-6">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <div className="text-slate-400 font-bold mb-1">
          {isFiltered ? 'Ei hakuun sopivia elokuvia.' : 'Ei katsottuja elokuvia vielä.'}
        </div>
        <p className="text-slate-600 text-xs">
          {isFiltered ? 'Kokeile eri hakusanaa.' : 'Lisää ensimmäinen elokuva yläpuolelta!'}
        </p>
      </div>
    )
  }

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
    // Handle YYYY-MM-DD ISO strings directly to avoid TZ shifts
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const parts = dateStr.split('T')[0].split('-')
      if (parts.length === 3) {
        return `${parseInt(parts[2])}.${parseInt(parts[1])}.${parts[0]}`
      }
    }
    const d = new Date(dateStr)
    return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`
  }

  return (
    <div className="space-y-12 pb-20">
      {years.map(year => {
        const byMonth = byYear[year].reduce((acc, m) => {
          const mon = m.internalDate.getMonth() + 1
          acc[mon] = acc[mon] || []
          acc[mon].push(m)
          return acc
        }, {})

        const monthsInYear = Object.keys(byMonth)
          .map(Number)
          .sort((a, b) => b - a)

        return (
          <section key={year} className="relative">
            <div className="sticky top-[4.5rem] z-20 bg-slate-950/80 backdrop-blur-md py-4 mb-6 border-b border-white/5 flex items-center justify-between gap-4 pr-5">
              <h2 className="text-xl font-black text-white/90 tracking-tighter">{year}</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
              <span className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-[11px] font-black text-slate-500 tabular-nums">
                {byYear[year].length}
              </span>
            </div>

            {monthsInYear.map(monNum => {
              const monthData = MONTHS.find(m => m.num === monNum)
              return (
                <div key={monNum} className="mb-8 last:mb-0">
                  <h3 className="text-[10px] font-black text-blue-400/60 mb-4 pl-1 uppercase tracking-[0.3em]">
                    {monthData ? monthData.name : ''}
                  </h3>

                  <div className="space-y-4">
                    {byMonth[monNum].sort((a, b) => b.internalDate - a.internalDate).map(movie => (
                      <article
                        key={movie.id}
                        onClick={() => onSelect(movie)}
                        className="group glass-card p-5 rounded-[2rem] flex justify-between items-center cursor-pointer active:scale-[0.98] transition-all hover:bg-white/[0.03] hover:border-white/10"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-100 text-lg leading-tight truncate">
                            {movie.title}
                            {movie.releaseYear && (
                              <span className="text-slate-500 font-medium ml-2 text-sm">
                                {movie.releaseYear}
                              </span>
                            )}
                          </h4>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              {movie.person}
                            </span>
                            {(movie.watchedAt || movie.watchDate) && (
                              <span className="text-[11px] font-medium text-slate-500 tracking-wide">
                                {formatDate(movie.watchedAt || movie.watchDate)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pl-4">
                          <button
                            onClick={(e) => { e.stopPropagation(); onEdit(movie); }}
                            className="p-2 rounded-full text-slate-600 hover:text-blue-400 hover:bg-blue-400/10 transition-all opacity-0 group-hover:opacity-100"
                            aria-label="Muokkaa"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDelete(movie.id); }}
                            className="p-2 rounded-full text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
                            aria-label="Poista"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                            </svg>
                          </button>

                        </div>
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
