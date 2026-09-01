const { query, queryOne } = require('../config/database');

/**
 * Recomputes a student's feature vector based on all stored assessment and attendance records.
 * Feature Vector schema:
 *  - avg_ca_score: Continuous assessment score (tests & assignments) weighted across courses
 *  - attendance_rate: Attended sessions / Total recorded sessions (0 - 100%)
 *  - submission_rate: Completed assignments / Total assignments (0 - 100%)
 * 
 * @param {number} studentId
 * @returns {Promise<Object>} { vector_id, avg_ca_score, attendance_rate, submission_rate, features: number[] }
 */
async function computeStudentFeatureVector(studentId) {
  // 1. Compute weighted CA score across all courses
  // Assessment types: 'test', 'assignment', 'examination'
  const caRecords = await query(
    `SELECT a.record_id, a.course_code, a.assessment_type, a.score, c.ca_weight
     FROM assessment_records a
     JOIN courses c ON a.course_code = c.course_code
     WHERE a.student_id = ? AND a.assessment_type IN ('test', 'assignment')`,
    [studentId]
  );

  let avgCaScore = 70.0; // Default baseline if no CA records entered yet

  if (caRecords.length > 0) {
    // Group CA scores by course and compute weighted CA
    const courseMap = {};
    for (const rec of caRecords) {
      if (!courseMap[rec.course_code]) {
        courseMap[rec.course_code] = {
          percentages: [],
          caWeight: parseFloat(rec.ca_weight || 0.30)
        };
      }
      const rawScore = parseFloat(rec.score);
      let pct = rawScore;
      if (rec.assessment_type === 'test') {
        pct = (rawScore / 30.0) * 100.0;
      } else if (rec.assessment_type === 'assignment') {
        pct = (rawScore / 20.0) * 100.0;
      }
      courseMap[rec.course_code].percentages.push(Math.min(100, Math.max(0, pct)));
    }

    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const [courseCode, data] of Object.entries(courseMap)) {
      const courseAvg = data.percentages.reduce((a, b) => a + b, 0) / data.percentages.length;
      totalWeightedScore += courseAvg * data.caWeight;
      totalWeight += data.caWeight;
    }

    if (totalWeight > 0) {
      avgCaScore = totalWeightedScore / totalWeight;
    }
  }

  // 2. Compute attendance rate
  const attendanceStats = await queryOne(
    `SELECT 
       COUNT(*) as total_sessions,
       SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as attended_sessions
     FROM attendance_records
     WHERE student_id = ?`,
    [studentId]
  );

  let attendanceRate = 85.0; // Default baseline if no attendance recorded yet
  if (attendanceStats && parseInt(attendanceStats.total_sessions, 10) > 0) {
    const total = parseInt(attendanceStats.total_sessions, 10);
    const attended = parseInt(attendanceStats.attended_sessions || 0, 10);
    attendanceRate = (attended / total) * 100.0;
  }

  // 3. Compute assignment submission rate
  const submissionStats = await queryOne(
    `SELECT 
       COUNT(*) as total_assignments,
       SUM(CASE WHEN score > 0 THEN 1 ELSE 0 END) as submitted_assignments
     FROM assessment_records
     WHERE student_id = ? AND assessment_type = 'assignment'`,
    [studentId]
  );

  let submissionRate = 80.0; // Default baseline if no assignments yet
  if (submissionStats && parseInt(submissionStats.total_assignments, 10) > 0) {
    const total = parseInt(submissionStats.total_assignments, 10);
    const submitted = parseInt(submissionStats.submitted_assignments || 0, 10);
    submissionRate = (submitted / total) * 100.0;
  }

  // Clamp values to valid 0-100 ranges
  avgCaScore = Math.min(100, Math.max(0, parseFloat(avgCaScore.toFixed(2))));
  attendanceRate = Math.min(100, Math.max(0, parseFloat(attendanceRate.toFixed(2))));
  submissionRate = Math.min(100, Math.max(0, parseFloat(submissionRate.toFixed(2))));

  // Check if a feature vector record already exists for this student
  const existingVector = await queryOne(
    'SELECT vector_id FROM feature_vectors WHERE student_id = ? ORDER BY vector_id DESC LIMIT 1',
    [studentId]
  );

  let vectorId;
  if (existingVector) {
    await query(
      `UPDATE feature_vectors 
       SET avg_ca_score = ?, attendance_rate = ?, submission_rate = ?, computed_at = NOW() 
       WHERE vector_id = ?`,
      [avgCaScore, attendanceRate, submissionRate, existingVector.vector_id]
    );
    vectorId = existingVector.vector_id;
  } else {
    const insertRes = await query(
      `INSERT INTO feature_vectors (student_id, avg_ca_score, attendance_rate, submission_rate, computed_at) 
       VALUES (?, ?, ?, ?, NOW())`,
      [studentId, avgCaScore, attendanceRate, submissionRate]
    );
    vectorId = insertRes.insertId;
  }

  return {
    vector_id: vectorId,
    student_id: studentId,
    avg_ca_score: avgCaScore,
    attendance_rate: attendanceRate,
    submission_rate: submissionRate,
    features: [avgCaScore, attendanceRate, submissionRate]
  };
}

module.exports = {
  computeStudentFeatureVector
};
