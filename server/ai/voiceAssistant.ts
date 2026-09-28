import { GoogleGenAI, Type } from '@google/genai';
import { db } from '../db/store';
import { buildAcademicKit } from '../ml/recommendation';

export interface VoiceAssistantRequest {
  query: string;
  preferredLanguage?: string;
  context: {
    currentUser: {
      id: string;
      name: string;
      role: 'STUDENT' | 'TEACHER' | 'ADMIN';
      studentId?: string;
    };
    currentTab?: string;
    studentId?: string;
    day?: string;
  };
}

export interface VoiceAssistantResponse {
  spokenResponse: string;
  displayText: string;
  action: 'NONE' | 'SWITCH_ROLE' | 'SWITCH_TAB' | 'OPEN_SCANNER' | 'TOGGLE_LOCKER' | 'SET_STUDENT' | 'OPEN_RECOVERY' | 'CHECK_BAG_WEIGHT' | 'REFRESH_DATA';
  actionPayload?: {
    role?: 'STUDENT' | 'TEACHER' | 'ADMIN';
    tab?: string;
    studentId?: string;
    lockerStatus?: 'OPEN' | 'LOCKED';
  };
  detectedLanguage: string;
  source: 'gemini' | 'rule-engine';
}

let aiInstance: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  if (!aiInstance && process.env.GEMINI_API_KEY) {
    try {
      aiInstance = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch (e) {
      console.warn('Failed to initialize Gemini AI Client:', e);
      return null;
    }
  }
  return aiInstance;
}

export async function processVoiceQuery(req: VoiceAssistantRequest): Promise<VoiceAssistantResponse> {
  const { query, preferredLanguage = 'en-US', context } = req;
  const user = context.currentUser;
  
  // Resolve active student
  const studentId = context.studentId || user.studentId || 'STU-8A-024';
  const student = db.students.find(s => s.studentId === studentId || s.id === studentId) || db.students[0];
  const locker = db.lockers.find(l => l.assignedStudentId === student.studentId) || {
    id: student.lockerNumber,
    lockerNumber: student.lockerNumber,
    status: 'LOCKED',
    assignedStudentId: student.studentId,
    currentBookIds: ['B-ENG-08-001', 'B-HIN-08-001', 'B-SOC-08-001'],
    capacityKg: 10,
    lastScannedAt: new Date().toISOString(),
  };

  const validDays: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday')[] = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];
  const dayName = validDays.includes(context.day as any) ? (context.day as any) : 'Monday';

  const timetableSlots = db.timetables[student.classId] || [];
  const homeworkList = db.homeworks.filter(h => h.classId === student.classId);
  const testsList = db.tests.filter(t => t.classId === student.classId);
  const kit = buildAcademicKit(student, locker as any, timetableSlots, homeworkList, testsList, db.books, dayName);

  const missingItems = kit.requiredItems.filter(i => !i.isPresentInLocker);
  const presentItems = kit.requiredItems.filter(i => i.isPresentInLocker);

  const systemContext = {
    activeUser: {
      name: user.name,
      role: user.role,
      studentId: user.studentId,
    },
    currentStudent: {
      name: student.name,
      studentId: student.studentId,
      classId: student.classId,
      lockerNumber: student.lockerNumber,
      lockerStatus: locker.status,
    },
    academicKit: {
      totalRequiredBooksCount: kit.requiredItems.length,
      booksInLockerCount: presentItems.length,
      missingBooksCount: missingItems.length,
      missingBookNames: missingItems.map(i => `${i.bookName} (${i.subject})`),
      packedInLockerBookNames: presentItems.map(i => `${i.bookName} (${i.subject})`),
      totalRequiredWeightKg: kit.totalRequiredWeightKg,
      unnecessaryWeightInLockerKg: kit.unnecessaryWeightKg,
      overallComplianceScore: kit.overallComplianceScore,
      weightSavingRecommendation: kit.weightSavingRecommendation,
    },
    tomorrowSchedule: timetableSlots.filter(s => s.day === dayName).map(s => `${s.timeSlot}: ${s.subject} (${s.room})`),
    pendingHomework: homeworkList.map(h => `${h.subject}: ${h.title} (Due: ${h.dueDate})`),
    upcomingTests: testsList.map(t => `${t.subject} (${t.testTitle}) on ${t.testDate}, Topic: ${t.chapterTopic}`),
    availableStudents: db.students.map(s => ({ name: s.name, id: s.studentId, class: s.classId })),
    currentTab: context.currentTab || 'dashboard',
  };

  // ⚡ STEP 1: FAST-PATH RULE ENGINE (< 2ms)
  const fastResult = ruleBasedFallback(query, preferredLanguage, systemContext);
  if (fastResult.action !== 'NONE') {
    return fastResult;
  }

  const ai = getAIClient();

  if (ai) {
    const prompt = `You are the friendly, intelligent, and multilingual voice assistant for the 'Smart Academic Locker & Student Management System' at Green Valley Public School.
The user just spoke the following query: "${query}".
The user's preferred speech language is "${preferredLanguage}".

Live Application Context:
${JSON.stringify(systemContext, null, 2)}

Instructions:
1. Understand the user's intent naturally (they can speak in ANY language: English, Hindi, Tamil, Telugu, Spanish, French, German, Hinglish, etc.).
2. You MUST reply in the SAME language the user spoke or preferred. Keep the 'spokenResponse' conversational, concise, and pleasant for speech synthesis (1-3 clear sentences).
3. Set the appropriate UI navigation 'action' and 'actionPayload' if their query implies moving to a section or performing an action:
   - If they ask about bag weight / safe weight / locker savings -> action: "SWITCH_TAB", actionPayload: { "tab": "ai-kit" }
   - If they ask what books to bring, what is missing, or what to pack -> action: "SWITCH_TAB", actionPayload: { "tab": "ai-kit" }
   - If they ask about schedule / timetable / periods -> action: "SWITCH_TAB", actionPayload: { "tab": "timetable" }
   - If they ask about homework / assignments -> action: "SWITCH_TAB", actionPayload: { "tab": "homework" }
   - If they ask about tests / exams -> action: "SWITCH_TAB", actionPayload: { "tab": "tests" }
   - If they ask to scan books / open camera / barcode -> action: "OPEN_SCANNER"
   - If they ask to open/unlock/lock their locker -> action: "TOGGLE_LOCKER", actionPayload: { "lockerStatus": "OPEN" }
   - If they ask to recover damaged QR -> action: "OPEN_RECOVERY"
   - If they ask to switch role to Teacher, Admin, or Student -> action: "SWITCH_ROLE", actionPayload: { "role": "TEACHER" / "ADMIN" / "STUDENT" }
   - If they ask to view another student (e.g. Priya, Rahul) -> action: "SET_STUDENT", actionPayload: { "studentId": "..." }
   - Otherwise -> action: "NONE"

Output strictly in JSON format matching the schema.`;

    const candidateModels = ['gemini-2.5-flash', 'gemini-3.7-flash'];

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                spokenResponse: {
                  type: Type.STRING,
                  description: 'Concise speech output in the spoken language for TTS',
                },
                displayText: {
                  type: Type.STRING,
                  description: 'Formatted markdown response for the visual chat bubble',
                },
                action: {
                  type: Type.STRING,
                  enum: [
                    'NONE',
                    'SWITCH_ROLE',
                    'SWITCH_TAB',
                    'OPEN_SCANNER',
                    'TOGGLE_LOCKER',
                    'SET_STUDENT',
                    'OPEN_RECOVERY',
                    'CHECK_BAG_WEIGHT',
                    'REFRESH_DATA',
                  ],
                },
                actionPayload: {
                  type: Type.OBJECT,
                  properties: {
                    role: { type: Type.STRING },
                    tab: { type: Type.STRING },
                    studentId: { type: Type.STRING },
                    lockerStatus: { type: Type.STRING },
                  },
                },
                detectedLanguage: { type: Type.STRING },
              },
              required: ['spokenResponse', 'displayText', 'action'],
            },
          },
        });

        const text = response.text?.trim() || '{}';
        const parsed = JSON.parse(text);
        return {
          spokenResponse: parsed.spokenResponse || 'Here is the information from your Smart Academic Locker.',
          displayText: parsed.displayText || parsed.spokenResponse || '',
          action: parsed.action || 'NONE',
          actionPayload: parsed.actionPayload,
          detectedLanguage: parsed.detectedLanguage || preferredLanguage,
          source: 'gemini',
        };
      } catch (geminiError: any) {
        // If high demand 503 or transient error, try next candidate model or fallback gracefully
        const isTransient = geminiError?.message?.includes('503') ||
                            geminiError?.status === 'UNAVAILABLE' ||
                            geminiError?.message?.includes('high demand');
        if (isTransient) {
          // Continue to next model or gracefully fallback
          continue;
        } else {
          break;
        }
      }
    }
  }

  // Multilingual Rule-Engine Fallback (Works completely offline or when API is busy)
  return ruleBasedFallback(query, preferredLanguage, systemContext);
}

function ruleBasedFallback(query: string, preferredLang: string, ctx: any): VoiceAssistantResponse {
  const q = query.toLowerCase().trim();

  // 1. Scanner Intent
  if (
    q.includes('scan') ||
    q.includes('camera') ||
    q.includes('qr') ||
    q.includes('barcode') ||
    q.includes('स्कैन') ||
    q.includes('கேமரா') ||
    q.includes('స్కానర్')
  ) {
    let spoken = 'Opening the live camera scanner for book check-in and check-out.';
    if (preferredLang.startsWith('hi')) spoken = 'लाइव कैमरा स्कैनर खोला जा रहा है। आप अपनी किताब का क्यूआर कोड स्कैन कर सकते हैं।';
    else if (preferredLang.startsWith('ta')) spoken = 'புத்தகங்களை ஸ்கேன் செய்ய நேரடி கேமரா ஸ்கேனர் திறக்கப்படுகிறது.';
    else if (preferredLang.startsWith('te')) spoken = 'లైవ్ కెమెరా స్కానర్ ఓపెన్ చేయబడుతోంది.';
    else if (preferredLang.startsWith('es')) spoken = 'Abriendo el escáner de cámara para registrar libros.';

    return {
      spokenResponse: spoken,
      displayText: `📷 **Opening Camera Scanner**\nHold your textbook or notebook QR code in front of the camera.`,
      action: 'OPEN_SCANNER',
      detectedLanguage: preferredLang,
      source: 'rule-engine',
    };
  }

  // 2. Locker Unlock/Lock Intent
  if (
    q.includes('unlock') ||
    q.includes('open locker') ||
    q.includes('lock door') ||
    q.includes('लॉकर खोलो') ||
    q.includes('லாக்கர்') ||
    q.includes('లాకర్')
  ) {
    const isLock = q.includes('lock door') || q.includes('close');
    const targetStatus = isLock ? 'LOCKED' : 'OPEN';
    let spoken = isLock ? 'Locker door is now locked.' : `Locker #${ctx.currentStudent.lockerNumber} has been unlocked.`;
    if (preferredLang.startsWith('hi')) spoken = isLock ? 'लॉकर सुरक्षित रूप से बंद कर दिया गया है।' : `लॉकर नंबर ${ctx.currentStudent.lockerNumber} खोल दिया गया है।`;
    else if (preferredLang.startsWith('ta')) spoken = `லாக்கர் எண் ${ctx.currentStudent.lockerNumber} திறக்கப்பட்டது.`;

    return {
      spokenResponse: spoken,
      displayText: `🔓 **Locker Door ${targetStatus === 'OPEN' ? 'Unlocked' : 'Locked'}**\nSmart locker **#${ctx.currentStudent.lockerNumber}** status updated.`,
      action: 'TOGGLE_LOCKER',
      actionPayload: { lockerStatus: targetStatus },
      detectedLanguage: preferredLang,
      source: 'rule-engine',
    };
  }

  // 3. Bag Weight & Savings Intent
  if (
    q.includes('weight') ||
    q.includes('bag') ||
    q.includes('heavy') ||
    q.includes('saving') ||
    q.includes('बस्ता') ||
    q.includes('वजन') ||
    q.includes('சுமை') ||
    q.includes('బరువు') ||
    q.includes('peso')
  ) {
    const weight = ctx.academicKit.totalRequiredWeightKg || 2.1;
    const saved = ctx.academicKit.unnecessaryWeightInLockerKg || 1.8;
    let spoken = `Your estimated bag weight for tomorrow is ${weight} kilograms. You saved ${saved} kilograms by keeping books in your locker.`;
    if (preferredLang.startsWith('hi')) spoken = `कल आपके बस्ते का अनुमानित वजन ${weight} किलोग्राम होगा। आपने लॉकर में किताबें रखकर ${saved} किलोग्राम वजन कम किया है।`;
    else if (preferredLang.startsWith('ta')) spoken = `நாளை உங்கள் பையின் எடை ${weight} கிலோ. லாக்கரில் புத்தகங்கள் வைத்ததால் ${saved} கிலோ சுமை குறைந்துள்ளது.`;
    else if (preferredLang.startsWith('te')) spoken = `రేపు మీ బ్యాగ్ బరువు ${weight} కిలోలు. లాకర్‌లో పుస్తకాలు ఉంచడం వల్ల ${saved} కిలోల బరువు తగ్గింది.`;
    else if (preferredLang.startsWith('es')) spoken = `El peso estimado de tu mochila para mañana es de ${weight} kg. Ahorraste ${saved} kg en tu casillero.`;

    return {
      spokenResponse: spoken,
      displayText: `🎒 **Bag Weight Analysis**\n- **Estimated Weight:** \`${weight} kg\` (Limit: 3.5 kg)\n- **Weight Saved in Locker:** \`${saved} kg\`\n- **Compliance Score:** ${ctx.academicKit.overallComplianceScore || 85}%`,
      action: 'SWITCH_TAB',
      actionPayload: { tab: 'ai-kit' },
      detectedLanguage: preferredLang,
      source: 'rule-engine',
    };
  }

  // 4. Missing Books / What to pack Intent
  if (
    q.includes('missing') ||
    q.includes('pack') ||
    q.includes('bring') ||
    q.includes('book') ||
    q.includes('kit') ||
    q.includes('किताब') ||
    q.includes('புத்தகம்') ||
    q.includes('పుస్తకాలు') ||
    q.includes('libro')
  ) {
    const missing = ctx.academicKit.missingBookNames;
    let spoken = '';
    if (missing.length === 0) {
      spoken = 'All required books for tomorrow are safely stored in your locker or bag.';
    } else {
      spoken = `You are missing ${missing.length} item: ${missing.join(', ')}. Please make sure to pack them for tomorrow's classes.`;
    }

    if (preferredLang.startsWith('hi')) {
      spoken = missing.length === 0
        ? 'कल के लिए आपकी सभी आवश्यक किताबें तैयार हैं।'
        : `कल के लिए आपकी ${missing.length} किताब छूटी हुई है: ${missing.join(', ')}। कृपया इन्हें साथ ले जाएं।`;
    }

    return {
      spokenResponse: spoken,
      displayText: `📚 **Academic Kit Check**\n- **Total Required:** ${ctx.academicKit.totalRequiredBooksCount}\n- **In Locker:** ${ctx.academicKit.booksInLockerCount}\n- **Missing (${missing.length}):** ${missing.length > 0 ? missing.join(', ') : 'None! All set.'}`,
      action: 'SWITCH_TAB',
      actionPayload: { tab: 'ai-kit' },
      detectedLanguage: preferredLang,
      source: 'rule-engine',
    };
  }

  // 5. Timetable / Schedule Intent
  if (
    q.includes('schedule') ||
    q.includes('timetable') ||
    q.includes('class') ||
    q.includes('period') ||
    q.includes('टाइम टेबल') ||
    q.includes('நேர அட்டவணை') ||
    q.includes('టైమ్‌టేబుల్')
  ) {
    const count = ctx.tomorrowSchedule.length;
    let spoken = `Tomorrow you have ${count} periods. Here is your timetable schedule.`;
    if (preferredLang.startsWith('hi')) spoken = `कल आपकी कक्षा में ${count} पीरियड हैं। आपका टाइम टेबल खोला गया है।`;
    else if (preferredLang.startsWith('ta')) spoken = `நாளை உங்களுக்கு ${count} பாடவேளைகள் உள்ளன.`;

    return {
      spokenResponse: spoken,
      displayText: `📅 **Tomorrow's Schedule (${count} Periods)**\n${ctx.tomorrowSchedule.map((p: string) => `• ${p}`).join('\n')}`,
      action: 'SWITCH_TAB',
      actionPayload: { tab: 'timetable' },
      detectedLanguage: preferredLang,
      source: 'rule-engine',
    };
  }

  // 6. Homework Intent
  if (
    q.includes('homework') ||
    q.includes('assignment') ||
    q.includes('गृहकार्य') ||
    q.includes('வீட்டுப்பாடம்') ||
    q.includes('హోంవర్క్') ||
    q.includes('tarea')
  ) {
    const count = ctx.pendingHomework.length;
    let spoken = count === 0
      ? 'You have no pending homework for tomorrow!'
      : `You have ${count} homework assignment due: ${ctx.pendingHomework.join(', ')}.`;
    if (preferredLang.startsWith('hi')) {
      spoken = count === 0 ? 'कल के लिए कोई गृहकार्य लंबित नहीं है!' : `कल के लिए आपका ${count} गृहकार्य बाकी है।`;
    }

    return {
      spokenResponse: spoken,
      displayText: `📝 **Pending Homework**\n${count > 0 ? ctx.pendingHomework.map((h: string) => `• ${h}`).join('\n') : '🎉 All homework completed!'}`,
      action: 'SWITCH_TAB',
      actionPayload: { tab: 'homework' },
      detectedLanguage: preferredLang,
      source: 'rule-engine',
    };
  }

  // 7. Tests / Exams Intent
  if (
    q.includes('test') ||
    q.includes('exam') ||
    q.includes('quiz') ||
    q.includes('परीक्षा') ||
    q.includes('தேர்வு') ||
    q.includes('పరీక్ష')
  ) {
    const count = ctx.upcomingTests.length;
    let spoken = count === 0
      ? 'No tests are scheduled for tomorrow.'
      : `Upcoming tests: ${ctx.upcomingTests.join('. ')}.`;
    if (preferredLang.startsWith('hi')) {
      spoken = count === 0 ? 'कल कोई परीक्षा नहीं है।' : `आगामी परीक्षा विवरण: ${ctx.upcomingTests.join('. ')}।`;
    }

    return {
      spokenResponse: spoken,
      displayText: `📊 **Upcoming Tests & Quizzes**\n${count > 0 ? ctx.upcomingTests.map((t: string) => `• ${t}`).join('\n') : 'No upcoming tests scheduled.'}`,
      action: 'SWITCH_TAB',
      actionPayload: { tab: 'tests' },
      detectedLanguage: preferredLang,
      source: 'rule-engine',
    };
  }

  // 8. Role Switch Intents
  if (q.includes('teacher') || q.includes('शिक्षक') || q.includes('ஆசிரியர்')) {
    return {
      spokenResponse: 'Switching view to Teacher Portal.',
      displayText: '👨‍🏫 **Switched to Teacher Portal**',
      action: 'SWITCH_ROLE',
      actionPayload: { role: 'TEACHER' },
      detectedLanguage: preferredLang,
      source: 'rule-engine',
    };
  }
  if (q.includes('admin') || q.includes('प्रबंधक') || q.includes('நிர்வாகி')) {
    return {
      spokenResponse: 'Switching view to School Administration Portal.',
      displayText: '🛡️ **Switched to Admin Portal**',
      action: 'SWITCH_ROLE',
      actionPayload: { role: 'ADMIN' },
      detectedLanguage: preferredLang,
      source: 'rule-engine',
    };
  }
  if (q.includes('student') || q.includes('छात्र') || q.includes('மாணவர்')) {
    return {
      spokenResponse: 'Switching view to Student Portal.',
      displayText: '🎓 **Switched to Student Portal**',
      action: 'SWITCH_ROLE',
      actionPayload: { role: 'STUDENT' },
      detectedLanguage: preferredLang,
      source: 'rule-engine',
    };
  }

  // Default General Help
  let spoken = `I can help you check bag weight, find missing books, see tomorrow's timetable, open your locker, or start the camera scanner. What would you like to do?`;
  if (preferredLang.startsWith('hi')) {
    spoken = 'मैं आपके बस्ते का वजन, आवश्यक किताबें, टाइम टेबल, गृहकार्य, या कैमरा स्कैनर खोलने में मदद कर सकता हूँ। आप क्या करना चाहते हैं?';
  } else if (preferredLang.startsWith('ta')) {
    spoken = 'பையின் எடை, புத்தகங்கள், கால அட்டவணை அல்லது கேமரா ஸ்கேனரை திறக்க என்னால் உதவ முடியும். என்ன செய்ய வேண்டும்?';
  }

  return {
    spokenResponse: spoken,
    displayText: `💡 **How I Can Help You:**\n- 🎒 *"What is my bag weight for tomorrow?"*\n- 📚 *"Which books am I missing?"*\n- 📅 *"Show my timetable for tomorrow"*\n- 📷 *"Open camera scanner"*\n- 🔓 *"Unlock my locker"*`,
    action: 'NONE',
    detectedLanguage: preferredLang,
    source: 'rule-engine',
  };
}
