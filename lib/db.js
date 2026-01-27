import { Pool } from 'pg'

// Handle SSL connection for Supabase/Postgres
let connectionString = process.env.POSTGRES_URL

// Remove sslmode=require from connection string to avoid conflicts with manual SSL config
if (connectionString && connectionString.includes('sslmode=require')) {
    connectionString = connectionString.replace('sslmode=require', 'sslmode=no-verify')
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false, // Required for some Supabase connections or self-signed certs
    },
})

export default pool
