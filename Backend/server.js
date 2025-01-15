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
app.use('/api/course', require('./routes/course')); // Add course routes

// Root Route
app.get('/', (req, res) => {
    res.send('Backend is running!');
});

// Serve static files from the FrontEnd directory
app.use(express.static(path.join(__dirname, '../FrontEnd')));

// Catch-all route to serve index.html for unknown paths
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../FrontEnd/index.html'));
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));