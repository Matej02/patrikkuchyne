const session = require('express-session');
const db = require('../db');

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
`);

const stmts = {
  get: db.prepare('SELECT data, expires_at FROM sessions WHERE sid = ?'),
  set: db.prepare('INSERT OR REPLACE INTO sessions (sid, data, expires_at) VALUES (?, ?, ?)'),
  del: db.prepare('DELETE FROM sessions WHERE sid = ?'),
  cleanup: db.prepare('DELETE FROM sessions WHERE expires_at < ?')
};

class SQLiteStore extends session.Store {
  constructor() {
    super();
    setInterval(() => {
      try { stmts.cleanup.run(Date.now()); } catch (e) { /* ignore */ }
    }, 60 * 60 * 1000).unref();
  }

  get(sid, cb) {
    try {
      const row = stmts.get.get(sid);
      if (!row) return cb(null, null);
      if (row.expires_at < Date.now()) {
        stmts.del.run(sid);
        return cb(null, null);
      }
      cb(null, JSON.parse(row.data));
    } catch (err) { cb(err); }
  }

  set(sid, sessionData, cb) {
    try {
      const ttlMs = (sessionData.cookie && sessionData.cookie.maxAge) || 1000 * 60 * 60 * 24 * 7;
      stmts.set.run(sid, JSON.stringify(sessionData), Date.now() + ttlMs);
      cb && cb(null);
    } catch (err) { cb && cb(err); }
  }

  destroy(sid, cb) {
    try { stmts.del.run(sid); cb && cb(null); }
    catch (err) { cb && cb(err); }
  }

  touch(sid, sessionData, cb) {
    this.set(sid, sessionData, cb);
  }
}

module.exports = SQLiteStore;
