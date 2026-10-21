'use strict';
/**
 * controllers/admin/faqController.js — FAQ management (feature expansion A3).
 *
 *   GET    /api/admin/faq-categories          (with faqCount)
 *   POST   /api/admin/faq-categories          {title, order?, isActive?}
 *   PUT    /api/admin/faq-categories/:id
 *   DELETE /api/admin/faq-categories/:id      409 FAQS_EXIST while it still has faqs
 *   GET    /api/admin/faqs?category
 *   POST   /api/admin/faqs                    {category, question, answer, isActive?, order?}
 *   PUT    /api/admin/faqs/:id
 *   DELETE /api/admin/faqs/:id
 *   POST   /api/admin/faqs/reorder            {ids}  order = position in ids
 *
 * Lists are small and returned whole (pagination reports one page).
 */
const mongoose = require('mongoose');
const FaqCategory = require('../../models/FaqCategory');
const Faq = require('../../models/Faq');
const { record: audit } = require('../../services/auditLog');
const { text } = require('../SuccessStoryController');

function notFound(res, what) {
  return res.status(404).json({ status: false, code: 'NOT_FOUND', message: `${what} not found` });
}
function invalid(res, message) {
  return res.status(400).json({ status: false, code: 'VALIDATION_ERROR', message });
}
function onePage(rows) {
  return { total: rows.length, page: 1, limit: rows.length, pages: rows.length ? 1 : 0 };
}
function bool(v) {
  if (v === true || v === 'true' || v === 1 || v === '1') return true;
  if (v === false || v === 'false' || v === 0 || v === '0') return false;
  return undefined;
}
function orderOf(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(n, 100000)) : undefined;
}

/* ---------- categories ---------- */

function readCategory(b, partial) {
  const fields = {};
  if (b.title !== undefined || !partial) {
    const t = text(b.title, 121);
    if (!t) return { error: 'title is required' };
    if (t.length > 120) return { error: 'title must be at most 120 characters' };
    fields.title = t;
  }
  if (b.order !== undefined) {
    const o = orderOf(b.order);
    if (o === undefined) return { error: 'order must be a number' };
    fields.order = o;
  }
  if (b.isActive !== undefined) {
    const a = bool(b.isActive);
    if (a === undefined) return { error: 'isActive must be true or false' };
    fields.isActive = a;
  }
  return { fields };
}

exports.listCategories = async (req, res) => {
  try {
    const [cats, counts] = await Promise.all([
      FaqCategory.find().sort({ order: 1, createdAt: 1, _id: 1 }).lean(),
      Faq.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    ]);
    const map = new Map(counts.map((c) => [String(c._id), c.count]));
    const rows = cats.map((c) => ({ ...c, faqCount: map.get(String(c._id)) || 0 }));
    return res.json({ status: true, data: rows, pagination: onePage(rows) });
  } catch (err) {
    console.error('[admin faq-categories list]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const r = readCategory(req.body || {}, false);
    if (r.error) return invalid(res, r.error);
    if (r.fields.order === undefined) {
      const last = await FaqCategory.findOne().sort({ order: -1 }).select('order').lean();
      r.fields.order = last ? (last.order || 0) + 1 : 0;
    }
    const doc = await FaqCategory.create(r.fields);
    audit(req, 'faqCategory.create', { type: 'faqCategory', id: doc._id }, { after: r.fields });
    return res.status(201).json({ status: true, data: { ...doc.toObject(), faqCount: 0 } });
  } catch (err) {
    console.error('[admin faq-categories create]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res, 'Category');
    const r = readCategory(req.body || {}, true);
    if (r.error) return invalid(res, r.error);
    const doc = await FaqCategory.findById(req.params.id);
    if (!doc) return notFound(res, 'Category');
    const before = {};
    for (const k of Object.keys(r.fields)) before[k] = doc[k];
    Object.assign(doc, r.fields);
    await doc.save();
    audit(req, 'faqCategory.update', { type: 'faqCategory', id: doc._id }, { before, after: r.fields });
    return res.json({ status: true, data: doc.toObject() });
  } catch (err) {
    console.error('[admin faq-categories update]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res, 'Category');
    const inUse = await Faq.countDocuments({ category: req.params.id });
    if (inUse) {
      return res.status(409).json({ status: false, code: 'FAQS_EXIST', message: `This category still has ${inUse} FAQ(s); move or delete them first` });
    }
    const doc = await FaqCategory.findByIdAndDelete(req.params.id).lean();
    if (!doc) return notFound(res, 'Category');
    audit(req, 'faqCategory.delete', { type: 'faqCategory', id: doc._id }, { before: { title: doc.title } });
    return res.json({ status: true, data: { _id: doc._id, deleted: true } });
  } catch (err) {
    console.error('[admin faq-categories delete]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

/* ---------- faqs ---------- */

async function readFaq(b, partial) {
  const fields = {};
  if (b.category !== undefined || !partial) {
    if (!b.category || !mongoose.isValidObjectId(b.category)) return { error: 'category is required' };
    if (!(await FaqCategory.exists({ _id: b.category }))) return { error: 'category does not exist' };
    fields.category = b.category;
  }
  if (b.question !== undefined || !partial) {
    const q = text(b.question, 301);
    if (!q) return { error: 'question is required' };
    if (q.length > 300) return { error: 'question must be at most 300 characters' };
    fields.question = q;
  }
  if (b.answer !== undefined || !partial) {
    const a = text(b.answer, 5001);
    if (!a) return { error: 'answer is required' };
    if (a.length > 5000) return { error: 'answer must be at most 5000 characters' };
    fields.answer = a;
  }
  if (b.order !== undefined) {
    const o = orderOf(b.order);
    if (o === undefined) return { error: 'order must be a number' };
    fields.order = o;
  }
  if (b.isActive !== undefined) {
    const a = bool(b.isActive);
    if (a === undefined) return { error: 'isActive must be true or false' };
    fields.isActive = a;
  }
  return { fields };
}

exports.listFaqs = async (req, res) => {
  try {
    const query = {};
    if (req.query.category) {
      if (!mongoose.isValidObjectId(req.query.category)) return res.json({ status: true, data: [], pagination: onePage([]) });
      query.category = req.query.category;
    }
    const rows = await Faq.find(query).sort({ order: 1, createdAt: 1, _id: 1 }).populate('category', 'title').lean();
    return res.json({ status: true, data: rows, pagination: onePage(rows) });
  } catch (err) {
    console.error('[admin faqs list]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.createFaq = async (req, res) => {
  try {
    const r = await readFaq(req.body || {}, false);
    if (r.error) return invalid(res, r.error);
    if (r.fields.order === undefined) {
      const last = await Faq.findOne({ category: r.fields.category }).sort({ order: -1 }).select('order').lean();
      r.fields.order = last ? (last.order || 0) + 1 : 0;
    }
    const doc = await Faq.create(r.fields);
    audit(req, 'faq.create', { type: 'faq', id: doc._id }, { after: { question: doc.question, category: String(doc.category) } });
    return res.status(201).json({ status: true, data: doc.toObject() });
  } catch (err) {
    console.error('[admin faqs create]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.updateFaq = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res, 'FAQ');
    const doc = await Faq.findById(req.params.id);
    if (!doc) return notFound(res, 'FAQ');
    const r = await readFaq(req.body || {}, true);
    if (r.error) return invalid(res, r.error);
    const before = {};
    for (const k of Object.keys(r.fields)) before[k] = doc[k];
    Object.assign(doc, r.fields);
    await doc.save();
    audit(req, 'faq.update', { type: 'faq', id: doc._id }, { before, after: r.fields });
    return res.json({ status: true, data: doc.toObject() });
  } catch (err) {
    console.error('[admin faqs update]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.deleteFaq = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res, 'FAQ');
    const doc = await Faq.findByIdAndDelete(req.params.id).lean();
    if (!doc) return notFound(res, 'FAQ');
    audit(req, 'faq.delete', { type: 'faq', id: doc._id }, { before: { question: doc.question } });
    return res.json({ status: true, data: { _id: doc._id, deleted: true } });
  } catch (err) {
    console.error('[admin faqs delete]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.reorderFaqs = async (req, res) => {
  try {
    const ids = (req.body || {}).ids;
    if (!Array.isArray(ids) || !ids.length || ids.length > 500) return invalid(res, 'ids must be a non-empty array');
    if (!ids.every((id) => mongoose.isValidObjectId(id))) return invalid(res, 'ids must be FAQ ids');
    if (new Set(ids.map(String)).size !== ids.length) return invalid(res, 'ids must not repeat');
    const found = await Faq.countDocuments({ _id: { $in: ids } });
    if (found !== ids.length) return invalid(res, 'Some FAQs were not found');
    await Faq.bulkWrite(ids.map((id, i) => ({ updateOne: { filter: { _id: id }, update: { $set: { order: i } } } })));
    audit(req, 'faq.reorder', { type: 'faq', id: null }, { after: { ids: ids.map(String) } });
    const rows = await Faq.find({ _id: { $in: ids } }).sort({ order: 1 }).select('_id order category').lean();
    return res.json({ status: true, data: rows });
  } catch (err) {
    console.error('[admin faqs reorder]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};
