import { sql } from '@vercel/postgres'

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            const { rows } = await sql`SELECT * FROM movies ORDER BY created_at DESC;`
            // Map back to frontend expected format if needed, but it should match mostly.
            // Front expects: { id, title, person, year, month, releaseYear, source }
            // DB has: id, title, person, release_year, month, source
            const movies = rows.map(r => ({
                ...r,
                releaseYear: r.release_year, // map snake_case to camelCase
            }))
            return res.status(200).json(movies)
        } catch (error) {
            console.error(error)
            return res.status(500).json({ error: error.message })
        }
    }

    if (req.method === 'POST') {
        try {
            const { id, title, person, year, month, source, releaseYear } = req.body
            if (!title) return res.status(400).json({ error: 'Title required' })

            await sql`
        INSERT INTO movies (id, title, person, release_year, month, source)
        VALUES (${id}, ${title}, ${person}, ${releaseYear || 0}, ${month}, ${source});
      `
            return res.status(201).json({ success: true })
        } catch (error) {
            console.error(error)
            return res.status(500).json({ error: error.message })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
