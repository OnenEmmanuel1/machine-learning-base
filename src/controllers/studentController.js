const { query, queryOne } = require('../config/database');
const { getUserNotifications } = require('../services/notificationService');

const studentController = {
  // Student Personal Dashboard
  getDashboard: async (req, res) => {
    try {
      const user = req.session.user;

      // 1. Fetch student record
      const student = await queryOne(
        `SELECT s.*, u.full_name as supervisor_name, u.email as supervisor_email, u.department
         FROM students s
         LEFT JOIN users u ON s.supervisor_id = u.user_id
         WHERE s.user_id = ?`,
        [user.user_id]
      );

      if (!student) {
        req.flash('error', 'Student profile not linked to this user account.');
        return res.render('student/dashboard', {
          title: 'Student Dashboard',
          student: null,
          featureVector: null,
          latestPrediction: null,
          explanation: null,
          assessments: [],
          attendanceStats: { total: 0, present: 0, percentage: 0 },
          notifications: []
        });
      }

      // 2. Fetch Latest Feature Vector
      const featureVector = await queryOne(
        'SELECT * FROM feature_vectors WHERE student_id = ? ORDER BY computed_at DESC LIMIT 1',
        [student.student_id]
      );

      // 3. Fetch Latest Prediction Result
      const latestPrediction = await queryOne(
        `SELECT p.*, m.model_type, m.version AS model_version
         FROM prediction_results p
         JOIN prediction_models m ON p.model_id = m.model_id
         WHERE p.student_id = ?
         ORDER BY p.generated_at DESC LIMIT 1`,
        [student.student_id]
      );

      let explanation = null;
      if (latestPrediction && latestPrediction.feature_contributions) {
        try {
          explanation = typeof latestPrediction.feature_contributions === 'string'
            ? JSON.parse(latestPrediction.feature_contributions)
            : latestPrediction.feature_contributions;
        } catch (e) {
          explanation = null;
        }
      }

      // 4. Fetch Assessment history
      const assessments = await query(
        `SELECT a.*, c.title as course_title, c.ca_weight
         FROM assessment_records a
         JOIN courses c ON a.course_code = c.course_code
         WHERE a.student_id = ?
         ORDER BY a.date_recorded DESC`,
        [student.student_id]
      );

      // 5. Fetch Attendance summary
      const attendanceRecords = await query(
        `SELECT a.*, c.title as course_title
         FROM attendance_records a
         JOIN courses c ON a.course_code = c.course_code
         WHERE a.student_id = ?
         ORDER BY a.session_date DESC`,
        [student.student_id]
      );

      const totalSessions = attendanceRecords.length;
      const attendedSessions = attendanceRecords.filter(a => a.status === 'present').length;
      const attendancePercentage = totalSessions > 0 ? parseFloat(((attendedSessions / totalSessions) * 100).toFixed(1)) : 100.0;

      // 6. Fetch student alerts
      const notifications = await getUserNotifications(user.user_id, 'student');

      res.render('student/dashboard', {
        title: 'Student Academic Performance Portal | ML-SPMS',
        student,
        featureVector,
        latestPrediction,
        explanation,
        assessments,
        attendanceRecords,
        attendanceStats: {
          total: totalSessions,
          present: attendedSessions,
          percentage: attendancePercentage
        },
        notifications
      });
    } catch (error) {
      console.error('[STUDENT DASHBOARD ERROR]:', error);
      req.flash('error', 'Failed to load student performance data.');
      res.redirect('/auth/login');
    }
  },

  // Student In-App Notifications
  getNotifications: async (req, res) => {
    try {
      const user = req.session.user;
      const notifications = await getUserNotifications(user.user_id, 'student');

      res.render('student/notifications', {
        title: 'Academic Performance Alerts & Advisories | ML-SPMS',
        notifications
      });
    } catch (error) {
      console.error('[STUDENT NOTIFICATIONS ERROR]:', error);
      req.flash('error', 'Failed to retrieve notifications.');
      res.redirect('/student/dashboard');
    }
  }
};

module.exports = studentController;
