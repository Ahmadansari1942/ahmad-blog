'use strict';
const express = require('express');
const helmet = require('helmet');
const path = require('path');
const log = require('./lib/logger');
const { register, metricsMiddleware } = require('./lib/metrics');

function createApp({ store, isShuttingDown = () => false }) {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // running behind Traefik ingress
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          scriptSrc: ["'self'"],
          scriptSrcAttr: ["'unsafe-inline'"], // views use inline onclick handlers
          upgradeInsecureRequests: null, // site is served over plain HTTP until a domain + TLS is added
        },
      },
      // These headers only make sense over HTTPS / are noisy without a domain.
      strictTransportSecurity: false,
      crossOriginOpenerPolicy: false,
      originAgentCluster: false,
    }),
  );
  app.use(metricsMiddleware);

  // ── Health endpoints (Kubernetes probes) ───────────────────────────
  // Liveness: process is up. Never depends on the DB, otherwise a DB
  // outage would make Kubernetes restart every app pod for no benefit.
  app.get('/healthz', (req, res) => res.status(200).json({ status: 'ok' }));

  // Readiness: can this pod serve traffic (DB reachable, not shutting down)?
  app.get('/readyz', async (req, res) => {
    if (isShuttingDown()) return res.status(503).json({ status: 'shutting_down' });
    const ok = await store.ready();
    return res.status(ok ? 200 : 503).json({ status: ok ? 'ready' : 'db_unavailable' });
  });

  app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

  // ── Home page ──────────────────────────────────────────────────────
  app.get('/', async (req, res, next) => {
    try {
      const category = typeof req.query.category === 'string' ? req.query.category : '';
      const search = typeof req.query.search === 'string' ? req.query.search : '';
      const posts = await store.getAllPosts();

      let filtered = posts;
      if (category && category !== 'All') {
        filtered = filtered.filter((p) => p.category === category);
      }
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.summary.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q),
        );
      }

      res.render('index', {
        posts: filtered,
        featured: posts.find((p) => p.featured),
        categories: ['All', ...new Set(posts.map((p) => p.category))],
        currentCategory: category || 'All',
        searchQuery: search,
        totalArticles: posts.length,
        totalAuthors: new Set(posts.map((p) => p.author)).size,
        totalCategories: new Set(posts.map((p) => p.category)).size,
      });
    } catch (err) {
      next(err);
    }
  });

  // ── Single post ────────────────────────────────────────────────────
  app.get('/post/:id', async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      const post = Number.isNaN(id) ? null : await store.getPostById(id);
      if (!post) return res.status(404).render('404', { message: 'Post not found' });

      const all = await store.getAllPosts();
      const related = all.filter((p) => p.category === post.category && p.id !== post.id).slice(0, 3);
      return res.render('post', { post, related });
    } catch (err) {
      return next(err);
    }
  });

  // ── 404 + error handler ────────────────────────────────────────────
  app.use((req, res) => res.status(404).render('404', { message: 'Page not found' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    log.error('unhandled error', { path: req.path, error: err.message });
    res.status(500).render('404', { message: 'Something went wrong. Please try again.', code: 500 });
  });

  return app;
}

// Separate tiny app for Prometheus, served on its own port so /metrics
// is never reachable through the public ingress.
function createMetricsApp() {
  const app = express();
  app.disable('x-powered-by');
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });
  return app;
}

module.exports = { createApp, createMetricsApp };
