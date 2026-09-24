'use strict';
const { createApp, createMetricsApp } = require('./app');
const { createStore } = require('./lib/store');
const log = require('./lib/logger');

const PORT = Number(process.env.PORT || 3000);
const METRICS_PORT = Number(process.env.METRICS_PORT || 9100);
// Time to keep serving after SIGTERM so the Service/Ingress can drop this pod first.
const SHUTDOWN_DELAY_MS = Number(process.env.SHUTDOWN_DELAY_MS || 5000);

let shuttingDown = false;
const store = createStore();
const app = createApp({ store, isShuttingDown: () => shuttingDown });

const server = app.listen(PORT, '0.0.0.0', () => log.info('AhmadBlog listening', { port: PORT, store: store.kind }));
const metricsServer = createMetricsApp().listen(METRICS_PORT, '0.0.0.0', () =>
  log.info('metrics listening', { port: METRICS_PORT }),
);

// Connect/migrate in the background; /readyz stays 503 until it succeeds.
store.init().catch((err) => log.error('store init failed', { error: err.message }));

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info('shutdown requested', { signal });

  setTimeout(() => {
    server.close(async () => {
      metricsServer.close();
      await store.close();
      log.info('shutdown complete');
      process.exit(0);
    });
    // Hard stop if connections refuse to drain.
    setTimeout(() => process.exit(1), 10000).unref();
  }, SHUTDOWN_DELAY_MS);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => log.error('unhandledRejection', { error: String(err) }));
