require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// --- Helper Functions to convert DB snake_case to frontend camelCase ---
const toCamel = (s) => {
  return s.replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
};

const isObject = function (o) {
  return o === Object(o) && !Array.isArray(o) && typeof o !== 'function';
};

const keysToCamel = function (o) {
  if (isObject(o)) {
    const n = {};
    Object.keys(o)
      .forEach((k) => {
        n[toCamel(k)] = keysToCamel(o[k]);
      });
    return n;
  } else if (Array.isArray(o)) {
    return o.map((i) => {
      return keysToCamel(i);
    });
  }
  return o;
};


// Middleware
app.use(cors());
app.use(express.json());

// --- DIAGNOSTIC LOGGING ---
// Add middleware to log every incoming request to help debug proxy issues.
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Received request: ${req.method} ${req.originalUrl}`);
  next();
});

// Health check route for Render
app.get('/', (req, res) => {
  res.status(200).send('MindBattle Backend is running!');
});

// Routes
app.get('/api/contests', async (req, res) => {
  try {
    const query = `
      SELECT
        id, title, description, category, (entry_fee_cents / 100.0) as entry_fee, (prize_pool_cents / 100.0) as prize_pool, status, 
        registration_start_date, registration_end_date, contest_start_date, 
        max_participants, rules, questions, participants, number_of_questions, 
        created_by, results, difficulty,
        'KBC' as format,
        'per_question' as timer_type,
        time_per_question,
        null as total_contest_time
      FROM contests_kbc
      UNION ALL
      SELECT
        id, title, description, category, (entry_fee_cents / 100.0) as entry_fee, (prize_pool_cents / 100.0) as prize_pool, status, 
        registration_start_date, registration_end_date, contest_start_date, 
        max_participants, rules, questions, participants, number_of_questions, 
        created_by, results, difficulty,
        'FastestFinger' as format,
        'total_contest' as timer_type,
        0 as time_per_question,
        total_contest_time
      FROM contests_fastest_finger
      ORDER BY contest_start_date DESC
    `;
    const { rows } = await db.query(query);
    // Timestamps are returned as Date objects, frontend expects numbers (milliseconds)
    const processedRows = rows.map(row => ({
        ...row,
        registration_start_date: new Date(row.registration_start_date).getTime(),
        registration_end_date: new Date(row.registration_end_date).getTime(),
        contest_start_date: new Date(row.contest_start_date).getTime(),
    }));
    res.json(keysToCamel(processedRows));
  } catch (err) {
    console.error('Error fetching contests:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});