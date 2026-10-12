'use strict';
/**
 * test/helpers/harness.js — shared boot for the API suites (A9, integrator #14).
 *
 * Runner: node:test  (`NODE_ENV=test node --test test/`)
 * DB:     mongodb-memory-server, or MONGODB_URI_TEST when set (local mongod)
 * App:    createApp() from apps/api/app.js (A9.1). Until that file exists every
 *         suite calls test.skip, so `node --test` passes today.
 *
 * All heavy requires are lazy so this file can be loaded by the runner's
 * default `test/**` pattern without node_modules being installed.
 */
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
// A fixed secret keeps tokenFor() and the app in sync even without .env.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'banjaramatch-test-only-jwt-secret-0123456789abcdef0123456789abcdef';
}

const API_ROOT = path.resolve(__dirname, '..', '..');
const APP_PATH = path.join(API_ROOT, 'app.js');

function appAvailable() {
  return fs.existsSync(APP_PATH);
}

function depsAvailable() {
  try {
    require.resolve('supertest');
    require.resolve('mongoose');
    if (!process.env.MONGODB_URI_TEST) require.resolve('mongodb-memory-server');
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Register a skipped placeholder when the suite cannot run yet. Returns true
 * when the caller should define the real suite.
 */
function suiteReady(test, name) {
  if (!appAvailable()) {
    test.skip(`${name}: apps/api/app.js (createApp) not present yet — A9.1`, () => {});
    return false;
  }
  if (!depsAvailable()) {
    test.skip(`${name}: devDependencies (supertest/mongodb-memory-server) not installed`, () => {});
    return false;
  }
  return true;
}

let mongod = null;
let mongoose = null;
let appInstance = null;
let serverInstance = null;

async function startDb() {
  mongoose = require('mongoose');
  let uri = process.env.MONGODB_URI_TEST;
  if (!uri) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    uri = mongod.getUri('banjaramatch_test');
  }
  process.env.MONGODB_URI = uri;
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(uri);
  }
  return mongoose;
}

async function dropDb() {
  if (mongoose && mongoose.connection.readyState === 1) {
    await mongoose.connection.db.dropDatabase();
  }
}

/**
 * Returns something supertest can wrap. createApp() may return an express
 * app, an http server, or { app, server, io }.
 */
async function getApp() {
  if (appInstance) return appInstance;
  const mod = require(APP_PATH);
  const createApp = typeof mod === 'function' ? mod : mod.createApp;
  let result = createApp();
  if (result && typeof result.then === 'function') result = await result;
  if (result && result.app) {
    appInstance = result.app;
    serverInstance = result.server || null;
  } else {
    appInstance = result;
  }
  return appInstance;
}

function request() {
  const supertest = require('supertest');
  return supertest(appInstance);
}

async function stopAll() {
  try {
    if (serverInstance && typeof serverInstance.close === 'function' && serverInstance.listening) {
      await new Promise((r) => serverInstance.close(r));
    }
  } catch (_) {
    /* ignore */
  }
  try {
    if (mongoose && mongoose.connection.readyState !== 0) await mongoose.disconnect();
  } catch (_) {
    /* ignore */
  }
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
}

/** Deep-walk a JSON body and collect every string that looks like an ObjectId. */
function collectIds(value, out = new Set()) {
  if (value === null || value === undefined) return out;
  if (typeof value === 'string') {
    if (/^[0-9a-f]{24}$/i.test(value)) out.add(value.toLowerCase());
    return out;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectIds(v, out);
    return out;
  }
  if (typeof value === 'object') {
    for (const v of Object.values(value)) collectIds(v, out);
  }
  return out;
}

/** Deep-walk and collect every object that has a `gender` key. */
function collectProfiles(value, out = []) {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) {
    for (const v of value) collectProfiles(v, out);
    return out;
  }
  if ('gender' in value && ('_id' in value || 'full_name' in value)) out.push(value);
  for (const v of Object.values(value)) collectProfiles(v, out);
  return out;
}

function listData(body) {
  if (!body) return [];
  if (Array.isArray(body.data)) return body.data;
  if (body.data && Array.isArray(body.data.users)) return body.data.users;
  if (body.data && Array.isArray(body.data.matches)) return body.data.matches;
  if (body.data && Array.isArray(body.data.profiles)) return body.data.profiles;
  if (Array.isArray(body.users)) return body.users;
  return [];
}

module.exports = {
  API_ROOT,
  APP_PATH,
  appAvailable,
  depsAvailable,
  suiteReady,
  startDb,
  dropDb,
  getApp,
  request,
  stopAll,
  collectIds,
  collectProfiles,
  listData,
};
