const Gotra = require('../../models/Gotra');
const Clan = require('../../models/Clan');
const { suggestClansForGotras } = require('../../services/groqClanSuggestionService');

const SITEMAP_REGEN_URL = process.env.SITEMAP_REGEN_URL || 'http://localhost:4000/api/regenerate-sitemap';
const triggerSitemapRegeneration = (reason) => {
  require('axios').post(SITEMAP_REGEN_URL, {}, { timeout: 5000 })
    .then(() => console.log(`Sitemap regeneration triggered (${reason})`))
    .catch((error) => console.error(`Sitemap regeneration trigger failed (${reason}):`, error.message));
};

// Returns AI-suggested clan assignments for unassigned gotras. Read-only —
// never writes to the DB. Admin reviews results in the UI and calls
// applyClanSuggestions for the ones they approve.
const suggestClanForUnassignedGotras = async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ status: false, message: 'GROQ_API_KEY not configured on the server' });
    }

    const { gotraIds } = req.body || {};
    const filter = Array.isArray(gotraIds) && gotraIds.length
      ? { _id: { $in: gotraIds } }
      : { clan: null };

    const gotras = await Gotra.find(filter, '_id name').lean();
    if (gotras.length === 0) {
      return res.json({ status: true, data: [] });
    }

    const clans = await Clan.find({}, 'name').lean();
    const clanIdByName = {};
    clans.forEach((c) => { clanIdByName[c.name.toLowerCase()] = c._id; });

    const suggestions = await suggestClansForGotras(
      gotras.map((g) => ({ id: g._id.toString(), name: g.name })),
      process.env.GROQ_API_KEY,
      process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
    );

    const data = suggestions.map((s) => ({
      gotraId: s.id,
      name: s.name,
      suggestedClanId: s.clan ? (clanIdByName[s.clan.toLowerCase()] || null) : null,
      suggestedClanName: s.clan || null,
      confidence: s.confidence,
      reasoning: s.reasoning,
    }));

    res.json({ status: true, data });
  } catch (error) {
    console.error('AI gotra clan suggestion error:', error);
    res.status(500).json({ status: false, message: error.message || 'Server error' });
  }
};

// Applies admin-approved clan assignments. Body: { assignments: [{gotraId, clanId}] }
const applyClanSuggestions = async (req, res) => {
  try {
    const { assignments } = req.body || {};
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ status: false, message: 'No assignments provided' });
    }

    const ops = assignments
      .filter((a) => a.gotraId && a.clanId)
      .map((a) => ({
        updateOne: {
          filter: { _id: a.gotraId },
          update: { $set: { clan: a.clanId } },
        },
      }));

    if (ops.length === 0) {
      return res.status(400).json({ status: false, message: 'No valid assignments provided' });
    }

    const result = await Gotra.bulkWrite(ops);
    res.json({ status: true, message: 'Applied successfully', modifiedCount: result.modifiedCount });
    triggerSitemapRegeneration('ai-apply gotra clan assignments');
  } catch (error) {
    console.error('Apply AI gotra clan suggestions error:', error);
    res.status(500).json({ status: false, message: error.message || 'Server error' });
  }
};

module.exports = { suggestClanForUnassignedGotras, applyClanSuggestions };
