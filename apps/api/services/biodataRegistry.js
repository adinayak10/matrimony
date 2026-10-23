'use strict';
/**
 * services/biodataRegistry.js — the kit's template registry joined with the
 * admin overrides (BiodataTemplateMeta), cached 60 s.
 *
 *   listPublic()        active rows, ordered: [{templateId,slug,name,tagline,description,
 *                       categories,category,tags,culture,archetype,thumbnail,isFeatured,order}]
 *   listAdmin()         every registry template + isActive, registryName, overrides, hasOverrides
 *   categories(rows?)   K.registry.CATEGORIES + count of active templates in each
 *   isKnown(id)         the kit has this template
 *   isActive(id)        known and not switched off by an admin
 *   invalidate()        drop the cache (admin writes)
 *
 * Nothing runs at require time.
 */
const { kit } = require('./biodataKit');

const TTL_MS = 60 * 1000;
let cache = null;
let cachedAt = 0;
let inflight = null;

function nameOf(n) {
  if (typeof n === 'string') return n;
  if (n && typeof n === 'object') return String(n.en || Object.values(n)[0] || '');
  return '';
}

function registryRows() {
  const K = kit();
  const rows = typeof K.registry.summary === 'function' ? K.registry.summary() : [];
  return rows.map((s, index) => ({ s, index }));
}

function merge({ s, index }, meta) {
  const m = meta || {};
  const categories = Array.isArray(s.categories) ? s.categories.slice() : [];
  const registryName = nameOf(s.name);
  const hasOrder = typeof m.order === 'number' && Number.isFinite(m.order);
  return {
    templateId: s.id,
    slug: s.slug || s.id,
    name: (m.displayName && m.displayName.trim()) || registryName,
    tagline: s.tagline || '',
    description: (m.description && m.description.trim()) || s.tagline || '',
    categories,
    category: m.category || categories[0] || '',
    tags: Array.isArray(m.tags) && m.tags.length ? m.tags.slice() : Array.isArray(s.tags) ? s.tags.slice() : [],
    culture: s.culture || '',
    archetype: s.archetype || '',
    thumbnail: m.thumbnailUrl || s.thumbnail || `/images/biodata/${s.id}.webp`,
    isFeatured: !!m.isFeatured,
    order: hasOrder ? m.order : 1000 + index,
    // admin-only fields (stripped by publicRow)
    isActive: m.isActive !== false,
    registryName,
    // the kit's own values (admin shows them as the defaults behind the overrides)
    registry: {
      name: registryName,
      description: s.tagline || '',
      category: categories[0] || '',
      tags: Array.isArray(s.tags) ? s.tags.slice() : [],
      thumbnail: s.thumbnail || `/images/biodata/${s.id}.webp`,
    },
    registryIndex: index,
    hasOverrides: !!meta,
    overrides: meta
      ? {
          isActive: m.isActive !== false,
          isFeatured: !!m.isFeatured,
          order: hasOrder ? m.order : null,
          displayName: m.displayName || '',
          description: m.description || '',
          category: m.category || '',
          tags: Array.isArray(m.tags) ? m.tags.slice() : [],
          thumbnailUrl: m.thumbnailUrl || '',
          updatedAt: m.updatedAt || null,
        }
      : null,
  };
}

function publicRow(r) {
  return {
    templateId: r.templateId,
    slug: r.slug,
    name: r.name,
    tagline: r.tagline,
    description: r.description,
    categories: r.categories,
    category: r.category,
    tags: r.tags,
    culture: r.culture,
    archetype: r.archetype,
    thumbnail: r.thumbnail,
    isFeatured: r.isFeatured,
    order: r.order,
  };
}

function sortRows(rows) {
  return rows.sort((a, b) => a.order - b.order || a.registryIndex - b.registryIndex);
}

async function load() {
  // eslint-disable-next-line global-require
  const BiodataTemplateMeta = require('../models/BiodataTemplateMeta');
  const metas = await BiodataTemplateMeta.find().lean();
  const byId = new Map(metas.map((m) => [m.templateId, m]));
  const rows = sortRows(registryRows().map((r) => merge(r, byId.get(r.s.id))));
  cache = rows;
  cachedAt = Date.now();
  return rows;
}

async function allRows({ fresh = false } = {}) {
  if (!fresh && cache && Date.now() - cachedAt < TTL_MS) return cache;
  if (!fresh && inflight) return inflight;
  inflight = load().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function listPublic() {
  const rows = await allRows();
  return rows.filter((r) => r.isActive).map(publicRow);
}

async function listAdmin() {
  return (await allRows({ fresh: true })).map((r) => ({ ...r }));
}

function categoryList() {
  const K = kit();
  return Array.isArray(K.registry.CATEGORIES) ? K.registry.CATEGORIES : [];
}

function categorySlugs() {
  return categoryList().map((c) => c.slug);
}

/** Categories with the number of ACTIVE templates in each (public rows or admin rows). */
function categories(rows) {
  const active = (rows || []).filter((r) => r.isActive !== false);
  return categoryList().map((c) => ({
    slug: c.slug,
    name: c.name,
    description: c.description || '',
    count: active.filter((r) => r.category === c.slug || (r.categories || []).includes(c.slug)).length,
  }));
}

function isKnown(id) {
  if (!id || typeof id !== 'string') return false;
  try {
    return !!kit().registry.get(id);
  } catch (_) {
    return false;
  }
}

async function isActive(id) {
  if (!isKnown(id)) return false;
  const rows = await allRows();
  const row = rows.find((r) => r.templateId === id);
  return !!(row && row.isActive);
}

function invalidate() {
  cache = null;
  cachedAt = 0;
}

module.exports = { listPublic, listAdmin, categories, categorySlugs, isKnown, isActive, invalidate, publicRow, nameOf, TTL_MS };
