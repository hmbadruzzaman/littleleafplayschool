require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - Allow both localhost and production origins
const allowedOrigins = [
    'http://localhost:3000',
    'https://welittleleaf.com',
    'https://www.welittleleaf.com'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
const authRoutes = require('./routes/auth');
const publicRoutes = require('./routes/public');
const studentRoutes = require('./routes/student');
const teacherRoutes = require('./routes/teacher');
const adminRoutes = require('./routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Little Leaf Play School API is running',
        timestamp: new Date().toISOString()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome to Little Leaf Play School Management System API',
        version: '1.0.0',
        endpoints: {
            public: '/api/public',
            auth: '/api/auth',
            student: '/api/student',
            teacher: '/api/teacher',
            admin: '/api/admin'
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// Start server
app.listen(PORT, () => {
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║   Little Leaf Play School Management API     ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log(`\nServer running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`\nAPI Endpoints:`);
    console.log(`  - Health: http://localhost:${PORT}/health`);
    console.log(`  - Public: http://localhost:${PORT}/api/public`);
    console.log(`  - Auth:   http://localhost:${PORT}/api/auth`);
    console.log(`  - Student: http://localhost:${PORT}/api/student`);
    console.log(`  - Teacher: http://localhost:${PORT}/api/teacher`);
    console.log(`  - Admin:  http://localhost:${PORT}/api/admin`);
    console.log('\n' + '═'.repeat(48));
});

module.exports = app;
