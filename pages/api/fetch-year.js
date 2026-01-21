export default async function handler(req, res) {
  const { title, watchedYear } = req.query
  const apiKey = process.env.TMDB_API_KEY

  if (!title || !apiKey) {
    return res.status(200).json({ year: null, source: 'missing' })
  }

  try {
    const url =
      `https://api.themoviedb.org/3/search/movie` +
      `?api_key=${apiKey}` +
      `&query=${encodeURIComponent(title)}` +
      `&language=fi-FI`

    const response = await fetch(url)
    if (!response.ok) {
      return res.status(200).json({ year: null, source: 'fetch_failed' })
    }

    const data = await response.json()
    if (!Array.isArray(data.results)) {
      return res.status(200).json({ year: null, source: 'no_results' })
    }

    const targetYear = watchedYear ? Number(watchedYear) : null

    // Filtteröi kelvolliset elokuvat
    const candidates = data.results
      .filter(r => r.release_date && r.title)
      .map(r => ({
        title: r.title,
        year: Number(r.release_date.split('-')[0]),
      }))
      .filter(r => !isNaN(r.year))

    if (candidates.length === 0) {
      return res.status(200).json({ year: null, source: 'no_valid_release' })
    }

    let chosen

    if (targetYear) {
      // Valitse lähinnä katseluvuotta oleva (<= watchedYear)
      const past = candidates.filter(c => c.year <= targetYear)
      chosen = past.length
        ? past.sort((a, b) => b.year - a.year)[0]
        : candidates.sort((a, b) => b.year - a.year)[0]
    } else {
      // fallback: uusin
      chosen = candidates.sort((a, b) => b.year - a.year)[0]
    }

    return res.status(200).json({
      year: String(chosen.year),
      source: 'tmdb',
    })
  } catch (err) {
    return res.status(200).json({
      year: null,
      source: 'exception',
      message: String(err),
    })
  }
}
