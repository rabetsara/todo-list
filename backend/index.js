const express = require('express');
const { Pool } = require('pg');
const cors    = require('cors');

const app  = express();
app.use(cors());               // autorise le frontend à appeler le backend
app.use(express.json());       // lit le JSON des requêtes

// Connexion à PostgreSQL
// Les variables d'environnement viennent du docker-compose.yml
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'tododb',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'secret',
});

// ── ROUTES API ────────────────────────────────────────────────

// GET /tasks — récupérer toutes les tâches
app.get('/tasks', async (req, res) => {
  const result = await pool.query('SELECT * FROM tasks ORDER BY id ASC');
  res.json(result.rows);
});

// POST /tasks — créer une tâche
app.post('/tasks', async (req, res) => {
  const { title } = req.body;
  const result = await pool.query(
    'INSERT INTO tasks (title, done) VALUES ($1, false) RETURNING *',
    [title]
  );
  res.json(result.rows[0]);
});

// PUT /tasks/:id — cocher / décocher
app.put('/tasks/:id', async (req, res) => {
  const { done } = req.body;
  const result = await pool.query(
    'UPDATE tasks SET done = $1 WHERE id = $2 RETURNING *',
    [done, req.params.id]
  );
  res.json(result.rows[0]);
});

// DELETE /tasks/:id — supprimer
app.delete('/tasks/:id', async (req, res) => {
  await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
  res.json({ message: 'Tâche supprimée' });
});

// ── DÉMARRAGE ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend démarré sur le port ${PORT}`);
});
