'use strict';
// Minimal structured (JSON) logger — easy to ship to Loki/ELK/CloudWatch later.
function write(level, msg, extra) {
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    msg,
    ...extra,
  });
  (level === 'error' ? process.stderr : process.stdout).write(line + '\n');
}

module.exports = {
  info: (msg, extra) => write('info', msg, extra),
  warn: (msg, extra) => write('warn', msg, extra),
  error: (msg, extra) => write('error', msg, extra),
};
