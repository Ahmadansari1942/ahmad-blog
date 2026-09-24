'use strict';
/**
 * Data-access layer (the "data tier" connector).
 *
 *  - DB_HOST set   -> MySQL (production / Kubernetes)
 *  - DB_HOST empty -> in-memory data from data/posts.js (local dev / tests)
 *
 * Both stores expose the same interface:
 *   init(), ready(), getAllPosts(), getPostById(id), close()
 */
const mysql = require('mysql2/promise');
const seedPosts = require('../data/posts');
const log = require('./logger');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS posts (
  id        INT UNSIGNED NOT NULL PRIMARY KEY,
  title     VARCHAR(255) NOT NULL,
  category  VARCHAR(100) NOT NULL,
  author    VARCHAR(100) NOT NULL,
  \`date\`    VARCHAR(50)  NOT NULL,
  image     VARCHAR(500) NOT NULL,
  featured  TINYINT(1)   NOT NULL DEFAULT 0,
  summary   TEXT         NOT NULL,
  content   MEDIUMTEXT   NOT NULL,
  INDEX idx_posts_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function createMemoryStore() {
  return {
    kind: 'memory',
    async init() {},
    async ready() { return true; },
    async getAllPosts() { return seedPosts; },
    async getPostById(id) { return seedPosts.find((p) => p.id === id) || null; },
    async close() {},
  };
}

function rowToPost(row) {
  return { ...row, id: Number(row.id), featured: Boolean(row.featured) };
}

function createMysqlStore(env) {
  let pool = null;
  let isReady = false;
  let closing = false;

  const config = {
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 3306),
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    connectionLimit: Number(env.DB_CONNECTION_LIMIT || 10),
    connectTimeout: 5000,
    waitForConnections: true,
    charset: 'utf8mb4',
  };

  async function migrateAndSeed() {
    // GET_LOCK makes sure only one replica migrates/seeds at a time.
    const conn = await pool.getConnection();
    try {
      const [[lock]] = await conn.query("SELECT GET_LOCK('ahmad_blog_init', 30) AS got");
      if (!lock.got) throw new Error('could not obtain init lock');
      try {
        await conn.query(SCHEMA);
        const [[{ total }]] = await conn.query('SELECT COUNT(*) AS total FROM posts');
        if (Number(total) === 0) {
          const rows = seedPosts.map((p) => [
            p.id, p.title, p.category, p.author, p.date,
            p.image, p.featured ? 1 : 0, p.summary, p.content,
          ]);
          await conn.query(
            'INSERT INTO posts (id, title, category, author, `date`, image, featured, summary, content) VALUES ?',
            [rows],
          );
          log.info('database seeded', { posts: rows.length });
        }
      } finally {
        await conn.query("SELECT RELEASE_LOCK('ahmad_blog_init')");
      }
    } finally {
      conn.release();
    }
  }

  return {
    kind: 'mysql',

    // Keeps retrying until MySQL is reachable — the pod stays "not ready"
    // (but alive) meanwhile, so Kubernetes never routes traffic to it early.
    async init() {
      pool = mysql.createPool(config);
      let delay = 1000;
      while (!closing) {
        try {
          await migrateAndSeed();
          isReady = true;
          log.info('database ready', { host: config.host, database: config.database });
          return;
        } catch (err) {
          log.warn('database not ready, retrying', { error: err.message, retry_in_ms: delay });
          await sleep(delay);
          delay = Math.min(delay * 2, 10000);
        }
      }
    },

    async ready() {
      if (!isReady || !pool) return false;
      try {
        await pool.query('SELECT 1');
        return true;
      } catch {
        return false;
      }
    },

    async getAllPosts() {
      const [rows] = await pool.query('SELECT * FROM posts ORDER BY id ASC');
      return rows.map(rowToPost);
    },

    async getPostById(id) {
      const [rows] = await pool.query('SELECT * FROM posts WHERE id = ? LIMIT 1', [id]);
      return rows.length ? rowToPost(rows[0]) : null;
    },

    async close() {
      closing = true;
      isReady = false;
      if (pool) await pool.end().catch(() => {});
    },
  };
}

function createStore(env = process.env) {
  if (env.DB_HOST) return createMysqlStore(env);
  log.warn('DB_HOST not set — using in-memory data (development mode only)');
  return createMemoryStore();
}

module.exports = { createStore, createMemoryStore };
