const mongoose = require('mongoose');

const membershipPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['Free', 'Silver', 'Gold', 'Platinum'],
  },
  price: {
    type: Number,
    required: true,
    default: 0,
  },
  duration_days: {
    type: Number,
    required: true,
    default: 0,
  },
  description: {
    type: String,
    required: false,
  },
  features: [{
    type: String,
  }],
}, { timestamps: true });

module.exports = mongoose.model('MembershipPlan', membershipPlanSchema);
