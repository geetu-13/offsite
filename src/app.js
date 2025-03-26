const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { processPDF, getAllPDFs, getPDFById } = require("./services/pdf");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure Multer to use memory storage
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { 
        fileSize: 10 * 1024 * 1024, // 10MB per file
        files: 10 // Maximum number of files
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});

// Handle multiple PDF uploads and processing
app.post("/api/upload", upload.array("pdfs", 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const results = await Promise.all(req.files.map(file => processPDF(file)));
        
        // Separate successful and failed uploads
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        res.status(201).json({
            message: `Processed ${successful.length} PDF(s) successfully${failed.length > 0 ? `, ${failed.length} failed` : ''}`,
            successful: successful.map(r => r.pdf),
            failed: failed.map(r => ({
                filename: r.filename,
                error: r.error,
                attempts: r.attempts
            }))
        });
    } catch (error) {
        console.error('Error processing PDFs:', error);
        res.status(500).json({ 
            error: 'Error processing PDFs',
            details: error.message
        });
    }
});

// Get all processed PDFs
app.get("/api/pdfs", async (req, res) => {
    try {
        const pdfs = await getAllPDFs();
        res.json(pdfs);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching PDFs' });
    }
});

// Get a specific PDF by ID
app.get("/api/pdf/:id", async (req, res) => {
    try {
        const pdf = await getPDFById(req.params.id);
        res.json(pdf);
    } catch (error) {
        if (error.message === 'PDF not found') {
            res.status(404).json({ error: 'PDF not found' });
        } else {
            res.status(500).json({ error: 'Error fetching PDF' });
        }
    }
});

module.exports = app;