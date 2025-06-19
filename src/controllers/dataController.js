import File from '../models/File.js';
import Analysis from '../models/Analysis.js';
import History from '../models/History.js';
import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

const uploadExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        console.log('File upload request:', {
            originalName: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            filename: req.file.filename,
            path: req.file.path,
            userId: req.user.id
        });

        // Validate file name
        const fileName = req.file.originalname;
        if (!fileName) {
            return res.status(400).json({
                success: false,
                message: 'Invalid file name'
            });
        }

        // Check for corrupted file names (multiple extensions)
        if (fileName.match(/\.(xlsx|xls|csv)\.(xlsx|xls|csv)$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid file name detected. This appears to be a previously downloaded file. Please upload the original file instead.'
            });
        }

        // Validate file type
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv'
        ];

        if (!allowedTypes.includes(req.file.mimetype)) {
            console.log('Invalid file type:', req.file.mimetype);
            return res.status(400).json({
                success: false,
                message: 'Invalid file type. Please upload an Excel file (.xlsx, .xls) or CSV file.'
            });
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (req.file.size > maxSize) {
            console.log('File too large:', req.file.size);
            return res.status(400).json({
                success: false,
                message: 'File size too large. Maximum size is 10MB.'
            });
        }

        // Check if file exists and is readable
        if (!fs.existsSync(req.file.path)) {
            console.log('File does not exist at path:', req.file.path);
            return res.status(400).json({
                success: false,
                message: 'Uploaded file not found. Please try uploading again.'
            });
        }

        // Parse Excel file with error handling
        const filePath = req.file.path;
        let workbook, sheetName, sheet, data;

        try {
            console.log('Attempting to read file:', filePath);
            workbook = xlsx.readFile(filePath, {
                cellDates: true,
                cellNF: false,
                cellText: false
            });

            console.log('Workbook read successfully, sheets:', workbook.SheetNames);

            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No sheets found in the Excel file.'
                });
            }

            sheetName = workbook.SheetNames[0];
            sheet = workbook.Sheets[sheetName];

            if (!sheet) {
                return res.status(400).json({
                    success: false,
                    message: 'Could not read the first sheet of the Excel file.'
                });
            }

            console.log('Reading sheet data...');
            data = xlsx.utils.sheet_to_json(sheet, {
                header: 1,
                defval: '',
                blankrows: false
            });

            console.log('Raw data length:', data.length);

            // Convert array format to object format if needed
            if (data.length > 0 && Array.isArray(data[0])) {
                const headers = data[0];
                const rows = data.slice(1);
                data = rows.map(row => {
                    const obj = {};
                    headers.forEach((header, index) => {
                        obj[header || `Column${index + 1}`] = row[index] || '';
                    });
                    return obj;
                });
            }

        } catch (parseError) {
            console.error('Excel parsing error:', parseError);
            console.error('Error stack:', parseError.stack);
            return res.status(400).json({
                success: false,
                message: 'Failed to parse Excel file. Please ensure the file is not corrupted and contains valid data.',
                error: parseError.message
            });
        }

        if (!data || data.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No data found in the Excel file. Please ensure the file contains data in the first sheet.'
            });
        }

        console.log('Parsed data:', {
            rows: data.length,
            columns: Object.keys(data[0] || {}),
            sampleData: data.slice(0, 2)
        });

        // Save file info and data to DB
        const fileDoc = await File.create({
            user: req.user.id,
            originalName: req.file.originalname,
            storagePath: filePath,
            size: req.file.size,
            data,
        });

        console.log('File saved to database:', fileDoc._id);

        res.status(201).json({
            success: true,
            fileId: fileDoc._id,
            preview: data.slice(0, 10), // send first 10 rows as preview
            message: 'File uploaded and parsed successfully',
        });
    } catch (error) {
        console.error('Upload error:', error);
        console.error('Error stack:', error.stack);

        // Clean up uploaded file if it exists
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (cleanupError) {
                console.error('Failed to cleanup uploaded file:', cleanupError);
            }
        }

        res.status(500).json({
            success: false,
            message: 'Failed to upload and parse file',
            error: error.message
        });
    }
};

const getFileData = async (req, res) => {
    try {
        const { fileId } = req.params;
        const file = await File.findOne({ _id: fileId, user: req.user.id });
        if (!file) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }
        res.json({
            success: true,
            fileId: file._id,
            originalName: file.originalName,
            uploadedAt: file.uploadedAt,
            data: file.data,
        });
    } catch (error) {
        console.error('Get file data error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch file data', error: error.message });
    }
};

const generateChart = async (req, res) => {
    try {
        const { fileId, chartType = 'bar', xColumn, yColumn, maxRows = 50 } = req.body;

        console.log('Chart generation request:', { fileId, chartType, xColumn, yColumn, maxRows });

        if (!fileId) {
            return res.status(400).json({ success: false, message: 'File ID is required' });
        }

        const file = await File.findOne({ _id: fileId, user: req.user.id });
        if (!file) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }

        const data = file.data;
        if (!data || data.length === 0) {
            return res.status(400).json({ success: false, message: 'No data in file' });
        }

        if (!Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid data structure' });
        }

        const firstRow = data[0];
        if (!firstRow || typeof firstRow !== 'object') {
            return res.status(400).json({ success: false, message: 'Invalid data format' });
        }

        const keys = Object.keys(firstRow);

        // Use provided columns or fallback to first two columns
        const xCol = xColumn || keys[0];
        const yCol = yColumn || keys[1];

        if (!keys.includes(xCol) || !keys.includes(yCol)) {
            return res.status(400).json({
                success: false,
                message: `Selected columns not found. Available columns: ${keys.join(', ')}`
            });
        }

        // Limit data to maxRows
        const limitedData = data.slice(0, maxRows);

        // Filter out non-numeric values for the Y column
        const numericData = limitedData.filter(row => {
            const value = row[yCol];
            return value !== null && value !== undefined && !isNaN(Number(value));
        });

        if (numericData.length === 0) {
            return res.status(400).json({
                success: false,
                message: `No numeric data found in column "${yCol}". Please select a different Y-axis column.`
            });
        }

        // Generate chart configuration based on chart type
        let chartConfig;

        if (chartType === 'pie') {
            // For pie charts, aggregate data
            const aggregated = {};
            numericData.forEach(row => {
                const label = String(row[xCol] || 'Unknown');
                const value = Number(row[yCol]);
                aggregated[label] = (aggregated[label] || 0) + value;
            });

            const labels = Object.keys(aggregated);
            const values = Object.values(aggregated);

            chartConfig = {
                type: 'pie',
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        'rgba(147, 51, 234, 0.8)',
                        'rgba(236, 72, 153, 0.8)',
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                        'rgba(14, 165, 233, 0.8)',
                    ],
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 2
                }]
            };
        } else {
            // For other chart types
            chartConfig = {
                type: chartType,
                labels: numericData.map(row => String(row[xCol] || 'Unknown')),
                datasets: [{
                    label: yCol,
                    data: numericData.map(row => Number(row[yCol])),
                    backgroundColor: chartType === 'scatter' ? 'rgba(147, 51, 234, 0.6)' : 'rgba(147, 51, 234, 0.2)',
                    borderColor: 'rgba(147, 51, 234, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: chartType === 'scatter' ? 'rgba(147, 51, 234, 1)' : undefined,
                    pointBorderColor: chartType === 'scatter' ? '#ffffff' : undefined,
                    pointRadius: chartType === 'scatter' ? 6 : undefined,
                    fill: chartType === 'line' ? true : false,
                    tension: chartType === 'line' ? 0.4 : undefined
                }]
            };
        }

        // Save analysis with required fields
        const analysis = await Analysis.create({
            name: `Chart Analysis - ${file.originalName}`,
            type: 'chart',
            file: file._id,
            user: req.user.id,
            chartConfig,
            results: {
                data: {
                    totalRows: data.length,
                    displayedRows: numericData.length,
                    xColumn: xCol,
                    yColumn: yCol,
                    chartType: chartType,
                    maxRows: maxRows
                }
            }
        });

        console.log('Chart analysis created:', analysis._id);

        res.json({
            success: true,
            analysisId: analysis._id,
            chartConfig,
            message: 'Chart generated successfully'
        });
    } catch (error) {
        console.error('Generate chart error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate chart',
            error: error.message
        });
    }
};

const getChart = async (req, res) => {
    try {
        const { fileId } = req.params;
        const analysis = await Analysis.findOne({ file: fileId, user: req.user.id });
        if (!analysis) {
            return res.status(404).json({ success: false, message: 'Chart not found' });
        }
        res.json({ success: true, chartConfig: analysis.chartConfig, analysisId: analysis._id });
    } catch (error) {
        console.error('Get chart error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch chart', error: error.message });
    }
};

const getHistory = async (req, res) => {
    try {
        // Find all files and analyses for the user
        const files = await File.find({ user: req.user.id }).sort({ uploadedAt: -1 });
        const analyses = await Analysis.find({ user: req.user.id }).sort({ createdAt: -1 });

        console.log('History request:', {
            userId: req.user.id,
            filesCount: files.length,
            analysesCount: analyses.length
        });

        res.json({ success: true, files, analyses });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch history', error: error.message });
    }
};

const getInsights = async (req, res) => {
    try {
        const { fileId } = req.params;
        console.log('GetInsights called with fileId:', fileId);
        console.log('User ID:', req.user.id);

        const file = await File.findOne({ _id: fileId, user: req.user.id });
        console.log('File found:', file ? 'Yes' : 'No');

        if (!file) {
            console.log('File not found for fileId:', fileId);
            return res.status(404).json({ success: false, message: 'File not found' });
        }

        const data = file.data;
        if (!data || data.length === 0) {
            return res.status(400).json({ success: false, message: 'No data in file' });
        }

        console.log('Processing insights for file:', file.originalName, 'with', data.length, 'rows');

        // Basic AI/statistical insights (summary, trends, outliers)
        const keys = Object.keys(data[0]);
        const summary = {};
        const trends = [];
        const recommendations = [];
        const anomalies = [];
        const dataQuality = [];

        // Generate summary statistics
        keys.forEach(key => {
            const values = data.map(row => row[key]).filter(v => typeof v === 'number');
            if (values.length > 0) {
                const sum = values.reduce((a, b) => a + b, 0);
                const mean = sum / values.length;
                const min = Math.min(...values);
                const max = Math.max(...values);

                summary[key] = {
                    count: values.length,
                    min,
                    max,
                    mean: mean.toFixed(2),
                    total: sum.toFixed(2)
                };

                // Generate trends
                if (values.length > 1) {
                    const trend = values[values.length - 1] - values[0];
                    if (Math.abs(trend) > mean * 0.1) { // Significant trend
                        trends.push(`${key} shows a ${trend > 0 ? 'positive' : 'negative'} trend of ${Math.abs(trend).toFixed(2)}`);
                    }
                }

                // Check for outliers
                const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
                const outliers = values.filter(v => Math.abs(v - mean) > 2 * std);
                if (outliers.length > 0) {
                    anomalies.push(`Found ${outliers.length} outliers in ${key} column`);
                }
            }
        });

        // Generate recommendations based on data patterns
        if (trends.length > 0) {
            recommendations.push('Consider investigating the identified trends for business insights');
        }
        if (anomalies.length > 0) {
            recommendations.push('Review outliers to ensure data quality and identify potential issues');
        }
        if (data.length > 100) {
            recommendations.push('Large dataset detected - consider using sampling for faster analysis');
        }

        // Data quality observations
        dataQuality.push(`Dataset contains ${data.length} rows and ${keys.length} columns`);
        dataQuality.push(`${Object.keys(summary).length} columns contain numeric data suitable for analysis`);
        if (data.length < 10) {
            dataQuality.push('Small dataset - consider collecting more data for better insights');
        }

        // Create a comprehensive summary
        const overallSummary = `Analysis of ${file.originalName} reveals ${trends.length} significant trends, ${anomalies.length} data anomalies, and ${Object.keys(summary).length} numeric columns. The dataset contains ${data.length} records with ${Math.round((Object.keys(summary).length / keys.length) * 100)}% numeric columns.`;

        res.json({
            success: true,
            data: {
                summary: overallSummary,
                trends,
                recommendations,
                anomalies,
                dataQuality,
                statistics: summary
            }
        });
    } catch (error) {
        console.error('Get insights error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch insights', error: error.message });
    }
};

const downloadReport = async (req, res) => {
    try {
        const { fileId } = req.params;
        const file = await File.findOne({ _id: fileId, user: req.user.id });
        if (!file) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }

        const data = file.data;
        // Create a new workbook and worksheet
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(data);
        xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
        // Write to buffer
        const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

        // Fix filename to prevent duplicate extensions
        let filename = file.originalName || 'report';
        if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
            filename = filename.replace(/\.(xlsx|xls)$/, '');
        }
        filename = `${filename}_report.xlsx`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);
    } catch (error) {
        console.error('Download report error:', error);
        res.status(500).json({ success: false, message: 'Failed to download report', error: error.message });
    }
};

const deleteFile = async (req, res) => {
    try {
        const { fileId } = req.params;

        console.log('Delete file request:', { fileId, userId: req.user.id });

        const file = await File.findOne({ _id: fileId, user: req.user.id });
        if (!file) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }

        // Delete associated analyses first
        await Analysis.deleteMany({ file: fileId, user: req.user.id });
        console.log('Deleted associated analyses for file:', fileId);

        // Delete the file
        await File.findByIdAndDelete(fileId);
        console.log('Deleted file:', fileId);

        res.json({
            success: true,
            message: 'File and associated analyses deleted successfully'
        });
    } catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete file',
            error: error.message
        });
    }
};

export default {
    uploadExcel,
    getFileData,
    generateChart,
    getChart,
    getHistory,
    getInsights,
    downloadReport,
    deleteFile
}; 