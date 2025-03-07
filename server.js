const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Configure Multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/"); // Save files in the "uploads" directory
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // Keep original filename
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
});

// Handle file uploads (max 100 files)
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
        uploadedFiles: req.files.map(file => file.originalname) // Return file names in response
    });
});

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

app.listen(3000, () => console.log("\n🚀 Server running on port 3000"));
