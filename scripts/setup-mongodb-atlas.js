import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import ExcelFile from '../src/models/ExcelFile.js';
import Analysis from '../src/models/Analysis.js';
import History from '../src/models/History.js';

// Load environment variables
dotenv.config();

const setupDatabase = async () => {
    try {
        // Connect to MongoDB Atlas
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB Atlas');

        // Create indexes
        console.log('Creating indexes...');
        await User.createIndexes();
        await ExcelFile.createIndexes();
        await Analysis.createIndexes();
        await History.createIndexes();
        console.log('Indexes created successfully');

        // Create admin user if it doesn't exist
        const adminExists = await User.findOne({ email: 'admin@example.com' });
        if (!adminExists) {
            const admin = new User({
                name: 'Admin User',
                email: 'admin@example.com',
                password: 'admin123', // This will be hashed by the pre-save hook
                role: 'admin'
            });
            await admin.save();
            console.log('Admin user created successfully');
        }

        console.log('Database setup completed successfully');
    } catch (error) {
        console.error('Database setup error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

setupDatabase(); 