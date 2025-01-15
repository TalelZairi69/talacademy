const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
require('dotenv').config();

const app = express();

// Connect to MongoDB
connectDB();
app.use(cors({
    origin: 'https://talacademy.onrender.com', // Allow only your frontend's domain
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allow specific methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Spescify allowed headers
    credentials: true, // Allow cookies or authorization headers
}));
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://talacademy.onrender.com');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

app.options('*', cors()); // Automatically respond to OPTIONS requests

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
app.use((req, res, next) => {
    console.log('Request Origin:', req.headers.origin);
    console.log('Request Method:', req.method);
    console.log('Request Headers:', req.headers);
    next();
});
