const mongoose = require('mongoose');

const CitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  state: { type: mongoose.Schema.Types.ObjectId, ref: 'State', required: true },
  district: { type: String, default: null },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  population: { type: Number, default: null },
  stdCode: { type: String, default: null },
  gstStateCode: { type: String, default: null },
  iso31662: { type: String, default: null },
  altitude: { type: Number, default: null },
  rank: { type: Number, default: null }
});

module.exports = mongoose.model("City", CitySchema);
