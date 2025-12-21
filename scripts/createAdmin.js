require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/admin');

const dbURI = process.env.DATABASE_URL || 'mongodb://localhost:27017/sho3latElnour';

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(dbURI);
    console.log('Connected to database');

    // Admin credentials
    const adminData = {
      phoneNumber: '01000000000',
      password: 'admin123456', // Change this to a secure password
      role: 'Admin',
    };

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({
      phoneNumber: adminData.phoneNumber,
    });

    if (existingAdmin) {
      console.log(
        '⚠️  Admin account already exists with phone number:',
        adminData.phoneNumber
      );
      console.log('Admin ID:', existingAdmin._id);
      
      // Update password and role if needed
      existingAdmin.password = adminData.password;
      existingAdmin.role = adminData.role;
      await existingAdmin.save();

      console.log('✅ Admin account password updated successfully!');
      console.log('==================================');
      console.log('Phone Number:', adminData.phoneNumber);
      console.log('Password:', adminData.password);
      console.log('==================================');
    } else {
      // Create new admin
      const admin = new Admin(adminData);
      await admin.save();

      console.log('✅ Admin account created successfully!');
      console.log('==================================');
      console.log('Phone Number:', adminData.phoneNumber);
      console.log('Password:', adminData.password);
      console.log('==================================');
      console.log('⚠️  Please change the password after first login!');
    }

    // Close connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();
