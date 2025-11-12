import express from 'express';
import { Pool } from 'pg';
import cors from 'cors';

const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'API is working',
    timestamp: new Date().toISOString(),
    message: 'External API access is enabled'
  });
});

// Simple endpoint to test geography data access
app.get('/api/geography/status', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM provincias) as provincias_count,
        (SELECT COUNT(*) FROM cantones) as cantones_count,
        (SELECT COUNT(*) FROM distritos) as distritos_count,
        (SELECT COUNT(*) FROM barrios) as barrios_count
    `);

    res.json({
      status: 'Geography data accessible',
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error accessing geography data',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Export for Vercel
export default app;