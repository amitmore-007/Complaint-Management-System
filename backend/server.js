import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/database.js';

// Route imports
import clientRoutes from './routes/clientRoutes.js';
import technicianRoutes from './routes/technicianRoutes.js';
import adminAuthRoutes from './routes/adminAuthRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import equipmentRoutes from './routes/equipmentRoutes.js';

// For ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration optimized for production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:4173',
      process.env.FRONTEND_URL,
      'https://cemaintenance.in',
      'https://www.cemaintenance.in',
      // Add your Render frontend URL here when deployed
    ].filter(Boolean);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for Render
app.set('trust proxy', 1);

// Create uploads directory if it doesn't exist
import fs from 'fs';
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
connectDB();


// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CMS Backend Server is running',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// API Routes - Order matters!
app.use('/api/admin/auth', adminAuthRoutes);  // Admin auth routes first
app.use('/api/client', clientRoutes);         // Client routes (includes auth and complaints)
app.use('/api/complaints', complaintRoutes);  // General complaint routes
app.use('/api/technician', technicianRoutes); // Technician routes
app.use('/api/admin', adminRoutes);           // Admin routes (non-auth)
app.use('/api/equipment', equipmentRoutes);   // Equipment routes

// Debug endpoints (only in development)
if (process.env.NODE_ENV !== 'production') {
  // Debug route to check if equipment routes are loaded
  app.get('/api/debug/routes', (req, res) => {
    const routes = [];
    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        routes.push(middleware.route.path);
      } else if (middleware.name === 'router') {
        middleware.handle.stack.forEach((handler) => {
          if (handler.route) {
            routes.push(handler.route.path);
          }
        });
      }
    });
    res.json({ routes });
  });
  
  app.get('/api/debug/collections', async (req, res) => {
    try {
      const Client = (await import('./models/Client.js')).default;
      const Technician = (await import('./models/Technician.js')).default;
      const Admin = (await import('./models/Admin.js')).default;
      const Complaint = (await import('./models/Complaint.js')).default;
      const Equipment = (await import('./models/Equipment.js')).default;
      const AssetRecord = (await import('./models/AssetRecord.js')).default;

      const clientCount = await Client.countDocuments();
      const technicianCount = await Technician.countDocuments();
      const adminCount = await Admin.countDocuments();
      const complaintCount = await Complaint.countDocuments();
      const equipmentCount = await Equipment.countDocuments();
      const assetRecordCount = await AssetRecord.countDocuments();

      res.json({
        success: true,
        collections: {
          clients: clientCount,
          technicians: technicianCount,
          admins: adminCount,
          complaints: complaintCount,
          equipment: equipmentCount,
          assetRecords: assetRecordCount
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Debug Twilio configuration and test
  app.get('/api/debug/twilio', async (req, res) => {
    try {
      const twilioConfig = {
        accountSid: !!process.env.TWILIO_ACCOUNT_SID,
        authToken: !!process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER,
        whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER
      };
      
      res.json({
        success: true,
        config: twilioConfig,
        message: 'Twilio configuration status'
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Test Twilio message sending
  app.post('/api/debug/twilio/test', async (req, res) => {
    try {
      const { phoneNumber, message } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          error: 'Phone number is required'
        });
      }

      const { sendStatusUpdateNotification } = await import('./config/twilio.js');
      
      const result = await sendStatusUpdateNotification(
        phoneNumber,
        'TEST-001',
        'in-progress',
        'Test User'
      );
      
      res.json({
        success: true,
        result,
        message: 'Test message sent'
      });
    } catch (error) {
      console.error('Test Twilio error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Check message delivery status
  app.get('/api/debug/twilio/status/:messageId', async (req, res) => {
    try {
      const { messageId } = req.params;
      const client = (await import('./config/twilio.js')).default;
      
      const message = await client.messages(messageId).fetch();
      
      res.json({
        success: true,
        message: {
          sid: message.sid,
          status: message.status,
          errorCode: message.errorCode,
          errorMessage: message.errorMessage,
          dateCreated: message.dateCreated,
          dateSent: message.dateSent,
          dateUpdated: message.dateUpdated,
          to: message.to,
          from: message.from,
          body: message.body
        }
      });
    } catch (error) {
      console.error('Message status check error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // WhatsApp sandbox setup instructions
  app.get('/api/debug/whatsapp-setup', (req, res) => {
    res.json({
      success: true,
      instructions: {
        title: 'WhatsApp Sandbox Setup Instructions',
        steps: [
          {
            step: 1,
            action: 'Open WhatsApp on your phone'
          },
          {
            step: 2,
            action: 'Send a message to: +1 415 523 8886'
          },
          {
            step: 3,
            action: 'Message content: "join <your-sandbox-keyword>"',
            note: 'Find your sandbox keyword in Twilio Console > Messaging > Try it out > Send a WhatsApp message'
          },
          {
            step: 4,
            action: 'Wait for confirmation message from Twilio'
          },
          {
            step: 5,
            action: 'Your phone number is now verified for the sandbox'
          }
        ],
        currentConfig: {
          whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER,
          accountSid: process.env.TWILIO_ACCOUNT_SID ? `${process.env.TWILIO_ACCOUNT_SID.substring(0, 10)}...` : 'Not set'
        },
        testEndpoint: '/api/debug/twilio/test',
        statusCheckEndpoint: '/api/debug/twilio/status/{messageId}'
      }
    });
  });
}

// 404 handler
app.use('*', (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  }
  res.status(404).json({ 
    success: false,
    message: 'Route not found',
    path: req.originalUrl 
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Server Error:', error.message);
  
  // CORS error handling
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      error: 'Origin not allowed'
    });
  }

  res.status(error.status || 500).json({ 
    success: false, 
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🔗 API URL: http://localhost:${PORT}/api`);
  }
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server failed to start:', error);
  process.exit(1);
});

export default app;