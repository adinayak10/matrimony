const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const { connectDB } = require('./db');

async function createAdminUser() {
  try {
    await connectDB();
    console.log('✅ Connected to database');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@banjaramatch.com' });
    
    if (existingAdmin) {
      console.log('📝 Admin user already exists. Updating role...');
      existingAdmin.role = 'admin';
      existingAdmin.full_name = 'Admin';
      await existingAdmin.save();
      console.log('✅ Admin user updated:', existingAdmin.email);
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const adminUser = new User({
        email: 'admin@banjaramatch.com',
        password: hashedPassword,
        full_name: 'Admin',
        phone: '9999999999',
        login_type: 2, // Email login
        role: 'admin',
        gender: 'Male',
        is_verified: 1
      });

      await adminUser.save();
      console.log('✅ Admin user created successfully!');
      console.log('📧 Email: admin@banjaramatch.com');
      console.log('🔑 Password: admin123');
    }

    console.log('\n⚠️  IMPORTANT: Change the password after first login!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
