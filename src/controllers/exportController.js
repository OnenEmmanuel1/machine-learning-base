const { query, queryOne } = require('../config/database');

const exportController = {
  // Export Cohort CSV
  exportCohortCsv: async (req, res) => {
    try {
      const students = await query(
        `SELECT s.matric_no, s.full_name, s.level, u.full_name AS supervisor_name,
                fv.avg_ca_score, fv.attendance_rate, fv.submission_rate,
                pr.risk_level, pr.confidence, pr.feature_contributions, pr.generated_at,
                m.model_type, m.version AS model_version
         FROM students s
         LEFT JOIN (
            SELECT f1.* FROM feature_vectors f1
            JOIN (SELECT student_id, MAX(computed_at) as max_time FROM feature_vectors GROUP BY student_id) f2
            ON f1.student_id = f2.student_id AND f1.computed_at = f2.max_time
         ) fv ON s.student_id = fv.student_id
         LEFT JOIN (
            SELECT p1.* FROM prediction_results p1
            JOIN (SELECT student_id, MAX(generated_at) as max_gen FROM prediction_results GROUP BY student_id) p2
            ON p1.student_id = p2.student_id AND p1.generated_at = p2.max_gen
         ) pr ON s.student_id = pr.student_id
         LEFT JOIN prediction_models m ON pr.model_id = m.model_id
         LEFT JOIN users u ON s.supervisor_id = u.user_id
         ORDER BY s.matric_no ASC`
      );

      const headers = [
        'Matric Number',
        'Full Name',
        'Level',
        'Academic Supervisor',
        'Avg CA Score (%)',
        'Attendance Rate (%)',
        'Submission Rate (%)',
        'Risk Level',
        'Model Confidence (%)',
        'Active Model',
        'Evaluation Timestamp'
      ];

      const csvRows = [headers.join(',')];

      for (const s of students) {
        const row = [
          `"${s.matric_no}"`,
          `"${s.full_name}"`,
          s.level,
          `"${s.supervisor_name || 'N/A'}"`,
          s.avg_ca_score || 0,
          s.attendance_rate || 0,
          s.submission_rate || 0,
          `"${(s.risk_level || 'UNCLASSIFIED').toUpperCase()}"`,
          s.confidence || 0,
          `"${s.model_type ? s.model_type + ' (' + s.model_version + ')' : 'N/A'}"`,
          `"${s.generated_at ? new Date(s.generated_at).toISOString() : 'N/A'}"`
        ];
        csvRows.push(row.join(','));
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=UNICAL_CS_Cohort_Performance_Report_${Date.now()}.csv`);
      return res.send(csvRows.join('\r\n'));
    } catch (error) {
      console.error('[EXPORT COHORT CSV ERROR]:', error);
      req.flash('error', 'Failed to export cohort CSV.');
      res.redirect('/lecturer/dashboard');
    }
  },

  // Export Cohort Printable Report
  printCohortReport: async (req, res) => {
    try {
      const activeModel = await queryOne(
        'SELECT model_id, model_type, version, accuracy, trained_at FROM prediction_models WHERE is_active = 1 LIMIT 1'
      );

      const students = await query(
        `SELECT s.matric_no, s.full_name, s.level, u.full_name AS supervisor_name,
                fv.avg_ca_score, fv.attendance_rate, fv.submission_rate,
                pr.risk_level, pr.confidence, pr.feature_contributions, pr.generated_at
         FROM students s
         LEFT JOIN (
            SELECT f1.* FROM feature_vectors f1
            JOIN (SELECT student_id, MAX(computed_at) as max_time FROM feature_vectors GROUP BY student_id) f2
            ON f1.student_id = f2.student_id AND f1.computed_at = f2.max_time
         ) fv ON s.student_id = fv.student_id
         LEFT JOIN (
            SELECT p1.* FROM prediction_results p1
            JOIN (SELECT student_id, MAX(generated_at) as max_gen FROM prediction_results GROUP BY student_id) p2
            ON p1.student_id = p2.student_id AND p1.generated_at = p2.max_gen
         ) pr ON s.student_id = pr.student_id
         LEFT JOIN users u ON s.supervisor_id = u.user_id
         ORDER BY 
           CASE pr.risk_level 
             WHEN 'high' THEN 1 
             WHEN 'moderate' THEN 2 
             WHEN 'low' THEN 3 
             ELSE 4 
           END, s.matric_no ASC`
      );

      let lowCount = 0, modCount = 0, highCount = 0;
      students.forEach(s => {
        if (s.risk_level === 'low') lowCount++;
        else if (s.risk_level === 'moderate') modCount++;
        else if (s.risk_level === 'high') highCount++;
      });

      res.render('export/cohort-print', {
        title: 'Official Cohort Performance & Risk Analysis Report | UNICAL CS',
        activeModel,
        students,
        stats: {
          total: students.length,
          lowCount,
          modCount,
          highCount
        },
        generatedDate: new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      });
    } catch (error) {
      console.error('[PRINT COHORT ERROR]:', error);
      req.flash('error', 'Failed to generate printable report.');
      res.redirect('/lecturer/dashboard');
    }
  },

  // Export Individual Student CSV
  exportStudentCsv: async (req, res) => {
    try {
      const studentId = parseInt(req.params.id, 10);
      const student = await queryOne('SELECT * FROM students WHERE student_id = ?', [studentId]);
      if (!student) {
        req.flash('error', 'Student not found.');
        return res.redirect('/lecturer/dashboard');
      }

      const assessments = await query(
        `SELECT a.course_code, a.assessment_type, a.score, a.date_recorded, c.title as course_title
         FROM assessment_records a
         JOIN courses c ON a.course_code = c.course_code
         WHERE a.student_id = ? ORDER BY a.date_recorded DESC`,
        [studentId]
      );

      const headers = ['Matric Number', 'Student Name', 'Course Code', 'Course Title', 'Assessment Type', 'Score', 'Date Recorded'];
      const csvRows = [headers.join(',')];

      for (const a of assessments) {
        csvRows.push([
          `"${student.matric_no}"`,
          `"${student.full_name}"`,
          `"${a.course_code}"`,
          `"${a.course_title}"`,
          `"${a.assessment_type}"`,
          a.score,
          `"${a.date_recorded ? new Date(a.date_recorded).toISOString().split('T')[0] : ''}"`
        ].join(','));
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${student.matric_no.replace(/\//g, '_')}_Performance_Data.csv`);
      return res.send(csvRows.join('\r\n'));
    } catch (error) {
      console.error('[EXPORT STUDENT CSV ERROR]:', error);
      req.flash('error', 'Failed to export student CSV.');
      res.redirect('back');
    }
  },

  // Printable Individual Student Performance Report
  printStudentReport: async (req, res) => {
    try {
      const studentId = parseInt(req.params.id, 10);

      const student = await queryOne(
        `SELECT s.*, u.full_name AS supervisor_name, u.email AS supervisor_email
         FROM students s
         LEFT JOIN users u ON s.supervisor_id = u.user_id
         WHERE s.student_id = ?`,
        [studentId]
      );

      if (!student) {
        req.flash('error', 'Student not found.');
        return res.redirect('/lecturer/dashboard');
      }

      const featureVector = await queryOne(
        'SELECT * FROM feature_vectors WHERE student_id = ? ORDER BY computed_at DESC LIMIT 1',
        [studentId]
      );

      const latestPrediction = await queryOne(
        `SELECT p.*, m.model_type, m.version AS model_version
         FROM prediction_results p
         JOIN prediction_models m ON p.model_id = m.model_id
         WHERE p.student_id = ?
         ORDER BY p.generated_at DESC LIMIT 1`,
        [studentId]
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

      const assessments = await query(
        `SELECT a.*, c.title as course_title, c.ca_weight
         FROM assessment_records a
         JOIN courses c ON a.course_code = c.course_code
         WHERE a.student_id = ?
         ORDER BY a.course_code ASC, a.date_recorded DESC`,
        [studentId]
      );

      const attendanceRecords = await query(
        `SELECT a.*, c.title as course_title
         FROM attendance_records a
         JOIN courses c ON a.course_code = c.course_code
         WHERE a.student_id = ?
         ORDER BY a.session_date DESC`,
        [studentId]
      );

      const totalAtt = attendanceRecords.length;
      const presentAtt = attendanceRecords.filter(a => a.status === 'present').length;
      const attRate = totalAtt > 0 ? parseFloat(((presentAtt / totalAtt) * 100).toFixed(1)) : 100.0;

      res.render('export/student-print', {
        title: `Academic Performance & Early Warning Profile — ${student.matric_no}`,
        student,
        featureVector,
        latestPrediction,
        explanation,
        assessments,
        attendanceStats: {
          total: totalAtt,
          present: presentAtt,
          rate: attRate
        },
        generatedDate: new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      });
    } catch (error) {
      console.error('[PRINT STUDENT REPORT ERROR]:', error);
      req.flash('error', 'Failed to generate printable student report.');
      res.redirect('back');
    }
  }
};

module.exports = exportController;
