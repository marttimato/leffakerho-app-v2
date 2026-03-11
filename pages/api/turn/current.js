import pool from '../../../lib/db'
import { PEOPLE } from '../../../lib/constants'

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { rows } = await pool.query('SELECT person FROM movies ORDER BY watched_at DESC, created_at DESC LIMIT 1')
        
        let nextPerson = PEOPLE[0]
        if (rows.length > 0) {
            const lastPerson = rows[0].person
            const currentIndex = PEOPLE.indexOf(lastPerson)
            if (currentIndex !== -1) {
                nextPerson = PEOPLE[(currentIndex + 1) % PEOPLE.length]
            }
        }

        return res.status(200).json({ 
            memberId: nextPerson,
            memberName: nextPerson
        })
    } catch (error) {
        console.error('API [GET /api/turn/current] error:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}
