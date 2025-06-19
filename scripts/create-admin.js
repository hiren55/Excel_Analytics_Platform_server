import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

// Load environment variables
dotenv.config();

const createAdminUser = async () => {
    try {
        // Connect to MongoDB
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        // Delete existing admin user if exists
        await User.deleteOne({ email: 'admin@dataviz.com' });
        console.log('Removed existing admin user');

        // Create admin user with simple password
        const adminUser = new User({
            name: 'Admin User',
            email: 'admin@dataviz.com',
            password: 'admin123', // Will be hashed by pre-save hook
            role: 'admin',
            status: 'active'
        });

        await adminUser.save();
        console.log('✅ Admin user created successfully!');
        console.log('📧 Email: admin@dataviz.com');
        console.log('🔑 Password: admin123');
        console.log('👤 Role: admin');

        // Verify the user was created correctly (include password field)
        const savedUser = await User.findOne({ email: 'admin@dataviz.com' }).select('+password');
        console.log('Saved user:', {
            id: savedUser._id,
            name: savedUser.name,
            email: savedUser.email,
            role: savedUser.role,
            status: savedUser.status,
            hasPassword: !!savedUser.password,
            passwordLength: savedUser.password ? savedUser.password.length : 0
        });

        // Test password comparison
        const isPasswordValid = await savedUser.comparePassword('admin123');
        console.log('Password verification test:', isPasswordValid);

    } catch (error) {
        console.error('❌ Error creating admin user:', error);
    } finally {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    }
};

// Run the script
createAdminUser(); 