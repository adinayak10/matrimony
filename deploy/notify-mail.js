// Emails one alert through the API's SMTP account (the box has no MTA).
// Called by notify.sh when ALERT_EMAIL is set:
//
//   printf 'text' | ALERT_EMAIL=owner@example.com node deploy/notify-mail.js
//
// SMTP_HOST/PORT/USER/PASS/SERVICE and EMAIL_FROM_NAME are read as data from
// SHARED/env/api.env (never printed). nodemailer comes from the hoisted root
// node_modules; when it is missing this prints to stderr and exits 1 so the
// caller logs the message instead.
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const SHARED = process.env.BM_SHARED || '/var/www/banjaramatch-shared';
const API_ENV = process.env.BM_API_ENV || path.join(SHARED, 'env', 'api.env');
const ROOT = path.resolve(__dirname, '..');

function readEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2] || '';
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

async function main() {
  const to = process.env.ALERT_EMAIL;
  if (!to) {
    process.stderr.write('[notify-mail] ALERT_EMAIL not set\n');
    return 1;
  }
  const text = process.argv.slice(2).join(' ') || fs.readFileSync(0, 'utf8');
  if (!text.trim()) return 0;

  const env = readEnvFile(API_ENV);
  const smtp = {
    host: process.env.SMTP_HOST || env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || env.SMTP_USER,
    pass: process.env.SMTP_PASS || env.SMTP_PASS,
    service: process.env.SMTP_SERVICE || env.SMTP_SERVICE,
    fromName: process.env.EMAIL_FROM_NAME || env.EMAIL_FROM_NAME || 'BanjaraMatch deploy',
  };
  if (!smtp.user || !smtp.pass || !(smtp.host || smtp.service)) {
    process.stderr.write('[notify-mail] SMTP_* not configured in api.env\n');
    return 1;
  }

  let nodemailer;
  try {
    nodemailer = createRequire(path.join(ROOT, 'package.json'))('nodemailer');
  } catch {
    process.stderr.write('[notify-mail] nodemailer is not installed in the root node_modules\n');
    return 1;
  }
  const transportOpts = smtp.service && !smtp.host
    ? { service: smtp.service, auth: { user: smtp.user, pass: smtp.pass } }
    : { host: smtp.host, port: smtp.port, secure: smtp.port === 465, auth: { user: smtp.user, pass: smtp.pass } };
  const transport = nodemailer.createTransport({ ...transportOpts, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000 });
  const subject = `[banjaramatch] ${text.split('\n')[0].slice(0, 120)}`;
  await transport.sendMail({
    from: `"${smtp.fromName}" <${smtp.user}>`,
    to,
    subject,
    text: `${text}\n\n-- ${require('os').hostname()} ${new Date().toISOString()}`,
  });
  return 0;
}

main().then(
  (code) => process.exit(code),
  (e) => { process.stderr.write(`[notify-mail] ${e.message}\n`); process.exit(1); },
);
