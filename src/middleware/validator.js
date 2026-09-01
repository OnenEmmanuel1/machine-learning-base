const { queryOne } = require('../config/database');

/**
 * Validate assessment score entry (Section 3.3.1)
 */
async function validateScoreInput(req, res, next) {
  const { student_id, course_code, assessment_type, score, date_recorded } = req.body;
  const errors = [];

  // Check student existence
  if (!student_id) {
    errors.push('Student ID is required.');
  } else {
    const student = await queryOne('SELECT student_id FROM students WHERE student_id = ?', [student_id]);
    if (!student) errors.push(`Selected student (ID: ${student_id}) does not exist in the database.`);
  }

  // Check course existence
  if (!course_code) {
    errors.push('Course code is required.');
  } else {
    const course = await queryOne('SELECT course_code FROM courses WHERE course_code = ?', [course_code]);
    if (!course) errors.push(`Course ${course_code} is not registered in the system.`);
  }

  // Validate assessment type
  const validTypes = ['test', 'assignment', 'examination'];
  if (!assessment_type || !validTypes.includes(assessment_type)) {
    errors.push('Assessment type must be one of: test, assignment, examination.');
  }

  // Validate score ranges per grading scheme
  const numScore = parseFloat(score);
  if (isNaN(numScore) || numScore < 0) {
    errors.push('Score must be a positive numeric value.');
  } else {
    if (assessment_type === 'test' && (numScore > 30)) {
      errors.push('Test score cannot exceed 30 marks.');
    } else if (assessment_type === 'assignment' && (numScore > 20)) {
      errors.push('Assignment score cannot exceed 20 marks.');
    } else if (assessment_type === 'examination' && (numScore > 70)) {
      errors.push('Examination score cannot exceed 70 marks.');
    } else if (numScore > 100) {
      errors.push('Score cannot exceed 100%.');
    }
  }

  // Validate date
  if (!date_recorded || isNaN(Date.parse(date_recorded))) {
    errors.push('A valid recorded date (YYYY-MM-DD) is required.');
  }

  if (errors.length > 0) {
    req.flash('error', errors.join(' '));
    return res.redirect('back');
  }

  next();
}

/**
 * Validate attendance session input (Section 3.3.1)
 */
async function validateAttendanceInput(req, res, next) {
  const { student_id, course_code, session_date, status } = req.body;
  const errors = [];

  if (!student_id) {
    errors.push('Student ID is required.');
  } else {
    const student = await queryOne('SELECT student_id FROM students WHERE student_id = ?', [student_id]);
    if (!student) errors.push(`Student with ID ${student_id} does not exist.`);
  }

  if (!course_code) {
    errors.push('Course code is required.');
  } else {
    const course = await queryOne('SELECT course_code FROM courses WHERE course_code = ?', [course_code]);
    if (!course) errors.push(`Course ${course_code} does not exist.`);
  }

  if (!session_date || isNaN(Date.parse(session_date))) {
    errors.push('A valid session date (YYYY-MM-DD) is required.');
  }

  if (!status || !['present', 'absent'].includes(status)) {
    errors.push('Attendance status must be either "present" or "absent".');
  }

  if (errors.length > 0) {
    req.flash('error', errors.join(' '));
    return res.redirect('back');
  }

  next();
}

module.exports = {
  validateScoreInput,
  validateAttendanceInput
};
