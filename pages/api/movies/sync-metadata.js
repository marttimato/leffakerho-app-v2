import pool from '../../../lib/db'

export default async function handler(req, res) {
    const apiKey = process.env.TMDB_API_KEY
    if (!apiKey) {
        return res.status(500).json({ error: 'TMDB API key missing' })
    }

    try {
        // 1. Get movies missing original_title but having tmdb_id
        const { rows: movies } = await pool.query(
            "SELECT id, tmdb_id, title FROM movies WHERE tmdb_id IS NOT NULL AND (original_title IS NULL OR original_title = '')"
        )

        const results = {
            total: movies.length,
            success: 0,
            error: 0,
            details: []
        }

        if (movies.length === 0) {
            return res.status(200).json({ ...results, message: 'Kaikilla elokuvilla on jo nimitiedot.' })
        }

        // 2. Fetch metadata from TMDB in chunks
        const chunkSize = 5
        for (let i = 0; i < movies.length; i += chunkSize) {
            const chunk = movies.slice(i, i + chunkSize)
            await Promise.all(chunk.map(async (movie) => {
                try {
                    // Fetch translations for original and alternative titles
                    const translationsUrl = `https://api.themoviedb.org/3/movie/${movie.tmdb_id}/translations?api_key=${apiKey}`
                    const translationsRes = await fetch(translationsUrl)
                    const translationsData = await translationsRes.json()

                    // Also fetch movie details for the original title (just in case)
                    const detailsUrl = `https://api.themoviedb.org/3/movie/${movie.tmdb_id}?api_key=${apiKey}`
                    const detailsRes = await fetch(detailsUrl)
                    const detailsData = await detailsRes.json()

                    const originalTitle = detailsData.original_title || ''
                    const titles = []
                    const seenTitles = new Set()

                    if (originalTitle) seenTitles.add(originalTitle.toLowerCase())

                    // Extract titles from translations
                    const translations = translationsData.translations || []
                    const priorityLanguages = ['fi', 'en']

                    priorityLanguages.forEach(lang => {
                        const translation = translations.find(t => t.iso_639_1 === lang)
                        if (translation?.data?.title && !seenTitles.has(translation.data.title.toLowerCase())) {
                            titles.push(translation.data.title)
                            seenTitles.add(translation.data.title.toLowerCase())
                        }
                    })

                    // Add the current title if it's not already in the set
                    if (movie.title && !seenTitles.has(movie.title.toLowerCase())) {
                        titles.push(movie.title)
                    }

                    // 3. Update DB
                    await pool.query(
                        "UPDATE movies SET original_title = $1, alternative_titles = $2 WHERE id = $3",
                        [originalTitle, titles, movie.id]
                    )

                    results.success++
                } catch (e) {
                    console.error(`Metadata sync failed for movie ${movie.title}:`, e)
                    results.error++
                    results.details.push({ title: movie.title, error: e.message })
                }
            }))
        }

        return res.status(200).json(results)
    } catch (e) {
        console.error('Metadata sync handler error:', e)
        return res.status(500).json({ error: 'Metadata synchronization failed' })
    }
}
