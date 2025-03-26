const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const mongoose = require("mongoose");
const PDF = require("./models/PDF");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Configure Multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/"); // Save files in the "uploads" directory
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname); // Add timestamp to filename
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Process a single PDF file
async function processPDF(file) {
    const dataBuffer = fs.readFileSync(file.path);
    const data = await pdfParse(dataBuffer);
    
    const pdf = new PDF({
        filename: file.filename,
        originalName: file.originalname,
        content: data.text
    });

    await pdf.save();
    
    // Clean up the uploaded file
    fs.unlinkSync(file.path);
    
    return pdf;
}

// Handle multiple PDF uploads and processing
app.post("/api/upload", upload.array("pdfs", 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const results = await Promise.all(req.files.map(file => processPDF(file)));

        res.status(201).json({
            message: `${results.length} PDF(s) uploaded and processed successfully`,
            pdfs: results
        });
    } catch (error) {
        console.error('Error processing PDFs:', error);
        res.status(500).json({ error: 'Error processing PDFs' });
    }
});

// Get all processed PDFs
app.get("/api/pdfs", async (req, res) => {
    try {
        const pdfs = await PDF.find().sort({ uploadDate: -1 });
        res.json(pdfs);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching PDFs' });
    }
});

// Get a specific PDF by ID
app.get("/api/pdf/:id", async (req, res) => {
    try {
        const pdf = await PDF.findById(req.params.id);
        if (!pdf) {
            return res.status(404).json({ error: 'PDF not found' });
        }
        res.json(pdf);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching PDF' });
    }
});

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

module.exports = app;