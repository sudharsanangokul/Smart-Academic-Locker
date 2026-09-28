import { MLDatasetRecord } from '../../src/types';

export const FEATURE_NAMES = [
  'day_of_week',
  'previous_misses',
  'previous_scans',
  'homework_due',
  'test_tomorrow',
  'material_required',
  'previous_week_misses',
  'subject_miss_rate',
  'days_since_last_miss',
  'class_level',
  'material_type',
  'estimated_material_weight',
  'number_of_required_books',
  'number_of_books_scanned',
];

export function generateSyntheticDataset(recordCount = 5200): MLDatasetRecord[] {
  const records: MLDatasetRecord[] = [];
  const subjects = ['Mathematics', 'Science', 'English', 'Social Science', 'Hindi', 'Computer Science'];
  const studentIds = Array.from({ length: 120 }, (_, i) => `STU-${(i + 1).toString().padStart(3, '0')}`);

  // Seedable pseudo-random helper for consistency
  let seed = 42;
  function random(): number {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  function randomInt(min: number, max: number): number {
    return Math.floor(random() * (max - min + 1)) + min;
  }

  for (let i = 0; i < recordCount; i++) {
    const studentId = studentIds[i % studentIds.length];
    const subject = subjects[randomInt(0, subjects.length - 1)];
    const dayOfWeek = randomInt(1, 6); // 1 (Mon) to 6 (Sat)
    const classLevel = randomInt(6, 8); // Class 6, 7, or 8
    const materialType = randomInt(0, 3); // 0=Textbook, 1=Notebook, 2=Workbook, 3=Record Book

    // Realistic features based on student discipline variance
    const studentBaseRisk = (parseInt(studentId.split('-')[1], 10) % 7) / 7; // student inherent tendency
    const previousMisses = Math.min(12, Math.max(0, Math.round(studentBaseRisk * 8 + (random() * 4 - 2))));
    const previousScans = Math.max(2, randomInt(10, 80));
    const previousWeekMisses = Math.min(5, Math.max(0, Math.round(previousMisses * 0.4 + (random() * 2 - 1))));
    
    // Subject specific difficulty
    const subjectFactor = subject === 'Science' || subject === 'Mathematics' ? 0.35 : 0.2;
    const subjectMissRate = Math.min(0.95, Math.max(0.05, Number((studentBaseRisk * 0.5 + subjectFactor + (random() * 0.2 - 0.1)).toFixed(2))));
    
    const daysSinceLastMiss = previousMisses > 0 ? randomInt(1, 20) : randomInt(20, 60);
    const homeworkDue = random() < 0.45 ? 1 : 0;
    const testTomorrow = random() < 0.25 ? 1 : 0;
    const materialRequired = 1;
    const numberOfRequiredBooks = randomInt(2, 6);
    const numberOfBooksScanned = Math.max(0, Math.min(numberOfRequiredBooks, numberOfRequiredBooks - (random() < 0.3 ? randomInt(1, 2) : 0)));
    const estimatedMaterialWeight = Number((random() * 1.5 + 0.4).toFixed(2));

    // Ground truth calculation with realistic correlated logistic-like weighting
    let logit = -1.8; // base bias
    logit += previousMisses * 0.32;
    logit += subjectMissRate * 2.1;
    logit += testTomorrow * 0.95; // Students get stressed or need extra special notebooks for tests
    logit += homeworkDue * 0.75;
    logit += previousWeekMisses * 0.4;
    logit += (materialType === 1 ? 0.45 : 0); // Notebooks forgotten more frequently than textbooks
    logit += (dayOfWeek === 1 || dayOfWeek === 6 ? 0.35 : 0); // Monday and Saturday higher forgetting
    logit -= (daysSinceLastMiss > 10 ? 0.5 : 0);
    logit -= (numberOfBooksScanned >= numberOfRequiredBooks ? 1.8 : 0);
    logit += (numberOfRequiredBooks > 4 ? 0.4 : 0);

    // Add slight realistic noise
    const noise = (random() - 0.5) * 0.6;
    const probability = 1 / (1 + Math.exp(-(logit + noise)));
    const forgotMaterial = probability > 0.48 ? 1 : 0;

    records.push({
      student_id: studentId,
      subject,
      day_of_week: dayOfWeek,
      previous_misses: previousMisses,
      previous_scans: previousScans,
      homework_due: homeworkDue,
      test_tomorrow: testTomorrow,
      material_required: materialRequired,
      previous_week_misses: previousWeekMisses,
      subject_miss_rate: subjectMissRate,
      days_since_last_miss: daysSinceLastMiss,
      class_level: classLevel,
      material_type: materialType,
      estimated_material_weight: estimatedMaterialWeight,
      number_of_required_books: numberOfRequiredBooks,
      number_of_books_scanned: numberOfBooksScanned,
      forgot_material: forgotMaterial,
    });
  }

  return records;
}

export function extractFeatureVector(record: MLDatasetRecord): number[] {
  return [
    record.day_of_week,
    record.previous_misses,
    record.previous_scans,
    record.homework_due,
    record.test_tomorrow,
    record.material_required,
    record.previous_week_misses,
    record.subject_miss_rate,
    record.days_since_last_miss,
    record.class_level,
    record.material_type,
    record.estimated_material_weight,
    record.number_of_required_books,
    record.number_of_books_scanned,
  ];
}
