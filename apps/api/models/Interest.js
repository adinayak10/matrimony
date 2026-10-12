const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define the Interest Schema
const interestSchema = new Schema(
  {
    // Define the fields for the Interest model
    title: { type: String, required: true },
   // description: { type: String }, // Example of additional fields you might have
    // Add other fields as per your database structure
  },
  { timestamps: true }
);

// Define the method to get the associated room for this interest
interestSchema.methods.getRoom = async function () {
  // Use 'interest_ids' in Room model to find the room associated with this interest
  const room = await mongoose.model('Room').findOne({ interest_ids: this._id });
  return room;
};

// Create the Interest model
const Interest = mongoose.model('Interest', interestSchema);

module.exports = Interest;
