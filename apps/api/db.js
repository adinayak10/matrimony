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

    // Also connect Mongoose. Indexes declared on the schemas are built at boot
    // (A6.11) unless MONGOOSE_AUTO_INDEX=false — used for bridge/boot checks
    // against the live DB before the Phase 3f cleanup tools have run.
    const autoIndex = String(process.env.MONGOOSE_AUTO_INDEX || 'true').toLowerCase() !== 'false';
    if (!autoIndex) console.warn('[db] autoIndex disabled (MONGOOSE_AUTO_INDEX=false): schema indexes are NOT built on this boot');
    await mongoose.connect(uri, { dbName, autoIndex });
    console.log('Connected to MongoDB with Mongoose');

    return mongoClient; // ✅ IMPORTANT: return full client, not db object
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

module.exports = { connectDB };
