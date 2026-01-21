export default async function handler(req, res) {
  const { title } = req.query
  const apiKey = process.env.TMDB_API_KEY

  if (!title || !apiKey) {
    return res.status(200).json({ results: [] })
  }

  try {
    const url =
      `https://api.themoviedb.org/3/search/movie` +
      `?api_key=${apiKey}` +
      `&query=${encodeURIComponent(title)}` +
      `&language=fi-FI`

    const response = await fetch(url)
    if (!response.ok) {
      return res.status(200).json({ results: [] })
    }

    const data = await response.json()

    const results = (data.results || [])
      .filter(r => r.release_date)
      .map(r => ({
        id: r.id,
        title: r.title,
        releaseYear: r.release_date.split('-')[0],
        overview: r.overview,
      }))

    return res.status(200).json({ results })
  } catch {
    return res.status(200).json({ results: [] })
  }
}
