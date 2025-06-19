import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    originalName: { type: String, required: true },
    storagePath: { type: String, required: true },
    size: { type: Number, required: true }, // File size in bytes
    data: { type: Array, required: true }, // Parsed Excel data as array of objects
    uploadedAt: { type: Date, default: Date.now },
});

export default mongoose.model('File', fileSchema); 