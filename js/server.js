const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('../config/db.js');
const authHandler = require('../api/auth.js');
const User = require('./Users.js');

const envPath = path.join(__dirname, '../config/.env');
console.log('Looking for .env at:', envPath);
dotenv.config({ path: envPath });
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));
app.use('/api/auth', authHandler);

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