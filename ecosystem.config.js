// pm2 definitions for the three apps and the deploy listener (B3.24).
//
// deploy.sh runs `pm2 startOrReload ecosystem.config.js --only ... --update-env`
// with RELEASE_SHA and BM_NODE exported; pm2 re-reads cwd/script/interpreter/
// env from this file on every reload. The interpreter is an absolute path on
// purpose: the pm2 daemon itself runs /usr/bin/node 18, so a bare 'node'
// would keep Node 18 forever.
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SHARED = process.env.BM_SHARED || '/var/www/banjaramatch-shared';

function pinnedNodeVersion() {
  try {
    return fs.readFileSync(path.join(ROOT, '.nvmrc'), 'utf8').trim();
  } catch {
    return '22.23.2';
  }
}
const NVM = `/root/.nvm/versions/node/v${pinnedNodeVersion()}/bin/node`;
// Never silently Node 18: fall back to 'node' only when the pinned binary is absent.
const NODE = process.env.BM_NODE || (fs.existsSync(NVM) ? NVM : 'node');
const RELEASE_SHA = process.env.RELEASE_SHA || '';

const logs = (name) => ({
  out_file: `${SHARED}/logs/${name}.out.log`,
  error_file: `${SHARED}/logs/${name}.err.log`,
  time: true,
  merge_logs: true,
});

// Cluster mode with one instance: the new process boots beside the old one
// and, with wait_ready, the old one keeps answering until the new one has
// sent process.send('ready'). instances stays 1 (socket.io state in memory).
const app = (name, dir, script, port, mem) => ({
  name,
  cwd: path.join(ROOT, 'apps', dir),
  script,
  interpreter: NODE,
  exec_mode: 'fork',
  wait_ready: true,
  listen_timeout: 30000,
  kill_timeout: 8000,
  max_memory_restart: mem,
  autorestart: true,
  watch: false,
  ...logs(name),
  // Each app loads its own .env (a symlink to SHARED/env/<app>.env) via
  // dotenv from cwd; dotenv never overrides the values set here.
  env: { NODE_ENV: 'production', PORT: port, HOST: '127.0.0.1', RELEASE_SHA },
});

module.exports = {
  apps: [
    app('banjaramatch-web', 'web', 'app.js', 4000, '400M'),
    // The biodata PDF renderer (services/biodataPdf.js) runs Chromium as a CHILD
    // process: its ~250-300 MB is outside this max_memory_restart (pm2 measures
    // the node process only). It is bounded instead by one browser, one render
    // at a time, a 60 s idle close, the MemAvailable >= 350 MB launch guard and
    // the BIODATA_PDF_DISABLED kill switch.
    app('banjaramatch-api', 'api', 'index.js', 4002, '600M'),
    app('banjaramatch-admin', 'admin', 'server.js', 4001, '200M'),
    {
      // GitHub push -> deploy.sh. Fork mode; deploy.sh reloads it last and
      // only when deploy/webhook-listener.js changed.
      name: 'banjaramatch-deploy-hook',
      cwd: path.join(ROOT, 'deploy'),
      script: 'webhook-listener.js',
      interpreter: NODE,
      exec_mode: 'fork',
      max_memory_restart: '100M',
      kill_timeout: 3000,
      autorestart: true,
      watch: false,
      ...logs('banjaramatch-deploy-hook'),
      env: { NODE_ENV: 'production', WEBHOOK_PORT: 4003 },
    },
  ],
};
