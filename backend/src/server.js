const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables before importing modules that read process.env
dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const callRoutes = require('./routes/callRoutes');
const chatRoutes = require('./routes/chatRoutes');
const medicineRoutes = require('./routes/medicineRoutes');
const healthRecordsRoutes = require('./routes/healthRecordsRoutes');
const hospitalsRoutes = require('./routes/hospitalsRoutes');
const symptomRoutes = require('./routes/symptomRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes');
const equipmentRotationRoutes = require('./routes/equipmentRotationRoutes');
const simpleRoutes = require('./routes/simpleRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const videoRoutes = require('./routes/videoRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/health-records', healthRecordsRoutes);
app.use('/api/hospitals', hospitalsRoutes);
app.use('/api/symptoms', symptomRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/equipment-rotation', equipmentRotationRoutes);
app.use('/api/simple', simpleRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/videos', videoRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Telemedicine Backend API',
    version: '1.0.0',
    status: 'Running'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
});
