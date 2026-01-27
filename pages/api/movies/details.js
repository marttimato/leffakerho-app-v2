export default async function handler(req, res) {
    const { id } = req.query
    const apiKey = process.env.TMDB_API_KEY

    if (!id || !apiKey) {
        return res.status(400).json({ error: 'ID and API key required' })
    }

    try {
        const url = `https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=fi-FI`
        const response = await fetch(url)
        const data = await response.json()

        if (data.success === false) {
            return res.status(404).json({ error: 'Movie not found' })
        }

        return res.status(200).json({
            title: data.title,
            overview: data.overview,
            posterPath: data.poster_path,
            backdropPath: data.backdrop_path,
            releaseDate: data.release_date,
            voteAverage: data.vote_average,
            runtime: data.runtime,
            genres: data.genres ? data.genres.map(g => g.name) : []
        })
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Failed to fetch details' })
    }
}
