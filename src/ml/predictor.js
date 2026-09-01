const { queryOne, query } = require('../config/database');
const DecisionTreeModel = require('./models/decisionTree');
const RandomForestModel = require('./models/randomForest');
const LogisticRegressionModel = require('./models/logisticRegression');
const { explainPrediction } = require('./explainer');
const { RISK_MAP } = require('./datasetGenerator');

let cachedActiveModel = null;
let cachedModelRecord = null;

/**
 * Invalidate cached model instance
 */
function invalidateModelCache() {
  cachedActiveModel = null;
  cachedModelRecord = null;
}

/**
 * Load currently active model from DB
 */
async function getActiveModel() {
  if (cachedActiveModel && cachedModelRecord) {
    return { model: cachedActiveModel, record: cachedModelRecord };
  }

  let record = await queryOne(
    'SELECT model_id, model_type, version, accuracy, model_data, is_active FROM prediction_models WHERE is_active = 1 LIMIT 1'
  );

  // If no model is active, get the latest trained model or train on the fly
  if (!record || !record.model_data) {
    console.log('[ML PREDICTOR] No active model found in DB. Loading latest available or training...');
    record = await queryOne(
      'SELECT model_id, model_type, version, accuracy, model_data, is_active FROM prediction_models ORDER BY trained_at DESC LIMIT 1'
    );

    if (!record || !record.model_data) {
      const { trainAllModels } = require('./trainer');
      const trained = await trainAllModels({ activeModel: 'random_forest' });
      record = await queryOne(
        'SELECT model_id, model_type, version, accuracy, model_data, is_active FROM prediction_models WHERE is_active = 1 LIMIT 1'
      );
    }
  }

  let modelInstance = null;
  if (record.model_type === 'decision_tree') {
    modelInstance = DecisionTreeModel.load(record.model_data);
  } else if (record.model_type === 'random_forest') {
    modelInstance = RandomForestModel.load(record.model_data);
  } else if (record.model_type === 'logistic_regression') {
    modelInstance = LogisticRegressionModel.load(record.model_data);
  } else {
    throw new Error(`Unknown model type: ${record.model_type}`);
  }

  cachedActiveModel = modelInstance;
  cachedModelRecord = record;

  return { model: cachedActiveModel, record: cachedModelRecord };
}

/**
 * Predict risk level for a student feature vector
 * @param {number[]} features [avg_ca_score, attendance_rate, submission_rate]
 * @returns {Promise<Object>} { model_id, risk_level, confidence, feature_contributions }
 */
async function predictRisk(features) {
  const { model, record } = await getActiveModel();
  
  const result = model.predictWithConfidence(features);
  const riskClassIndex = typeof result.prediction === 'number' ? result.prediction : parseInt(result.prediction, 10);
  const riskLevel = RISK_MAP[riskClassIndex] || 'moderate';
  const confidence = result.confidence || 85.0;

  // Generate real feature-level explanation
  const explanation = explainPrediction(features, riskLevel, confidence, record.model_type);

  return {
    model_id: record.model_id,
    model_type: record.model_type,
    model_version: record.version,
    risk_level: riskLevel,
    confidence: parseFloat(confidence.toFixed(2)),
    feature_contributions: JSON.stringify(explanation),
    explanation_object: explanation
  };
}

module.exports = {
  getActiveModel,
  predictRisk,
  invalidateModelCache
};
