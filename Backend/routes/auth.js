const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const verifyToken = require('../middleware/auth');
const multer = require('multer');

// Configure multer to store files in memory as buffers
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    },
});

// Signup Route
// Signup Route
router.post('/signup', async (req, res) => {
    console.log('Request Body:', req.body); // Add this line
    const { username, email, password, role, gender, phone, invitationCode } = req.body;

    if (!username || !email || !password || !role || !gender || !phone) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    // Validate role-specific fields
    if (role === 'teacher' && !invitationCode) {
        return res.status(400).json({ message: 'Invitation code is required for teachers.' });
    }

    if (!phone.match(/^[0-9]{8,15}$/)) {
        return res.status(400).json({ message: 'Invalid phone number format.' });
    }

    try {
        const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
        if (existingUser) {
            return res.status(400).json({ message: 'Email or phone number already in use.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword, role, gender, phone });
        await newUser.save();

        res.status(201).json({ message: 'Signup successful!' });
    } catch (error) {
        console.error('Signup Error:', error);
        res.status(500).json({ message: 'Server error. Please try again later.' });
    }
});



// Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password.' });
        }

        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({ message: 'Login successful!', token });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error. Please try again later.' });
    }
});
router.get('/dashboard', verifyToken, async (req, res) => {
    

    try {
        const user = await User.findById(req.user.id).select('username role email phone balance profilePicture');

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const profilePicture = user.profilePicture && user.profilePicture.data
            ? `data:${user.profilePicture.contentType};base64,${user.profilePicture.data.toString('base64')}`
            : '/FrontEnd/img/default-profile.png'; // Default image if none exists

            res.status(200).json({
                username: user.username,
                role: user.role,
                email: user.email,
                phone: user.phone,
                balance: user.balance, // Ensure this is added
                profilePicture,
            });
            
    } catch (error) {
        console.error('Dashboard Fetch Error:', error);
        res.status(500).json({ message: 'Failed to fetch user details.' });
    }
});
router.put('/update-profile', verifyToken, async (req, res) => {
    const { username, email, phone } = req.body;

    if (phone && !phone.match(/^[0-9]{8,15}$/)) {
        return res.status(400).json({ message: 'Invalid phone number format.' });
    }

    try {
        const updatedFields = {};
        if (username) updatedFields.username = username;
        if (email) updatedFields.email = email;
        if (phone) updatedFields.phone = phone;

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updatedFields },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json({
            message: 'Profile updated successfully!',
            user: {
                username: updatedUser.username,
                email: updatedUser.email,
                phone: updatedUser.phone,
            },
        });
    } catch (error) {
        console.error('Profile Update Error:', error);
        res.status(500).json({ message: 'Failed to update profile.' });
    }
});



module.exports = router;
