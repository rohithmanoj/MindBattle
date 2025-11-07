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

// Routes
app.get('/api/contests', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM contests ORDER BY contest_start_date DESC');
    // The frontend expects camelCase keys, but the DB returns snake_case.
    // We convert them here to match the API contract defined in types.ts.
    res.json(keysToCamel(rows));
  } catch (err) {
    console.error('Error fetching contests:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
