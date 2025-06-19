import mongoose from 'mongoose';

const excelFileSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['processing', 'processed', 'error'],
        default: 'processing'
    },
    metadata: {
        sheets: [String],
        rows: Number,
        columns: [String],
        firstSheet: String
    },
    analysis: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Analysis'
    }],
    uploadedAt: { type: Date, default: Date.now },
});

// Indexes
excelFileSchema.index({ user: 1, createdAt: -1 });
excelFileSchema.index({ status: 1 });

const ExcelFile = mongoose.models.ExcelFile || mongoose.model('ExcelFile', excelFileSchema);
export default ExcelFile; 