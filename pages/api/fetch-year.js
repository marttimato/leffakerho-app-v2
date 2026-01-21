export default async function handler(req, res) {
  const { title } = req.query
  const apiKey = process.env.OMDB_API_KEY

  if (!title || !apiKey) {
    return res.status(200).json({})
  }

  try {
    const url = `http://www.omdbapi.com/?t=${encodeURIComponent(
      title
    )}&apikey=${apiKey}`

    const response = await fetch(url)
    if (!response.ok) {
      return res.status(200).json({})
    }

    const data = await response.json()

    if (data && data.Year) {
      const match = data.Year.match(/\d{4}/)
      if (match) {
        return res.status(200).json({ year: match[0] })
      }
    }

    return res.status(200).json({})
  } catch {
    return res.status(500).json({})
  }
}
