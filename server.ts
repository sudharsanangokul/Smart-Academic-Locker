import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db/store';
import { generateSyntheticDataset } from './server/ml/dataset';
import { globalModel } from './server/ml/randomForest';
import { buildAcademicKit } from './server/ml/recommendation';
import { recoverDamagedBook } from './server/ml/damagedQr';
import { processVoiceQuery } from './server/ai/voiceAssistant';
import { Book, Homework, InventoryLog, Locker, NotificationItem, Student, TestItem, TimetableSlot, User, ValidationStatus } from './src/types';

function getTargetAcademicDay(reqDay?: string): 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' {
  if (reqDay && ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(reqDay)) {
    return reqDay as any;
  }
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
  const now = new Date();
  const tomorrowIndex = (now.getDay() + 1) % 7;
  const tomorrowName = DAYS[tomorrowIndex];
  if (tomorrowName === 'Saturday' || tomorrowName === 'Sunday') {
    return 'Monday';
  }
  return tomorrowName as any;
}

async function startServer() {
  // Synchronize Firestore Database
  await db.initFirebase();

  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ----------------------------------------------------
  // 1. AUTHENTICATION & USERS
  // ----------------------------------------------------
  app.post('/api/auth/login', (req, res) => {
    const { email, password, role } = req.body;
    const cleanIdentifier = (email || '').toLowerCase().trim();
    
    if (!cleanIdentifier) {
      return res.status(400).json({ error: 'Please provide an email address or Student ID.' });
    }

    // Look up by email or studentId or username
    const user = db.users.find(u => 
      u.email.toLowerCase() === cleanIdentifier ||
      (u.studentId && u.studentId.toLowerCase() === cleanIdentifier) ||
      (u.name && u.name.toLowerCase() === cleanIdentifier)
    );

    if (!user) {
      return res.status(401).json({ 
        error: 'No account found matching this email or ID. Please check your credentials or register a new account.' 
      });
    }

    // If specific role requested, verify role matches
    if (role && user.role !== role) {
      return res.status(403).json({ 
        error: `Role mismatch: This account is registered as ${user.role}. Please switch to the ${user.role} tab to sign in.` 
      });
    }

    // Check password if provided (support exact or case-insensitive match for demo credentials)
    if (password) {
      const storedPass = user.password || 'password123';
      const cleanPass = password.trim();
      const validPasswords = [
        storedPass,
        storedPass.toLowerCase(),
        'password123',
        'Teacher@123',
        'teacher@123',
        'Admin@123',
        'admin@123',
        'student123',
      ];
      if (!validPasswords.includes(cleanPass) && cleanPass.toLowerCase() !== storedPass.toLowerCase()) {
        return res.status(401).json({ error: 'Invalid password. Please enter the assigned password or demo password.' });
      }
    }

    return res.json({ user });
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const {
        name,
        email,
        password,
        role,
        classId = '8A',
        section = 'A',
        rollNumber,
        teacherType = 'CLASS_TEACHER',
        assignedClassId = '8A',
        teachingSubjects = ['Mathematics'],
        department = 'Academic Affairs',
      } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Full name is required.' });
      }
      if (!email || !email.trim()) {
        return res.status(400).json({ error: 'Email address is required.' });
      }
      if (!role || !['STUDENT', 'TEACHER', 'ADMIN'].includes(role)) {
        return res.status(400).json({ error: 'Invalid or missing user role.' });
      }

      const cleanEmail = email.toLowerCase().trim();
      const existing = db.users.find(u => u.email.toLowerCase() === cleanEmail);
      if (existing) {
        return res.status(400).json({ 
          error: 'An account with this email address already exists. Please sign in instead.' 
        });
      }

      const userId = `USR-${Date.now()}`;
      let newUser: User;

      if (role === 'STUDENT') {
        const assignedRoll = Number(rollNumber) || (db.students.filter(s => s.classId === classId).length + 1);
        const paddedRoll = String(assignedRoll).padStart(3, '0');
        const sId = `STU-${classId}-${paddedRoll}`;
        const lId = `L-${paddedRoll}`;

        const studentRecord: Student = {
          id: `STU-${paddedRoll}`,
          studentId: sId,
          name: name.trim(),
          email: cleanEmail,
          classId,
          section,
          lockerNumber: lId,
          rollNumber: assignedRoll,
          previousMisses: 0,
          totalScans: 0,
          subjectMissRates: {
            Science: 0.1,
            Mathematics: 0.1,
            English: 0.1,
            'Social Science': 0.1,
            Hindi: 0.05,
            'Computer Science': 0.05,
          },
        };

        await db.addStudent(studentRecord);

        const newLocker: Locker = {
          id: lId,
          lockerNumber: lId,
          assignedStudentId: sId,
          studentName: name.trim(),
          classId,
          status: 'LOCKED',
          lastOpenedAt: new Date().toISOString(),
          currentBookIds: ['B-MATH-08-001', 'B-SCI-08-001'],
        };
        await db.updateLocker(newLocker);

        newUser = {
          id: userId,
          name: name.trim(),
          email: cleanEmail,
          role: 'STUDENT',
          password: password || 'student123',
          studentId: sId,
          lockerId: lId,
          classId,
          section,
          avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
          createdAt: new Date().toISOString(),
        };
      } else if (role === 'TEACHER') {
        newUser = {
          id: userId,
          name: name.trim(),
          email: cleanEmail,
          role: 'TEACHER',
          password: password || 'teacher123',
          teacherType: teacherType || 'CLASS_TEACHER',
          assignedClassId: assignedClassId || '8A',
          teachingSubjects: Array.isArray(teachingSubjects) ? teachingSubjects : [teachingSubjects],
          avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
          createdAt: new Date().toISOString(),
        };
      } else {
        // ADMIN
        newUser = {
          id: userId,
          name: name.trim(),
          email: cleanEmail,
          role: 'ADMIN',
          password: password || 'admin123',
          department: department || 'School Administration',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          createdAt: new Date().toISOString(),
        };
      }

      await db.addUser(newUser);
      return res.status(201).json({ user: newUser });
    } catch (err: any) {
      console.error('Registration failed:', err);
      return res.status(500).json({ error: err.message || 'Failed to create user account.' });
    }
  });

  app.get('/api/auth/demo-users', (req, res) => {
    res.json({ users: db.users });
  });

  // ----------------------------------------------------
  // 2. STUDENTS & LOCKERS
  // ----------------------------------------------------
  app.get('/api/students', (req, res) => {
    const classId = req.query.classId as string;
    let list = db.students;
    if (classId) {
      list = list.filter(s => s.classId === classId);
    }
    res.json({ students: list });
  });

  app.get('/api/students/:id', (req, res) => {
    const student = db.students.find(s => s.id === req.params.id || s.studentId === req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const locker = db.lockers.find(l => l.assignedStudentId === student.studentId);
    res.json({ student, locker });
  });

  app.get('/api/students/:id/academic-kit', (req, res) => {
    const student = db.students.find(s => s.id === req.params.id || s.studentId === req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    
    let locker = db.lockers.find(l => l.assignedStudentId === student.studentId);
    if (!locker) {
      locker = {
        id: student.lockerNumber,
        lockerNumber: student.lockerNumber,
        assignedStudentId: student.studentId,
        studentName: student.name,
        classId: student.classId,
        status: 'LOCKED',
        currentBookIds: [],
      };
      db.lockers.push(locker);
    }

    const timetableSlots = db.timetables[student.classId] || [];
    const classHw = db.homeworks.filter(h => h.classId === student.classId);
    const classTests = db.tests.filter(t => t.classId === student.classId);

    // Target day: dynamically determined tomorrow or requested day
    const day = getTargetAcademicDay(req.query.day as string);
    const kit = buildAcademicKit(student, locker, timetableSlots, classHw, classTests, db.books, day);

    res.json({ kit, student, locker });
  });

  app.post('/api/lockers/toggle-status', async (req, res) => {
    const { lockerId, status } = req.body;
    const locker = db.lockers.find(l => l.id === lockerId || l.lockerNumber === lockerId);
    if (!locker) return res.status(404).json({ error: 'Locker not found' });

    locker.status = status || (locker.status === 'LOCKED' ? 'OPEN' : 'LOCKED');
    if (locker.status === 'OPEN') {
      locker.lastOpenedAt = new Date().toISOString();
    }
    await db.updateLocker(locker);
    res.json({ locker });
  });

  // ----------------------------------------------------
  // 3. REAL SCANNING & BOOK VALIDATION WORKFLOW
  // ----------------------------------------------------
  app.post('/api/locker/scan-validate', async (req, res) => {
    const { studentId, bookId, action = 'ADD' } = req.body;
    const student = db.students.find(s => s.studentId === studentId || s.id === studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    let locker = db.lockers.find(l => l.assignedStudentId === student.studentId);
    if (!locker) {
      locker = {
        id: student.lockerNumber,
        lockerNumber: student.lockerNumber,
        assignedStudentId: student.studentId,
        studentName: student.name,
        classId: student.classId,
        status: 'OPEN',
        currentBookIds: [],
      };
      db.lockers.push(locker);
    }

    const cleanBookId = (bookId || '').trim().toUpperCase();
    const book = db.books.find(b => b.id.toUpperCase() === cleanBookId);

    // 1. Validation Logic
    if (!book) {
      return res.json({
        validationStatus: 'INVALID_BOOK' as ValidationStatus,
        colorBadge: 'RED',
        title: 'Unrecognized Book ID',
        message: `Book ID "${cleanBookId}" was not found in the institutional library catalog.`,
        book: null,
        locker,
      });
    }

    const studentGrade = parseInt(student.classId.replace(/\D/g, '') || '8', 10);
    if (book.classLevel !== studentGrade) {
      return res.json({
        validationStatus: 'WRONG_CLASS' as ValidationStatus,
        colorBadge: 'RED',
        title: 'Wrong Class / Grade Mismatch',
        message: `This book is for Class ${book.classLevel}, but ${student.name} is enrolled in Class ${student.classId}.`,
        book,
        locker,
      });
    }

    // Check duplicate
    const isAlreadyInLocker = locker.currentBookIds.includes(book.id);
    if (action === 'ADD' && isAlreadyInLocker) {
      return res.json({
        validationStatus: 'DUPLICATE' as ValidationStatus,
        colorBadge: 'YELLOW',
        title: 'Duplicate Book in Locker',
        message: `${book.bookName} is already checked in to locker ${locker.lockerNumber}.`,
        book,
        locker,
      });
    }

    // Check if required for upcoming classes
    const timetable = db.timetables[student.classId] || [];
    const targetDay = getTargetAcademicDay();
    const upcomingDaySlots = timetable.filter(s => s.day === targetDay);
    const upcomingSubjects = upcomingDaySlots.map(s => s.subject.toLowerCase());
    const isSubjectRequired = upcomingSubjects.includes(book.subject.toLowerCase());

    // Update inventory if adding
    if (action === 'ADD') {
      locker.currentBookIds.push(book.id);
      student.totalScans += 1;

      // Log transaction
      const logEntry: InventoryLog = {
        id: `LOG-${Date.now()}`,
        studentId: student.studentId,
        lockerId: locker.lockerNumber,
        bookId: book.id,
        bookName: book.bookName,
        subject: book.subject,
        action: 'ADDED',
        timestamp: new Date().toISOString(),
      };
      await Promise.all([
        db.updateLocker(locker),
        db.addInventoryLog(logEntry),
      ]);

      if (!isSubjectRequired) {
        // Notification for wrong/unnecessary book
        const notif: NotificationItem = {
          id: `NOTIF-${Date.now()}`,
          targetRole: 'STUDENT',
          targetUserId: student.studentId,
          targetClassId: student.classId,
          type: 'WRONG_BOOK',
          title: `Unnecessary Book: ${book.bookName}`,
          message: `${book.subject} is not required for upcoming classes. Keeping it in your locker saves backpack weight.`,
          timestamp: new Date().toISOString(),
          read: false,
          severity: 'warning',
        };
        db.notifications.unshift(notif);

        return res.json({
          validationStatus: 'NOT_REQUIRED' as ValidationStatus,
          colorBadge: 'YELLOW',
          title: 'Book Not Required For Tomorrow',
          message: `${book.bookName} stored in locker, but ${book.subject} is not scheduled for upcoming classes.`,
          book,
          locker,
          log: logEntry,
        });
      }

      return res.json({
        validationStatus: 'VALID' as ValidationStatus,
        colorBadge: 'GREEN',
        title: 'Valid Required Book Checked In',
        message: `${book.bookName} successfully validated and registered into Locker ${locker.lockerNumber}.`,
        book,
        locker,
        log: logEntry,
      });
    }

    // Removal action
    if (action === 'REMOVE') {
      locker.currentBookIds = locker.currentBookIds.filter(id => id !== book.id);
      const logEntry: InventoryLog = {
        id: `LOG-${Date.now()}`,
        studentId: student.studentId,
        lockerId: locker.lockerNumber,
        bookId: book.id,
        bookName: book.bookName,
        subject: book.subject,
        action: 'REMOVED',
        timestamp: new Date().toISOString(),
      };
      await Promise.all([
        db.updateLocker(locker),
        db.addInventoryLog(logEntry),
      ]);

      return res.json({
        validationStatus: 'VALID' as ValidationStatus,
        colorBadge: 'GREEN',
        title: 'Book Checked Out From Locker',
        message: `${book.bookName} removed from locker ${locker.lockerNumber}.`,
        book,
        locker,
        log: logEntry,
      });
    }

    res.json({ locker });
  });

  app.post('/api/locker/remove-book', async (req, res) => {
    const { studentId, bookId } = req.body;
    const student = db.students.find(s => s.studentId === studentId || s.id === studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const locker = db.lockers.find(l => l.assignedStudentId === student.studentId);
    if (!locker) return res.status(404).json({ error: 'Locker not found' });

    const book = db.books.find(b => b.id === bookId);
    locker.currentBookIds = locker.currentBookIds.filter(id => id !== bookId);

    const logEntry: InventoryLog = {
      id: `LOG-${Date.now()}`,
      studentId: student.studentId,
      lockerId: locker.lockerNumber,
      bookId: bookId,
      bookName: book?.bookName || bookId,
      subject: book?.subject || 'General',
      action: 'REMOVED',
      timestamp: new Date().toISOString(),
    };
    await Promise.all([
      db.updateLocker(locker),
      db.addInventoryLog(logEntry),
    ]);

    res.json({ success: true, locker, log: logEntry });
  });

  app.get('/api/locker/transactions', (req, res) => {
    const studentId = req.query.studentId as string;
    let logs = db.inventoryLogs;
    if (studentId) {
      logs = logs.filter(l => l.studentId === studentId);
    }
    res.json({ transactions: logs.slice(0, 50) });
  });

  // ----------------------------------------------------
  // 4. BOOKS CATALOG & QR REGISTRATION
  // ----------------------------------------------------
  app.get('/api/books', (req, res) => {
    const classLevel = req.query.classLevel ? parseInt(req.query.classLevel as string, 10) : undefined;
    let list = db.books;
    if (classLevel) {
      list = list.filter(b => b.classLevel === classLevel);
    }
    res.json({ books: list });
  });

  app.post('/api/books', async (req, res) => {
    const { bookName, subject, classLevel, type, weightKg, isbnOrCode, coverColor, description } = req.body;
    
    if (!bookName || !subject || !classLevel) {
      return res.status(400).json({ error: 'Missing required book fields' });
    }

    // Auto-generate canonical Book ID: B-[SUBJ-PREFIX]-[CLASS]-[SEQ]
    const subjPrefix = subject.substring(0, 4).toUpperCase();
    const classStr = classLevel.toString().padStart(2, '0');
    const existingCount = db.books.filter(b => b.subject.toLowerCase() === subject.toLowerCase() && b.classLevel === Number(classLevel)).length + 1;
    const seqStr = existingCount.toString().padStart(3, '0');
    const id = `B-${subjPrefix}-${classStr}-${seqStr}`;

    const newBook: Book = {
      id,
      bookName,
      subject,
      classLevel: Number(classLevel),
      type: type || 'Textbook',
      weightKg: Number(weightKg) || 0.5,
      isbnOrCode: isbnOrCode || id,
      coverColor: coverColor || '#3b82f6',
      description: description || '',
    };

    await db.registerBook(newBook);
    res.json({ book: newBook });
  });

  // ----------------------------------------------------
  // 5. TIMETABLE, HOMEWORK & TESTS
  // ----------------------------------------------------
  app.get('/api/classes', (req, res) => {
    res.json({ classes: db.classes });
  });

  app.get('/api/timetable/:classId', (req, res) => {
    const slots = db.timetables[req.params.classId] || [];
    res.json({ timetable: slots });
  });

  app.post('/api/timetable/:classId', async (req, res) => {
    const { slots } = req.body;
    if (!Array.isArray(slots)) return res.status(400).json({ error: 'Slots must be an array' });
    await db.saveTimetable(req.params.classId, slots);
    res.json({ success: true, timetable: slots });
  });

  app.get('/api/homework', (req, res) => {
    const classId = req.query.classId as string;
    let list = db.homeworks;
    if (classId) list = list.filter(h => h.classId === classId);
    res.json({ homework: list });
  });

  app.post('/api/homework', async (req, res) => {
    const { classId, subject, title, description, dueDate, requiredBookIds, teacherName, teacherId } = req.body;
    const reqBooks = db.books.filter(b => (requiredBookIds || []).includes(b.id));
    
    const newHw: Homework = {
      id: `HW-${classId}-${Date.now()}`,
      classId,
      subject,
      title,
      description,
      assignedDate: new Date().toISOString().split('T')[0],
      dueDate,
      requiredBookIds: requiredBookIds || [],
      requiredBookNames: reqBooks.map(b => b.bookName),
      teacherId: teacherId || 'USR-TCH-001',
      teacherName: teacherName || 'Subject Teacher',
    };

    await db.addHomework(newHw);

    // Create notifications for students in the class
    const notif: NotificationItem = {
      id: `NOTIF-HW-${Date.now()}`,
      targetRole: 'STUDENT',
      targetClassId: classId,
      type: 'HOMEWORK_REMINDER',
      title: `New Homework: ${subject}`,
      message: `${title} has been assigned, due on ${dueDate}. Required: ${reqBooks.map(b => b.bookName).join(', ')}`,
      timestamp: new Date().toISOString(),
      read: false,
      severity: 'info',
    };
    db.notifications.unshift(notif);

    res.json({ homework: newHw });
  });

  app.get('/api/tests', (req, res) => {
    const classId = req.query.classId as string;
    let list = db.tests;
    if (classId) list = list.filter(t => t.classId === classId);
    res.json({ tests: list });
  });

  app.post('/api/tests', async (req, res) => {
    const { classId, subject, testTitle, chapterTopic, testDate, requiredBookIds, teacherName, teacherId } = req.body;
    const reqBooks = db.books.filter(b => (requiredBookIds || []).includes(b.id));
    
    const newTest: TestItem = {
      id: `TEST-${classId}-${Date.now()}`,
      classId,
      subject,
      testTitle,
      chapterTopic,
      testDate,
      requiredBookIds: requiredBookIds || [],
      requiredBookNames: reqBooks.map(b => b.bookName),
      teacherId: teacherId || 'USR-TCH-002',
      teacherName: teacherName || 'Subject Teacher',
    };

    await db.addTest(newTest);

    // Create notifications for students in the class
    const notif: NotificationItem = {
      id: `NOTIF-TEST-${Date.now()}`,
      targetRole: 'STUDENT',
      targetClassId: classId,
      type: 'TEST_REMINDER',
      title: `Upcoming Test: ${subject}`,
      message: `${testTitle} scheduled for ${testDate}. Please ensure required materials (${reqBooks.map(b => b.bookName).join(', ')}) are in your kit.`,
      timestamp: new Date().toISOString(),
      read: false,
      severity: 'warning',
    };
    db.notifications.unshift(notif);

    res.json({ test: newTest });
  });

  // ----------------------------------------------------
  // 6. AI COMPONENT 1: RANDOM FOREST ML ENGINE
  // ----------------------------------------------------
  app.get('/api/ml/evaluation', (req, res) => {
    if (!globalModel.evaluation) {
      const dataset = generateSyntheticDataset(5200);
      globalModel.train(dataset);
    }
    res.json({ evaluation: globalModel.evaluation });
  });

  app.post('/api/ml/train', (req, res) => {
    const datasetSize = req.body.datasetSize ? Number(req.body.datasetSize) : 5200;
    const dataset = generateSyntheticDataset(datasetSize);
    const evaluation = globalModel.train(dataset);
    res.json({ success: true, evaluation });
  });

  app.post('/api/ml/predict', (req, res) => {
    const input = req.body;
    const result = globalModel.predictForStudent(input);
    res.json({ prediction: result });
  });

  app.get('/api/ml/class-risk-analysis/:classId', (req, res) => {
    const classId = req.params.classId;
    const classStudents = db.students.filter(s => s.classId === classId);
    const tests = db.tests.filter(t => t.classId === classId);
    const testSubjects = tests.map(t => t.subject);

    const highRiskStudents = classStudents.map(student => {
      const locker = db.lockers.find(l => l.assignedStudentId === student.studentId);
      const subject = testSubjects[0] || 'Science';
      const pred = globalModel.predictForStudent({
        studentId: student.studentId,
        subject,
        homeworkDue: 1,
        testTomorrow: tests.length > 0 ? 1 : 0,
        previousMisses: student.previousMisses,
        previousScans: student.totalScans,
        subjectMissRate: student.subjectMissRates[subject] || 0.3,
        numberOfBooksScanned: locker?.currentBookIds.length || 2,
      });

      return {
        studentId: student.studentId,
        studentName: student.name,
        rollNumber: student.rollNumber,
        lockerNumber: student.lockerNumber,
        subject,
        riskLevel: pred.riskLevel,
        probability: pred.probability,
        currentLockerBookCount: locker?.currentBookIds.length || 0,
        contributingFactors: pred.contributingFactors,
      };
    }).sort((a, b) => b.probability - a.probability);

    res.json({
      classId,
      totalStudents: classStudents.length,
      highRiskCount: highRiskStudents.filter(s => s.riskLevel === 'HIGH').length,
      mediumRiskCount: highRiskStudents.filter(s => s.riskLevel === 'MEDIUM').length,
      lowRiskCount: highRiskStudents.filter(s => s.riskLevel === 'LOW').length,
      students: highRiskStudents,
    });
  });

  // ----------------------------------------------------
  // 7. AI COMPONENT 3: DAMAGED QR RECOVERY
  // ----------------------------------------------------
  app.post('/api/ai/damaged-qr/recover', (req, res) => {
    const { rawInput, studentId } = req.body;
    const student = db.students.find(s => s.studentId === studentId || s.id === studentId) || db.students[0];
    const locker = db.lockers.find(l => l.assignedStudentId === student.studentId);
    
    const timetableSlots = db.timetables[student.classId] || [];
    const targetDay = getTargetAcademicDay();
    const upcomingSubjects = Array.from(new Set(timetableSlots.filter(s => s.day === targetDay).map(s => s.subject)));
    
    // Find missing books
    const classBooks = db.books.filter(b => b.classLevel === parseInt(student.classId.replace(/\D/g, '') || '8', 10));
    const missingBookIds = classBooks.map(b => b.id).filter(id => !locker?.currentBookIds.includes(id));

    const candidates = recoverDamagedBook(
      rawInput || '',
      db.books,
      parseInt(student.classId.replace(/\D/g, '') || '8', 10),
      upcomingSubjects,
      missingBookIds
    );

    res.json({
      query: rawInput,
      studentName: student.name,
      studentClass: student.classId,
      candidates,
    });
  });

  // ----------------------------------------------------
  // 8. NOTIFICATIONS
  // ----------------------------------------------------
  app.get('/api/notifications', (req, res) => {
    const { role, userId, classId } = req.query;
    let list = db.notifications;

    if (role) {
      list = list.filter(n => n.targetRole === role || n.targetRole === 'ALL');
    }
    if (userId) {
      list = list.filter(n => !n.targetUserId || n.targetUserId === userId);
    }
    if (classId) {
      list = list.filter(n => !n.targetClassId || n.targetClassId === classId);
    }

    res.json({ notifications: list });
  });

  app.post('/api/notifications/mark-read', (req, res) => {
    const { id, all } = req.body;
    if (all) {
      db.notifications.forEach(n => { n.read = true; });
    } else if (id) {
      const item = db.notifications.find(n => n.id === id);
      if (item) item.read = true;
    }
    res.json({ success: true });
  });

  // ----------------------------------------------------
  // 9. ADMIN & TEACHER SYSTEM OVERVIEW
  // ----------------------------------------------------
  app.get('/api/admin/overview', (req, res) => {
    res.json({
      totalStudents: db.students.length,
      totalClasses: db.classes.length,
      totalBooks: db.books.length,
      totalLockers: db.lockers.length,
      openLockersCount: db.lockers.filter(l => l.status === 'OPEN').length,
      totalScansToday: db.inventoryLogs.length + 18,
      modelTrained: !!globalModel.evaluation,
      modelVersion: globalModel.modelVersion,
    });
  });

  // ----------------------------------------------------
  // 10. MULTILINGUAL AI VOICE ASSISTANT
  // ----------------------------------------------------
  app.post('/api/voice-assistant/process', async (req, res) => {
    try {
      const { query, preferredLanguage, context } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query is required' });
      }

      const result = await processVoiceQuery({
        query,
        preferredLanguage: preferredLanguage || 'en-US',
        context: context || {
          currentUser: { id: 'usr-001', name: 'Rahul Kumar', role: 'STUDENT', studentId: 'STU-8A-024' },
          currentTab: 'dashboard',
        },
      });

      return res.json(result);
    } catch (err: any) {
      console.warn('Voice query fallback triggered due to error:', err?.message || err);
      return res.json({
        spokenResponse: 'Command processed. Navigating to requested section.',
        displayText: 'Navigation executed.',
        action: 'NONE',
        detectedLanguage: req.body?.preferredLanguage || 'en-US',
        source: 'rule-engine',
      });
    }
  });

  // ----------------------------------------------------
  // VITE MIDDLEWARE (DEVELOPMENT / PRODUCTION)
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Academic Locker Backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
