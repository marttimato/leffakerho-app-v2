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
    const data = await response.json()

    // Fetch alternative titles for each result
    const resultsWithTitles = await Promise.all(
      (data.results || [])
        .filter(r => r.release_date)
        .map(async (r) => {
          // Fetch translations to get alternative titles
          const translationsUrl = `https://api.themoviedb.org/3/movie/${r.id}/translations?api_key=${apiKey}`
          const translationsResponse = await fetch(translationsUrl)
          const translationsData = await translationsResponse.json()

          // Extract titles from translations
          const titles = []
          const seenTitles = new Set()

          // Add original title
          if (r.original_title && !seenTitles.has(r.original_title.toLowerCase())) {
            titles.push({
              title: r.original_title,
              language: r.original_language,
              type: 'original'
            })
            seenTitles.add(r.original_title.toLowerCase())
          }

          // Add titles from translations (prioritize Finnish and English)
          const translations = translationsData.translations || []
          const priorityLanguages = ['fi', 'en']

          priorityLanguages.forEach(lang => {
            const translation = translations.find(t => t.iso_639_1 === lang)
            if (translation?.data?.title && !seenTitles.has(translation.data.title.toLowerCase())) {
              titles.push({
                title: translation.data.title,
                language: lang,
                type: lang === 'fi' ? 'finnish' : 'english'
              })
              seenTitles.add(translation.data.title.toLowerCase())
            }
          })

          // If we only have one title, add the current Finnish search result title if different
          if (r.title && !seenTitles.has(r.title.toLowerCase())) {
            titles.push({
              title: r.title,
              language: 'fi',
              type: 'finnish'
            })
          }

          return {
            id: r.id,
            titles: titles.length > 0 ? titles : [{ title: r.title, language: 'fi', type: 'finnish' }],
            releaseYear: Number(r.release_date.split('-')[0]),
            overview: r.overview,
          }
        })
    )

    return res.status(200).json({ results: resultsWithTitles })
  } catch (e) {
    console.error(e)
    return res.status(200).json({ results: [] })
  }
}
