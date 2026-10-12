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
    const item = new Model(req.body);
    await item.save();
    res.json({ status: true, message: 'Created successfully', data: item });
    if (notifySitemap) triggerSitemapRegeneration(`create ${Model.modelName}`);
  } catch (error) {
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
    const item = await Model.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

    if (!item) {
      return res.status(404).json({ status: false, message: 'Item not found' });
    }

    res.json({ status: true, message: 'Updated successfully', data: item });
    if (notifySitemap) triggerSitemapRegeneration(`update ${Model.modelName}`);
  } catch (error) {
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
    const item = await Model.findByIdAndDelete(id);

    if (!item) {
      return res.status(404).json({ status: false, message: 'Item not found' });
    }

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
