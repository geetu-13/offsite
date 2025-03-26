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

// Handle single PDF upload and processing
app.post("/api/upload", upload.single("pdf"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const dataBuffer = fs.readFileSync(req.file.path);
        const data = await pdfParse(dataBuffer);
        
        const pdf = new PDF({
            filename: req.file.filename,
            originalName: req.file.originalname,
            content: data.text
        });

        await pdf.save();
        
        // Clean up the uploaded file
        fs.unlinkSync(req.file.path);

        res.status(201).json({
            message: 'PDF uploaded and processed successfully',
            pdf: pdf
        });
    } catch (error) {
        console.error('Error processing PDF:', error);
        res.status(500).json({ error: 'Error processing PDF' });
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

// Handle multiple file uploads (max 100 files)
app.post("/upload", upload.array("pdfs", 100), (req, res) => {
    if (!req.files || req.files.length === 0) {
        console.log("No files uploaded.");
        return res.status(400).json({ message: "No files uploaded!" });
    }

    // Log details of uploaded files
    console.log(`\n📂 ${req.files.length} PDF(s) uploaded:`);
    req.files.forEach((file, index) => {
        console.log(`${index + 1}. ${file.originalname} (Size: ${file.size} bytes)`);
    });

    res.json({ 
        message: `${req.files.length} PDF files uploaded successfully!`,
        uploadedFiles: req.files.map(file => file.originalname)
    });
});

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

module.exports = app;