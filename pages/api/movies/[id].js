import { sql } from '@vercel/postgres'

export default async function handler(req, res) {
    if (req.method === 'DELETE') {
        try {
            const { id } = req.query
            if (!id) return res.status(400).json({ error: 'ID required' })

            await sql`DELETE FROM movies WHERE id = ${id};`
            return res.status(200).json({ success: true })
        } catch (error) {
            console.error(error)
            return res.status(500).json({ error: error.message })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
