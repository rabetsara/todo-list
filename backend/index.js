const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Configuration PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'tododb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'secret',
});

// Attente de PostgreSQL
async function waitForDb() {
  let connected = false;

  while (!connected) {
    try {
      await pool.query('SELECT 1');
      connected = true;
      console.log('✅ PostgreSQL connecté');
    } catch (err) {
      console.log('⏳ Attente PostgreSQL...');
      await new Promise(res => setTimeout(res, 2000));
    }
  }
}

// Middleware de gestion d'erreur
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ROUTES

app.get('/tasks', asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM tasks ORDER BY id ASC');
  res.json(result.rows);
}));

app.post('/tasks', asyncHandler(async (req, res) => {
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title requis' });
  }

  const result = await pool.query(
    'INSERT INTO tasks (title, done) VALUES ($1, false) RETURNING *',
    [title]
  );

  res.json(result.rows[0]);
}));

app.put('/tasks/:id', asyncHandler(async (req, res) => {
  const { done } = req.body;

  const result = await pool.query(
    'UPDATE tasks SET done = $1 WHERE id = $2 RETURNING *',
    [done, req.params.id]
  );

  res.json(result.rows[0]);
}));

app.delete('/tasks/:id', asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
  res.json({ message: 'Tâche supprimée' });
}));

// Gestion erreurs globales
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur' });
});

// Lancement serveur
const PORT = process.env.PORT || 3000;

waitForDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Backend démarré sur le port ${PORT}`);
  });
});
