/**
 * Simulated Dataset Generator for ML-SPMS (University of Calabar CS Department)
 * Generates realistic student academic performance samples for training and evaluation.
 * 
 * Features:
 *  - avg_ca_score: Continuous Assessment score (0 to 100%)
 *  - attendance_rate: Class & Lab attendance percentage (0 to 100%)
 *  - submission_rate: Assignment & Practical task completion percentage (0 to 100%)
 * 
 * Labels (Classes):
 *  - 0: 'low' (Safe, on track for good academic standing: A, B, C)
 *  - 1: 'moderate' (Borderline, at risk of D/E/supplementary exam)
 *  - 2: 'high' (Critical, high probability of F failure or carryover)
 */

function gaussianRandom(mean = 0, stdev = 1) {
  let u = 1 - Math.random();
  let v = Math.random();
  let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
}

function clamp(val, min = 0, max = 100) {
  return Math.min(Math.max(val, min), max);
}

/**
 * Generate simulated dataset for model training
 * @param {number} count Total number of samples (default 1000)
 * @returns {Array<{ features: number[], label: number, riskName: string }>}
 */
function generateSimulatedDataset(count = 1000) {
  const dataset = [];

  // Distribution: ~45% Low Risk, ~30% Moderate Risk, ~25% High Risk
  const lowCount = Math.floor(count * 0.45);
  const modCount = Math.floor(count * 0.30);
  const highCount = count - lowCount - modCount;

  // 1. Low Risk Archetypes (Strong CA, High Attendance, High Submission)
  for (let i = 0; i < lowCount; i++) {
    const avg_ca = clamp(gaussianRandom(75, 10), 55, 98);
    const attendance = clamp(gaussianRandom(85, 8), 70, 100);
    const submissions = clamp(gaussianRandom(88, 8), 68, 100);

    dataset.push({
      features: [
        parseFloat(avg_ca.toFixed(2)),
        parseFloat(attendance.toFixed(2)),
        parseFloat(submissions.toFixed(2))
      ],
      label: 0,
      riskName: 'low'
    });
  }

  // 2. Moderate Risk Archetypes (Borderline CA, Moderate Attendance, Inconsistent Submissions)
  for (let i = 0; i < modCount; i++) {
    const subType = Math.random();
    let avg_ca, attendance, submissions;

    if (subType < 0.4) {
      // Moderate scores, weak attendance
      avg_ca = clamp(gaussianRandom(52, 7), 40, 68);
      attendance = clamp(gaussianRandom(58, 8), 45, 72);
      submissions = clamp(gaussianRandom(65, 9), 50, 78);
    } else if (subType < 0.7) {
      // Good attendance, but poor test comprehension
      avg_ca = clamp(gaussianRandom(45, 6), 35, 58);
      attendance = clamp(gaussianRandom(74, 6), 62, 85);
      submissions = clamp(gaussianRandom(60, 8), 45, 75);
    } else {
      // Weak submissions, moderate exams
      avg_ca = clamp(gaussianRandom(54, 6), 42, 65);
      attendance = clamp(gaussianRandom(66, 7), 52, 78);
      submissions = clamp(gaussianRandom(48, 8), 35, 62);
    }

    dataset.push({
      features: [
        parseFloat(avg_ca.toFixed(2)),
        parseFloat(attendance.toFixed(2)),
        parseFloat(submissions.toFixed(2))
      ],
      label: 1,
      riskName: 'moderate'
    });
  }

  // 3. High Risk Archetypes (Failing CA, Severe absenteeism, Missed assignments)
  for (let i = 0; i < highCount; i++) {
    const avg_ca = clamp(gaussianRandom(28, 9), 5, 42);
    const attendance = clamp(gaussianRandom(38, 11), 10, 52);
    const submissions = clamp(gaussianRandom(32, 12), 5, 48);

    dataset.push({
      features: [
        parseFloat(avg_ca.toFixed(2)),
        parseFloat(attendance.toFixed(2)),
        parseFloat(submissions.toFixed(2))
      ],
      label: 2,
      riskName: 'high'
    });
  }

  // Shuffle dataset thoroughly
  for (let i = dataset.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dataset[i], dataset[j]] = [dataset[j], dataset[i]];
  }

  return dataset;
}

/**
 * Split dataset into training and testing sets
 * @param {Array} dataset
 * @param {number} trainRatio default 0.8 (80/20 split)
 */
function trainTestSplit(dataset, trainRatio = 0.8) {
  const trainSize = Math.floor(dataset.length * trainRatio);
  const train = dataset.slice(0, trainSize);
  const test = dataset.slice(trainSize);

  return {
    X_train: train.map(d => d.features),
    y_train: train.map(d => d.label),
    X_test: test.map(d => d.features),
    y_test: test.map(d => d.label),
    trainRaw: train,
    testRaw: test
  };
}

module.exports = {
  generateSimulatedDataset,
  trainTestSplit,
  RISK_MAP: { 0: 'low', 1: 'moderate', 2: 'high' },
  LABEL_MAP: { 'low': 0, 'moderate': 1, 'high': 2 },
  FEATURE_NAMES: ['avg_ca_score', 'attendance_rate', 'submission_rate']
};
