const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'breach.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    mission_id TEXT NOT NULL,
    step_index INTEGER NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    UNIQUE(user_id, mission_id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

module.exports = {
  async init() {
    // Tables already created synchronously above.
  },

  async getUserByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username) || null;
  },

  async getUserById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
  },

  async createUser(username, passwordHash) {
    const info = db
      .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
      .run(username, passwordHash);
    return { id: info.lastInsertRowid, username, score: 0 };
  },

  async addToScore(userId, points) {
    db.prepare('UPDATE users SET score = score + ? WHERE id = ?').run(points, userId);
    const row = db.prepare('SELECT score FROM users WHERE id = ?').get(userId);
    return row.score;
  },

  async getAllProgress(userId) {
    return db.prepare('SELECT * FROM progress WHERE user_id = ?').all(userId);
  },

  async getProgress(userId, missionId) {
    return (
      db
        .prepare('SELECT * FROM progress WHERE user_id = ? AND mission_id = ?')
        .get(userId, missionId) || null
    );
  },

  async ensureProgress(userId, missionId) {
    db.prepare(
      'INSERT OR IGNORE INTO progress (user_id, mission_id, step_index, completed) VALUES (?, ?, 0, 0)'
    ).run(userId, missionId);
    return this.getProgress(userId, missionId);
  },

  async advanceProgress(userId, missionId, newStepIndex, justCompleted) {
    db.prepare(
      `UPDATE progress
       SET step_index = ?,
           completed = ?,
           completed_at = CASE WHEN ? THEN datetime('now') ELSE completed_at END
       WHERE user_id = ? AND mission_id = ?`
    ).run(newStepIndex, justCompleted ? 1 : 0, justCompleted ? 1 : 0, userId, missionId);
  },

  async getLeaderboard(limit = 10) {
    return db
      .prepare('SELECT username, score FROM users ORDER BY score DESC LIMIT ?')
      .all(limit);
  },
};
