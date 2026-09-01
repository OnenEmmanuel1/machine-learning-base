const { query, queryOne } = require('../config/database');
const { sendAlertEmail } = require('../config/mailer');

/**
 * Dispatch and store alert notification when student risk level escalates to moderate or high
 * @param {Object} params { resultId, studentId, riskLevel, confidence, explanation }
 */
async function dispatchRiskAlert({ resultId, studentId, riskLevel, confidence, explanation }) {
  try {
    // 1. Fetch student and supervisor details
    const student = await queryOne(
      `SELECT s.student_id, s.matric_no, s.full_name, s.level, s.supervisor_id,
              u_sup.full_name AS supervisor_name, u_sup.email AS supervisor_email,
              u_stu.email AS student_email
       FROM students s
       JOIN users u_sup ON s.supervisor_id = u_sup.user_id
       LEFT JOIN users u_stu ON s.user_id = u_stu.user_id
       WHERE s.student_id = ?`,
      [studentId]
    );

    if (!student) {
      console.warn(`[NOTIFICATION] Student with ID ${studentId} not found.`);
      return null;
    }

    const narrative = explanation && explanation.narrative 
      ? explanation.narrative 
      : `Performance risk escalated to ${riskLevel.toUpperCase()} with ${confidence}% confidence.`;

    const alertMessage = `Academic Risk Alert: Student ${student.full_name} (${student.matric_no}) has been classified as ${riskLevel.toUpperCase()} RISK (${confidence}% confidence). Rationale: ${narrative}`;

    // 2. Insert alert into alert_notifications table
    const insertRes = await query(
      `INSERT INTO alert_notifications (result_id, student_id, supervisor_id, message, status, timestamp)
       VALUES (?, ?, ?, ?, 'sent', NOW())`,
      [resultId, studentId, student.supervisor_id, alertMessage]
    );

    const alertId = insertRes.insertId;

    // 3. Dispatch email notifications
    const recipients = [];
    if (student.supervisor_email) recipients.push(student.supervisor_email);
    if (student.student_email) recipients.push(student.student_email);

    if (recipients.length > 0) {
      const emailSubject = `[UNICAL CS ML-SPMS] ${riskLevel.toUpperCase()} Academic Risk Alert — ${student.matric_no}`;
      const emailHtml = `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 6px;">
          <div style="background-color: #0f172a; color: #ffffff; padding: 15px; border-radius: 4px; text-align: center;">
            <h2 style="margin: 0; font-size: 18px; font-weight: 600;">Department of Computer Science — University of Calabar</h2>
            <p style="margin: 5px 0 0 0; font-size: 13px; color: #94a3b8;">Student Performance Monitoring System (ML-SPMS)</p>
          </div>
          
          <div style="padding: 20px 0;">
            <div style="background-color: ${riskLevel === 'high' ? '#fee2e2' : '#fef3c7'}; border-left: 4px solid ${riskLevel === 'high' ? '#ef4444' : '#f59e0b'}; padding: 12px; margin-bottom: 20px;">
              <strong style="color: ${riskLevel === 'high' ? '#991b1b' : '#92400e'}; font-size: 15px;">
                ATTENTION: ${riskLevel.toUpperCase()} RISK CLASSIFICATION DETECTED
              </strong>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 35%;">Student Name:</td>
                <td style="padding: 8px 0; font-weight: 600; color: #1e293b; font-size: 14px;">${student.full_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Matric Number:</td>
                <td style="padding: 8px 0; font-weight: 600; color: #1e293b; font-size: 14px;">${student.matric_no}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Academic Level:</td>
                <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${student.level} Level</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Academic Supervisor:</td>
                <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${student.supervisor_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Model Confidence:</td>
                <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${confidence}%</td>
              </tr>
            </table>

            <div style="background-color: #f8fafc; padding: 15px; border-radius: 4px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
              <h4 style="margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; color: #475569; letter-spacing: 0.5px;">Machine Learning Explanation & Risk Drivers</h4>
              <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #334155;">${narrative}</p>
            </div>

            <p style="font-size: 13px; color: #64748b; line-height: 1.4;">
              This notification was generated automatically by the ML-SPMS Prediction Engine following the entry/update of recent continuous assessment or attendance records. Immediate academic counseling and intervention are advised.
            </p>
          </div>

          <div style="text-align: center; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
            &copy; University of Calabar &bull; Department of Computer Science &bull; ML-SPMS
          </div>
        </div>
      `;

      await sendAlertEmail({
        to: recipients.join(', '),
        subject: emailSubject,
        html: emailHtml,
        text: alertMessage
      });
    }

    return {
      alert_id: alertId,
      student_id: studentId,
      supervisor_id: student.supervisor_id,
      risk_level: riskLevel,
      status: 'sent'
    };
  } catch (error) {
    console.error('[NOTIFICATION SERVICE ERROR]:', error);
    return null;
  }
}

/**
 * Acknowledge an alert notification
 */
async function acknowledgeAlert(alertId, supervisorId) {
  const result = await query(
    `UPDATE alert_notifications 
     SET status = 'acknowledged' 
     WHERE alert_id = ? AND (supervisor_id = ? OR ? IN (SELECT user_id FROM users WHERE role = 'administrator'))`,
    [alertId, supervisorId, supervisorId]
  );
  return result.affectedRows > 0;
}

/**
 * Fetch alert notifications for a user (Supervisor or Student)
 */
async function getUserNotifications(userId, role) {
  if (role === 'student') {
    return await query(
      `SELECT a.alert_id, a.message, a.status, a.timestamp, p.risk_level, p.confidence
       FROM alert_notifications a
       JOIN prediction_results p ON a.result_id = p.result_id
       JOIN students s ON a.student_id = s.student_id
       WHERE s.user_id = ?
       ORDER BY a.timestamp DESC LIMIT 50`,
      [userId]
    );
  } else {
    return await query(
      `SELECT a.alert_id, a.message, a.status, a.timestamp, s.matric_no, s.full_name as student_name,
              p.risk_level, p.confidence
       FROM alert_notifications a
       JOIN prediction_results p ON a.result_id = p.result_id
       JOIN students s ON a.student_id = s.student_id
       WHERE a.supervisor_id = ? OR ? IN (SELECT user_id FROM users WHERE role = 'administrator')
       ORDER BY a.timestamp DESC LIMIT 50`,
      [userId, userId]
    );
  }
}

module.exports = {
  dispatchRiskAlert,
  acknowledgeAlert,
  getUserNotifications
};
