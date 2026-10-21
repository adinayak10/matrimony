'use strict';
/**
 * controllers/FaqController.js — public FAQ (feature expansion A3).
 *
 *   POST /api/fetchFAQs   (public; the app's FaqCategoriesModel)
 *   GET  /api/faqs        (public; website, Cache-Control public, max-age=300)
 *
 * Shape: [{ id, _id, title, is_deleted:0, created_at, updated_at,
 *           faqs:[{ id, _id, faqs_type_id, question, answer, created_at, updated_at }] }]
 * `id` / `faqs_type_id` are NUMBERS (1-based positions; the Dart model reads
 * them as num): category id = its position, faq id = running position across
 * all categories, faqs_type_id = the category's id. Active rows only; empty
 * categories are left out. No seeded content: an empty list is normal.
 */
const FaqCategory = require('../models/FaqCategory');
const Faq = require('../models/Faq');

async function buildFaqTree() {
  const [cats, faqs] = await Promise.all([
    FaqCategory.find({ isActive: true }).sort({ order: 1, createdAt: 1, _id: 1 }).lean(),
    Faq.find({ isActive: true }).sort({ order: 1, createdAt: 1, _id: 1 }).lean(),
  ]);
  const byCat = new Map();
  for (const f of faqs) {
    const k = String(f.category);
    if (!byCat.has(k)) byCat.set(k, []);
    byCat.get(k).push(f);
  }
  const out = [];
  let faqPos = 0;
  for (const c of cats) {
    const list = byCat.get(String(c._id));
    if (!list || !list.length) continue;
    const catId = out.length + 1;
    out.push({
      id: catId,
      _id: c._id,
      title: c.title,
      is_deleted: 0,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
      faqs: list.map((f) => {
        faqPos += 1;
        return {
          id: faqPos,
          _id: f._id,
          faqs_type_id: catId,
          question: f.question,
          answer: f.answer,
          created_at: f.createdAt,
          updated_at: f.updatedAt,
        };
      }),
    });
  }
  return out;
}

async function fetchFAQs(req, res) {
  try {
    const data = await buildFaqTree();
    return res.json({ status: true, message: 'FAQs', data });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[fetchFAQs]', err.message);
    return res.status(500).json({ status: false, message: 'Server error', data: [] });
  }
}

async function getFaqs(req, res) {
  try {
    const data = await buildFaqTree();
    res.set('Cache-Control', 'public, max-age=300');
    return res.json({ status: true, message: 'FAQs', data });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[faqs]', err.message);
    return res.status(500).json({ status: false, message: 'Server error', data: [] });
  }
}

module.exports = { buildFaqTree, fetchFAQs, getFaqs };
