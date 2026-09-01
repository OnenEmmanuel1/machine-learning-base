const { generateSimulatedDataset, trainTestSplit, RISK_MAP } = require('./datasetGenerator');
const DecisionTreeModel = require('./models/decisionTree');
const RandomForestModel = require('./models/randomForest');
const LogisticRegressionModel = require('./models/logisticRegression');
const { query } = require('../config/database');

/**
 * Calculate multi-class classification metrics (Accuracy, Precision, Recall, F1, Confusion Matrix)
 */
function evaluatePredictions(y_true, y_pred) {
  const numClasses = 3; // 0: low, 1: moderate, 2: high
  const confusionMatrix = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];

  let correct = 0;
  const n = y_true.length;

  for (let i = 0; i < n; i++) {
    const actual = y_true[i];
    const predicted = y_pred[i];
    if (confusionMatrix[actual] && confusionMatrix[actual][predicted] !== undefined) {
      confusionMatrix[actual][predicted]++;
    }
    if (actual === predicted) {
      correct++;
    }
  }

  const overallAccuracy = parseFloat(((correct / n) * 100).toFixed(2));

  // Compute per-class precision, recall, f1
  const classMetrics = {};
  let macroPrecisionSum = 0;
  let macroRecallSum = 0;
  let macroF1Sum = 0;

  for (let c = 0; c < numClasses; c++) {
    const className = RISK_MAP[c];
    const tp = confusionMatrix[c][c];
    
    let fp = 0;
    for (let r = 0; r < numClasses; r++) {
      if (r !== c) fp += confusionMatrix[r][c];
    }

    let fn = 0;
    for (let col = 0; col < numClasses; col++) {
      if (col !== c) fn += confusionMatrix[c][col];
    }

    const precision = (tp + fp) > 0 ? (tp / (tp + fp)) * 100 : 0;
    const recall = (tp + fn) > 0 ? (tp / (tp + fn)) * 100 : 0;
    const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    classMetrics[className] = {
      tp,
      fp,
      fn,
      precision: parseFloat(precision.toFixed(2)),
      recall: parseFloat(recall.toFixed(2)),
      f1_score: parseFloat(f1.toFixed(2))
    };

    macroPrecisionSum += precision;
    macroRecallSum += recall;
    macroF1Sum += f1;
  }

  return {
    accuracy: overallAccuracy,
    macro_precision: parseFloat((macroPrecisionSum / numClasses).toFixed(2)),
    macro_recall: parseFloat((macroRecallSum / numClasses).toFixed(2)),
    macro_f1: parseFloat((macroF1Sum / numClasses).toFixed(2)),
    confusion_matrix: confusionMatrix,
    class_metrics: classMetrics,
    total_test_samples: n
  };
}

/**
 * Train all 3 algorithms on freshly generated synthetic dataset
 * @param {Object} options
 * @returns {Promise<Object>} Results of all 3 trained models
 */
async function trainAllModels(options = {}) {
  const sampleCount = options.sampleCount || 1000;
  const version = options.version || `v${Date.now().toString().slice(-6)}`;
  console.log(`[ML TRAINER] Generating simulated dataset (${sampleCount} records)...`);

  const dataset = generateSimulatedDataset(sampleCount);
  const { X_train, y_train, X_test, y_test } = trainTestSplit(dataset, 0.8);

  console.log(`[ML TRAINER] Train split: ${X_train.length} samples, Test split: ${X_test.length} samples`);

  const results = {};

  // 1. Train Decision Tree (ml-cart)
  console.log('[ML TRAINER] Training CART Decision Tree...');
  const dt = new DecisionTreeModel({ maxDepth: 6, minNumSamples: 3 });
  dt.train(X_train, y_train);
  const dtPreds = dt.predict(X_test);
  const dtMetrics = evaluatePredictions(y_test, dtPreds);
  results.decision_tree = {
    model: dt,
    metrics: dtMetrics,
    accuracy: dtMetrics.accuracy,
    modelType: 'decision_tree',
    version
  };
  console.log(`[ML TRAINER] Decision Tree Accuracy: ${dtMetrics.accuracy}% (F1: ${dtMetrics.macro_f1}%)`);

  // 2. Train Random Forest (ml-random-forest)
  console.log('[ML TRAINER] Training Random Forest Classifier...');
  const rf = new RandomForestModel({ nEstimators: 30, maxFeatures: 1.0 });
  rf.train(X_train, y_train);
  const rfPreds = rf.predict(X_test);
  const rfMetrics = evaluatePredictions(y_test, rfPreds);
  results.random_forest = {
    model: rf,
    metrics: rfMetrics,
    accuracy: rfMetrics.accuracy,
    modelType: 'random_forest',
    version
  };
  console.log(`[ML TRAINER] Random Forest Accuracy: ${rfMetrics.accuracy}% (F1: ${rfMetrics.macro_f1}%)`);

  // 3. Train Logistic Regression (ml-logistic-regression)
  console.log('[ML TRAINER] Training Multinomial Logistic Regression...');
  const lr = new LogisticRegressionModel({ numSteps: 3000, learningRate: 0.05 });
  lr.train(X_train, y_train);
  const lrPreds = lr.predict(X_test);
  const lrMetrics = evaluatePredictions(y_test, lrPreds);
  results.logistic_regression = {
    model: lr,
    metrics: lrMetrics,
    accuracy: lrMetrics.accuracy,
    modelType: 'logistic_regression',
    version
  };
  console.log(`[ML TRAINER] Logistic Regression Accuracy: ${lrMetrics.accuracy}% (F1: ${lrMetrics.macro_f1}%)`);

  // Save to database if DB is reachable
  try {
    const defaultActive = options.activeModel || 'random_forest';

    for (const [modelType, res] of Object.entries(results)) {
      const isActive = modelType === defaultActive;
      const modelData = res.model.toJSON();
      const metricsJson = JSON.stringify(res.metrics);

      // Check if existing models of this type exist
      const existing = await query(
        'SELECT model_id FROM prediction_models WHERE model_type = ? ORDER BY model_id DESC LIMIT 1',
        [modelType]
      );

      if (existing && existing.length > 0) {
        await query(
          `UPDATE prediction_models 
           SET version = ?, accuracy = ?, metrics_json = ?, model_data = ?, is_active = ?, trained_at = NOW() 
           WHERE model_id = ?`,
          [version, res.accuracy, metricsJson, modelData, isActive ? 1 : 0, existing[0].model_id]
        );
        res.model_id = existing[0].model_id;
      } else {
        const insertRes = await query(
          `INSERT INTO prediction_models (model_type, version, accuracy, metrics_json, model_data, is_active, trained_at) 
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [modelType, version, res.accuracy, metricsJson, modelData, isActive ? 1 : 0]
        );
        res.model_id = insertRes.insertId;
      }
    }

    console.log(`[ML TRAINER] Successfully persisted all 3 models to prediction_models table. Active: ${defaultActive}`);
  } catch (dbErr) {
    console.warn('[ML TRAINER] Note: Could not save to DB directly (will be done during seed/init):', dbErr.message);
  }

  return results;
}

module.exports = {
  trainAllModels,
  evaluatePredictions
};
