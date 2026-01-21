export default async function handler(req, res) {
  const { title } = req.query

  // Turvatarkistus
  if (!title) {
    return res.status(400).json({})
  }

  const apiKey = process.env.OMDB_API_KEY

  // Jos avainta ei ole määritelty, ei tehdä pyyntöä
  if (!apiKey) {
    return res.status(200).json({})
  }

  try {
    // OMDb-haku elokuvan nimellä (t=)
    const url = `http://www.omdbapi.com/?t=${encodeURIComponent(
      title
    )}&apikey=${apiKey}`

    const response = await fetch(url)
    if (!response.ok) {
      return res.status(200).json({})
    }

    const data = await response.json()

    // OMDb palauttaa Year esim. "1997" tai "2001–2003"
    if (data && data.Year) {
      const match = data.Year.match(/\d{4}/)
      if (match) {
        return res.status(200).json({ year: match[0] })
      }
    }

    return res.status(200).json({})
  } catch (err) {
    return res.status(500).json({})
  }
}
