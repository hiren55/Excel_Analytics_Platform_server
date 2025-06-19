import mongoose from 'mongoose';

const historySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        enum: ['create', 'update', 'delete', 'login', 'register', 'complete', 'error'],
        required: true
    },
    resourceType: {
        type: String,
        enum: ['user', 'file', 'analysis'],
        required: true
    },
    resourceId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    details: {
        type: String,
        required: true
    },
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },
    ip: String,
    userAgent: String,
    status: {
        type: String,
        enum: ['success', 'error'],
        default: 'success'
    },
    error: {
        message: String,
        code: String
    }
}, {
    timestamps: true
});

// Indexes for better query performance
historySchema.index({ user: 1, createdAt: -1 });
historySchema.index({ resourceType: 1, resourceId: 1 });
historySchema.index({ action: 1 });

const History = mongoose.models.History || mongoose.model('History', historySchema);

export default History; 