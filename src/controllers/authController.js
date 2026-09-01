const bcrypt = require('bcryptjs');
const { queryOne, query } = require('../config/database');

const authController = {
  getLogin: (req, res) => {
    if (req.session && req.session.user) {
      if (req.session.user.role === 'student') return res.redirect('/student/dashboard');
      return res.redirect('/lecturer/dashboard');
    }
    res.render('auth/login', { title: 'Sign In | ML-SPMS UNICAL' });
  },

  postLogin: async (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      req.flash('error', 'Please provide both email/matric number and password.');
      return res.redirect('/auth/login');
    }

    try {
      // Allow login with either Email or Matric Number
      let user = await queryOne(
        `SELECT u.*, s.student_id, s.matric_no 
         FROM users u
         LEFT JOIN students s ON u.user_id = s.user_id
         WHERE u.email = ? OR s.matric_no = ?`,
        [identifier.trim(), identifier.trim()]
      );

      if (!user) {
        req.flash('error', 'Invalid login credentials.');
        return res.redirect('/auth/login');
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        req.flash('error', 'Invalid login credentials.');
        return res.redirect('/auth/login');
      }

      // Populate session
      req.session.user = {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        department: user.department,
        student_id: user.student_id || null,
        matric_no: user.matric_no || null
      };

      req.flash('success', `Welcome back, ${user.full_name}!`);

      req.session.save((err) => {
        if (err) console.error('[SESSION SAVE ERROR]:', err);
        if (user.role === 'student') {
          return res.redirect('/student/dashboard');
        } else if (user.role === 'administrator') {
          return res.redirect('/admin/dashboard');
        } else {
          return res.redirect('/lecturer/dashboard');
        }
      });
    } catch (error) {
      console.error('[AUTH ERROR]:', error);
      req.flash('error', 'An unexpected error occurred during authentication.');
      return res.redirect('/auth/login');
    }
  },

  logout: (req, res) => {
    req.session.destroy(() => {
      res.redirect('/auth/login');
    });
  }
};

module.exports = authController;
