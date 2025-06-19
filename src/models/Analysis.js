import mongoose from 'mongoose';

const analysisSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['chart', 'report', 'insight'],
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    file: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExcelFile',
        required: true
    },
    chartConfig: {
        type: Object,
        required: true
    },
    results: {
        data: {
            type: Map,
            of: mongoose.Schema.Types.Mixed
        },
        insights: [{
            text: String,
            importance: {
                type: String,
                enum: ['high', 'medium', 'low'],
                default: 'medium'
            }
        }],
        recommendations: [{
            text: String,
            priority: {
                type: String,
                enum: ['high', 'medium', 'low'],
                default: 'medium'
            }
        }]
    },
    status: {
        type: String,
        enum: ['processing', 'completed', 'error'],
        default: 'processing'
    },
    error: {
        message: String,
        code: String
    },
    createdAt: { type: Date, default: Date.now },
}, {
    timestamps: true
});

// Indexes for better query performance
analysisSchema.index({ user: 1, createdAt: -1 });
analysisSchema.index({ type: 1, status: 1 });
analysisSchema.index({ file: 1 });

const Analysis = mongoose.models.Analysis || mongoose.model('Analysis', analysisSchema);
export default Analysis; 