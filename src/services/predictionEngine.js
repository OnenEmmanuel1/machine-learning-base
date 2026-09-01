const { query, queryOne } = require('../config/database');
const { computeStudentFeatureVector } = require('./featureVectorService');
const { predictRisk } = require('../ml/predictor');
const { dispatchRiskAlert } = require('./notificationService');

/**
 * Core Prediction Engine (Activity Flow Section 3.2.3)
 * Automatically invoked whenever an assessment or attendance record is entered or updated.
 * 
 * Pipeline:
 *  1. Recompute student feature_vector
 *  2. Apply active ML prediction model
 *  3. Store prediction_result with confidence & feature_contributions
 *  4. Trigger alert_notifications if risk_level >= moderate
 * 
 * @param {number} studentId
 * @returns {Promise<Object>} Full prediction and alert execution report
 */
async function processStudentPerformanceUpdate(studentId) {
  try {
    console.log(`[PREDICTION ENGINE] Triggered for student ID: ${studentId}`);

    // Step 1: Recompute Feature Vector
    const featureVector = await computeStudentFeatureVector(studentId);
    console.log(`[PREDICTION ENGINE] Updated feature vector: CA=${featureVector.avg_ca_score}%, Attendance=${featureVector.attendance_rate}%, Submissions=${featureVector.submission_rate}%`);

    // Step 2: Apply Active Machine Learning Model
    const mlResult = await predictRisk(featureVector.features);
    console.log(`[PREDICTION ENGINE] Model ${mlResult.model_type} (${mlResult.model_version}) classified as: ${mlResult.risk_level.toUpperCase()} (${mlResult.confidence}%)`);

    // Step 3: Insert record into prediction_results
    const insertRes = await query(
      `INSERT INTO prediction_results (student_id, model_id, risk_level, confidence, feature_contributions, generated_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        studentId,
        mlResult.model_id,
        mlResult.risk_level,
        mlResult.confidence,
        mlResult.feature_contributions
      ]
    );

    const resultId = insertRes.insertId;

    // Step 4: Handle Risk Escalation with Alert Fatigue Guard (Section 2.2.4)
    let alertInfo = null;
    if (mlResult.risk_level === 'high' || mlResult.risk_level === 'moderate') {
      // Check previous prediction to detect true risk escalation/transition
      const prevPrediction = await queryOne(
        `SELECT risk_level, generated_at 
         FROM prediction_results 
         WHERE student_id = ? AND result_id != ? 
         ORDER BY generated_at DESC LIMIT 1`,
        [studentId, resultId]
      );

      // Check if an unacknowledged alert already exists for this student
      const pendingAlert = await queryOne(
        `SELECT a.alert_id, p.risk_level 
         FROM alert_notifications a
         JOIN prediction_results p ON a.result_id = p.result_id
         WHERE a.student_id = ? AND a.status = 'sent'
         ORDER BY a.timestamp DESC LIMIT 1`,
        [studentId]
      );

      const isFirstEvaluation = !prevPrediction;
      const isRiskEscalated = prevPrediction && (
        (prevPrediction.risk_level === 'low' && (mlResult.risk_level === 'moderate' || mlResult.risk_level === 'high')) ||
        (prevPrediction.risk_level === 'moderate' && mlResult.risk_level === 'high')
      );
      const isAlertAcknowledged = !pendingAlert;

      if (isFirstEvaluation || isRiskEscalated || isAlertAcknowledged) {
        console.log(`[PREDICTION ENGINE] Risk alert triggered (Risk: ${mlResult.risk_level.toUpperCase()}, Escalation: ${isRiskEscalated || isFirstEvaluation}). Dispatching alert...`);
        alertInfo = await dispatchRiskAlert({
          resultId,
          studentId,
          riskLevel: mlResult.risk_level,
          confidence: mlResult.confidence,
          explanation: mlResult.explanation_object
        });
      } else {
        console.log(`[ALERT FATIGUE GUARD] Student ${studentId} already has an active '${pendingAlert.risk_level}' alert and risk has not escalated. Redundant notification suppressed.`);
      }
    } else {
      console.log(`[PREDICTION ENGINE] Low risk confirmed. Classification saved without alert.`);
    }

    return {
      success: true,
      result_id: resultId,
      student_id: studentId,
      feature_vector: featureVector,
      prediction: {
        model_id: mlResult.model_id,
        model_type: mlResult.model_type,
        model_version: mlResult.model_version,
        risk_level: mlResult.risk_level,
        confidence: mlResult.confidence,
        feature_contributions: mlResult.explanation_object
      },
      alert: alertInfo
    };
  } catch (error) {
    console.error(`[PREDICTION ENGINE ERROR] Failed for student ${studentId}:`, error);
    throw error;
  }
}

module.exports = {
  processStudentPerformanceUpdate
};
