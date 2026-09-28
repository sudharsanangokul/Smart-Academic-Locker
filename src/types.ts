export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';
export type TeacherType = 'CLASS_TEACHER' | 'SUBJECT_TEACHER';
export type LockerStatus = 'LOCKED' | 'OPEN';
export type BookType = 'Textbook' | 'Notebook' | 'Workbook' | 'Record Book' | 'Other';
export type ValidationStatus = 'VALID' | 'NOT_REQUIRED' | 'DUPLICATE' | 'WRONG_CLASS' | 'INVALID_BOOK';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type InventoryAction = 'ADDED' | 'REMOVED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  avatar?: string;
  department?: string;
  teacherType?: TeacherType;
  assignedClassId?: string; // e.g. "8A" for Class Teacher
  teachingSubjects?: string[]; // e.g. ["Science", "Mathematics"]
  studentId?: string;
  lockerId?: string;
  classId?: string;
  section?: string;
  createdAt?: string;
}

export interface Student {
  id: string;
  studentId: string; // e.g. "STU-8A-024"
  name: string;
  email: string;
  classId: string; // e.g. "8A"
  section: string;
  lockerNumber: string; // e.g. "L-024"
  rollNumber: number;
  previousMisses: number;
  totalScans: number;
  subjectMissRates: Record<string, number>;
}

export interface SchoolClass {
  id: string; // "8A"
  name: string; // "Class 8A"
  grade: number; // 8
  section: string; // "A"
  studentCount: number;
  classTeacherId: string;
  classTeacherName: string;
  roomNumber: string;
}

export interface Book {
  id: string; // "B-MATH-08-001"
  bookName: string;
  subject: string;
  classLevel: number;
  type: BookType;
  weightKg: number;
  isbnOrCode?: string;
  coverColor?: string;
  description?: string;
}

export interface Locker {
  id: string; // "L-024"
  lockerNumber: string;
  assignedStudentId: string;
  studentName: string;
  classId: string;
  status: LockerStatus;
  lastOpenedAt?: string;
  currentBookIds: string[];
}

export interface InventoryLog {
  id: string;
  studentId: string;
  lockerId: string;
  bookId: string;
  bookName: string;
  subject: string;
  action: InventoryAction;
  timestamp: string;
}

export interface TimetableSlot {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  timeSlot: string; // "09:00 - 10:00"
  subject: string;
  teacherName: string;
  room: string;
}

export interface Homework {
  id: string;
  classId: string;
  subject: string;
  title: string;
  description: string;
  assignedDate: string;
  dueDate: string;
  requiredBookIds: string[];
  requiredBookNames: string[];
  teacherId: string;
  teacherName: string;
}

export interface TestItem {
  id: string;
  classId: string;
  subject: string;
  testTitle: string;
  chapterTopic: string;
  testDate: string;
  requiredBookIds: string[];
  requiredBookNames: string[];
  teacherId: string;
  teacherName: string;
}

export interface NotificationItem {
  id: string;
  targetRole: UserRole | 'ALL';
  targetUserId?: string; // studentId or teacherId
  targetClassId?: string;
  type: 'MISSING_MATERIAL' | 'WRONG_BOOK' | 'HOMEWORK_REMINDER' | 'TEST_REMINDER' | 'AI_FORGETTING_ALERT' | 'BAG_WEIGHT_WARNING' | 'RECOMMENDATION' | 'ANNOUNCEMENT';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  severity: 'info' | 'warning' | 'error' | 'success';
  metadata?: Record<string, unknown>;
}

// ML Model Data Interfaces
export interface MLDatasetRecord {
  student_id: string;
  subject: string;
  day_of_week: number; // 1 to 6 (Mon to Sat)
  previous_misses: number;
  previous_scans: number;
  homework_due: number; // 0 or 1
  test_tomorrow: number; // 0 or 1
  material_required: number; // 0 or 1
  previous_week_misses: number;
  subject_miss_rate: number; // 0.0 - 1.0
  days_since_last_miss: number;
  class_level: number; // 6, 7, 8
  material_type: number; // 0=Textbook, 1=Notebook, 2=Workbook, 3=Record Book, 4=Other
  estimated_material_weight: number; // in kg
  number_of_required_books: number;
  number_of_books_scanned: number;
  forgot_material: number; // 0 or 1 target
}

export interface MLModelEvaluation {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: {
    trueNegative: number;
    falsePositive: number;
    falseNegative: number;
    truePositive: number;
  };
  featureImportance: {
    feature: string;
    importance: number;
    description: string;
  }[];
  datasetSize: number;
  trainingRecords: number;
  testingRecords: number;
  modelType: string;
  trainingTimestamp: string;
  modelVersion: string;
}

export interface MLPredictionInput {
  studentId: string;
  subject: string;
  dayOfWeek?: number;
  previousMisses?: number;
  previousScans?: number;
  homeworkDue: number;
  testTomorrow: number;
  materialRequired?: number;
  previousWeekMisses?: number;
  subjectMissRate?: number;
  daysSinceLastMiss?: number;
  classLevel?: number;
  materialType?: number;
  estimatedMaterialWeight?: number;
  numberOfRequiredBooks?: number;
  numberOfBooksScanned?: number;
}

export interface MLPredictionResult {
  studentId: string;
  studentName?: string;
  subject: string;
  probability: number; // 0.0 to 1.0 (actual trained model output)
  predictedClass: 0 | 1;
  riskLevel: RiskLevel;
  timestamp: string;
  modelVersion: string;
  contributingFactors: string[];
}

export interface AcademicKitItem {
  bookId: string;
  bookName: string;
  subject: string;
  type: BookType;
  weightKg: number;
  isPresentInLocker: boolean;
  status: 'VALID_PRESENT' | 'MISSING_REQUIRED' | 'HIGH_RISK_WARNING';
  reason: string;
  mlForgettingProbability?: number;
  mlRiskLevel?: RiskLevel;
}

export interface AcademicKitSummary {
  date: string;
  dayName: string;
  targetSubjects: string[];
  requiredItems: AcademicKitItem[];
  unnecessaryItemsInLocker: {
    bookId: string;
    bookName: string;
    subject: string;
    weightKg: number;
  }[];
  totalRequiredWeightKg: number;
  unnecessaryWeightKg: number;
  weightSavingRecommendation: string;
  overallComplianceScore: number; // e.g. 75%
}

export interface DamagedQRCandidate {
  book: Book;
  confidenceScore: number; // 0 to 100%
  matchReasons: string[];
}

export type VoiceAssistantAction =
  | 'NONE'
  | 'SWITCH_ROLE'
  | 'SWITCH_TAB'
  | 'OPEN_SCANNER'
  | 'TOGGLE_LOCKER'
  | 'SET_STUDENT'
  | 'OPEN_RECOVERY'
  | 'CHECK_BAG_WEIGHT'
  | 'REFRESH_DATA'
  | 'START_VOICE_ASSIGN';

export interface VoiceAssistantResponse {
  spokenResponse: string;
  displayText: string;
  action: VoiceAssistantAction;
  actionPayload?: {
    role?: 'STUDENT' | 'TEACHER' | 'ADMIN';
    tab?: string;
    studentId?: string;
    lockerStatus?: 'OPEN' | 'LOCKED';
    mode?: 'homework' | 'test';
  };
  detectedLanguage: string;
  source: 'gemini' | 'rule-engine';
}

