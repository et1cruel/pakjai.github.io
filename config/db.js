const mongoose = require('mongoose');

let connectionPromise;

const connectDB = async () => {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured');
    if (connectionPromise) return connectionPromise;
    connectionPromise = mongoose.connect(process.env.MONGO_URI).then(conn => {
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    }).catch(error => {
        connectionPromise = null;
        throw error;
    });
    return connectionPromise;
};

/* Legacy Express startup helper.
const legacyConnectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};
*/

module.exports = connectDB;