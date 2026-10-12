const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Caste Master Schema
const casteSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,  // Ensures no duplicate caste entries
  },

  
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },


  
});

const Caste = mongoose.model('Caste', casteSchema);

module.exports = Caste;
