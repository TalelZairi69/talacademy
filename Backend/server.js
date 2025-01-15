const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path'); // For handling file paths
const connectDB = require('./config/db');
require('dotenv').config();

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());


app.use(bodyParser.json());

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/course', require('./routes/course')); 

// Root Route
app.get('/', (req, res) => {
    res.send('Backend is running!');
});

app.use(express.static(path.join(__dirname, '../FrontEnd')));

app.get('/FrontEnd/dashboard/courses/:courseCode', (req, res) => {
    res.sendFile(path.join(__dirname, '../FrontEnd/dashboard/courses/course-details.html'));
});



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.pdf')) {
            res.setHeader('Content-Disposition', 'inline'); // View in browser
            res.setHeader('Content-Type', 'application/pdf'); // Explicit MIME type
        }
    }
}));
const { S3Client } = require('@aws-sdk/client-s3');


// AWS S3 configuration
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
