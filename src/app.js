const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const pdfParse = require("pdf-parse");
const PDF = require("./models/PDF");

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

// Validate PDF buffer
function validatePDFBuffer(buffer) {
    // Check if buffer starts with PDF signature (%PDF-)
    const pdfHeader = buffer.slice(0, 5).toString();
    if (pdfHeader !== '%PDF-') {
        throw new Error('Invalid PDF header');
    }

    // Check if buffer ends with %%EOF (within last 1024 bytes)
    const lastBytes = buffer.slice(-1024).toString();
    if (!lastBytes.includes('%%EOF')) {
        throw new Error('Invalid PDF footer');
    }

    // Check minimum file size (PDF header + footer)
    if (buffer.length < 100) {
        throw new Error('File too small to be a valid PDF');
    }

    return true;
}

// Process a single PDF file with retries
async function processPDF(file, maxRetries = 3) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Processing ${file.originalname} - Attempt ${attempt}/${maxRetries}`);
            
            // Validate PDF buffer
            validatePDFBuffer(file.buffer);

            // Try to parse the PDF
            const data = await pdfParse(file.buffer, {
                max: 0 // No page limit
            });

            // Validate extracted content
            if (!data || !data.text) {
                throw new Error('No text content found in PDF');
            }

            // Additional validation of extracted content
            if (data.text.trim().length < 10) {
                throw new Error('PDF contains insufficient text content');
            }

            // Create and save PDF document
            const pdf = new PDF({
                filename: file.originalname,
                originalName: file.originalname,
                content: data.text,
                metadata: {
                    pageCount: data.numpages,
                    processingAttempts: attempt
                }
            });

            await pdf.save();
            
            console.log(`Successfully processed ${file.originalname} on attempt ${attempt}`);
            return {
                success: true,
                pdf: pdf,
                message: `Successfully processed ${file.originalname} on attempt ${attempt}`
            };
        } catch (error) {
            lastError = error;
            console.error(`Attempt ${attempt} failed for ${file.originalname}:`, error.message);
            
            // If it's a genuine PDF corruption error, don't retry
            if (error.message.includes('Invalid PDF header') || 
                error.message.includes('Invalid PDF footer') ||
                error.message.includes('File too small')) {
                break;
            }

            // Wait before retrying (exponential backoff)
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
    }

    // If we get here, all attempts failed
    return {
        success: false,
        error: `Failed after ${maxRetries} attempts. Last error: ${lastError.message}`,
        filename: file.originalname,
        attempts: maxRetries
    };
}

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

module.exports = app;