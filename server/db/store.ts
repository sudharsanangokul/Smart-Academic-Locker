import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
} from 'firebase/firestore';
import { serverFirestore } from '../firebase';
import {
  Book,
  Homework,
  InventoryLog,
  Locker,
  NotificationItem,
  SchoolClass,
  Student,
  TestItem,
  TimetableSlot,
  User,
} from '../../src/types';

// Collection references
const USERS_COL = 'users';
const CLASSES_COL = 'classes';
const STUDENTS_COL = 'students';
const BOOKS_COL = 'books';
const LOCKERS_COL = 'lockers';
const TIMETABLES_COL = 'timetables';
const HOMEWORK_COL = 'homework';
const TESTS_COL = 'tests';
const LOGS_COL = 'inventoryLogs';
const NOTIFICATIONS_COL = 'notifications';

export class FirestoreDataStore {
  public initialized = false;

  // In-memory cache for ultra-fast response fallback and hybrid sync
  users: User[] = [];
  classes: SchoolClass[] = [];
  students: Student[] = [];
  books: Book[] = [];
  lockers: Locker[] = [];
  inventoryLogs: InventoryLog[] = [];
  timetables: Record<string, TimetableSlot[]> = {};
  homeworks: Homework[] = [];
  tests: TestItem[] = [];
  notifications: NotificationItem[] = [];

  constructor() {
    this.seedDefaultDataInMemory();
  }

  private seedDefaultDataInMemory() {
    // 1. Classes
    this.classes = [
      { id: '6A', name: 'Class 6A', grade: 6, section: 'A', studentCount: 40, classTeacherId: 'TCH-003', classTeacherName: 'Mrs. Ananya Roy', roomNumber: 'Room 101' },
      { id: '6B', name: 'Class 6B', grade: 6, section: 'B', studentCount: 45, classTeacherId: 'TCH-004', classTeacherName: 'Mr. Suresh Menon', roomNumber: 'Room 102' },
      { id: '7A', name: 'Class 7A', grade: 7, section: 'A', studentCount: 50, classTeacherId: 'TCH-005', classTeacherName: 'Mrs. Sunita Patel', roomNumber: 'Room 201' },
      { id: '8A', name: 'Class 8A', grade: 8, section: 'A', studentCount: 60, classTeacherId: 'TCH-001', classTeacherName: 'Mr. Ramesh Sharma', roomNumber: 'Room 301' },
      { id: '8B', name: 'Class 8B', grade: 8, section: 'B', studentCount: 55, classTeacherId: 'TCH-006', classTeacherName: 'Mr. Deepak Verma', roomNumber: 'Room 302' },
    ];

    // 2. Books Catalog
    this.books = [
      { id: 'B-MATH-08-001', bookName: 'NCERT Mathematics Textbook', subject: 'Mathematics', classLevel: 8, type: 'Textbook', weightKg: 0.65, coverColor: '#3b82f6', description: 'Standard Grade 8 Mathematics Curriculum' },
      { id: 'B-MATH-08-002', bookName: 'Mathematics Classwork Notebook', subject: 'Mathematics', classLevel: 8, type: 'Notebook', weightKg: 0.35, coverColor: '#60a5fa', description: '200 Pages Long Ruled Notebook' },
      { id: 'B-SCI-08-001', bookName: 'NCERT Science Textbook', subject: 'Science', classLevel: 8, type: 'Textbook', weightKg: 0.70, coverColor: '#10b981', description: 'General Science Physics, Chemistry & Biology' },
      { id: 'B-SCI-08-002', bookName: 'Science Practical & Class Notebook', subject: 'Science', classLevel: 8, type: 'Notebook', weightKg: 0.40, coverColor: '#34d399', description: 'Lab Record & Classroom Notebook' },
      { id: 'B-ENG-08-001', bookName: 'Honeydew English Textbook', subject: 'English', classLevel: 8, type: 'Textbook', weightKg: 0.50, coverColor: '#8b5cf6', description: 'English Literature and Prose' },
      { id: 'B-ENG-08-002', bookName: 'English Grammar & Writing Notebook', subject: 'English', classLevel: 8, type: 'Notebook', weightKg: 0.30, coverColor: '#a78bfa', description: 'Grammar practice and essay composition' },
      { id: 'B-HIST-08-001', bookName: 'Our Pasts - III History Textbook', subject: 'History', classLevel: 8, type: 'Textbook', weightKg: 0.55, coverColor: '#f59e0b', description: 'Modern Indian History Curriculum' },
      { id: 'B-SST-08-001', bookName: 'Resources & Development (Geography)', subject: 'Social Science', classLevel: 8, type: 'Textbook', weightKg: 0.50, coverColor: '#d97706', description: 'Physical and Human Geography' },
      { id: 'B-HIN-08-001', bookName: 'Vasant Hindi Textbook', subject: 'Hindi', classLevel: 8, type: 'Textbook', weightKg: 0.45, coverColor: '#ec4899', description: 'Hindi Literature & Poetry' },
      { id: 'B-COMP-08-001', bookName: 'Computer Science & AI Basics', subject: 'Computer Science', classLevel: 8, type: 'Textbook', weightKg: 0.40, coverColor: '#06b6d4', description: 'Introduction to Algorithms, Python & AI' },
      { id: 'B-MATH-07-001', bookName: 'NCERT Mathematics Class 7', subject: 'Mathematics', classLevel: 7, type: 'Textbook', weightKg: 0.60, coverColor: '#2563eb' },
      { id: 'B-SCI-07-001', bookName: 'NCERT Science Class 7', subject: 'Science', classLevel: 7, type: 'Textbook', weightKg: 0.65, coverColor: '#059669' },
      { id: 'B-ENG-07-001', bookName: 'Honeycomb English Class 7', subject: 'English', classLevel: 7, type: 'Textbook', weightKg: 0.45, coverColor: '#7c3aed' },
      { id: 'B-MATH-06-001', bookName: 'NCERT Mathematics Class 6', subject: 'Mathematics', classLevel: 6, type: 'Textbook', weightKg: 0.55, coverColor: '#1d4ed8' },
      { id: 'B-SCI-06-001', bookName: 'NCERT Science Class 6', subject: 'Science', classLevel: 6, type: 'Textbook', weightKg: 0.60, coverColor: '#047857' },
      { id: 'B-ENG-06-001', bookName: 'A Pact with the Sun Class 6', subject: 'English', classLevel: 6, type: 'Textbook', weightKg: 0.40, coverColor: '#6d28d9' },
    ];

    // 3. Students & Lockers
    const firstNames = ['Rahul', 'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Shaurya', 'Atharv', 'Advik', 'Pranav', 'Advaith', 'Aaryan', 'Dhruv', 'Kabir', 'Rithvik', 'Ananya', 'Diya', 'Aadhya', 'Pari', 'Saanvi', 'Myra', 'Ira', 'Avani', 'Prisha', 'Riya', 'Siya', 'Navya', 'Tanvi', 'Sara', 'Kavya', 'Ahana', 'Meera', 'Anika', 'Tara', 'Samaira'];
    const lastNames = ['Kumar', 'Sharma', 'Verma', 'Patel', 'Reddy', 'Gupta', 'Singh', 'Nair', 'Iyer', 'Menon', 'Rao', 'Joshi', 'Chopra', 'Bhat', 'Deshmukh', 'Mishra', 'Pandey', 'Malhotra', 'Mukherjee', 'Das'];

    this.students = [];
    this.lockers = [];

    const rahulStudent: Student = {
      id: 'STU-024',
      studentId: 'STU-8A-024',
      name: 'Rahul Kumar',
      email: 'student@school.com',
      classId: '8A',
      section: 'A',
      lockerNumber: 'L-024',
      rollNumber: 24,
      previousMisses: 5,
      totalScans: 42,
      subjectMissRates: {
        Science: 0.48,
        Mathematics: 0.20,
        English: 0.35,
        'Social Science': 0.15,
        Hindi: 0.10,
        'Computer Science': 0.05,
      },
    };
    this.students.push(rahulStudent);

    this.lockers.push({
      id: 'L-024',
      lockerNumber: 'L-024',
      assignedStudentId: rahulStudent.studentId,
      studentName: rahulStudent.name,
      classId: '8A',
      status: 'LOCKED',
      lastOpenedAt: new Date(Date.now() - 3600000).toISOString(),
      currentBookIds: ['B-MATH-08-001', 'B-SCI-08-001'],
    });

    for (let i = 1; i <= 60; i++) {
      if (i === 24) continue;
      const paddedNum = i.toString().padStart(3, '0');
      const sId = `STU-8A-${paddedNum}`;
      const lId = `L-${paddedNum}`;
      const fName = firstNames[(i * 3) % firstNames.length];
      const lName = lastNames[(i * 7) % lastNames.length];
      const fullName = `${fName} ${lName}`;
      const misses = (i % 7);

      const s: Student = {
        id: `STU-${paddedNum}`,
        studentId: sId,
        name: fullName,
        email: `student${i}@school.com`,
        classId: '8A',
        section: 'A',
        lockerNumber: lId,
        rollNumber: i,
        previousMisses: misses,
        totalScans: 20 + (i % 30),
        subjectMissRates: {
          Science: (misses * 0.08),
          Mathematics: (misses * 0.05),
          English: (misses * 0.06),
          'Social Science': 0.1,
          Hindi: 0.05,
          'Computer Science': 0.05,
        },
      };
      this.students.push(s);

      const initialBooks = ['B-MATH-08-001', 'B-SCI-08-001'];
      if (i % 2 === 0) initialBooks.push('B-ENG-08-001');
      if (i % 3 === 0) initialBooks.push('B-MATH-08-002');
      if (i % 5 === 0) initialBooks.push('B-SCI-08-002');

      this.lockers.push({
        id: lId,
        lockerNumber: lId,
        assignedStudentId: sId,
        studentName: fullName,
        classId: '8A',
        status: 'LOCKED',
        lastOpenedAt: new Date(Date.now() - (i * 7200000)).toISOString(),
        currentBookIds: initialBooks,
      });
    }

    // 4. Users
    this.users = [
      {
        id: 'USR-ADMIN',
        name: 'Principal Dr. A. K. Sundaram',
        email: 'admin@gmail.com',
        role: 'ADMIN',
        password: 'Admin@123',
        department: 'Executive Administration',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      },
      {
        id: 'USR-TCH-001',
        name: 'Mr. Ramesh Sharma',
        email: 'teacher1@gmail.com',
        role: 'TEACHER',
        password: 'Teacher@123',
        teacherType: 'CLASS_TEACHER',
        assignedClassId: '8A',
        teachingSubjects: ['Mathematics', 'Social Science'],
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      },
      {
        id: 'USR-TCH-002',
        name: 'Dr. Priya Verma',
        email: 'teacher2@gmail.com',
        role: 'TEACHER',
        password: 'Teacher@123',
        teacherType: 'SUBJECT_TEACHER',
        assignedClassId: '8A',
        teachingSubjects: ['Science'],
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      },
      {
        id: 'USR-STU-024',
        name: 'Rahul Kumar',
        email: 'student@school.com',
        role: 'STUDENT',
        password: 'student123',
        studentId: 'STU-8A-024',
        lockerId: 'L-024',
        classId: '8A',
        section: 'A',
        avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      },
      {
        id: 'USR-STU-002',
        name: 'Aarav Sharma',
        email: 'aarav@school.com',
        role: 'STUDENT',
        password: 'student123',
        studentId: 'STU-8A-002',
        lockerId: 'L-002',
        classId: '8A',
        section: 'A',
        avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
      },
    ];

    // 5. Timetables
    this.timetables['8A'] = [
      { id: 'TT-8A-M1', day: 'Monday', timeSlot: '08:30 - 09:30', subject: 'Mathematics', teacherName: 'Mr. Ramesh Sharma', room: 'Room 301' },
      { id: 'TT-8A-M2', day: 'Monday', timeSlot: '09:30 - 10:30', subject: 'Science', teacherName: 'Dr. Priya Verma', room: 'Science Lab 2' },
      { id: 'TT-8A-M3', day: 'Monday', timeSlot: '10:45 - 11:45', subject: 'English', teacherName: 'Mrs. Rohini Sen', room: 'Room 301' },
      { id: 'TT-8A-M4', day: 'Monday', timeSlot: '11:45 - 12:45', subject: 'Social Science', teacherName: 'Mr. Ramesh Sharma', room: 'Room 301' },
      { id: 'TT-8A-M5', day: 'Monday', timeSlot: '01:30 - 02:30', subject: 'Computer Science', teacherName: 'Mr. Vinay Kapoor', room: 'IT Lab 1' },
      { id: 'TT-8A-T1', day: 'Tuesday', timeSlot: '08:30 - 09:30', subject: 'Science', teacherName: 'Dr. Priya Verma', room: 'Science Lab 2' },
      { id: 'TT-8A-T2', day: 'Tuesday', timeSlot: '09:30 - 10:30', subject: 'Mathematics', teacherName: 'Mr. Ramesh Sharma', room: 'Room 301' },
      { id: 'TT-8A-T3', day: 'Tuesday', timeSlot: '10:45 - 11:45', subject: 'Hindi', teacherName: 'Mrs. Kanta Devi', room: 'Room 301' },
      { id: 'TT-8A-T4', day: 'Tuesday', timeSlot: '11:45 - 12:45', subject: 'English', teacherName: 'Mrs. Rohini Sen', room: 'Room 301' },
      { id: 'TT-8A-W1', day: 'Wednesday', timeSlot: '08:30 - 09:30', subject: 'Mathematics', teacherName: 'Mr. Ramesh Sharma', room: 'Room 301' },
      { id: 'TT-8A-W2', day: 'Wednesday', timeSlot: '09:30 - 10:30', subject: 'Science', teacherName: 'Dr. Priya Verma', room: 'Science Lab 2' },
      { id: 'TT-8A-W3', day: 'Wednesday', timeSlot: '10:45 - 11:45', subject: 'Social Science', teacherName: 'Mr. Ramesh Sharma', room: 'Room 301' },
      { id: 'TT-8A-TH1', day: 'Thursday', timeSlot: '08:30 - 09:30', subject: 'English', teacherName: 'Mrs. Rohini Sen', room: 'Room 301' },
      { id: 'TT-8A-TH2', day: 'Thursday', timeSlot: '09:30 - 10:30', subject: 'Science', teacherName: 'Dr. Priya Verma', room: 'Science Lab 2' },
      { id: 'TT-8A-TH3', day: 'Thursday', timeSlot: '10:45 - 11:45', subject: 'Mathematics', teacherName: 'Mr. Ramesh Sharma', room: 'Room 301' },
      { id: 'TT-8A-F1', day: 'Friday', timeSlot: '08:30 - 09:30', subject: 'Mathematics', teacherName: 'Mr. Ramesh Sharma', room: 'Room 301' },
      { id: 'TT-8A-F2', day: 'Friday', timeSlot: '09:30 - 10:30', subject: 'Hindi', teacherName: 'Mrs. Kanta Devi', room: 'Room 301' },
      { id: 'TT-8A-F3', day: 'Friday', timeSlot: '10:45 - 11:45', subject: 'Computer Science', teacherName: 'Mr. Vinay Kapoor', room: 'IT Lab 1' },
    ];

    // 6. Homework
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    this.homeworks = [
      {
        id: 'HW-8A-001',
        classId: '8A',
        subject: 'Mathematics',
        title: 'Exercise 5.2 – Linear Equations in One Variable',
        description: 'Complete problems 1 to 15 in the classwork notebook showing full step-by-step solutions.',
        assignedDate: todayStr,
        dueDate: tomorrowStr,
        requiredBookIds: ['B-MATH-08-001', 'B-MATH-08-002'],
        requiredBookNames: ['NCERT Mathematics Textbook', 'Mathematics Classwork Notebook'],
        teacherId: 'USR-TCH-001',
        teacherName: 'Mr. Ramesh Sharma',
      },
      {
        id: 'HW-8A-002',
        classId: '8A',
        subject: 'English',
        title: 'Poem Comprehension – The Ant and the Cricket',
        description: 'Read the stanzas and answer comprehension questions on page 42 in the English grammar notebook.',
        assignedDate: todayStr,
        dueDate: tomorrowStr,
        requiredBookIds: ['B-ENG-08-001', 'B-ENG-08-002'],
        requiredBookNames: ['Honeydew English Textbook', 'English Grammar & Writing Notebook'],
        teacherId: 'USR-TCH-001',
        teacherName: 'Mrs. Rohini Sen',
      },
    ];

    // 7. Tests
    this.tests = [
      {
        id: 'TEST-8A-001',
        classId: '8A',
        subject: 'Science',
        testTitle: 'Chapter 3 Unit Test – Synthetic Fibres and Plastics',
        chapterTopic: 'Polymers, Types of Synthetic Fibres & Environmental Impact',
        testDate: tomorrowStr,
        requiredBookIds: ['B-SCI-08-001', 'B-SCI-08-002'],
        requiredBookNames: ['NCERT Science Textbook', 'Science Practical & Class Notebook'],
        teacherId: 'USR-TCH-002',
        teacherName: 'Dr. Priya Verma',
      },
    ];

    // 8. Notifications
    this.notifications = [
      {
        id: 'NOTIF-001',
        targetRole: 'STUDENT',
        targetUserId: 'STU-8A-024',
        targetClassId: '8A',
        type: 'AI_FORGETTING_ALERT',
        title: 'High Forgetting Probability Alert (Science)',
        message: 'Science Chapter 3 Test is scheduled for tomorrow. Our ML model predicts an 84% probability of forgetting your Science Notebook. Please ensure it is placed in your locker or bag!',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        read: false,
        severity: 'warning',
      },
      {
        id: 'NOTIF-002',
        targetRole: 'STUDENT',
        targetUserId: 'STU-8A-024',
        targetClassId: '8A',
        type: 'MISSING_MATERIAL',
        title: 'English Notebook Missing',
        message: 'English class is scheduled tomorrow with homework due, but your English Notebook is currently not detected in your locker.',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        read: false,
        severity: 'error',
      },
      {
        id: 'NOTIF-003',
        targetRole: 'TEACHER',
        targetClassId: '8A',
        type: 'AI_FORGETTING_ALERT',
        title: 'Class 8A Material Readiness Warning',
        message: '14 students in Class 8A have not yet checked in their Science Notebook for tomorrow\'s Chapter 3 Unit Test.',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        read: false,
        severity: 'warning',
      },
    ];

    // 9. Inventory Logs
    this.inventoryLogs = [
      {
        id: 'LOG-001',
        studentId: 'STU-8A-024',
        lockerId: 'L-024',
        bookId: 'B-MATH-08-001',
        bookName: 'NCERT Mathematics Textbook',
        subject: 'Mathematics',
        action: 'ADDED',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'LOG-002',
        studentId: 'STU-8A-024',
        lockerId: 'L-024',
        bookId: 'B-SCI-08-001',
        bookName: 'NCERT Science Textbook',
        subject: 'Science',
        action: 'ADDED',
        timestamp: new Date(Date.now() - 82800000).toISOString(),
      },
    ];
  }

  // Initialize and synchronize with Firebase Cloud Firestore
  public async initFirebase(): Promise<void> {
    try {
      console.log('Synchronizing Firestore Database collections...');

      // 1. Check if Books collection exists in Firestore
      const booksSnap = await getDocs(collection(serverFirestore, BOOKS_COL));
      if (booksSnap.empty) {
        console.log('Seeding initial data to Cloud Firestore...');
        await this.seedToFirestore();
      } else {
        console.log('Loading existing data from Cloud Firestore...');
        await this.loadFromFirestore();
      }

      this.initialized = true;
      console.log('Firestore DB synchronized successfully.');
    } catch (err) {
      console.warn('Firestore initialization notice (operating with persistent memory store + async sync):', err);
      this.initialized = true;
    }
  }

  private async seedToFirestore(): Promise<void> {
    const batch = writeBatch(serverFirestore);

    // Users
    for (const u of this.users) {
      const ref = doc(serverFirestore, USERS_COL, u.id);
      batch.set(ref, u);
    }
    // Classes
    for (const c of this.classes) {
      const ref = doc(serverFirestore, CLASSES_COL, c.id);
      batch.set(ref, c);
    }
    // Books
    for (const b of this.books) {
      const ref = doc(serverFirestore, BOOKS_COL, b.id);
      batch.set(ref, b);
    }
    // Students
    for (const s of this.students) {
      const ref = doc(serverFirestore, STUDENTS_COL, s.id);
      batch.set(ref, s);
    }
    // Lockers
    for (const l of this.lockers) {
      const ref = doc(serverFirestore, LOCKERS_COL, l.id);
      batch.set(ref, l);
    }
    // Homework
    for (const h of this.homeworks) {
      const ref = doc(serverFirestore, HOMEWORK_COL, h.id);
      batch.set(ref, h);
    }
    // Tests
    for (const t of this.tests) {
      const ref = doc(serverFirestore, TESTS_COL, t.id);
      batch.set(ref, t);
    }
    // Timetables
    for (const [classId, slots] of Object.entries(this.timetables)) {
      for (const slot of slots) {
        const ref = doc(serverFirestore, TIMETABLES_COL, slot.id);
        batch.set(ref, { ...slot, classId });
      }
    }
    // Notifications
    for (const n of this.notifications) {
      const ref = doc(serverFirestore, NOTIFICATIONS_COL, n.id);
      batch.set(ref, n);
    }
    // Logs
    for (const log of this.inventoryLogs) {
      const ref = doc(serverFirestore, LOGS_COL, log.id);
      batch.set(ref, log);
    }

    await batch.commit();
  }

  public async loadFromFirestore(): Promise<void> {
    try {
      const [uSnap, cSnap, bSnap, sSnap, lSnap, hSnap, tSnap, nSnap, logSnap, ttSnap] = await Promise.all([
        getDocs(collection(serverFirestore, USERS_COL)),
        getDocs(collection(serverFirestore, CLASSES_COL)),
        getDocs(collection(serverFirestore, BOOKS_COL)),
        getDocs(collection(serverFirestore, STUDENTS_COL)),
        getDocs(collection(serverFirestore, LOCKERS_COL)),
        getDocs(collection(serverFirestore, HOMEWORK_COL)),
        getDocs(collection(serverFirestore, TESTS_COL)),
        getDocs(collection(serverFirestore, NOTIFICATIONS_COL)),
        getDocs(collection(serverFirestore, LOGS_COL)),
        getDocs(collection(serverFirestore, TIMETABLES_COL)),
      ]);

      if (!uSnap.empty) {
        this.users = uSnap.docs.map(d => d.data() as User);
        // Ensure standard demo accounts always match the official credentials
        const officialDemoAccounts: Record<string, { email: string; password: string }> = {
          'USR-ADMIN': { email: 'admin@gmail.com', password: 'Admin@123' },
          'USR-TCH-001': { email: 'teacher1@gmail.com', password: 'Teacher@123' },
          'USR-TCH-002': { email: 'teacher2@gmail.com', password: 'Teacher@123' },
        };
        for (const [id, creds] of Object.entries(officialDemoAccounts)) {
          const u = this.users.find(x => x.id === id);
          if (u) {
            u.email = creds.email;
            u.password = creds.password;
            setDoc(doc(serverFirestore, USERS_COL, id), u).catch(() => {});
          } else {
            // If missing from Firestore, add default from seed
            const seed = [
              {
                id: 'USR-ADMIN',
                name: 'Principal Dr. A. K. Sundaram',
                email: 'admin@gmail.com',
                role: 'ADMIN' as const,
                password: 'Admin@123',
                department: 'Executive Administration',
              },
              {
                id: 'USR-TCH-001',
                name: 'Mr. Ramesh Sharma',
                email: 'teacher1@gmail.com',
                role: 'TEACHER' as const,
                password: 'Teacher@123',
                teacherType: 'CLASS_TEACHER' as const,
                assignedClassId: '8A',
                teachingSubjects: ['Mathematics', 'Social Science'],
              },
              {
                id: 'USR-TCH-002',
                name: 'Dr. Priya Verma',
                email: 'teacher2@gmail.com',
                role: 'TEACHER' as const,
                password: 'Teacher@123',
                teacherType: 'SUBJECT_TEACHER' as const,
                assignedClassId: '8A',
                teachingSubjects: ['Science'],
              },
            ].find(s => s.id === id);
            if (seed) {
              this.users.unshift(seed as User);
              setDoc(doc(serverFirestore, USERS_COL, id), seed).catch(() => {});
            }
          }
        }
      }
      if (!cSnap.empty) this.classes = cSnap.docs.map(d => d.data() as SchoolClass);
      if (!bSnap.empty) this.books = bSnap.docs.map(d => d.data() as Book);
      if (!sSnap.empty) this.students = sSnap.docs.map(d => d.data() as Student);
      if (!lSnap.empty) this.lockers = lSnap.docs.map(d => d.data() as Locker);
      if (!hSnap.empty) this.homeworks = hSnap.docs.map(d => d.data() as Homework);
      if (!tSnap.empty) this.tests = tSnap.docs.map(d => d.data() as TestItem);
      if (!nSnap.empty) this.notifications = nSnap.docs.map(d => d.data() as NotificationItem);
      if (!logSnap.empty) this.inventoryLogs = logSnap.docs.map(d => d.data() as InventoryLog);

      if (!ttSnap.empty) {
        const slots = ttSnap.docs.map(d => d.data() as TimetableSlot & { classId: string });
        this.timetables = {};
        for (const slot of slots) {
          const cId = slot.classId || '8A';
          if (!this.timetables[cId]) this.timetables[cId] = [];
          this.timetables[cId].push(slot);
        }
      }
    } catch (e) {
      console.warn('Failed to pull complete Firestore documents, using memory store:', e);
    }
  }

  // ----------------------------------------------------
  // Persistent Mutations with Firebase Write-Through
  // ----------------------------------------------------
  public async addHomework(hw: Homework): Promise<Homework> {
    this.homeworks.unshift(hw);
    try {
      await setDoc(doc(serverFirestore, HOMEWORK_COL, hw.id), hw);
    } catch (err) {
      console.warn('Firestore write error (addHomework):', err);
    }
    return hw;
  }

  public async addTest(test: TestItem): Promise<TestItem> {
    this.tests.unshift(test);
    try {
      await setDoc(doc(serverFirestore, TESTS_COL, test.id), test);
    } catch (err) {
      console.warn('Firestore write error (addTest):', err);
    }
    return test;
  }

  public async updateLocker(locker: Locker): Promise<Locker> {
    const idx = this.lockers.findIndex(l => l.id === locker.id || l.lockerNumber === locker.lockerNumber);
    if (idx >= 0) this.lockers[idx] = locker;
    else this.lockers.push(locker);

    try {
      await setDoc(doc(serverFirestore, LOCKERS_COL, locker.id), locker);
    } catch (err) {
      console.warn('Firestore write error (updateLocker):', err);
    }
    return locker;
  }

  public async addInventoryLog(log: InventoryLog): Promise<InventoryLog> {
    this.inventoryLogs.unshift(log);
    try {
      await setDoc(doc(serverFirestore, LOGS_COL, log.id), log);
    } catch (err) {
      console.warn('Firestore write error (addInventoryLog):', err);
    }
    return log;
  }

  public async registerBook(book: Book): Promise<Book> {
    this.books.push(book);
    try {
      await setDoc(doc(serverFirestore, BOOKS_COL, book.id), book);
    } catch (err) {
      console.warn('Firestore write error (registerBook):', err);
    }
    return book;
  }

  public async addUser(user: User): Promise<User> {
    const existingIdx = this.users.findIndex(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    if (existingIdx >= 0) {
      this.users[existingIdx] = user;
    } else {
      this.users.unshift(user);
    }
    try {
      await setDoc(doc(serverFirestore, USERS_COL, user.id), user);
    } catch (err) {
      console.warn('Firestore write error (addUser):', err);
    }
    return user;
  }

  public async addStudent(student: Student): Promise<Student> {
    const existingIdx = this.students.findIndex(s => s.id === student.id || s.studentId === student.studentId);
    if (existingIdx >= 0) {
      this.students[existingIdx] = student;
    } else {
      this.students.unshift(student);
    }
    try {
      await setDoc(doc(serverFirestore, STUDENTS_COL, student.id), student);
    } catch (err) {
      console.warn('Firestore write error (addStudent):', err);
    }
    return student;
  }

  public async saveTimetable(classId: string, slots: TimetableSlot[]): Promise<TimetableSlot[]> {
    this.timetables[classId] = slots;
    try {
      const batch = writeBatch(serverFirestore);
      for (const slot of slots) {
        const ref = doc(serverFirestore, TIMETABLES_COL, slot.id);
        batch.set(ref, { ...slot, classId });
      }
      await batch.commit();
    } catch (err) {
      console.warn('Firestore write error (saveTimetable):', err);
    }
    return slots;
  }
}

export const db = new FirestoreDataStore();
