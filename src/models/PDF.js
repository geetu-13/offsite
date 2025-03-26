const mongoose = require('mongoose');

const pdfSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    sentiment: {
        type: String,
        enum: ['positive', 'negative', 'neutral'],
        required: true
    },
    embeddings: {
        type: [Number],
        required: true
    },
    metadata: {
        pageCount: Number,
        processingAttempts: Number
    },
    uploadDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('PDF', pdfSchema); 