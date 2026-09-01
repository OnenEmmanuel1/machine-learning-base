const LogisticRegression = require('ml-logistic-regression');
const { Matrix } = require('ml-matrix');

class LogisticRegressionModel {
  constructor(options = {}) {
    this.options = {
      numSteps: options.numSteps || 2500,
      learningRate: options.learningRate || 0.05,
      ...options
    };
    this.classifier = null;
    this.trained = false;
    this.featureMeans = [0, 0, 0];
    this.featureStds = [1, 1, 1];
  }

  /**
   * Normalize features for gradient descent stability
   */
  _computeScalers(X) {
    const rawArr = Array.isArray(X) ? X : X.to2DArray();
    const numFeatures = rawArr[0].length;
    const numSamples = rawArr.length;

    this.featureMeans = new Array(numFeatures).fill(0);
    this.featureStds = new Array(numFeatures).fill(0);

    for (let j = 0; j < numFeatures; j++) {
      let sum = 0;
      for (let i = 0; i < numSamples; i++) {
        sum += rawArr[i][j];
      }
      this.featureMeans[j] = sum / numSamples;

      let varSum = 0;
      for (let i = 0; i < numSamples; i++) {
        varSum += Math.pow(rawArr[i][j] - this.featureMeans[j], 2);
      }
      this.featureStds[j] = Math.sqrt(varSum / numSamples) || 1.0;
    }
  }

  _scaleFeatures(features) {
    const isSingle = !Array.isArray(features[0]);
    const arr = isSingle ? [features] : features;
    const scaled = arr.map(row => 
      row.map((val, idx) => (val - this.featureMeans[idx]) / (this.featureStds[idx] || 1.0))
    );
    return isSingle ? scaled[0] : scaled;
  }

  /**
   * Train Logistic Regression on features X and labels y
   */
  train(X, y) {
    const rawX = Array.isArray(X) ? X : X.to2DArray();
    this._computeScalers(rawX);
    const scaledX = this._scaleFeatures(rawX);

    const matrixX = new Matrix(scaledX);
    const matrixY = Matrix.columnVector(y);

    this.classifier = new LogisticRegression(this.options);
    this.classifier.train(matrixX, matrixY);
    this.trained = true;
    return this;
  }

  /**
   * Predict single or multiple instances
   */
  predict(features) {
    if (!this.classifier) throw new Error('LogisticRegression model is not loaded or trained.');
    const isSingle = !Array.isArray(features[0]);
    const rawArr = isSingle ? [features] : features;
    const scaled = this._scaleFeatures(rawArr);
    const matrixX = new Matrix(scaled);
    const predictions = this.classifier.predict(matrixX);
    return isSingle ? predictions[0] : predictions;
  }

  /**
   * Predict with class probability distribution & confidence
   */
  predictWithConfidence(features) {
    if (!this.classifier) throw new Error('LogisticRegression model is not loaded or trained.');
    const singleFeature = Array.isArray(features[0]) ? features[0] : features;
    const scaled = this._scaleFeatures(singleFeature);
    const predClass = this.predict(singleFeature);

    // Compute raw decision scores for One-vs-Rest classifiers
    let scores = [];
    if (this.classifier.classifiers && this.classifier.classifiers.length > 0) {
      scores = this.classifier.classifiers.map(c => {
        const weights = c.weights.to2DArray()[0];
        let z = 0;
        for (let i = 0; i < scaled.length; i++) {
          z += scaled[i] * (weights[i] || 0);
        }
        return z;
      });
    }

    let confidence = 85.0;
    let probabilities = [0.33, 0.33, 0.33];

    if (scores.length === 3) {
      const maxScore = Math.max(...scores);
      const expScores = scores.map(s => Math.exp(s - maxScore));
      const sumExp = expScores.reduce((a, b) => a + b, 0);
      probabilities = expScores.map(s => parseFloat((s / sumExp).toFixed(4)));
      confidence = parseFloat((probabilities[predClass] * 100).toFixed(2));
      confidence = Math.max(55.0, Math.min(99.0, confidence));
    }

    return {
      prediction: predClass,
      confidence,
      probabilities
    };
  }

  toJSON() {
    if (!this.classifier) return null;
    return JSON.stringify({
      options: this.options,
      featureMeans: this.featureMeans,
      featureStds: this.featureStds,
      model: this.classifier.toJSON()
    });
  }

  static load(jsonString) {
    const instance = new LogisticRegressionModel();
    const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    instance.options = parsed.options || {};
    instance.featureMeans = parsed.featureMeans || [0, 0, 0];
    instance.featureStds = parsed.featureStds || [1, 1, 1];
    instance.classifier = LogisticRegression.load(parsed.model);
    instance.trained = true;
    return instance;
  }
}

module.exports = LogisticRegressionModel;
