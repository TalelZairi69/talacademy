const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['student', 'teacher', 'parent'], default: 'student' },
    gender: { type: String, required: true, enum: ['Male', 'Female'] },
    phone: { type: String, required: true, unique: true }, // Add this line
    balance: { type: Number, required: true, default: 0 },
    createdAt: { type: Date, default: Date.now },
});


module.exports = mongoose.model('User', UserSchema);
