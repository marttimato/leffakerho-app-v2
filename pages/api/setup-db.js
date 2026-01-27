import pool from '../../lib/db'

export default async function handler(req, res) {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS movies (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        person VARCHAR(255),
        year INT,
        release_year INT,
        month INT,
        watched_at DATE,
        tmdb_id INT,
        source VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movies' AND column_name='year') THEN
          ALTER TABLE movies ADD COLUMN year INT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movies' AND column_name='watched_at') THEN
          ALTER TABLE movies ADD COLUMN watched_at DATE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movies' AND column_name='tmdb_id') THEN
          ALTER TABLE movies ADD COLUMN tmdb_id INT;
        END IF;
      END $$;
    `
    const result = await pool.query(query)
    return res.status(200).json({ result })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: error.message })
  }
}
