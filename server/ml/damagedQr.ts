import { Book, DamagedQRCandidate } from '../../src/types';

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1).toLowerCase() === a.charAt(j - 1).toLowerCase()) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function recoverDamagedBook(
  rawInput: string,
  allBooks: Book[],
  studentClassLevel: number,
  upcomingSubjects: string[] = [],
  missingBookIds: string[] = []
): DamagedQRCandidate[] {
  const query = rawInput.trim().toUpperCase();
  const candidates: DamagedQRCandidate[] = [];

  for (const book of allBooks) {
    let score = 0;
    const reasons: string[] = [];

    const bookIdUpper = book.id.toUpperCase();
    const bookNameUpper = book.bookName.toUpperCase();
    const subjectUpper = book.subject.toUpperCase();

    // 1. Exact or Substring ID Match
    if (query && bookIdUpper.includes(query)) {
      score += 55;
      reasons.push(`Partial Book ID fragment matched '${query}'`);
    } else if (query.length >= 3) {
      // Fuzzy ID match
      const dist = levenshteinDistance(query, bookIdUpper);
      const similarity = 1 - dist / Math.max(query.length, bookIdUpper.length);
      if (similarity > 0.45) {
        score += similarity * 40;
        reasons.push(`Fuzzy ID code pattern match (${Math.round(similarity * 100)}% similarity)`);
      }
    }

    // 2. Title & Subject Keyword Match
    const tokens = query.split(/[\s\-_:,.]+/).filter(t => t.length >= 2);
    for (const token of tokens) {
      if (bookNameUpper.includes(token)) {
        score += 25;
        reasons.push(`Matched book title keyword '${token}'`);
      } else if (subjectUpper.includes(token)) {
        score += 20;
        reasons.push(`Matched subject '${book.subject}'`);
      }
    }

    // 3. Class Level Context
    if (book.classLevel === studentClassLevel) {
      score += 15;
      reasons.push(`Matches student's enrolled grade (Class ${studentClassLevel})`);
    } else {
      score -= 25; // Penalize mismatching class
    }

    // 4. Timetable & Schedule Context
    if (upcomingSubjects.map(s => s.toUpperCase()).includes(subjectUpper)) {
      score += 18;
      reasons.push(`Required for upcoming class schedule (${book.subject})`);
    }

    // 5. Currently Missing Material Context
    if (missingBookIds.includes(book.id)) {
      score += 15;
      reasons.push(`Currently missing from student's locker kit`);
    }

    // Normalize confidence between 5% and 98%
    let confidence = Math.min(98, Math.max(5, Math.round(score)));
    if (reasons.length === 0) {
      confidence = Math.min(25, confidence);
    }

    if (confidence >= 15 || reasons.length > 0) {
      candidates.push({
        book,
        confidenceScore: confidence,
        matchReasons: Array.from(new Set(reasons)),
      });
    }
  }

  // Sort descending by confidence score
  candidates.sort((a, b) => b.confidenceScore - a.confidenceScore);
  return candidates.slice(0, 5);
}
