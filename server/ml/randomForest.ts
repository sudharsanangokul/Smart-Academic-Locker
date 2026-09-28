import { MLDatasetRecord, MLModelEvaluation, MLPredictionInput, MLPredictionResult, RiskLevel } from '../../src/types';
import { FEATURE_NAMES, extractFeatureVector, generateSyntheticDataset } from './dataset';

export interface TreeNode {
  isLeaf: boolean;
  featureIndex?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
  predictedValue?: number; // 0 or 1
  probability?: number; // probability of class 1
  samplesCount?: number;
  giniGain?: number;
}

export class DecisionTreeClassifier {
  maxDepth: number;
  minSamplesSplit: number;
  root: TreeNode | null = null;
  featureImportanceAcc: number[] = new Array(FEATURE_NAMES.length).fill(0);

  constructor(maxDepth = 6, minSamplesSplit = 10) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
  }

  // Calculate Gini Impurity for binary classification
  private giniImpurity(labels: number[]): number {
    if (labels.length === 0) return 0;
    const p1 = labels.reduce((acc, val) => acc + val, 0) / labels.length;
    const p0 = 1 - p1;
    return 1 - (p0 * p0 + p1 * p1);
  }

  public fit(X: number[][], y: number[], featureIndicesToConsider?: number[]): void {
    this.featureImportanceAcc = new Array(X[0].length).fill(0);
    this.root = this.buildTree(X, y, 0, featureIndicesToConsider);
  }

  private buildTree(
    X: number[][],
    y: number[],
    depth: number,
    featureSubset?: number[]
  ): TreeNode {
    const numSamples = X.length;
    const numFeatures = X[0].length;
    const onesCount = y.reduce((acc, v) => acc + v, 0);
    const prob1 = numSamples > 0 ? onesCount / numSamples : 0;
    const majorityClass = prob1 >= 0.5 ? 1 : 0;

    // Base cases: max depth reached, min samples reached, or pure node
    if (depth >= this.maxDepth || numSamples < this.minSamplesSplit || prob1 === 0 || prob1 === 1) {
      return {
        isLeaf: true,
        predictedValue: majorityClass,
        probability: prob1,
        samplesCount: numSamples,
      };
    }

    const currentGini = this.giniImpurity(y);
    let bestGain = 0;
    let bestFeature = -1;
    let bestThreshold = 0;
    let bestLeftIndices: number[] = [];
    let bestRightIndices: number[] = [];

    // Features to test at this split
    const availableFeatures = featureSubset || Array.from({ length: numFeatures }, (_, i) => i);

    for (const fIdx of availableFeatures) {
      // Find candidate thresholds
      const values = X.map(row => row[fIdx]);
      const uniqueValues = Array.from(new Set(values)).sort((a, b) => a - b);
      if (uniqueValues.length <= 1) continue;

      // Sample a subset of midpoints for efficiency
      const step = Math.max(1, Math.floor(uniqueValues.length / 8));
      for (let i = 0; i < uniqueValues.length - 1; i += step) {
        const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2;
        const leftIdx: number[] = [];
        const rightIdx: number[] = [];

        for (let s = 0; s < numSamples; s++) {
          if (X[s][fIdx] <= threshold) {
            leftIdx.push(s);
          } else {
            rightIdx.push(s);
          }
        }

        if (leftIdx.length === 0 || rightIdx.length === 0) continue;

        const leftY = leftIdx.map(idx => y[idx]);
        const rightY = rightIdx.map(idx => y[idx]);

        const leftGini = this.giniImpurity(leftY);
        const rightGini = this.giniImpurity(rightY);
        const weightedGini = (leftIdx.length / numSamples) * leftGini + (rightIdx.length / numSamples) * rightGini;
        const gain = currentGini - weightedGini;

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = fIdx;
          bestThreshold = threshold;
          bestLeftIndices = leftIdx;
          bestRightIndices = rightIdx;
        }
      }
    }

    // If no good split found, return leaf
    if (bestGain <= 0.0001 || bestFeature === -1) {
      return {
        isLeaf: true,
        predictedValue: majorityClass,
        probability: prob1,
        samplesCount: numSamples,
      };
    }

    // Accumulate feature importance based on sample proportion * gain
    this.featureImportanceAcc[bestFeature] += (numSamples / 1000) * bestGain;

    const leftX = bestLeftIndices.map(i => X[i]);
    const leftY = bestLeftIndices.map(i => y[i]);
    const rightX = bestRightIndices.map(i => X[i]);
    const rightY = bestRightIndices.map(i => y[i]);

    return {
      isLeaf: false,
      featureIndex: bestFeature,
      threshold: bestThreshold,
      giniGain: bestGain,
      samplesCount: numSamples,
      probability: prob1,
      left: this.buildTree(leftX, leftY, depth + 1, featureSubset),
      right: this.buildTree(rightX, rightY, depth + 1, featureSubset),
    };
  }

  public predictSample(x: number[]): { predictedClass: number; probability: number } {
    let curr = this.root;
    if (!curr) return { predictedClass: 0, probability: 0 };

    while (curr && !curr.isLeaf) {
      if (curr.featureIndex !== undefined && curr.threshold !== undefined) {
        if (x[curr.featureIndex] <= curr.threshold) {
          curr = curr.left || null;
        } else {
          curr = curr.right || null;
        }
      } else {
        break;
      }
    }

    return {
      predictedClass: curr?.predictedValue ?? 0,
      probability: curr?.probability ?? 0,
    };
  }
}

export class RandomForestClassifier {
  nEstimators: number;
  maxDepth: number;
  minSamplesSplit: number;
  trees: DecisionTreeClassifier[] = [];
  featureImportance: number[] = new Array(FEATURE_NAMES.length).fill(0);
  evaluation: MLModelEvaluation | null = null;
  modelVersion = '1.0.0-rf-prod';
  trainedAt: string = '';

  constructor(nEstimators = 20, maxDepth = 6, minSamplesSplit = 8) {
    this.nEstimators = nEstimators;
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
  }

  // Train the Random Forest on given dataset using 80/20 train/test split
  public train(dataset: MLDatasetRecord[]): MLModelEvaluation {
    const numSamples = dataset.length;
    const X_all = dataset.map(extractFeatureVector);
    const y_all = dataset.map(r => r.forgot_material);

    // 80% Train, 20% Test Split with reproducible indexing
    const splitIndex = Math.floor(numSamples * 0.8);
    const X_train = X_all.slice(0, splitIndex);
    const y_train = y_all.slice(0, splitIndex);
    const X_test = X_all.slice(splitIndex);
    const y_test = y_all.slice(splitIndex);

    this.trees = [];
    this.featureImportance = new Array(FEATURE_NAMES.length).fill(0);

    const numFeatures = X_all[0].length;
    const featureSubsetSize = Math.max(2, Math.floor(Math.sqrt(numFeatures)));

    for (let t = 0; t < this.nEstimators; t++) {
      // 1. Bootstrap sampling with replacement
      const bootstrapIndices: number[] = [];
      for (let i = 0; i < X_train.length; i++) {
        bootstrapIndices.push(Math.floor(Math.random() * X_train.length));
      }
      const bX = bootstrapIndices.map(i => X_train[i]);
      const by = bootstrapIndices.map(i => y_train[i]);

      // 2. Random feature subset
      const allFeatureIdx = Array.from({ length: numFeatures }, (_, i) => i);
      // Shuffle
      for (let i = allFeatureIdx.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allFeatureIdx[i], allFeatureIdx[j]] = [allFeatureIdx[j], allFeatureIdx[i]];
      }
      const featureSubset = allFeatureIdx.slice(0, featureSubsetSize);

      const tree = new DecisionTreeClassifier(this.maxDepth, this.minSamplesSplit);
      tree.fit(bX, by, featureSubset);
      this.trees.push(tree);

      // Accumulate importance
      for (let f = 0; f < numFeatures; f++) {
        this.featureImportance[f] += tree.featureImportanceAcc[f];
      }
    }

    // Normalize feature importance to sum to 100%
    const totalImportance = this.featureImportance.reduce((a, b) => a + b, 0) || 1;
    this.featureImportance = this.featureImportance.map(imp => Number(((imp / totalImportance) * 100).toFixed(2)));

    // Evaluate against genuine 20% test partition
    let trueNegative = 0;
    let falsePositive = 0;
    let falseNegative = 0;
    let truePositive = 0;

    for (let i = 0; i < X_test.length; i++) {
      const pred = this.predict(X_test[i]);
      const actual = y_test[i];

      if (pred.predictedClass === 1 && actual === 1) truePositive++;
      else if (pred.predictedClass === 1 && actual === 0) falsePositive++;
      else if (pred.predictedClass === 0 && actual === 1) falseNegative++;
      else trueNegative++;
    }

    const testTotal = X_test.length;
    const accuracy = Number(((truePositive + trueNegative) / testTotal).toFixed(4));
    const precision = (truePositive + falsePositive) > 0 ? Number((truePositive / (truePositive + falsePositive)).toFixed(4)) : 0;
    const recall = (truePositive + falseNegative) > 0 ? Number((truePositive / (truePositive + falseNegative)).toFixed(4)) : 0;
    const f1Score = (precision + recall) > 0 ? Number(((2 * precision * recall) / (precision + recall)).toFixed(4)) : 0;

    const featureDescriptions: Record<string, string> = {
      day_of_week: 'Day of the week (higher risk on Mon/Sat)',
      previous_misses: 'Cumulative previous missed material count',
      previous_scans: 'Student regularity and scan compliance habit',
      homework_due: 'Upcoming homework submission urgency',
      test_tomorrow: 'Upcoming examination or scheduled test',
      material_required: 'Material requirement flag in timetable',
      previous_week_misses: 'Recent week forgetting frequency',
      subject_miss_rate: 'Historical miss tendency for this specific subject',
      days_since_last_miss: 'Recency factor since the last missing incident',
      class_level: 'Student grade level difficulty',
      material_type: 'Material category (Textbook vs Notebook/Workbook)',
      estimated_material_weight: 'Weight load of the book package',
      number_of_required_books: 'Total academic load count for the day',
      number_of_books_scanned: 'Locker inventory check-in completion rate',
    };

    const formattedImportance = FEATURE_NAMES.map((name, idx) => ({
      feature: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      importance: this.featureImportance[idx],
      description: featureDescriptions[name] || name,
    })).sort((a, b) => b.importance - a.importance);

    this.trainedAt = new Date().toISOString();
    this.evaluation = {
      accuracy,
      precision,
      recall,
      f1Score,
      confusionMatrix: {
        trueNegative,
        falsePositive,
        falseNegative,
        truePositive,
      },
      featureImportance: formattedImportance,
      datasetSize: numSamples,
      trainingRecords: X_train.length,
      testingRecords: X_test.length,
      modelType: 'Supervised Random Forest Classifier (20 Trees, Gini Impurity, Bagging)',
      trainingTimestamp: this.trainedAt,
      modelVersion: this.modelVersion,
    };

    return this.evaluation;
  }

  // Predict with ensemble voting
  public predict(featureVector: number[]): { predictedClass: 0 | 1; probability: number } {
    if (this.trees.length === 0) {
      return { predictedClass: 0, probability: 0.1 };
    }

    let probSum = 0;
    for (const tree of this.trees) {
      const { probability } = tree.predictSample(featureVector);
      probSum += probability;
    }

    const averageProb = Number((probSum / this.trees.length).toFixed(3));
    const predictedClass = averageProb >= 0.5 ? 1 : 0;

    return {
      predictedClass,
      probability: averageProb,
    };
  }

  // Live prediction helper taking student domain inputs
  public predictForStudent(input: MLPredictionInput): MLPredictionResult {
    // Construct feature vector matching extractFeatureVector order
    const dayOfWeek = input.dayOfWeek || new Date().getDay() || 1;
    const previousMisses = input.previousMisses ?? 3;
    const previousScans = input.previousScans ?? 25;
    const homeworkDue = input.homeworkDue;
    const testTomorrow = input.testTomorrow;
    const materialRequired = input.materialRequired ?? 1;
    const previousWeekMisses = input.previousWeekMisses ?? Math.min(2, Math.round(previousMisses * 0.3));
    const subjectMissRate = input.subjectMissRate ?? 0.3;
    const daysSinceLastMiss = input.daysSinceLastMiss ?? 4;
    const classLevel = input.classLevel ?? 8;
    const materialType = input.materialType ?? 1; // Notebook is 1
    const estimatedMaterialWeight = input.estimatedMaterialWeight ?? 0.65;
    const numberOfRequiredBooks = input.numberOfRequiredBooks ?? 4;
    const numberOfBooksScanned = input.numberOfBooksScanned ?? 2;

    const featureVector = [
      dayOfWeek,
      previousMisses,
      previousScans,
      homeworkDue,
      testTomorrow,
      materialRequired,
      previousWeekMisses,
      subjectMissRate,
      daysSinceLastMiss,
      classLevel,
      materialType,
      estimatedMaterialWeight,
      numberOfRequiredBooks,
      numberOfBooksScanned,
    ];

    const { predictedClass, probability } = this.predict(featureVector);

    let riskLevel: RiskLevel = 'LOW';
    if (probability >= 0.65) riskLevel = 'HIGH';
    else if (probability >= 0.35) riskLevel = 'MEDIUM';

    const contributingFactors: string[] = [];
    if (testTomorrow === 1) contributingFactors.push('Upcoming examination scheduled tomorrow');
    if (homeworkDue === 1) contributingFactors.push('Homework submission due tomorrow');
    if (previousMisses > 3) contributingFactors.push(`High historical missed material count (${previousMisses})`);
    if (subjectMissRate > 0.4) contributingFactors.push(`Above average forgetting rate for ${input.subject} (${Math.round(subjectMissRate * 100)}%)`);
    if (numberOfBooksScanned < numberOfRequiredBooks) contributingFactors.push('Incomplete locker check-in count');

    if (contributingFactors.length === 0) {
      contributingFactors.push('Consistent scan history and regular academic compliance');
    }

    return {
      studentId: input.studentId,
      subject: input.subject,
      probability,
      predictedClass,
      riskLevel,
      timestamp: new Date().toISOString(),
      modelVersion: this.modelVersion,
      contributingFactors,
    };
  }
}

// Global Singleton ML Model instance
export const globalModel = new RandomForestClassifier(20, 6, 8);

// Auto-initialize with synthetic dataset on bootstrap
const initialDataset = generateSyntheticDataset(5200);
globalModel.train(initialDataset);
