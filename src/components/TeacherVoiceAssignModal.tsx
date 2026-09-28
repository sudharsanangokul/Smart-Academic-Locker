import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  Volume2,
  Check,
  X,
  FileText,
  GraduationCap,
  Calendar,
  BookOpen,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { api } from '../services/api';
import { User, Book } from '../types';

export type AssignStep = 'SUBJECT' | 'TITLE' | 'DATE' | 'BOOKS' | 'CONFIRM';

interface TeacherVoiceAssignModalProps {
  currentUser: User;
  selectedClassId: string;
  allBooks: Book[];
  initialMode?: 'HOMEWORK' | 'TEST';
  onClose: () => void;
  onSuccess: () => void;
}

const AVAILABLE_SUBJECTS = [
  'Mathematics',
  'Science',
  'English',
  'Social Science',
  'Hindi',
  'Computer Science',
  'Physics',
  'Chemistry',
  'Biology',
];

// Helper to parse spoken date string to YYYY-MM-DD
function parseSpokenDate(spokenText: string): string {
  const text = spokenText.toLowerCase().trim();
  const today = new Date();
  const year = today.getFullYear();

  // 1. Relative phrases
  if (text.includes('today') || text.includes('आज') || text.includes('இன்று')) {
    return today.toISOString().split('T')[0];
  }
  if (
    text.includes('day after tomorrow') ||
    text.includes('peron') ||
    text.includes('परसों') ||
    text.includes('நாளை மறுநாள்')
  ) {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  }
  if (
    text.includes('tomorrow') ||
    text.includes('next day') ||
    text.includes('kal') ||
    text.includes('कल') ||
    text.includes('நாளை') ||
    text.includes('రేపు')
  ) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  // 2. Relative day counts: "in X days", "after X days", "X days later"
  const dayCountMatch = text.match(/(\d+)\s*(days?|दिन|நாட்கள்)/);
  if (dayCountMatch) {
    const daysToAdd = parseInt(dayCountMatch[1], 10);
    if (!isNaN(daysToAdd) && daysToAdd > 0) {
      const d = new Date(today);
      d.setDate(d.getDate() + daysToAdd);
      return d.toISOString().split('T')[0];
    }
  }

  if (text.includes('next week') || text.includes('1 week') || text.includes('अगले हफ्ते')) {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }

  // 3. Days of the week
  const dayMap: Record<string, number> = {
    sunday: 0,
    रविवार: 0,
    sun: 0,
    monday: 1,
    सोमवार: 1,
    mon: 1,
    tuesday: 2,
    मंगलवार: 2,
    tue: 2,
    wednesday: 3,
    बुधवार: 3,
    wed: 3,
    thursday: 4,
    गुरुवार: 4,
    thu: 4,
    friday: 5,
    शुक्रवार: 5,
    fri: 5,
    saturday: 6,
    शनिवार: 6,
    sat: 6,
  };

  for (const [dayName, targetDayNum] of Object.entries(dayMap)) {
    if (text.includes(dayName)) {
      const d = new Date(today);
      const currentDay = d.getDay();
      let diff = (targetDayNum - currentDay + 7) % 7;
      if (diff === 0) diff = 7;
      d.setDate(d.getDate() + diff);
      return d.toISOString().split('T')[0];
    }
  }

  // 4. Match full ISO format: YYYY-MM-DD
  const isoMatch = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = String(parseInt(isoMatch[2], 10)).padStart(2, '0');
    const d = String(parseInt(isoMatch[3], 10)).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 5. Match standard date format: DD/MM/YYYY or DD-MM-YYYY
  const slashMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (slashMatch) {
    const d = String(parseInt(slashMatch[1], 10)).padStart(2, '0');
    const m = String(parseInt(slashMatch[2], 10)).padStart(2, '0');
    const y = slashMatch[3];
    return `${y}-${m}-${d}`;
  }

  // 6. Match month name + day (e.g. "15th March", "August 30", "September 5")
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
    'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
  ];
  for (let mi = 0; mi < 12; mi++) {
    const mName = months[mi];
    const mShort = months[12 + mi];
    if (text.includes(mName) || text.includes(mShort)) {
      const dayNumMatch = text.match(/(\d{1,2})(?:st|nd|rd|th)?/);
      if (dayNumMatch) {
        const dNum = parseInt(dayNumMatch[1], 10);
        if (dNum >= 1 && dNum <= 31) {
          const targetDate = new Date(year, mi, dNum);
          if (targetDate < today) {
            targetDate.setFullYear(year + 1);
          }
          const y = targetDate.getFullYear();
          const m = String(targetDate.getMonth() + 1).padStart(2, '0');
          const d = String(targetDate.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
      }
    }
  }

  // Fallback to tomorrow
  const fallback = new Date(today);
  fallback.setDate(fallback.getDate() + 1);
  return fallback.toISOString().split('T')[0];
}

export const TeacherVoiceAssignModal: React.FC<TeacherVoiceAssignModalProps> = ({
  currentUser,
  selectedClassId,
  allBooks,
  initialMode = 'HOMEWORK',
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'HOMEWORK' | 'TEST'>(initialMode);
  const [currentStep, setCurrentStep] = useState<AssignStep>('SUBJECT');

  // Form Fields
  const [subject, setSubject] = useState<string>('Mathematics');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);

  // Voice Interaction State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState<boolean>(false);
  const [assistantMessage, setAssistantMessage] = useState<string>('');
  const [liveSpeech, setLiveSpeech] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Synchronized state reference for speech callback safety
  const stateRef = useRef({
    mode,
    currentStep,
    subject,
    title,
    description,
    dueDate,
    selectedBookIds,
    selectedClassId,
    allBooks,
    currentUser,
    isListening: false,
    isAssistantSpeaking: false,
    isSubmitting: false,
  });

  useEffect(() => {
    stateRef.current.mode = mode;
    stateRef.current.currentStep = currentStep;
    stateRef.current.subject = subject;
    stateRef.current.title = title;
    stateRef.current.description = description;
    stateRef.current.dueDate = dueDate;
    stateRef.current.selectedBookIds = selectedBookIds;
    stateRef.current.selectedClassId = selectedClassId;
    stateRef.current.allBooks = allBooks;
    stateRef.current.currentUser = currentUser;
    stateRef.current.isListening = isListening;
    stateRef.current.isAssistantSpeaking = isAssistantSpeaking;
    stateRef.current.isSubmitting = isSubmitting;
  });

  const recognitionRef = useRef<any>(null);

  const classLevel = parseInt(selectedClassId.replace(/\D/g, '') || '8', 10);
  const relevantBooks = allBooks.filter(b => b.classLevel === classLevel);

  // Safe Speech Synthesis with cancellation cleanup
  const speakText = useCallback((text: string, onEndCallback?: () => void) => {
    if (!('speechSynthesis' in window)) {
      if (onEndCallback) onEndCallback();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      setIsAssistantSpeaking(true);
      stateRef.current.isAssistantSpeaking = true;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'en-IN';

      utterance.onend = () => {
        setIsAssistantSpeaking(false);
        stateRef.current.isAssistantSpeaking = false;
        if (onEndCallback) onEndCallback();
      };

      utterance.onerror = (e) => {
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          console.warn('SpeechSynthesis notice:', e.error);
        }
        setIsAssistantSpeaking(false);
        stateRef.current.isAssistantSpeaking = false;
        if (onEndCallback) onEndCallback();
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS error:', e);
      setIsAssistantSpeaking(false);
      stateRef.current.isAssistantSpeaking = false;
      if (onEndCallback) onEndCallback();
    }
  }, []);

  // Safe voice listening starter
  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported in this browser.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }

      window.speechSynthesis?.cancel();

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        stateRef.current.isListening = true;
        setLiveSpeech('');
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        setLiveSpeech(transcript);

        if (event.results[current].isFinal) {
          handleSpokenAnswer(transcript);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech Recognition error:', e.error);
        setIsListening(false);
        stateRef.current.isListening = false;
      };

      recognition.onend = () => {
        setIsListening(false);
        stateRef.current.isListening = false;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      setIsListening(false);
      stateRef.current.isListening = false;
    }
  }, []);

  // Unified speech + question prompter for seamless step transitions
  const speakAndPrompt = useCallback((nextStep: AssignStep, message: string) => {
    setCurrentStep(nextStep);
    stateRef.current.currentStep = nextStep;
    setAssistantMessage(message);

    speakText(message, () => {
      // Once voice completes speaking, open microphone automatically
      setTimeout(() => {
        startListening();
      }, 250);
    });
  }, [speakText, startListening]);

  // Submit to API
  const handleFinalSubmit = async () => {
    const current = stateRef.current;
    if (current.isSubmitting) return;

    setIsSubmitting(true);
    stateRef.current.isSubmitting = true;

    try {
      const finalTitle =
        current.title.trim() ||
        (current.mode === 'HOMEWORK'
          ? `${current.subject} Assignment`
          : `${current.subject} Unit Test`);
      const finalDesc =
        current.description.trim() ||
        (current.mode === 'HOMEWORK'
          ? 'Complete chapter exercises and review questions.'
          : 'Comprehensive test covering assigned chapter topics.');

      if (current.mode === 'HOMEWORK') {
        await api.createHomework({
          classId: current.selectedClassId,
          subject: current.subject,
          title: finalTitle,
          description: finalDesc,
          dueDate: current.dueDate,
          requiredBookIds: current.selectedBookIds,
          teacherId: current.currentUser.id,
          teacherName: current.currentUser.name,
        });
      } else {
        await api.createTest({
          classId: current.selectedClassId,
          subject: current.subject,
          testTitle: finalTitle,
          chapterTopic: finalDesc,
          testDate: current.dueDate,
          requiredBookIds: current.selectedBookIds,
          teacherId: current.currentUser.id,
          teacherName: current.currentUser.name,
        });
      }

      const successVoice = `Success! ${
        current.mode === 'HOMEWORK' ? 'Homework' : 'Test'
      } titled "${finalTitle}" published to Class ${current.selectedClassId}.`;
      setAssistantMessage(successVoice);
      speakText(successVoice, () => {
        onSuccess();
        onClose();
      });
    } catch (err) {
      console.error('Failed to create assignment via voice:', err);
      speakText('There was an issue saving. Please verify the details on screen.');
    } finally {
      setIsSubmitting(false);
      stateRef.current.isSubmitting = false;
    }
  };

  // Main Speech Interpreter
  const handleSpokenAnswer = (spokenText: string) => {
    const raw = spokenText.toLowerCase().trim();
    if (!raw) return;

    const current = stateRef.current;
    const step = current.currentStep;
    const isTestMode = current.mode === 'TEST';

    // Step 1: SUBJECT
    if (step === 'SUBJECT') {
      const matched = AVAILABLE_SUBJECTS.find(s => raw.includes(s.toLowerCase()));
      const selected = matched || 'Mathematics';
      setSubject(selected);
      stateRef.current.subject = selected;

      const nextMsg = isTestMode
        ? `Subject set to ${selected}. What is the title or chapter name for the test?`
        : `Subject set to ${selected}. What is the assignment title or topic?`;

      speakAndPrompt('TITLE', nextMsg);
    }
    // Step 2: TITLE
    else if (step === 'TITLE') {
      let cleanTitle = spokenText
        .replace(/^(the title is|title is|it is|it's|call it|topic is)/i, '')
        .trim();
      if (!cleanTitle) cleanTitle = spokenText;

      setTitle(cleanTitle);
      stateRef.current.title = cleanTitle;

      const nextMsg = isTestMode
        ? `Test title recorded as "${cleanTitle}". When is the test date? You can say tomorrow, next Friday, or any date.`
        : `Title recorded as "${cleanTitle}". When is the due date? You can say tomorrow, next Friday, or any date.`;

      speakAndPrompt('DATE', nextMsg);
    }
    // Step 3: DATE
    else if (step === 'DATE') {
      const parsedDate = parseSpokenDate(spokenText);
      setDueDate(parsedDate);
      stateRef.current.dueDate = parsedDate;

      // Auto select subject book if none chosen
      const subjBook = relevantBooks.find(
        b => b.subject.toLowerCase() === current.subject.toLowerCase()
      );
      if (subjBook && current.selectedBookIds.length === 0) {
        setSelectedBookIds([subjBook.id]);
        stateRef.current.selectedBookIds = [subjBook.id];
      }

      const nextMsg = isTestMode
        ? `Test date set to ${parsedDate}. Which required textbook or materials should students bring? You can say the book name, or say None.`
        : `Due date set to ${parsedDate}. Which textbook should students bring or keep in locker? You can say the book name, or say None.`;

      speakAndPrompt('BOOKS', nextMsg);
    }
    // Step 4: BOOKS
    else if (step === 'BOOKS') {
      if (
        raw.includes('none') ||
        raw.includes('no book') ||
        raw.includes('nothing') ||
        raw.includes('no need') ||
        raw.includes('skip')
      ) {
        setSelectedBookIds([]);
        stateRef.current.selectedBookIds = [];
      } else {
        const matches = relevantBooks.filter(
          b =>
            raw.includes(b.bookName.toLowerCase()) ||
            raw.includes(b.subject.toLowerCase()) ||
            raw.includes(b.id.toLowerCase())
        );

        if (matches.length > 0) {
          const ids = matches.map(m => m.id);
          setSelectedBookIds(ids);
          stateRef.current.selectedBookIds = ids;
        } else {
          const subjBook = relevantBooks.find(
            b => b.subject.toLowerCase() === current.subject.toLowerCase()
          );
          if (subjBook) {
            setSelectedBookIds([subjBook.id]);
            stateRef.current.selectedBookIds = [subjBook.id];
          }
        }
      }

      const currentBooksCount = stateRef.current.selectedBookIds.length;
      const nextMsg = `Books noted (${currentBooksCount} book selected). Ready to publish this ${
        isTestMode ? 'test' : 'homework'
      } for Class ${current.selectedClassId}. Say Yes to confirm, or No to cancel.`;

      speakAndPrompt('CONFIRM', nextMsg);
    }
    // Step 5: CONFIRM & PUBLISH
    else if (step === 'CONFIRM') {
      if (
        raw.includes('yes') ||
        raw.includes('publish') ||
        raw.includes('save') ||
        raw.includes('confirm') ||
        raw.includes('ok') ||
        raw.includes('done') ||
        raw.includes('sure') ||
        raw.includes('हाँ') ||
        raw.includes('சரி') ||
        raw.includes('అవును')
      ) {
        handleFinalSubmit();
      } else if (
        raw.includes('no') ||
        raw.includes('cancel') ||
        raw.includes('stop') ||
        raw.includes('नहीं') ||
        raw.includes('இல்லை')
      ) {
        speakText('Assignment creation cancelled.');
        onClose();
      } else {
        const retryMsg = `Please say Yes to publish to Class ${current.selectedClassId}, or No to cancel.`;
        setAssistantMessage(retryMsg);
        speakText(retryMsg, () => {
          setTimeout(() => startListening(), 250);
        });
      }
    }
  };

  // Switch mode helper
  const handleModeChange = (newMode: 'HOMEWORK' | 'TEST') => {
    setMode(newMode);
    stateRef.current.mode = newMode;
    const initialPrompt =
      newMode === 'HOMEWORK'
        ? `Which subject is this homework for? For example: Mathematics, Science, or English.`
        : `Which subject is this test for? For example: Mathematics, Science, or English.`;
    speakAndPrompt('SUBJECT', initialPrompt);
  };

  // Jump to specific step
  const handleJumpToStep = (targetStep: AssignStep) => {
    const isTestMode = mode === 'TEST';
    let msg = '';
    if (targetStep === 'SUBJECT') {
      msg = `Which subject is this ${isTestMode ? 'test' : 'homework'} for?`;
    } else if (targetStep === 'TITLE') {
      msg = `What should the ${isTestMode ? 'test title or topic' : 'assignment title'} be?`;
    } else if (targetStep === 'DATE') {
      msg = `When is the ${isTestMode ? 'test date' : 'due date'}?`;
    } else if (targetStep === 'BOOKS') {
      msg = `Which required textbooks should students bring?`;
    } else if (targetStep === 'CONFIRM') {
      msg = `Ready to publish. Say Yes to confirm, or click Publish below.`;
    }
    speakAndPrompt(targetStep, msg);
  };

  // Initial prompt on open with safe initialization delay
  useEffect(() => {
    window.speechSynthesis?.cancel();

    const isTestMode = initialMode === 'TEST';
    const initialPrompt = isTestMode
      ? `Welcome to Voice Test Builder. Which subject is this test for? For example: Mathematics, Science, or English.`
      : `Welcome to Voice Homework Builder. Which subject is this homework for? For example: Mathematics, Science, or English.`;

    const timer = setTimeout(() => {
      speakAndPrompt('SUBJECT', initialPrompt);
    }, 150);

    return () => {
      clearTimeout(timer);
      window.speechSynthesis?.cancel();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return (
    <div
      id="teacher-voice-assign-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-3 sm:p-4 overflow-hidden animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 max-w-xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-5 py-3.5 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/40 border border-indigo-400/40 flex items-center justify-center shadow-inner shrink-0">
              <Sparkles className="w-4 h-4 text-indigo-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-white">
                  Interactive Voice {mode === 'TEST' ? 'Test' : 'Homework'} Builder
                </h3>
                <span className="bg-indigo-500/30 text-indigo-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-indigo-400/30">
                  Class {selectedClassId}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-tight">
                Step-by-step hands-free creation with instant class broadcast
              </p>
            </div>
          </div>

          <button
            id="btn-close-voice-modal"
            onClick={() => {
              window.speechSynthesis?.cancel();
              if (recognitionRef.current) recognitionRef.current.stop();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector (Homework vs Test) */}
        <div className="flex items-center px-4 py-2 bg-slate-100/90 border-b border-slate-200 gap-2 shrink-0">
          <button
            type="button"
            id="tab-mode-homework"
            onClick={() => handleModeChange('HOMEWORK')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'HOMEWORK'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Homework Assignment
          </button>
          <button
            type="button"
            id="tab-mode-test"
            onClick={() => handleModeChange('TEST')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'TEST'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Class Test / Exam
          </button>
        </div>

        {/* Assistant Voice Speaking HUD */}
        <div className="px-5 py-3 bg-indigo-50/80 border-b border-indigo-100 flex items-center gap-3 shrink-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-all ${
              isListening
                ? 'bg-rose-600 text-white ring-4 ring-rose-500/30 animate-pulse'
                : isAssistantSpeaking
                ? 'bg-indigo-600 text-white animate-bounce'
                : 'bg-slate-900 text-white'
            }`}
          >
            {isListening ? (
              <Mic className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5 text-indigo-200" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                Voice Assistant:
              </span>
              {isListening && (
                <span className="text-[9px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold animate-pulse">
                  Listening to answer...
                </span>
              )}
              {isAssistantSpeaking && (
                <span className="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                  Speaking prompt...
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
              {assistantMessage || 'Loading question...'}
            </p>

            {liveSpeech && (
              <div className="mt-1 text-[11px] bg-white px-2.5 py-1 rounded-lg border border-indigo-200 text-slate-700 font-medium italic truncate">
                Heard: "{liveSpeech}"
              </div>
            )}
          </div>
        </div>

        {/* Progress Step Stepper */}
        <div className="grid grid-cols-5 gap-1 px-4 py-1.5 bg-slate-50 border-b border-slate-200 text-center text-[10px] font-bold shrink-0">
          {[
            { id: 'SUBJECT', label: '1. Subject' },
            { id: 'TITLE', label: '2. Title' },
            { id: 'DATE', label: '3. Date' },
            { id: 'BOOKS', label: '4. Books' },
            { id: 'CONFIRM', label: '5. Publish' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => handleJumpToStep(s.id as AssignStep)}
              className={`py-1 rounded-lg transition-all cursor-pointer truncate ${
                currentStep === s.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:bg-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Scrollable Editable Form Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3.5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Subject Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
              <select
                id="voice-field-subject"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  stateRef.current.subject = e.target.value;
                }}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                {AVAILABLE_SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Field & Quick Shortcuts */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  {mode === 'HOMEWORK' ? 'Due Date' : 'Test Date'}
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      const val = d.toISOString().split('T')[0];
                      setDueDate(val);
                      stateRef.current.dueDate = val;
                    }}
                    className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                  >
                    Tomorrow
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 2);
                      const val = d.toISOString().split('T')[0];
                      setDueDate(val);
                      stateRef.current.dueDate = val;
                    }}
                    className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                  >
                    +2 Days
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      const day = d.getDay();
                      const diff = (5 - day + 7) % 7 || 7;
                      d.setDate(d.getDate() + diff);
                      const val = d.toISOString().split('T')[0];
                      setDueDate(val);
                      stateRef.current.dueDate = val;
                    }}
                    className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                  >
                    Friday
                  </button>
                </div>
              </div>
              <input
                type="date"
                id="voice-field-duedate"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  stateRef.current.dueDate = e.target.value;
                }}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Title Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {mode === 'HOMEWORK' ? 'Assignment Title' : 'Test Title / Topic'}
            </label>
            <input
              type="text"
              id="voice-field-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                stateRef.current.title = e.target.value;
              }}
              placeholder={
                mode === 'HOMEWORK'
                  ? 'e.g. Chapter 4 Fractions & Algebra Problems'
                  : 'e.g. Unit 3 Mechanics & Energy Exam'
              }
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Description / Instructions */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {mode === 'HOMEWORK' ? 'Homework Instructions' : 'Chapter / Syllabus Topics'}
            </label>
            <textarea
              rows={2}
              id="voice-field-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                stateRef.current.description = e.target.value;
              }}
              placeholder={
                mode === 'HOMEWORK'
                  ? 'Instructions or specific page exercises for students...'
                  : 'Syllabus and chapter scope for evaluation...'
              }
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Required Books Checkboxes */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Required Locker Books & Kit
              </label>
              <button
                type="button"
                onClick={() => {
                  setSelectedBookIds([]);
                  stateRef.current.selectedBookIds = [];
                }}
                className="text-[10px] text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Clear Selection
              </button>
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              {relevantBooks.length === 0 && (
                <span className="text-slate-400 text-[11px]">
                  No books in catalogue for Class {selectedClassId}
                </span>
              )}
              {relevantBooks.map((b) => (
                <label
                  key={b.id}
                  className="flex items-center gap-2 p-1 hover:bg-white rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedBookIds.includes(b.id)}
                    onChange={(e) => {
                      let updated = [];
                      if (e.target.checked) updated = [...selectedBookIds, b.id];
                      else updated = selectedBookIds.filter((id) => id !== b.id);
                      setSelectedBookIds(updated);
                      stateRef.current.selectedBookIds = updated;
                    }}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-slate-800 text-xs">{b.bookName}</span>
                  <span className="text-slate-400 text-[10px]">
                    ({b.id} • {b.weightKg}kg)
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions (Always visible & pinned) */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            id="btn-voice-mic-toggle"
            onClick={() => {
              if (isListening) {
                if (recognitionRef.current) {
                  try {
                    recognitionRef.current.stop();
                  } catch {
                    // ignore
                  }
                }
                setIsListening(false);
                stateRef.current.isListening = false;
              } else {
                startListening();
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isListening
                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                <span>Stop Listening</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 text-indigo-200" />
                <span>Speak Answer</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-voice-cancel"
              onClick={() => {
                window.speechSynthesis?.cancel();
                if (recognitionRef.current) recognitionRef.current.stop();
                onClose();
              }}
              className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              id="btn-voice-publish"
              disabled={isSubmitting || !title.trim()}
              onClick={handleFinalSubmit}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <span>Publishing...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Publish</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
