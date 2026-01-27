import pool from '../../lib/db'

export default async function handler(req, res) {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS movies (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        person VARCHAR(255),
        release_year INT,
        month INT,
        source VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `
    const result = await pool.query(query)
    return res.status(200).json({ result })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: error.message })
  }
}
