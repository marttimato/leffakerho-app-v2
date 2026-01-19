export default async function handler(req, res) {
  const { title } = req.query
  if (!title) return res.status(400).json({ error: 'title required' })

  const key = process.env.OMDB_API_KEY
  if (!key) {
    // Jos avainta ei ole asetettu, palauta 204 (ei sisältö) — client yrittää silti lisätä elokuvan ilman vuotta
    return res.status(204).json({})
  }

  try {
    const url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${key}`
    const r = await fetch(url)
    if (!r.ok) return res.status(502).json({})
    const data = await r.json()
    if (data && (data.Year || data.Year === '')) {
      // OMDb Year voi olla muodossa "1999" tai "1999–2003"; ota vain ensimmäinen nelinumero
      const m = (data.Year || '').match(/\d{4}/)
      if (m) return res.status(200).json({ year: m[0] })
    }
    return res.status(200).json({})
  } catch (e) {
    console.error(e)
    return res.status(500).json({})
  }
}
