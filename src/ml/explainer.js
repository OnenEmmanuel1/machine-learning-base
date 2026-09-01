/**
 * Feature Contribution Explainer (NFR5 Explainability)
 * Computes individual feature-level contributions to the risk classification
 * based on academic baselines from University of Calabar Computer Science curriculum.
 */

const BENCHMARKS = {
  avg_ca_score: { target: 50.0, weight: 0.40, name: 'Continuous Assessment Score' },
  attendance_rate: { target: 75.0, weight: 0.35, name: 'Class & Lab Attendance' },
  submission_rate: { target: 70.0, weight: 0.25, name: 'Assignment Submission Rate' }
};

/**
 * Generate feature contributions and narrative explanation
 * @param {number[]} features [avg_ca_score, attendance_rate, submission_rate]
 * @param {string} riskLevel 'low' | 'moderate' | 'high'
 * @param {number} confidence
 * @param {string} modelType
 * @returns {Object} Serialized explanation object
 */
function explainPrediction(features, riskLevel, confidence, modelType = 'random_forest') {
  const [caScore, attendanceRate, submissionRate] = features.map(v => parseFloat(Number(v).toFixed(2)));

  // Calculate gaps relative to institutional benchmark targets
  const caGap = BENCHMARKS.avg_ca_score.target - caScore;
  const attGap = BENCHMARKS.attendance_rate.target - attendanceRate;
  const subGap = BENCHMARKS.submission_rate.target - submissionRate;

  let breakdown = {};
  let narrative = '';

  if (riskLevel === 'high' || riskLevel === 'moderate') {
    // Risk factors are features falling below benchmark
    const rawRisks = {
      avg_ca_score: Math.max(0, caGap) * BENCHMARKS.avg_ca_score.weight,
      attendance_rate: Math.max(0, attGap) * BENCHMARKS.attendance_rate.weight,
      submission_rate: Math.max(0, subGap) * BENCHMARKS.submission_rate.weight
    };

    const totalRiskDeficit = rawRisks.avg_ca_score + rawRisks.attendance_rate + rawRisks.submission_rate;

    if (totalRiskDeficit > 0) {
      breakdown = {
        avg_ca_score: parseFloat(((rawRisks.avg_ca_score / totalRiskDeficit) * 100).toFixed(1)),
        attendance_rate: parseFloat(((rawRisks.attendance_rate / totalRiskDeficit) * 100).toFixed(1)),
        submission_rate: parseFloat(((rawRisks.submission_rate / totalRiskDeficit) * 100).toFixed(1))
      };
    } else {
      // Borderline cases where scores are around the edge
      breakdown = {
        avg_ca_score: 40.0,
        attendance_rate: 35.0,
        submission_rate: 25.0
      };
    }

    // Rank highest contributors
    const sortedFeatures = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
    const topFeature = sortedFeatures[0];
    const secondFeature = sortedFeatures[1];

    const reasons = [];
    if (caScore < BENCHMARKS.avg_ca_score.target) {
      reasons.push(`low Continuous Assessment average (${caScore}% vs ${BENCHMARKS.avg_ca_score.target}% benchmark)`);
    }
    if (attendanceRate < BENCHMARKS.attendance_rate.target) {
      reasons.push(`sub-threshold attendance (${attendanceRate}% vs UNICAL minimum ${BENCHMARKS.attendance_rate.target}%)`);
    }
    if (submissionRate < BENCHMARKS.submission_rate.target) {
      reasons.push(`inconsistent assignment submissions (${submissionRate}% vs ${BENCHMARKS.submission_rate.target}% requirement)`);
    }

    const reasonStr = reasons.length > 0 ? reasons.join('; ') : 'borderline performance across assessment indicators';

    narrative = `${riskLevel.toUpperCase()} RISK CLASSIFICATION (${confidence}% confidence): Primary risk driver is ${BENCHMARKS[topFeature[0]].name} (accounting for ${topFeature[1]}% of risk deficit), followed by ${BENCHMARKS[secondFeature[0]].name} (${secondFeature[1]}%). Specific factors: ${reasonStr}.`;

  } else {
    // Low Risk (Academic Excellence / Safe Standing)
    const rawPositives = {
      avg_ca_score: Math.max(0, caScore - BENCHMARKS.avg_ca_score.target) * BENCHMARKS.avg_ca_score.weight + 5,
      attendance_rate: Math.max(0, attendanceRate - BENCHMARKS.attendance_rate.target) * BENCHMARKS.attendance_rate.weight + 5,
      submission_rate: Math.max(0, submissionRate - BENCHMARKS.submission_rate.target) * BENCHMARKS.submission_rate.weight + 5
    };

    const totalPositive = rawPositives.avg_ca_score + rawPositives.attendance_rate + rawPositives.submission_rate;

    breakdown = {
      avg_ca_score: parseFloat(((rawPositives.avg_ca_score / totalPositive) * 100).toFixed(1)),
      attendance_rate: parseFloat(((rawPositives.attendance_rate / totalPositive) * 100).toFixed(1)),
      submission_rate: parseFloat(((rawPositives.submission_rate / totalPositive) * 100).toFixed(1))
    };

    narrative = `LOW RISK (SAFE): Student demonstrates solid academic performance with CA score at ${caScore}%, attendance at ${attendanceRate}% (exceeding UNICAL 75% threshold), and assignment completion at ${submissionRate}%.`;
  }

  return {
    risk_level: riskLevel,
    confidence: confidence,
    model_type: modelType,
    feature_values: {
      avg_ca_score: caScore,
      attendance_rate: attendanceRate,
      submission_rate: submissionRate
    },
    benchmarks: {
      avg_ca_score: BENCHMARKS.avg_ca_score.target,
      attendance_rate: BENCHMARKS.attendance_rate.target,
      submission_rate: BENCHMARKS.submission_rate.target
    },
    contributions: breakdown,
    narrative: narrative
  };
}

module.exports = {
  explainPrediction,
  BENCHMARKS
};
