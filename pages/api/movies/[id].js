import pool from '../../../lib/db'

export default async function handler(req, res) {
    if (req.method === 'PUT') {
        try {
            const { id } = req.query
            const { title, person, releaseYear, watchDate, tmdbId, originalTitle, alternativeTitles } = req.body

            if (!id || !title) return res.status(400).json({ error: 'ID and Title are required' })

            const d = new Date(watchDate)
            const year = d.getFullYear()
            const month = d.getMonth() + 1

            await pool.query(
                `UPDATE movies 
                 SET title = $1, person = $2, release_year = $3, watched_at = $4, tmdb_id = $5, year = $6, month = $7, original_title = $8, alternative_titles = $9
                 WHERE id = $10`,
                [title, person, releaseYear || 0, watchDate, tmdbId, year, month, originalTitle, alternativeTitles || [], id]
            )

            return res.status(200).json({ success: true })
        } catch (error) {
            console.error('API [PUT /api/movies/[id]] error:', error)
            return res.status(500).json({ error: 'Muokkaus epäonnistui' })
        }
    }

    if (req.method === 'DELETE') {
        try {
            const { id } = req.query
            if (!id) return res.status(400).json({ error: 'ID required' })

            await pool.query('DELETE FROM movies WHERE id = $1', [id])
            return res.status(200).json({ success: true })
        } catch (error) {
            console.error(error)
            return res.status(500).json({ error: error.message })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
