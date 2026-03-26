const express = require('express');
const { Pool } = require('pg');
const cors    = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'tododb',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'secret',
});

// ── FONCTION : attendre que PostgreSQL soit prêt ──────────────
async function connectWithRetry(retries = 10, delay = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query('SELECT 1');   // teste la connexion
      console.log('Connecté à PostgreSQL !');
      return;                          // connexion OK → on continue
    } catch (err) {
      console.log(`Tentative ${i}/${retries} — PostgreSQL pas encore prêt...`);
      if (i === retries) {
        console.error('Impossible de se connecter à PostgreSQL');
        process.exit(1);
      }
      // attendre avant de réessayer
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

// ── ROUTES API ────────────────────────────────────────────────

app.get('/tasks', async (req, res) => {
  const result = await pool.query('SELECT * FROM tasks ORDER BY id ASC');
  res.json(result.rows);
});

app.post('/tasks', async (req, res) => {
  const { title } = req.body;
  const result = await pool.query(
    'INSERT INTO tasks (title, done) VALUES ($1, false) RETURNING *',
    [title]
  );
  res.json(result.rows[0]);
});

app.put('/tasks/:id', async (req, res) => {
  const { done } = req.body;
  const result = await pool.query(
    'UPDATE tasks SET done = $1 WHERE id = $2 RETURNING *',
    [done, req.params.id]
  );
  res.json(result.rows[0]);
});

app.delete('/tasks/:id', async (req, res) => {
  await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
  res.json({ message: 'Tâche supprimée' });
});

// ── DÉMARRAGE : attendre PostgreSQL puis lancer le serveur ────
const PORT = process.env.PORT || 3000;

connectWithRetry().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend démarré sur le port ${PORT}`);
  });
});
