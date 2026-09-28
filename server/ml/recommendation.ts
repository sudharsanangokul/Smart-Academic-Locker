import { AcademicKitItem, AcademicKitSummary, Book, Homework, Locker, Student, TestItem, TimetableSlot } from '../../src/types';
import { globalModel } from './randomForest';

export function buildAcademicKit(
  student: Student,
  locker: Locker,
  timetableSlots: TimetableSlot[],
  homeworkList: Homework[],
  testsList: TestItem[],
  allBooks: Book[],
  dayName: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' = 'Monday'
): AcademicKitSummary {
  // 1. Get subjects scheduled for the day
  const daySlots = timetableSlots.filter(s => s.day === dayName);
  const scheduledSubjects = Array.from(new Set(daySlots.map(s => s.subject)));

  // 2. Identify required books for the day based on:
  // - Timetable subjects (each scheduled subject requires its main textbook & notebook)
  // - Homework due tomorrow
  // - Tests scheduled tomorrow
  const requiredBookMap = new Map<string, { book: Book; reasons: string[]; isTest: boolean; isHw: boolean }>();

  // A. Add books corresponding to timetable
  for (const subject of scheduledSubjects) {
    const matchingBooks = allBooks.filter(b => b.classLevel === parseInt(student.classId.replace(/\D/g, '') || '8', 10) && b.subject.toLowerCase() === subject.toLowerCase());
    
    for (const book of matchingBooks) {
      if (!requiredBookMap.has(book.id)) {
        requiredBookMap.set(book.id, {
          book,
          reasons: [`Scheduled in timetable (${dayName} ${daySlots.find(s => s.subject === subject)?.timeSlot || ''})`],
          isTest: false,
          isHw: false,
        });
      }
    }
  }

  // B. Add books required for Homework
  for (const hw of homeworkList) {
    for (const bId of hw.requiredBookIds) {
      const book = allBooks.find(b => b.id === bId);
      if (book) {
        const existing = requiredBookMap.get(book.id);
        if (existing) {
          existing.reasons.push(`Homework due: "${hw.title}"`);
          existing.isHw = true;
        } else {
          requiredBookMap.set(book.id, {
            book,
            reasons: [`Homework due: "${hw.title}"`],
            isTest: false,
            isHw: true,
          });
        }
      }
    }
  }

  // C. Add books required for Tests
  for (const test of testsList) {
    for (const bId of test.requiredBookIds) {
      const book = allBooks.find(b => b.id === bId);
      if (book) {
        const existing = requiredBookMap.get(book.id);
        if (existing) {
          existing.reasons.push(`Upcoming Examination: "${test.testTitle}" (${test.chapterTopic})`);
          existing.isTest = true;
        } else {
          requiredBookMap.set(book.id, {
            book,
            reasons: [`Upcoming Examination: "${test.testTitle}" (${test.chapterTopic})`],
            isTest: true,
            isHw: false,
          });
        }
      }
    }
  }

  // 3. For each required book, check if it's present in student's locker inventory
  // and run the ML forgetting prediction
  const requiredItems: AcademicKitItem[] = [];
  let totalRequiredWeight = 0;
  const currentLockerBooks = locker.currentBookIds;

  for (const [bookId, entry] of requiredBookMap.entries()) {
    const { book, reasons, isTest, isHw } = entry;
    const isPresent = currentLockerBooks.includes(bookId);
    totalRequiredWeight += book.weightKg;

    // Run ML Model prediction for this student + subject + conditions
    const mlPrediction = globalModel.predictForStudent({
      studentId: student.studentId,
      subject: book.subject,
      homeworkDue: isHw ? 1 : 0,
      testTomorrow: isTest ? 1 : 0,
      previousMisses: student.previousMisses,
      previousScans: student.totalScans,
      subjectMissRate: student.subjectMissRates[book.subject] || 0.25,
      classLevel: book.classLevel,
      materialType: book.type === 'Textbook' ? 0 : 1,
      estimatedMaterialWeight: book.weightKg,
      numberOfRequiredBooks: requiredBookMap.size,
      numberOfBooksScanned: currentLockerBooks.length,
    });

    let status: AcademicKitItem['status'] = 'VALID_PRESENT';
    if (!isPresent) {
      status = 'MISSING_REQUIRED';
    }
    if (mlPrediction.riskLevel === 'HIGH') {
      status = 'HIGH_RISK_WARNING';
    }

    let detailedReason = reasons.join('; ');
    if (mlPrediction.riskLevel === 'HIGH') {
      detailedReason += ` | ⚠️ ML Model Warning: ${Math.round(mlPrediction.probability * 100)}% risk of forgetting!`;
    }

    requiredItems.push({
      bookId: book.id,
      bookName: book.bookName,
      subject: book.subject,
      type: book.type,
      weightKg: book.weightKg,
      isPresentInLocker: isPresent,
      status,
      reason: detailedReason,
      mlForgettingProbability: mlPrediction.probability,
      mlRiskLevel: mlPrediction.riskLevel,
    });
  }

  // 4. Identify unnecessary items currently sitting in locker (not required for tomorrow)
  const unnecessaryItems: { bookId: string; bookName: string; subject: string; weightKg: number }[] = [];
  let unnecessaryWeight = 0;

  for (const bId of currentLockerBooks) {
    if (!requiredBookMap.has(bId)) {
      const book = allBooks.find(b => b.id === bId);
      if (book) {
        unnecessaryItems.push({
          bookId: book.id,
          bookName: book.bookName,
          subject: book.subject,
          weightKg: book.weightKg,
        });
        unnecessaryWeight += book.weightKg;
      }
    }
  }

  // 5. Weight saving recommendation
  let weightSavingRecommendation = 'Your bag load is optimal for upcoming classes.';
  if (unnecessaryItems.length > 0) {
    const bookNames = unnecessaryItems.map(i => i.bookName).slice(0, 2).join(', ');
    const extraCount = unnecessaryItems.length > 2 ? ` and ${unnecessaryItems.length - 2} more` : '';
    weightSavingRecommendation = `${bookNames}${extraCount} are not required for upcoming classes. Keeping them in the school locker saves ${Math.round(unnecessaryWeight * 1000)}g of backpack weight!`;
  }

  const presentCount = requiredItems.filter(i => i.isPresentInLocker).length;
  const overallComplianceScore = requiredItems.length > 0 ? Math.round((presentCount / requiredItems.length) * 100) : 100;

  return {
    date: new Date().toISOString().split('T')[0],
    dayName,
    targetSubjects: scheduledSubjects,
    requiredItems,
    unnecessaryItemsInLocker: unnecessaryItems,
    totalRequiredWeightKg: Number(totalRequiredWeight.toFixed(2)),
    unnecessaryWeightKg: Number(unnecessaryWeight.toFixed(2)),
    weightSavingRecommendation,
    overallComplianceScore,
  };
}
