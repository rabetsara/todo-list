const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Config PostgreSQL depuis les variables d environnement
const pool = new Pool({
  host:     process.env.DB_HOST     || 'postgres',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'tododb',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'secret123',
});

// Retry de connexion DB au démarrage
async function connectWithRetry(retries = 10, delay = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      const client = await pool.connect();
      console.log('✅ Connecté à PostgreSQL !');
      client.release();
      return true;
    } catch (err) {
      console.log(`⏳ Tentative ${i}/${retries} - DB pas prête: ${err.message}`);
      if (i === retries) {
        console.error('❌ Impossible de se connecter à la DB après plusieurs tentatives');
        process.exit(1);
      }
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

// Initialiser la table todos
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      done BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Table todos prête');
}

// Routes
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Todo API running' });
});

app.get('/todos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM todos ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/todos', async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'title requis' });
  try {
    const result = await pool.query(
      'INSERT INTO todos (title) VALUES ($1) RETURNING *',
      [title]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { done } = req.body;
  try {
    const result = await pool.query(
      'UPDATE todos SET done=$1 WHERE id=$2 RETURNING *',
      [done, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/todos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM todos WHERE id=$1', [id]);
    res.json({ message: 'Supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Démarrage
const PORT = process.env.PORT || 3000;

connectWithRetry()
  .then(() => initDB())
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Backend démarré sur le port ${PORT}`);
    });
  });
