// Admin Constants Management Controller
const axios = require('axios');
const Caste = require('../../models/Caste');
const Gotra = require('../../models/Gotra');
const Clan = require('../../models/Clan');
const SurnameTitle = require('../../models/SurnameTitle');
const Profession = require('../../models/Profession');
const Qualification = require('../../models/Qualification');
const IncomeRange = require('../../models/IncomeRange');
const Interest = require('../../models/Interest');
const ReportReason = require('../../models/ReportReason');
const AboutOption = require('../../models/AboutOption');
const User = require('../../models/User');
const mongoose = require('mongoose');
const { record: audit } = require('../../services/auditLog');

// C4.10: references that must be 0 before a constant may be deleted
const USAGE_COUNTERS = {
  Caste: (id) => User.countDocuments({ $or: [{ caste: id }, { 'preferences.caste': id }] }),
  Gotra: (id) => User.countDocuments({ $or: [{ gotra: id }, { 'family.motherGotra': id }, { 'preferences.gotra': id }] }),
  Clan: (id) => Gotra.countDocuments({ clan: id }),
  Profession: (id) => User.countDocuments({ $or: [{ profession: id }, { 'preferences.profession': id }] }),
  Qualification: (id) => User.countDocuments({ $or: [{ qualification: id }, { 'preferences.qualification': id }] }),
  IncomeRange: (id) => User.countDocuments({ $or: [{ incomeRange: id }, { 'family.incomeRange': id }] }),
  Interest: (id) => User.countDocuments({ interests: id }),
};

// Clan/Gotra/SurnameTitle changes feed the public banjara-gotra-list page,
// so regenerate the sitemap right away instead of waiting for the 6-hour cron.
// Fire-and-forget — never blocks the admin response on the web app being up.
const SITEMAP_REGEN_URL = process.env.SITEMAP_REGEN_URL || 'http://localhost:4000/api/regenerate-sitemap';
const triggerSitemapRegeneration = (reason) => {
  axios.post(SITEMAP_REGEN_URL, {}, { timeout: 5000 })
    .then(() => console.log(`Sitemap regeneration triggered (${reason})`))
    .catch((error) => console.error(`Sitemap regeneration trigger failed (${reason}):`, error.message));
};

/**
 * A unique-index clash or a schema validation failure is the admin's input,
 * not a server fault: answer 409 / 400 with a message the panel can show.
 * Returns true when it handled the error.
 */
function sendWriteError(res, error, Model) {
  if (error && error.code === 11000) {
    res.status(409).json({ status: false, code: 'DUPLICATE', message: `A ${Model.modelName} with that name already exists` });
    return true;
  }
  if (error && (error.name === 'ValidationError' || error.name === 'CastError')) {
    const first = error.errors ? Object.values(error.errors)[0] : null;
    res.status(400).json({ status: false, code: 'INVALID', message: (first && first.message) || 'Invalid value' });
    return true;
  }
  return false;
}

/**
 * Generic function to get all items (with optional populate)
 */
const getAllItems = (Model, populateField) => async (req, res) => {
  try {
    let query = Model.find().sort({ name: 1 });
    if (populateField) query = query.populate(populateField);
    const items = await query;
    res.json({ status: true, data: items });
  } catch (error) {
    console.error(`Get all ${Model.modelName} error:`, error);
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};

/**
 * Generic function to create item
 */
const createItem = (Model, notifySitemap) => async (req, res) => {
  try {
    const body = { ...(req.body || {}) };
    delete body._id;
    const item = new Model(body);
    await item.save();
    audit(req, 'constant.create', { type: Model.modelName, id: item._id }, { after: body });
    res.json({ status: true, message: 'Created successfully', data: item });
    if (notifySitemap) triggerSitemapRegeneration(`create ${Model.modelName}`);
  } catch (error) {
    if (sendWriteError(res, error, Model)) return;
    console.error(`Create ${Model.modelName} error:`, error);
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};

/**
 * Generic function to update item
 */
const updateItem = (Model, notifySitemap) => async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ status: false, message: 'Item not found' });
    const body = { ...(req.body || {}) };
    delete body._id;
    const item = await Model.findByIdAndUpdate(id, { $set: body }, { new: true, runValidators: true });

    if (!item) {
      return res.status(404).json({ status: false, message: 'Item not found' });
    }

    audit(req, 'constant.update', { type: Model.modelName, id }, { after: body });
    res.json({ status: true, message: 'Updated successfully', data: item });
    if (notifySitemap) triggerSitemapRegeneration(`update ${Model.modelName}`);
  } catch (error) {
    if (sendWriteError(res, error, Model)) return;
    console.error(`Update ${Model.modelName} error:`, error);
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};

/**
 * Generic function to delete item
 */
const deleteItem = (Model, notifySitemap) => async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ status: false, message: 'Item not found' });

    // C4.10: refuse while members still reference it
    const counter = USAGE_COUNTERS[Model.modelName];
    if (counter) {
      const inUse = await counter(id);
      if (inUse > 0) {
        return res.status(409).json({ status: false, code: 'IN_USE', inUse, message: `Cannot delete: in use by ${inUse} record(s)` });
      }
    }

    const item = await Model.findByIdAndDelete(id);

    if (!item) {
      return res.status(404).json({ status: false, message: 'Item not found' });
    }

    audit(req, 'constant.delete', { type: Model.modelName, id }, { before: item.toObject ? item.toObject() : item });
    res.json({ status: true, message: 'Deleted successfully' });
    if (notifySitemap) triggerSitemapRegeneration(`delete ${Model.modelName}`);
  } catch (error) {
    console.error(`Delete ${Model.modelName} error:`, error);
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};

// Export CRUD operations for each constant type
module.exports = {
  // Castes
  getAllCastes: getAllItems(Caste),
  createCaste: createItem(Caste),
  updateCaste: updateItem(Caste),
  deleteCaste: deleteItem(Caste),

  // Clans
  getAllClans: getAllItems(Clan),
  createClan: createItem(Clan, true),
  updateClan: updateItem(Clan, true),
  deleteClan: deleteItem(Clan, true),

  // Gotras (populate clan)
  getAllGotras: getAllItems(Gotra, 'clan'),
  createGotra: createItem(Gotra, true),
  updateGotra: updateItem(Gotra, true),
  deleteGotra: deleteItem(Gotra, true),

  // Surname Titles (cross-clan honorifics like Naik, Rao, Raju)
  getAllSurnameTitles: getAllItems(SurnameTitle),
  createSurnameTitle: createItem(SurnameTitle, true),
  updateSurnameTitle: updateItem(SurnameTitle, true),
  deleteSurnameTitle: deleteItem(SurnameTitle, true),

  // Professions
  getAllProfessions: getAllItems(Profession),
  createProfession: createItem(Profession),
  updateProfession: updateItem(Profession),
  deleteProfession: deleteItem(Profession),

  // Qualifications
  getAllQualifications: getAllItems(Qualification),
  createQualification: createItem(Qualification),
  updateQualification: updateItem(Qualification),
  deleteQualification: deleteItem(Qualification),

  // Income Ranges
  getAllIncomeRanges: getAllItems(IncomeRange),
  createIncomeRange: createItem(IncomeRange),
  updateIncomeRange: updateItem(IncomeRange),
  deleteIncomeRange: deleteItem(IncomeRange),

  // Interests
  getAllInterests: getAllItems(Interest),
  createInterest: createItem(Interest),
  updateInterest: updateItem(Interest),
  deleteInterest: deleteItem(Interest),

  // Report Reasons
  getAllReportReasons: getAllItems(ReportReason),
  createReportReason: createItem(ReportReason),
  updateReportReason: updateItem(ReportReason),
  deleteReportReason: deleteItem(ReportReason),

  // About Options
  getAllAboutOptions: getAllItems(AboutOption),
  createAboutOption: createItem(AboutOption),
  updateAboutOption: updateItem(AboutOption),
  deleteAboutOption: deleteItem(AboutOption)
};
