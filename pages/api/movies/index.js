import pool from '../../../lib/db'

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            const { rows } = await pool.query('SELECT * FROM movies ORDER BY watched_at DESC, created_at DESC')

            const movies = rows.map(r => ({
                ...r,
                year: r.year || (r.watched_at ? new Date(r.watched_at).getFullYear() : (r.created_at ? new Date(r.created_at).getFullYear() : 0)),
                month: r.month || (r.watched_at ? new Date(r.watched_at).getMonth() + 1 : (r.created_at ? new Date(r.created_at).getMonth() + 1 : 1)),
                releaseYear: r.release_year,
                watchedAt: r.watched_at
            }))
            return res.status(200).json(movies)
        } catch (error) {
            console.error('API [GET /api/movies] error:', error)
            return res.status(500).json({ error: 'Tietojen haku epäonnistui' })
        }
    }

    if (req.method === 'POST') {
        try {
            const { id, title, person, year, month, source, releaseYear, watchDate } = req.body
            if (!title) return res.status(400).json({ error: 'Title required' })

            await pool.query(
                `INSERT INTO movies (id, title, person, year, release_year, month, source, watched_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [id, title, person, year, releaseYear || 0, month, source, watchDate]
            )
            return res.status(201).json({ success: true })
        } catch (error) {
            console.error('API [POST /api/movies] error:', error)
            return res.status(500).json({ error: 'Tallennus epäonnistui' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
