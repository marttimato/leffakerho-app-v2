import { useState } from 'react'

const MONTHS = [
  { num: 1, name: 'Tammikuu' }, { num: 2, name: 'Helmikuu' },
  { num: 3, name: 'Maaliskuu' }, { num: 4, name: 'Huhtikuu' },
  { num: 5, name: 'Toukokuu' }, { num: 6, name: 'Kesäkuu' },
  { num: 7, name: 'Heinäkuu' }, { num: 8, name: 'Elokuu' },
  { num: 9, name: 'Syyskuu' }, { num: 10, name: 'Lokakuu' },
  { num: 11, name: 'Marraskuu' }, { num: 12, name: 'Joulukuu' },
]

export default function MovieList({ movies, onDelete, onSelect, onEdit, isFiltered, people }) {
  const [collapsedYears, setCollapsedYears] = useState({})
  const [activeMovieId, setActiveMovieId] = useState(null)

  if (!movies || !movies.length) {
    return (
      <div className="text-center py-20 px-6">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-700">
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

  const currentYear = new Date().getFullYear()

  function toggleYear(year) {
    setCollapsedYears(prev => {
      const isCurrentlyCollapsed = prev[year] ?? (year !== currentYear)
      return { ...prev, [year]: !isCurrentlyCollapsed }
    })
  }

  function handleCardClick(movie) {
    const isHoverDevice = window.matchMedia('(hover: hover)').matches
    if (isHoverDevice || activeMovieId === movie.id) {
      setActiveMovieId(null)
      onSelect(movie)
    } else {
      setActiveMovieId(movie.id)
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return ''
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
    <div className="space-y-6 pb-20">
      {years.map(year => {
        const isCollapsed = isFiltered ? false : (collapsedYears[year] ?? (year !== currentYear))
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
          <section key={year} className="space-y-4">
            <button
              onClick={() => toggleYear(year)}
              className="w-full flex items-center gap-4 py-2 hover:opacity-80 transition-opacity group text-left"
            >
              <h2 className="text-xl font-black text-white/90 tracking-tighter">{year}</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {byYear[year].length} leffaa
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`w-5 h-5 text-slate-600 transition-transform duration-300 ${isCollapsed ? '-rotate-90' : ''}`}
                >
                  <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </div>
            </button>

            {!isCollapsed && (
              <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                {monthsInYear.map(monNum => {
                  const monthData = MONTHS.find(m => m.num === monNum)
                  return (
                    <div key={monNum} className="space-y-3">
                      <h3 className="text-[10px] font-black text-slate-500 mb-2 pl-1 uppercase tracking-[0.3em]">
                        {monthData ? monthData.name : ''}
                      </h3>

                      <div className="grid gap-3">
                        {byMonth[monNum].sort((a, b) => b.internalDate - a.internalDate).map(movie => {
                          const isActive = activeMovieId === movie.id
                          return (
                            <article
                              key={movie.id}
                              onClick={() => handleCardClick(movie)}
                              className={`
                                glass-card p-4 rounded-2xl flex items-center gap-4 cursor-pointer transition-all border-white/5 h-20 group
                                ${isActive ? 'bg-white/[0.08] border-white/20' : 'hover:bg-white/[0.04] hover:border-white/10 active:scale-[0.99]'}
                              `}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5 min-w-0">
                                  <h4 className="font-bold text-slate-100 text-sm truncate shrink">
                                    {movie.title}
                                  </h4>
                                  {movie.releaseYear > 0 && (
                                    <span className="text-slate-500 text-[10px] font-medium shrink-0">
                                      {movie.releaseYear}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`
                                    px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border
                                    ${movie.person === 'Tomi' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                      movie.person === 'Mikkis' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                        movie.person === 'Aino' ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' :
                                          'bg-amber-500/10 text-amber-400 border-amber-500/20'}
                                  `}>
                                    {movie.person}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                <div className={`transition-all duration-300 ${isActive ? 'opacity-0 scale-90 h-0 overflow-hidden' : 'opacity-100 scale-100'}`}>
                                  <div className="text-[10px] font-medium text-slate-500 tabular-nums">
                                    {formatDate(movie.watchedAt || movie.watchDate)}
                                  </div>
                                </div>

                                <div className={`
                                  flex items-center gap-1 transition-all duration-300 shrink-0
                                  ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none md:pointer-events-auto md:group-hover:opacity-100 md:group-hover:translate-x-0'}
                                `}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(movie); }}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all active:bg-white/10"
                                    aria-label="Muokkaa"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(movie.id); }}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all active:bg-red-400/20"
                                    aria-label="Poista"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 9m-4.74 0-.34-9m9.26-3.85c.73 0 1.36.59 1.45 1.32l.28 2.22m-13.14 0 .28-2.22c.09-.73.72-1.32 1.45-1.32m13.14 0a45.65 45.65 0 0 0-11 0m11 0V19c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V7.41m21 0a45.65 45.65 0 0 0-11 0" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
