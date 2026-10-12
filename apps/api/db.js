// const { MongoClient } = require('mongodb');
// const mongoose = require('mongoose');

// const uri = "mongodb://localhost:27017/";
// const dbName = 'aasd';
// let db;

// async function connectDB() {
//   if (db) {
//     return db;
//   }

//   try {
//     const client = new MongoClient(uri);
//     await client.connect();
//     console.log('Connected to MongoDB with MongoClient');
//     db = client.db(dbName);

//     // Initialize Mongoose connection
//     await mongoose.connect(`${uri}${dbName}`, { });
//     console.log('Connected to MongoDB with Mongoose');

//     return db;
//   } catch (error) {
//     console.error('Error connecting to MongoDB:', error);
//     throw error;
//   }
// }

// module.exports = { connectDB };




const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

// MONGODB_URI carries the db name in its path; dbName is derived for the mongoClient
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aasd';
const dbName = (() => {
  try { return new URL(uri).pathname.slice(1) || 'aasd'; } catch (e) { return 'aasd'; }
})();
let mongoClient;

async function connectDB() {
  if (mongoClient) return mongoClient; // ✅ Reuse client

  try {
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    console.log('Connected to MongoDB with MongoClient');

    // Also connect Mongoose
    await mongoose.connect(uri, { dbName });
    console.log('Connected to MongoDB with Mongoose');

    return mongoClient; // ✅ IMPORTANT: return full client, not db object
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

module.exports = { connectDB };
