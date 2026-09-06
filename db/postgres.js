const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
});

module.exports = {
  async init() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        mission_id TEXT NOT NULL,
        step_index INTEGER NOT NULL DEFAULT 0,
        completed BOOLEAN NOT NULL DEFAULT false,
        completed_at TIMESTAMPTZ,
        UNIQUE(user_id, mission_id)
      );
    `);
  },

  async getUserByUsername(username) {
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return rows[0] || null;
  },

  async getUserById(id) {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async createUser(username, passwordHash) {
    const { rows } = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, score',
      [username, passwordHash]
    );
    return rows[0];
  },

  async addToScore(userId, points) {
    const { rows } = await pool.query(
      'UPDATE users SET score = score + $1 WHERE id = $2 RETURNING score',
      [points, userId]
    );
    return rows[0].score;
  },

  async getAllProgress(userId) {
    const { rows } = await pool.query('SELECT * FROM progress WHERE user_id = $1', [userId]);
    return rows;
  },

  async getProgress(userId, missionId) {
    const { rows } = await pool.query(
      'SELECT * FROM progress WHERE user_id = $1 AND mission_id = $2',
      [userId, missionId]
    );
    return rows[0] || null;
  },

  async ensureProgress(userId, missionId) {
    await pool.query(
      `INSERT INTO progress (user_id, mission_id, step_index, completed)
       VALUES ($1, $2, 0, false)
       ON CONFLICT (user_id, mission_id) DO NOTHING`,
      [userId, missionId]
    );
    return this.getProgress(userId, missionId);
  },

  async advanceProgress(userId, missionId, newStepIndex, justCompleted) {
    await pool.query(
      `UPDATE progress
       SET step_index = $1,
           completed = $2,
           completed_at = CASE WHEN $2 THEN now() ELSE completed_at END
       WHERE user_id = $3 AND mission_id = $4`,
      [newStepIndex, justCompleted, userId, missionId]
    );
  },

  async getLeaderboard(limit = 10) {
    const { rows } = await pool.query(
      'SELECT username, score FROM users ORDER BY score DESC LIMIT $1',
      [limit]
    );
    return rows;
  },
};
