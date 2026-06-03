import { neon } from '@neondatabase/serverless';

// This checks if the DATABASE_URL environment variable is configured in .env.local
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is missing in your .env.local file. Please add your Neon connection string to connect to the database.'
  );
}

// Create a database query client
export const sql = neon(process.env.DATABASE_URL);
