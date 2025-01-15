const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
require('dotenv').config();

const app = express();

// Connect to MongoDB
connectDB();

// CORS Configuration
app.use(cors({
    origin: 'https://talacademy.onrender.com', // Replace with your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // Enable for cookies/auth headers
}));

// Handle Preflight Requests explicitly (Optional if above is used)
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', 'https://talacademy.onrender.com');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(204); // No Content
});

// Middleware
app.use(bodyParser.json());

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/course', require('./routes/course'));

// Static File Uploads with CORS
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.pdf')) {
            res.setHeader('Content-Disposition', 'inline'); // View in browser
            res.setHeader('Content-Type', 'application/pdf'); // Explicit MIME type
        }
    }
}));

// Root Route
app.get('/', (req, res) => {
    res.send('Backend is running!');
});

// AWS S3 configuration
const { S3Client } = require('@aws-sdk/client-s3');
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Debugging Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Prevent caching for CORS responses
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
});

// Global Error Handler (to ensure all responses include headers)
app.use((err, req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://talacademy.onrender.com');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(err.status || 500).json({ error: err.message });
});

// Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
