const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('../config/db.js');
const User = require('./Users.js');

console.log('Looking for .env at:', path.join(__dirname, '../.env'));
dotenv.config({ path: path.join(__dirname, '../.env') });
const app = express();
app.use(express.json());

// API ตัวอย่าง: สมัครสมาชิก (Signup)
app.post('/api/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // บันทึกลง MongoDB
        const newUser = await User.create({ username, email, password });
        res.status(201).json({ success: true, data: newUser });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;

async function startServer() {
    await connectDB();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});