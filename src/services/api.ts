import {
  AcademicKitSummary,
  Book,
  DamagedQRCandidate,
  Homework,
  InventoryLog,
  Locker,
  MLModelEvaluation,
  MLPredictionInput,
  MLPredictionResult,
  NotificationItem,
  SchoolClass,
  Student,
  TestItem,
  TimetableSlot,
  User,
  UserRole,
  ValidationStatus,
  VoiceAssistantResponse,
} from '../types';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorBody.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  async login(email: string, password?: string, role?: UserRole): Promise<{ user: User }> {
    return fetchJson('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    });
  },

  async register(data: {
    name: string;
    email: string;
    password?: string;
    role: UserRole;
    classId?: string;
    section?: string;
    rollNumber?: number;
    teacherType?: string;
    assignedClassId?: string;
    teachingSubjects?: string[];
    department?: string;
  }): Promise<{ user: User }> {
    return fetchJson('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getDemoUsers(): Promise<{ users: User[] }> {
    return fetchJson('/api/auth/demo-users');
  },

  // Students & Lockers
  async getStudents(classId?: string): Promise<{ students: Student[] }> {
    const q = classId ? `?classId=${encodeURIComponent(classId)}` : '';
    return fetchJson(`/api/students${q}`);
  },

  async getStudent(id: string): Promise<{ student: Student; locker: Locker }> {
    return fetchJson(`/api/students/${id}`);
  },

  async getAcademicKit(studentId: string, day: string = 'Monday'): Promise<{ kit: AcademicKitSummary; student: Student; locker: Locker }> {
    return fetchJson(`/api/students/${studentId}/academic-kit?day=${day}`);
  },

  async toggleLockerStatus(lockerId: string, status?: 'LOCKED' | 'OPEN'): Promise<{ locker: Locker }> {
    return fetchJson('/api/lockers/toggle-status', {
      method: 'POST',
      body: JSON.stringify({ lockerId, status }),
    });
  },

  // Real Scan & Book Validation
  async scanValidateBook(studentId: string, bookId: string, action: 'ADD' | 'REMOVE' = 'ADD'): Promise<{
    validationStatus: ValidationStatus;
    colorBadge: 'GREEN' | 'YELLOW' | 'RED';
    title: string;
    message: string;
    book: Book | null;
    locker: Locker;
    log?: InventoryLog;
  }> {
    return fetchJson('/api/locker/scan-validate', {
      method: 'POST',
      body: JSON.stringify({ studentId, bookId, action }),
    });
  },

  async removeBook(studentId: string, bookId: string): Promise<{ success: boolean; locker: Locker; log: InventoryLog }> {
    return fetchJson('/api/locker/remove-book', {
      method: 'POST',
      body: JSON.stringify({ studentId, bookId }),
    });
  },

  async getTransactions(studentId?: string): Promise<{ transactions: InventoryLog[] }> {
    const q = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
    return fetchJson(`/api/locker/transactions${q}`);
  },

  // Books
  async getBooks(classLevel?: number): Promise<{ books: Book[] }> {
    const q = classLevel ? `?classLevel=${classLevel}` : '';
    return fetchJson(`/api/books${q}`);
  },

  async registerBook(book: Partial<Book>): Promise<{ book: Book }> {
    return fetchJson('/api/books', {
      method: 'POST',
      body: JSON.stringify(book),
    });
  },

  // Classes, Timetable, Homework, Tests
  async getClasses(): Promise<{ classes: SchoolClass[] }> {
    return fetchJson('/api/classes');
  },

  async getTimetable(classId: string): Promise<{ timetable: TimetableSlot[] }> {
    return fetchJson(`/api/timetable/${classId}`);
  },

  async saveTimetable(classId: string, slots: TimetableSlot[]): Promise<{ success: boolean; timetable: TimetableSlot[] }> {
    return fetchJson(`/api/timetable/${classId}`, {
      method: 'POST',
      body: JSON.stringify({ slots }),
    });
  },

  async getHomework(classId?: string): Promise<{ homework: Homework[] }> {
    const q = classId ? `?classId=${encodeURIComponent(classId)}` : '';
    return fetchJson(`/api/homework${q}`);
  },

  async createHomework(hw: Partial<Homework>): Promise<{ homework: Homework }> {
    return fetchJson('/api/homework', {
      method: 'POST',
      body: JSON.stringify(hw),
    });
  },

  async getTests(classId?: string): Promise<{ tests: TestItem[] }> {
    const q = classId ? `?classId=${encodeURIComponent(classId)}` : '';
    return fetchJson(`/api/tests${q}`);
  },

  async createTest(test: Partial<TestItem>): Promise<{ test: TestItem }> {
    return fetchJson('/api/tests', {
      method: 'POST',
      body: JSON.stringify(test),
    });
  },

  // AI & ML
  async getMLEvaluation(): Promise<{ evaluation: MLModelEvaluation }> {
    return fetchJson('/api/ml/evaluation');
  },

  async trainModel(datasetSize: number = 5200): Promise<{ success: boolean; evaluation: MLModelEvaluation }> {
    return fetchJson('/api/ml/train', {
      method: 'POST',
      body: JSON.stringify({ datasetSize }),
    });
  },

  async predictForgetting(input: MLPredictionInput): Promise<{ prediction: MLPredictionResult }> {
    return fetchJson('/api/ml/predict', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async getClassRiskAnalysis(classId: string): Promise<{
    classId: string;
    totalStudents: number;
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
    students: {
      studentId: string;
      studentName: string;
      rollNumber: number;
      lockerNumber: string;
      subject: string;
      riskLevel: string;
      probability: number;
      currentLockerBookCount: number;
      contributingFactors: string[];
    }[];
  }> {
    return fetchJson(`/api/ml/class-risk-analysis/${classId}`);
  },

  async recoverDamagedQR(rawInput: string, studentId: string): Promise<{
    query: string;
    studentName: string;
    studentClass: string;
    candidates: DamagedQRCandidate[];
  }> {
    return fetchJson('/api/ai/damaged-qr/recover', {
      method: 'POST',
      body: JSON.stringify({ rawInput, studentId }),
    });
  },

  // Notifications
  async getNotifications(role?: string, userId?: string, classId?: string): Promise<{ notifications: NotificationItem[] }> {
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (userId) params.set('userId', userId);
    if (classId) params.set('classId', classId);
    return fetchJson(`/api/notifications?${params.toString()}`);
  },

  async markNotificationRead(id?: string, all?: boolean): Promise<{ success: boolean }> {
    return fetchJson('/api/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify({ id, all }),
    });
  },

  // Admin Overview
  async getAdminOverview(): Promise<{
    totalStudents: number;
    totalClasses: number;
    totalBooks: number;
    totalLockers: number;
    openLockersCount: number;
    totalScansToday: number;
    modelTrained: boolean;
    modelVersion: string;
  }> {
    return fetchJson('/api/admin/overview');
  },

  // Multilingual AI Voice Assistant
  async processVoiceAssistant(query: string, preferredLanguage?: string, context?: any): Promise<VoiceAssistantResponse> {
    return fetchJson('/api/voice-assistant/process', {
      method: 'POST',
      body: JSON.stringify({ query, preferredLanguage, context }),
    });
  },
};
