const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoSanitize = require('express-mongo-sanitize');

dotenv.config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const aiRoutes = require('./routes/ai');
const documentSocketHandler = require('./websockets/documentHandler');
const { authLimiter, apiLimiter } = require('./middleware/rateLimit');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Connect Database
connectDB();

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true
}));
app.use(mongoSanitize()); // Data sanitization against NoSQL query injection - MUST BE BEFORE express.json()
app.use(express.json());

// Apply rate limiters
app.use('/api/', apiLimiter); // Apply to all /api routes by default
app.use('/api/auth', authLimiter); // More strict for auth routes

// Define Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/ai', aiRoutes);

app.get('/', (req, res) => {
    res.send('API is running...');
});

// Socket.io integration
documentSocketHandler(io);

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));