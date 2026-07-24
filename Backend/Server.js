/* ═══════════════════════════════════════════════
   RECLAIM'R BACKEND — SERVER ENTRY POINT
   Campus Lost & Found Management System API
═══════════════════════════════════════════════ */

require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const connectDB   = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const authRoutes  = require('./routes/auth');
const itemRoutes  = require('./routes/items');

const app = express();

// Connect to MongoDB
connectDB();

// Core middleware
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json({ limit: '10mb' })); // 10mb allows small base64 image previews

// Health check
app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: "Reclaim'r API is running." });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);

// 404 handler — no matching route found
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// Global error handler (always last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Reclaim'r server running on port ${PORT}`);
});