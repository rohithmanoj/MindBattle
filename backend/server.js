require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/contests', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM contests ORDER BY contest_start_date DESC');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching contests:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
