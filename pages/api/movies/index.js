import pool from '../../../lib/db'

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            // Ensure columns exist (simple migration)
            await pool.query('ALTER TABLE movies ADD COLUMN IF NOT EXISTS original_title TEXT')
            await pool.query('ALTER TABLE movies ADD COLUMN IF NOT EXISTS alternative_titles TEXT[]')

            const { rows } = await pool.query('SELECT * FROM movies ORDER BY watched_at DESC, created_at DESC')

            const movies = rows.map(r => ({
                ...r,
                year: r.year || (r.watched_at ? new Date(r.watched_at).getFullYear() : (r.created_at ? new Date(r.created_at).getFullYear() : 0)),
                month: r.month || (r.watched_at ? new Date(r.watched_at).getMonth() + 1 : (r.created_at ? new Date(r.created_at).getMonth() + 1 : 1)),
                releaseYear: r.release_year,
                watchedAt: r.watched_at,
                tmdbId: r.tmdb_id,
                originalTitle: r.original_title,
                alternativeTitles: r.alternative_titles || []
            }))
            return res.status(200).json(movies)
        } catch (error) {
            console.error('API [GET /api/movies] error:', error)
            return res.status(500).json({ error: 'Tietojen haku epäonnistui' })
        }
    }

    if (req.method === 'POST') {
        try {
            const { id, title, person, year, month, source, releaseYear, watchDate, tmdbId, originalTitle, alternativeTitles } = req.body
            if (!title) return res.status(400).json({ error: 'Title required' })

            await pool.query(
                `INSERT INTO movies (id, title, person, year, release_year, month, source, watched_at, tmdb_id, original_title, alternative_titles)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [id, title, person, year, releaseYear || 0, month, source, watchDate, tmdbId, originalTitle, alternativeTitles || []]
            )
            return res.status(201).json({ success: true })
        } catch (error) {
            console.error('API [POST /api/movies] error:', error)
            return res.status(500).json({ error: 'Tallennus epäonnistui' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
