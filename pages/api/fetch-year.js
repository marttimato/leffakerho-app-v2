export default async function handler(req, res) {
  const { title } = req.query
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

    if (data?.results?.length > 0) {
      const movie = data.results[0]
      if (movie.release_date) {
        const year = movie.release_date.split('-')[0]
        return res.status(200).json({
          year,
          source: 'tmdb',
        })
      }
    }

    return res.status(200).json({ year: null, source: 'not_found' })
  } catch (err) {
    return res.status(200).json({
      year: null,
      source: 'exception',
      message: String(err),
    })
  }
}
