// config/db.js
const mongoose = require("mongoose");

const ConnectDB = async () => {
    try {
        console.log('Attempting to connect to MongoDB...');
        
        // Don't log the full URI for security
        const uri = process.env.MONGO_URI;
        if (!uri) {
            throw new Error('MongoDB URI is not defined');
        }
        
        const conn = await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000,
            family: 4
        });
        
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error("MongoDB connection error:", error.message);
        if (error.message.includes('bad auth')) {
            console.error('Authentication failed. Please check your username and password.');
        }
        // Don't exit in production
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
    }
};

module.exports = ConnectDB;
