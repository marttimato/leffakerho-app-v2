import pool from '../../../lib/db'

export default async function handler(req, res) {
    const apiKey = process.env.TMDB_API_KEY
    if (!apiKey) {
        return res.status(500).json({ error: 'TMDB API key missing' })
    }

    const { memberId, limit = 3, explore_fraction = 0.33, excludeIds: excludeIdsQuery } = req.query
    const excludeIds = new Set(excludeIdsQuery ? excludeIdsQuery.split(',').map(id => parseInt(id)) : [])

    try {
        // 1. Get ALL watched movies by the club to exclude from results
        const allWatchedResult = await pool.query(
            "SELECT tmdb_id FROM movies WHERE tmdb_id IS NOT NULL"
        )
        const allWatchedIds = new Set(allWatchedResult.rows.map(r => parseInt(r.tmdb_id)))

        // 2. Build member profile
        let profile = {
            genres: {},
            directors: {},
            languages: {},
            countries: {},
            decades: {},
            ratings: {}
        }

        if (memberId) {
            const memberMovies = await pool.query(
                "SELECT tmdb_id, release_year, metadata FROM movies WHERE person = $1 AND tmdb_id IS NOT NULL ORDER BY watched_at DESC LIMIT 20",
                [memberId]
            )

            if (memberMovies.rows.length > 0) {
                for (const row of memberMovies.rows) {
                    let meta = row.metadata
                    
                    // If no metadata in DB, fetch from TMDB (and ideally we would save it, but let's keep it simple for now)
                    if (!meta) {
                        try {
                            const detailsUrl = `https://api.themoviedb.org/3/movie/${row.tmdb_id}?api_key=${apiKey}&append_to_response=credits,release_dates&language=fi-FI`
                            const detRes = await fetch(detailsUrl)
                            const detData = await detRes.json()
                            
                            const director = detData.credits?.crew?.find(c => c.job === 'Director')?.name
                            const certification = detData.release_dates?.results?.find(r => r.iso_3166_1 === 'FI')?.release_dates?.[0]?.certification 
                                || detData.release_dates?.results?.find(r => r.iso_3166_1 === 'US')?.release_dates?.[0]?.certification

                            meta = {
                                genres: detData.genres?.map(g => g.id) || [],
                                director: director,
                                language: detData.original_language,
                                countries: detData.production_countries?.map(c => c.iso_3166_1) || [],
                                certification: certification
                            }

                            // Optional: Update DB with fetched metadata to speed up next time
                            await pool.query("UPDATE movies SET metadata = $1 WHERE tmdb_id = $2", [meta, row.tmdb_id])
                        } catch (e) {
                            console.error(`Failed to fetch metadata for ${row.tmdb_id}`, e)
                            continue
                        }
                    }

                    // Aggregate
                    meta.genres?.forEach(gid => profile.genres[gid] = (profile.genres[gid] || 0) + 1)
                    if (meta.director) profile.directors[meta.director] = (profile.directors[meta.director] || 0) + 1
                    if (meta.language) profile.languages[meta.language] = (profile.languages[meta.language] || 0) + 1
                    meta.countries?.forEach(c => profile.countries[c] = (profile.countries[c] || 0) + 1)
                    if (row.release_year) {
                        const decade = Math.floor(row.release_year / 10) * 10
                        profile.decades[decade] = (profile.decades[decade] || 0) + 1
                    }
                    if (meta.certification) profile.ratings[meta.certification] = (profile.ratings[meta.certification] || 0) + 1
                }
            }
        }

        const hasHistory = Object.keys(profile.genres).length > 0

        // 3. Candidate Selection
        let candidates = []
        const candidateIds = new Set()

        // Source A: Recommendations based on member's last 3 movies
        if (memberId) {
            const recentMemberMovies = await pool.query(
                "SELECT tmdb_id FROM movies WHERE person = $1 AND tmdb_id IS NOT NULL ORDER BY watched_at DESC LIMIT 3",
                [memberId]
            )

            await Promise.all(recentMemberMovies.rows.map(async (row) => {
                try {
                    const recUrl = `https://api.themoviedb.org/3/movie/${row.tmdb_id}/recommendations?api_key=${apiKey}&language=fi-FI&page=1`
                    const response = await fetch(recUrl)
                    const data = await response.json()
                    if (data.results) {
                        data.results.forEach(m => {
                            if (!allWatchedIds.has(m.id) && !excludeIds.has(m.id) && !candidateIds.has(m.id)) {
                                candidates.push(m)
                                candidateIds.add(m.id)
                            }
                        })
                    }
                } catch (e) { }
            }))
        }

        // Source B: Discovery based on top genres
        const topGenres = Object.entries(profile.genres).sort((a,b) => b[1]-a[1]).slice(0, 3).map(e => e[0])
        if (topGenres.length > 0) {
            const genreQuery = topGenres.join(',')
            try {
                const discUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=fi-FI&with_genres=${genreQuery}&sort_by=popularity.desc&page=1`
                const response = await fetch(discUrl)
                const data = await response.json()
                if (data.results) {
                    data.results.forEach(m => {
                        if (!allWatchedIds.has(m.id) && !excludeIds.has(m.id) && !candidateIds.has(m.id)) {
                            candidates.push(m)
                            candidateIds.add(m.id)
                        }
                    })
                }
            } catch (e) { }
        }

        // Source C: Trending / Exploratory
        try {
            const trendUrl = `https://api.themoviedb.org/3/trending/movie/week?api_key=${apiKey}&language=fi-FI`
            const response = await fetch(trendUrl)
            const data = await response.json()
            if (data.results) {
                data.results.forEach(m => {
                    if (!allWatchedIds.has(m.id) && !excludeIds.has(m.id) && !candidateIds.has(m.id)) {
                        candidates.push(m)
                        candidateIds.add(m.id)
                    }
                })
            }
        } catch (e) { }

        // 4. Scoring
        const scoredCandidates = candidates.map(m => {
            let score = 0
            if (hasHistory) {
                // Genre match (+2 per shared genre)
                m.genre_ids?.forEach(gid => {
                    if (profile.genres[gid]) score += 2
                })
                // Language match (+1)
                if (profile.languages[m.original_language]) score += 1
                // Decade match (+1)
                if (m.release_date) {
                    const decade = Math.floor(parseInt(m.release_date.split('-')[0]) / 10) * 10
                    if (profile.decades[decade]) score += 1
                }
                // (Director and Country matching would require fetching candidate details, let's skip for perf)
            } else {
                // If no history, score by popularity/rating
                score = m.popularity / 10 + m.vote_average
            }
            return { ...m, score }
        })

        // 5. Mixing
        const sortedPersonalized = scoredCandidates.sort((a, b) => b.score - a.score)
        
        const totalRequested = parseInt(limit) || 3
        const exploratoryCount = Math.floor(totalRequested * parseFloat(explore_fraction))
        const personalizedCount = totalRequested - exploratoryCount

        const finalSelection = []
        const selectedIds = new Set()

        // Personalized picks
        sortedPersonalized.slice(0, personalizedCount * 5).sort(() => 0.5 - Math.random()) // Shuffle a bit for variety
            .slice(0, personalizedCount)
            .forEach(m => {
                finalSelection.push({ ...m, type: 'personalized' })
                selectedIds.add(m.id)
            })

        // Exploratory picks (lesser scores or just trending)
        const exploratoryCandidates = scoredCandidates
            .filter(m => !selectedIds.has(m.id))
            .sort(() => 0.5 - Math.random()) // Random from remaining
            .slice(0, exploratoryCount)
        
        exploratoryCandidates.forEach(m => {
            finalSelection.push({ ...m, type: 'exploratory' })
            selectedIds.add(m.id)
        })

        // Telemetry
        console.log(`[RECOMMENDATIONS] memberId=${memberId} total=${totalRequested} personalized=${finalSelection.filter(m => m.type === 'personalized').length} exploratory=${finalSelection.filter(m => m.type === 'exploratory').length} fallback=${!hasHistory}`)

        // Fallback note if history sparse
        const note = !hasHistory ? "Not enough personal history — showing broader suggestions" : null

        return res.status(200).json({
            results: finalSelection.map(movie => ({
                id: movie.id,
                title: movie.title,
                posterPath: movie.poster_path,
                releaseYear: movie.release_date ? movie.release_date.split('-')[0] : '',
                voteAverage: movie.vote_average,
                recommendationType: movie.type
            })),
            note
        })

    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Failed to generate recommendations' })
    }
}
