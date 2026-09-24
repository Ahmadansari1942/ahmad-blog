'use strict';
const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

function metricsMiddleware(req, res, next) {
  const end = httpDuration.startTimer();
  res.on('finish', () => {
    // req.route is only set for matched routes -> keeps label cardinality low.
    const route = req.route ? req.route.path : 'unmatched';
    end({ method: req.method, route, status: res.statusCode });
  });
  next();
}

module.exports = { register, metricsMiddleware };
