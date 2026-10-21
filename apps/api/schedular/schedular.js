'use strict';
/**
 * schedular/schedular.js — node-cron wiring (feature expansion A0.5).
 *
 * Nothing is scheduled at require time. index.js calls start() after the
 * server is listening, only when !env.IS_TEST && env.CRON_ENABLED &&
 * cluster.isPrimary, so a second process never double-sends.
 *
 *   every 15 min       interest monitor        (services/jobs/interestMonitor)
 *   06:07 every 6 h    saved-search alerts     (services/jobs/savedSearchAlerts)
 *   03:30 daily        verification file purge (services/jobs/verificationFilePurge)
 * (cron expressions in JOBS below)
 *
 * Each job has a running flag: a slow run is never overlapped by the next tick.
 * The second-chance and chat-intent jobs are no longer scheduled.
 */
const JOBS = [
  { name: 'interestMonitor', cron: '*/15 * * * *', load: () => require('../services/jobs/interestMonitor') },
  { name: 'savedSearchAlerts', cron: '7 */6 * * *', load: () => require('../services/jobs/savedSearchAlerts') },
  { name: 'verificationFilePurge', cron: '30 3 * * *', load: () => require('../services/jobs/verificationFilePurge') },
];

let tasks = [];
const running = new Set();

function wrap(job) {
  return async () => {
    if (running.has(job.name)) {
      console.warn(`[cron] ${job.name} still running, tick skipped`);
      return;
    }
    running.add(job.name);
    const started = Date.now();
    try {
      const result = await job.load()();
      console.log(`[cron] ${job.name} done in ${((Date.now() - started) / 1000).toFixed(1)}s`, result || '');
    } catch (err) {
      console.error(`[cron] ${job.name} failed:`, err && err.message);
    } finally {
      running.delete(job.name);
    }
  };
}

function start() {
  if (tasks.length) return tasks.length;
  const cron = require('node-cron');
  tasks = JOBS.map((job) => cron.schedule(job.cron, wrap(job), { name: job.name }));
  console.log(`[cron] scheduled: ${JOBS.map((j) => `${j.name} (${j.cron})`).join(', ')}`);
  return tasks.length;
}

function stop() {
  for (const t of tasks) {
    try {
      t.stop();
      if (typeof t.destroy === 'function') t.destroy();
    } catch (_) { /* ignore */ }
  }
  tasks = [];
}

module.exports = { start, stop, JOBS, _wrap: wrap };
