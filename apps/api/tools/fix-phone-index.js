// Script to fix phone index - drop old non-sparse index and recreate as sparse
const mongoose = require('mongoose');

const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aasd';

async function fixPhoneIndex() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    console.log('\n📋 Checking existing indexes...');
    const indexes = await usersCollection.indexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));

    // Check if phone_1 index exists
    const phoneIndex = indexes.find(idx => idx.name === 'phone_1');
    
    if (phoneIndex) {
      console.log('\n🔍 Found phone_1 index:', phoneIndex);
      
      // Check if it's sparse
      if (!phoneIndex.sparse) {
        console.log('⚠️  Index is NOT sparse - this causes the duplicate null error');
        console.log('🗑️  Dropping old phone_1 index...');
        await usersCollection.dropIndex('phone_1');
        console.log('✅ Old index dropped');
        
        console.log('🔨 Creating new sparse unique index on phone...');
        await usersCollection.createIndex(
          { phone: 1 },
          { unique: true, sparse: true, background: true }
        );
        console.log('✅ New sparse index created');
      } else {
        console.log('✅ Index is already sparse - no changes needed');
      }
    } else {
      console.log('\n⚠️  No phone_1 index found - creating sparse unique index...');
      await usersCollection.createIndex(
        { phone: 1 },
        { unique: true, sparse: true, background: true }
      );
      console.log('✅ Sparse index created');
    }

    console.log('\n📋 Final indexes:');
    const finalIndexes = await usersCollection.indexes();
    console.log(JSON.stringify(finalIndexes, null, 2));

    console.log('\n🎉 Phone index fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixPhoneIndex();
