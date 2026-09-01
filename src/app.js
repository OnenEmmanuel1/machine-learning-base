const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const morgan = require('morgan');
const helmet = require('helmet');
require('dotenv').config();

const { exposeLocals } = require('./middleware/auth');

// Routes
const authRoutes = require('./routes/authRoutes');
const lecturerRoutes = require('./routes/lecturerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const studentRoutes = require('./routes/studentRoutes');
const exportRoutes = require('./routes/exportRoutes');

const app = express();

// Security headers with Helmet (per NFR4)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdnjs.cloudflare.com"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com"
        ],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"]
      }
    }
  })
);

// Request logger
app.use(morgan('dev'));

// Body parsing
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Proxy trust
app.set('trust proxy', 1);

// Session configuration
app.use(
  session({
    name: 'mlspms.sid',
    secret: process.env.SESSION_SECRET || 'unical_cs_ml_spms_session_secret_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Ensure cookies work across localhost HTTP mapping
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
  })
);

// Flash messages
app.use(flash());

// View engine setup
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

// Global middleware for templates
app.use(exposeLocals);

// Route mounts
app.use('/auth', authRoutes);
app.use('/lecturer', lecturerRoutes);
app.use('/admin', adminRoutes);
app.use('/student', studentRoutes);
app.use('/export', exportRoutes);

// Root route redirect
app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    if (req.session.user.role === 'student') return res.redirect('/student/dashboard');
    if (req.session.user.role === 'administrator') return res.redirect('/admin/dashboard');
    return res.redirect('/lecturer/dashboard');
  }
  res.redirect('/auth/login');
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).render('error', {
    title: '404 - Page Not Found',
    errorCode: 404,
    errorMessage: 'The requested resource could not be found on this server.'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[UNHANDLED SERVER ERROR]:', err);
  res.status(500).render('error', {
    title: '500 - Server Error',
    errorCode: 500,
    errorMessage: process.env.NODE_ENV === 'development' ? err.message : 'An internal server error occurred.'
  });
});

module.exports = app;
