const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email:    { type: String, required: true, unique: true },
    password: { type: String, required: true },
    bio:      { type: String, default: 'ยังไม่มีประวัติส่วนตัว' },
    avatar:   { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);