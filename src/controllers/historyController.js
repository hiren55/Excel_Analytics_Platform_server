import History from '../models/History.js';

// Create history record
const createHistory = async (data) => {
    try {
        const history = new History(data);
        await history.save();
        return history;
    } catch (error) {
        console.error('Create History Error:', error);
        return null;
    }
};

// Get user history
const getUserHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10, type } = req.query;

        const query = { user: userId };
        if (type) {
            query.resourceType = type;
        }

        const history = await History.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await History.countDocuments(query);

        res.json({
            history,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Get User History Error:', error);
        res.status(500).json({ message: 'Error fetching history' });
    }
};

// Get resource history
const getResourceHistory = async (req, res) => {
    try {
        const { type, id } = req.params;
        const userId = req.user.id;

        const history = await History.find({
            user: userId,
            resourceType: type,
            resourceId: id
        }).sort({ createdAt: -1 });

        res.json(history);
    } catch (error) {
        console.error('Get Resource History Error:', error);
        res.status(500).json({ message: 'Error fetching resource history' });
    }
};

export {
    createHistory,
    getUserHistory,
    getResourceHistory,
}; 