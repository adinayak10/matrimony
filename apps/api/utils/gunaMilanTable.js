/**
 * Simplified Guna Milan (horoscope compatibility) reference data.
 *
 * This is NOT a full Vedic Ashtakoot (36-guna) calculation — that requires
 * precise birth time/place plus ephemeris/panchang computation (or a paid
 * third-party astrology API), which is a real vendor/build decision outside
 * this pass. This is a deterministic, static simplification covering two of
 * the eight traditional kootas that don't require exact birth time:
 *
 *  - Rashi Koota (Moon-sign compatibility, based on the distance between
 *    the two Rashis on the zodiac wheel)
 *  - Gana Koota (temperament grouping — each Nakshatra belongs to one of
 *    three Ganas: Deva, Manushya, or Rakshasa)
 *
 * No external API calls, no per-lookup cost. The scoring function below
 * (computeGunaMilan) is designed so a future real Ashtakoot engine could
 * be swapped in behind the same return shape without breaking callers.
 */

const RASHIS = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya',
  'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meena',
];

const NAKSHATRA_GANA = {
  'Ashwini': 'Deva',
  'Bharani': 'Manushya',
  'Krittika': 'Rakshasa',
  'Rohini': 'Manushya',
  'Mrigashira': 'Deva',
  'Ardra': 'Manushya',
  'Punarvasu': 'Deva',
  'Pushya': 'Deva',
  'Ashlesha': 'Rakshasa',
  'Magha': 'Rakshasa',
  'Purva Phalguni': 'Manushya',
  'Uttara Phalguni': 'Manushya',
  'Hasta': 'Deva',
  'Chitra': 'Rakshasa',
  'Swati': 'Deva',
  'Vishakha': 'Rakshasa',
  'Anuradha': 'Deva',
  'Jyeshtha': 'Rakshasa',
  'Mula': 'Rakshasa',
  'Purva Ashadha': 'Manushya',
  'Uttara Ashadha': 'Manushya',
  'Shravana': 'Deva',
  'Dhanishta': 'Rakshasa',
  'Shatabhisha': 'Rakshasa',
  'Purva Bhadrapada': 'Manushya',
  'Uttara Bhadrapada': 'Manushya',
  'Revati': 'Deva',
};

const NAKSHATRA_LIST = Object.keys(NAKSHATRA_GANA);

/** Distance from rashi A to rashi B going forward around the wheel, 1-12. */
function rashiDistance(fromIdx, toIdx) {
  return ((toIdx - fromIdx + 12) % 12) + 1;
}

function scoreRashi(rashi1, rashi2) {
  const idx1 = RASHIS.indexOf(rashi1);
  const idx2 = RASHIS.indexOf(rashi2);
  if (idx1 === -1 || idx2 === -1) return null;

  const d1 = rashiDistance(idx1, idx2);
  const d2 = rashiDistance(idx2, idx1);

  if (d1 === 1) return { points: 4, max: 4, label: 'Same Rashi — excellent temperament match' };
  if ([5, 9].includes(d1) || [5, 9].includes(d2)) return { points: 4, max: 4, label: 'Trine Rashis — excellent match' };
  if ([6, 8].includes(d1) || [6, 8].includes(d2)) return { points: 0, max: 4, label: 'Shadashtak relationship — traditionally considered inauspicious' };
  if ([2, 12].includes(d1) || [2, 12].includes(d2)) return { points: 1, max: 4, label: 'Dwirdwadash relationship — traditionally considered challenging' };
  if ([3, 11].includes(d1) || [3, 11].includes(d2)) return { points: 3, max: 4, label: 'Supportive Rashis — good match' };
  if (d1 === 7) return { points: 2, max: 4, label: 'Opposite Rashis — neutral match' };
  return { points: 2, max: 4, label: 'Neutral Rashi relationship' };
}

function scoreGana(nakshatra1, nakshatra2) {
  const gana1 = NAKSHATRA_GANA[nakshatra1];
  const gana2 = NAKSHATRA_GANA[nakshatra2];
  if (!gana1 || !gana2) return null;

  if (gana1 === gana2) return { points: 4, max: 4, label: `Both ${gana1} Gana — excellent temperament match` };
  const pair = [gana1, gana2].sort().join('-');
  if (pair === 'Deva-Manushya') return { points: 3, max: 4, label: 'Deva-Manushya Gana — good match' };
  if (pair === 'Manushya-Rakshasa') return { points: 2, max: 4, label: 'Manushya-Rakshasa Gana — moderate match' };
  return { points: 0, max: 4, label: 'Deva-Rakshasa Gana — traditionally considered least compatible' };
}

/**
 * Compute a simplified compatibility score between two horoscope profiles.
 * Returns null for any koota where required data is missing on either side
 * — callers should render "not enough info" rather than treating a null
 * koota as a bad score.
 */
function computeGunaMilan(horoscope1, horoscope2) {
  const rashiScore = (horoscope1?.rashi && horoscope2?.rashi)
    ? scoreRashi(horoscope1.rashi, horoscope2.rashi)
    : null;
  const ganaScore = (horoscope1?.nakshatra && horoscope2?.nakshatra)
    ? scoreGana(horoscope1.nakshatra, horoscope2.nakshatra)
    : null;

  const kootas = [];
  if (rashiScore) kootas.push({ name: 'Rashi (Moon sign)', ...rashiScore });
  if (ganaScore) kootas.push({ name: 'Gana (temperament)', ...ganaScore });

  if (kootas.length === 0) {
    return { available: false, kootas: [], totalPoints: 0, maxPoints: 0, percentage: null };
  }

  const totalPoints = kootas.reduce((s, k) => s + k.points, 0);
  const maxPoints = kootas.reduce((s, k) => s + k.max, 0);

  return {
    available: true,
    kootas,
    totalPoints,
    maxPoints,
    percentage: Math.round((totalPoints / maxPoints) * 100),
    note: 'Simplified Rashi + Gana compatibility only — not a full 36-guna Ashtakoot reading.',
  };
}

module.exports = { RASHIS, NAKSHATRA_LIST, NAKSHATRA_GANA, computeGunaMilan };
