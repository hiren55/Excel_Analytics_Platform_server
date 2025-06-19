import Analysis from '../models/Analysis.js';
import ExcelFile from '../models/ExcelFile.js';
import { generateInsights as generateGeminiInsights, generateChartRecommendations } from '../services/geminiService.js';
import { createHistory } from './historyController.js';

// Create a new analysis
const createAnalysis = async (req, res) => {
    try {
        const { name, type, excelFileId, config } = req.body;
        const userId = req.user.id;

        // Verify Excel file exists and belongs to user
        const excelFile = await ExcelFile.findOne({ _id: excelFileId, user: userId });
        if (!excelFile) {
            return res.status(404).json({ message: 'Excel file not found' });
        }

        // Create analysis
        const analysis = new Analysis({
            name,
            type,
            user: userId,
            excelFile: excelFileId,
            config,
            status: 'processing'
        });

        await analysis.save();

        // Create history record
        await createHistory({
            user: userId,
            action: 'create',
            resourceType: 'analysis',
            resourceId: analysis._id,
            details: `Created ${type} analysis: ${name}`
        });

        // Start analysis in background
        processAnalysis(analysis._id, excelFile, config);

        res.status(201).json(analysis);
    } catch (error) {
        console.error('Create Analysis Error:', error);
        res.status(500).json({ message: 'Error creating analysis' });
    }
};

// Get all analyses for a user
const getAllAnalyses = async (req, res) => {
    try {
        const userId = req.user.id;
        const analyses = await Analysis.find({ user: userId })
            .populate('excelFile', 'name originalName')
            .sort({ createdAt: -1 });

        res.json(analyses);
    } catch (error) {
        console.error('Get All Analyses Error:', error);
        res.status(500).json({ message: 'Error fetching analyses' });
    }
};

// Get analysis by ID
const getAnalysisById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const analysis = await Analysis.findOne({ _id: id, user: userId })
            .populate('excelFile', 'name originalName');

        if (!analysis) {
            return res.status(404).json({ message: 'Analysis not found' });
        }

        res.json(analysis);
    } catch (error) {
        console.error('Get Analysis Error:', error);
        res.status(500).json({ message: 'Error fetching analysis' });
    }
};

// Update analysis
const updateAnalysis = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const updates = req.body;

        const analysis = await Analysis.findOne({ _id: id, user: userId });
        if (!analysis) {
            return res.status(404).json({ message: 'Analysis not found' });
        }

        // Update fields
        Object.keys(updates).forEach(key => {
            if (key !== 'user' && key !== 'excelFile') {
                analysis[key] = updates[key];
            }
        });

        await analysis.save();

        // Create history record
        await createHistory({
            user: userId,
            action: 'update',
            resourceType: 'analysis',
            resourceId: analysis._id,
            details: `Updated analysis: ${analysis.name}`
        });

        res.json(analysis);
    } catch (error) {
        console.error('Update Analysis Error:', error);
        res.status(500).json({ message: 'Error updating analysis' });
    }
};

// Delete analysis
const deleteAnalysis = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const analysis = await Analysis.findOne({ _id: id, user: userId });
        if (!analysis) {
            return res.status(404).json({ message: 'Analysis not found' });
        }

        await analysis.deleteOne();

        // Create history record
        await createHistory({
            user: userId,
            action: 'delete',
            resourceType: 'analysis',
            resourceId: id,
            details: `Deleted analysis: ${analysis.name}`
        });

        res.json({ message: 'Analysis deleted successfully' });
    } catch (error) {
        console.error('Delete Analysis Error:', error);
        res.status(500).json({ message: 'Error deleting analysis' });
    }
};

// Generate chart
const generateChart = async (req, res) => {
    try {
        const { excelFileId, config } = req.body;
        const userId = req.user.id;

        // Verify Excel file exists and belongs to user
        const excelFile = await ExcelFile.findOne({ _id: excelFileId, user: userId });
        if (!excelFile) {
            return res.status(404).json({ message: 'Excel file not found' });
        }

        // Get chart recommendations from Gemini
        const recommendations = await generateChartRecommendations(excelFile.data, config);
        if (!recommendations.success) {
            return res.status(500).json({ message: 'Error generating chart recommendations' });
        }

        res.json(recommendations.data);
    } catch (error) {
        console.error('Generate Chart Error:', error);
        res.status(500).json({ message: 'Error generating chart' });
    }
};

// Generate insights
const generateInsights = async (req, res) => {
    try {
        const { excelFileId, config } = req.body;
        const userId = req.user.id;

        // Verify Excel file exists and belongs to user
        const excelFile = await ExcelFile.findOne({ _id: excelFileId, user: userId });
        if (!excelFile) {
            return res.status(404).json({ message: 'Excel file not found' });
        }

        // Get insights from Gemini
        const insights = await generateGeminiInsights(excelFile.data, config);
        if (!insights.success) {
            return res.status(500).json({ message: 'Error generating insights' });
        }

        res.json(insights.data);
    } catch (error) {
        console.error('Generate Insights Error:', error);
        res.status(500).json({ message: 'Error generating insights' });
    }
};

// Helper function to process analysis in background
const processAnalysis = async (analysisId, excelFile, config) => {
    try {
        const analysis = await Analysis.findById(analysisId);
        if (!analysis) return;

        let results;
        if (analysis.type === 'chart') {
            const recommendations = await generateChartRecommendations(excelFile.data, config);
            if (!recommendations.success) {
                throw new Error(recommendations.error);
            }
            results = recommendations.data;
        } else if (analysis.type === 'insight') {
            const insights = await generateGeminiInsights(excelFile.data, config);
            if (!insights.success) {
                throw new Error(insights.error);
            }
            results = insights.data;
        }

        // Update analysis with results
        analysis.results = results;
        analysis.status = 'completed';
        await analysis.save();

        // Create history record
        await createHistory({
            user: analysis.user,
            action: 'complete',
            resourceType: 'analysis',
            resourceId: analysis._id,
            details: `Completed ${analysis.type} analysis: ${analysis.name}`
        });
    } catch (error) {
        console.error('Process Analysis Error:', error);

        // Update analysis with error
        const analysis = await Analysis.findById(analysisId);
        if (analysis) {
            analysis.status = 'error';
            analysis.error = {
                message: error.message,
                code: error.code || 'PROCESSING_ERROR'
            };
            await analysis.save();

            // Create history record
            await createHistory({
                user: analysis.user,
                action: 'error',
                resourceType: 'analysis',
                resourceId: analysis._id,
                details: `Error in ${analysis.type} analysis: ${error.message}`
            });
        }
    }
};

export {
    createAnalysis,
    getAllAnalyses,
    getAnalysisById,
    updateAnalysis,
    deleteAnalysis,
    generateChart,
    generateInsights
}; 