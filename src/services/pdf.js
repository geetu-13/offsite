const pdfParse = require("pdf-parse");
const PDF = require("../models/PDF");
const { generateEmbeding, analyzeSentiment } = require("./llm");

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

            // Generate embeddings and analyze sentiment
            console.log(`Generating embeddings and analyzing sentiment for ${file.originalname}`);
            const [embeddings, sentiment] = await Promise.all([
                generateEmbeding(data.text),
                analyzeSentiment(data.text)
            ]);

            // Validate embeddings format
            if (!Array.isArray(embeddings) || embeddings.some(n => typeof n !== 'number')) {
                console.log("Embedding format", embeddings)
                throw new Error('Invalid embeddings format received from LLM');
            }

            // Create and save PDF document
            const pdf = new PDF({
                filename: file.originalname,
                originalName: file.originalname,
                content: data.text,
                sentiment: sentiment,
                embeddings: embeddings,
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
            
            // If it's a genuine PDF corruption error or LLM error, don't retry
            if (error.message.includes('Invalid PDF header') || 
                error.message.includes('Invalid PDF footer') ||
                error.message.includes('File too small') ||
                error.message.includes('Failed to generate embedding') ||
                error.message.includes('Failed to analyze sentiment') ||
                error.message.includes('Invalid embeddings format') ||
                error.message.includes('Invalid sentiment value')) {
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

// Get all processed PDFs
async function getAllPDFs() {
    try {
        return await PDF.find().sort({ uploadDate: -1 });
    } catch (error) {
        throw new Error('Error fetching PDFs');
    }
}

// Get a specific PDF by ID
async function getPDFById(id) {
    try {
        const pdf = await PDF.findById(id);
        if (!pdf) {
            throw new Error('PDF not found');
        }
        return pdf;
    } catch (error) {
        throw new Error('Error fetching PDF');
    }
}

module.exports = {
    processPDF,
    getAllPDFs,
    getPDFById
}; 