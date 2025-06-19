import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Get Gemini Pro model
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// Analyze data and generate insights
export const generateInsights = async (data, config = {}) => {
    try {
        const { focus, context } = config;

        // Prepare the prompt
        const prompt = `
            Analyze the following data and provide insights:
            ${JSON.stringify(data, null, 2)}

            Focus areas: ${focus || 'general trends and patterns'}
            Context: ${context || 'business data analysis'}

            Please provide:
            1. Key trends and patterns
            2. Notable insights
            3. Potential recommendations
            4. Data quality observations
        `;

        // Generate content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse the response into structured format
        const insights = parseInsights(text);

        return {
            success: true,
            data: insights
        };
    } catch (error) {
        console.error('Gemini API Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Generate chart recommendations
export const generateChartRecommendations = async (data, config = {}) => {
    try {
        const { type, metrics } = config;

        // Prepare the prompt
        const prompt = `
            Based on the following data:
            ${JSON.stringify(data, null, 2)}

            Recommend the most appropriate chart type and configuration for:
            Type: ${type || 'general visualization'}
            Metrics: ${metrics || 'all available metrics'}

            Please provide:
            1. Recommended chart type
            2. Data series to include
            3. Axis configurations
            4. Additional visual elements
        `;

        // Generate content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse the response into structured format
        const recommendations = parseChartRecommendations(text);

        return {
            success: true,
            data: recommendations
        };
    } catch (error) {
        console.error('Gemini API Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Helper function to parse insights into structured format
const parseInsights = (text) => {
    // Split the text into sections
    const sections = text.split('\n\n');

    const insights = {
        trends: [],
        insights: [],
        recommendations: [],
        dataQuality: []
    };

    let currentSection = null;

    sections.forEach(section => {
        if (section.includes('Key trends and patterns')) {
            currentSection = 'trends';
        } else if (section.includes('Notable insights')) {
            currentSection = 'insights';
        } else if (section.includes('Potential recommendations')) {
            currentSection = 'recommendations';
        } else if (section.includes('Data quality observations')) {
            currentSection = 'dataQuality';
        } else if (currentSection && section.trim()) {
            insights[currentSection].push({
                text: section.trim(),
                importance: calculateImportance(section)
            });
        }
    });

    return insights;
};

// Helper function to parse chart recommendations
const parseChartRecommendations = (text) => {
    const recommendations = {
        chartType: '',
        dataSeries: [],
        axisConfig: {},
        visualElements: []
    };

    // Parse the text to extract recommendations
    const sections = text.split('\n\n');

    sections.forEach(section => {
        if (section.includes('Recommended chart type')) {
            recommendations.chartType = section.split(':')[1].trim();
        } else if (section.includes('Data series')) {
            recommendations.dataSeries = section
                .split(':')[1]
                .split('\n')
                .map(item => item.trim())
                .filter(Boolean);
        } else if (section.includes('Axis configurations')) {
            const axisConfig = section.split(':')[1].trim();
            recommendations.axisConfig = parseAxisConfig(axisConfig);
        } else if (section.includes('Additional visual elements')) {
            recommendations.visualElements = section
                .split(':')[1]
                .split('\n')
                .map(item => item.trim())
                .filter(Boolean);
        }
    });

    return recommendations;
};

// Helper function to calculate insight importance
const calculateImportance = (text) => {
    const importanceKeywords = {
        high: ['critical', 'significant', 'major', 'important', 'crucial'],
        medium: ['notable', 'considerable', 'moderate'],
        low: ['minor', 'slight', 'small']
    };

    const textLower = text.toLowerCase();

    for (const [level, keywords] of Object.entries(importanceKeywords)) {
        if (keywords.some(keyword => textLower.includes(keyword))) {
            return level;
        }
    }

    return 'medium'; // Default importance
};

// Helper function to parse axis configuration
const parseAxisConfig = (text) => {
    const config = {
        x: {},
        y: {}
    };

    const lines = text.split('\n');
    lines.forEach(line => {
        if (line.includes('X-axis')) {
            config.x = parseAxisLine(line);
        } else if (line.includes('Y-axis')) {
            config.y = parseAxisLine(line);
        }
    });

    return config;
};

// Helper function to parse axis line
const parseAxisLine = (line) => {
    const parts = line.split(':')[1].trim().split(',');
    return {
        label: parts[0].trim(),
        scale: parts[1]?.trim() || 'linear',
        range: parts[2]?.trim() || 'auto'
    };
}; 