import ExcelFile from '../models/ExcelFile.js';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// @desc    Upload Excel file
// @route   POST /api/excel/upload
// @access  Private
const upload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload a file'
            });
        }

        // Read Excel file
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        // Create Excel file record
        const excelFile = await ExcelFile.create({
            name: req.file.filename,
            originalName: req.file.originalname,
            path: req.file.path,
            size: req.file.size,
            type: req.file.mimetype,
            user: req.user.id,
            status: 'processed',
            metadata: {
                sheets: workbook.SheetNames,
                rows: data.length,
                columns: Object.keys(data[0] || {}),
                firstSheet: sheetName
            }
        });

        res.status(201).json({
            success: true,
            data: excelFile
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading file'
        });
    }
};

// @desc    Get all Excel files for user
// @route   GET /api/excel
// @access  Private
const getAll = async (req, res) => {
    try {
        const files = await ExcelFile.find({ user: req.user.id })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: files
        });
    } catch (error) {
        console.error('Get all files error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving files'
        });
    }
};

// @desc    Get single Excel file
// @route   GET /api/excel/:id
// @access  Private
const getById = async (req, res) => {
    try {
        const file = await ExcelFile.findOne({
            _id: req.params.id,
            user: req.user.id
        });

        if (!file) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        // Read Excel file
        const workbook = xlsx.readFile(file.path);
        const sheetName = file.metadata.firstSheet;
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        res.json({
            success: true,
            data: {
                ...file.toObject(),
                preview: data.slice(0, 10) // First 10 rows as preview
            }
        });
    } catch (error) {
        console.error('Get file error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving file'
        });
    }
};

// @desc    Delete Excel file
// @route   DELETE /api/excel/:id
// @access  Private
const deleteFile = async (req, res) => {
    try {
        const file = await ExcelFile.findOne({
            _id: req.params.id,
            user: req.user.id
        });

        if (!file) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        // Delete file from storage
        try {
            await fs.unlink(file.path);
        } catch (error) {
            console.error('Error deleting file from storage:', error);
        }

        // Delete from database
        await file.deleteOne();

        res.json({
            success: true,
            message: 'File deleted successfully'
        });
    } catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting file'
        });
    }
};

export {
    upload,
    getAll,
    getById,
    deleteFile
}; 