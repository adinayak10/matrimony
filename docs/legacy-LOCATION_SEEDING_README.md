# Location Seeding Documentation

## Overview
This document describes the improved location seeding system that imports country, state, and city data from `cities.json` with **deterministic IDs** that remain consistent across multiple seeding runs.

## Key Features

### 1. Deterministic ID Generation
- Uses MD5 hashing to generate consistent MongoDB ObjectIDs
- Same location will always get the same ID across re-seeding
- Prevents duplicate data and maintains referential integrity

### 2. Data Hierarchy
```
Country (India)
  └── States (35 states)
       └── Cities (528 cities per state)
```

### 3. Extended City Data
The City model now stores additional metadata from `cities.json`:

| Field | Type | Description |
|-------|------|-------------|
| `name` | String | City name (required) |
| `state` | ObjectId | Reference to State (required) |
| `district` | String | District name |
| `latitude` | Number | Geographic coordinate |
| `longitude` | Number | Geographic coordinate |
| `population` | Number | City population |
| `stdCode` | String | STD telephone code |
| `gstStateCode` | String | GST state code |
| `iso31662` | String | ISO 3166-2 code |
| `altitude` | Number | Altitude in meters |
| `rank` | Number | City ranking |

## How It Works

### Deterministic ID Generation
```javascript
function generateDeterministicId(str) {
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return hash.substring(0, 24); // MongoDB ObjectId is 24 hex characters
}
```

### ID Strategy
- **Country ID**: Hash of `"India"`
- **State ID**: Hash of `"India-{StateName}"`
- **City ID**: Hash of `"{StateName}-{CityName}"`

This ensures:
- ✅ Same ID every time you re-seed
- ✅ No duplicates
- ✅ Consistent relationships between Country → State → City

## Usage

### Run Complete Seeding
```bash
cd /var/www/api.banjaramatch.com
node seed.js
```

### Run Only Location Seeding
```javascript
const { seedLocations } = require('./seed');
await seedLocations();
```

### What Gets Seeded
1. **Country**: India (1 country)
2. **States**: 35 Indian states from JSON
3. **Cities**: 528 cities with full metadata

### Re-Seeding Behavior
When you run the seed script again:
- ✅ Existing locations are detected and **NOT** duplicated
- ✅ New locations are added with deterministic IDs
- ✅ Existing locations keep their original IDs
- ✅ Safe to run multiple times

## Data Source
- **File**: `/var/www/api.banjaramatch.com/controllers/cities.json`
- **Format**: Array of city objects
- **Structure**:
```json
{
  "id": 1,
  "city": "Mumbai",
  "district": "Mumbai",
  "state": "Maharashtra",
  "std-code": "022",
  "gst-state-code": "27",
  "iso_3166-2": "IN-MH",
  "population": 12442373,
  "rank": 1,
  "latitude": 19.076,
  "longitude": 72.8777,
  "altitude": 14
}
```

## API Integration
Your existing city listing APIs will continue to work without changes:

```javascript
// Get cities by state
const cities = await City.find({ state: stateId }).populate('state');

// Get states by country
const states = await State.find({ country: countryId }).populate('country');

// Get all cities with geo data
const citiesWithGeo = await City.find({
  latitude: { $ne: null },
  longitude: { $ne: null }
});
```

## Benefits

### Before (Old System)
- ❌ New random IDs on each seed
- ❌ Potential duplicates
- ❌ Lost city metadata (lat/long, population)
- ❌ Inconsistent state/country relationships

### After (New System)
- ✅ Consistent IDs across seeding runs
- ✅ No duplicates possible
- ✅ Full city metadata preserved
- ✅ Reliable Country → State → City hierarchy
- ✅ District excluded from hierarchy (as requested)

## Database Statistics

After seeding, you'll have:
- **Countries**: 1 (India)
- **States**: 35
- **Cities**: 528 (all from `cities.json`)

```bash
# Verify counts
mongo aasd --eval "db.countries.count()"  # Should show 1
mongo aasd --eval "db.states.count()"     # Should show 35
mongo aasd --eval "db.cities.count()"     # Should show 528
```

## Troubleshooting

### Issue: Duplicate Key Error
If you see `E11000 duplicate key error`, it means:
- A location already exists with that name
- The script will skip it and continue
- This is **normal behavior** and safe

### Issue: Missing Cities
Check if `cities.json` is complete:
```bash
node -e "console.log(require('./controllers/cities.json').length)"
```

### Issue: Wrong ID After Re-Seed
This should NOT happen. If it does:
1. Check that deterministic ID function is being used
2. Verify the input string to `generateDeterministicId()` is consistent
3. Clear collections and re-seed:
```bash
# CAUTION: This deletes all location data
mongo aasd --eval "db.cities.deleteMany({}); db.states.deleteMany({}); db.countries.deleteMany({});"
node seed.js
```

## Future Enhancements
- Add more countries beyond India
- Support for multiple languages (city names in Hindi, Marathi, etc.)
- Geocoding verification for lat/long accuracy
- Population data updates
- Auto-update from external data sources

## Files Modified
1. `/var/www/api.banjaramatch.com/seed.js` - Added deterministic seeding logic
2. `/var/www/api.banjaramatch.com/models/City.js` - Extended schema with metadata fields
3. `/var/www/api.banjaramatch.com/controllers/cities.json` - Data source (unchanged)

---

**Last Updated**: 2024
**Author**: Seeding System Enhancement
**Version**: 2.0
