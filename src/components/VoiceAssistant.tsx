import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bot,
  Globe,
  Mic,
  MicOff,
  Sparkles,
  Volume2,
  VolumeX,
  Radio,
  CheckCircle2,
  Compass,
  Zap,
  HelpCircle,
  X,
  ChevronDown,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { User, VoiceAssistantAction, VoiceAssistantResponse } from '../types';
import { api } from '../services/api';

export interface VoiceAssistantProps {
  currentUser: User;
  onSwitchUser?: (user: User) => void;
  allUsers?: User[];
  onTriggerAction?: (action: VoiceAssistantAction, payload?: any) => void;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en-IN', label: 'English (India)', flag: '🇮🇳', native: 'English' },
  { code: 'hi-IN', label: 'Hindi', flag: '🇮🇳', native: 'हिन्दी' },
  { code: 'ta-IN', label: 'Tamil', flag: '🇮🇳', native: 'தமிழ்' },
  { code: 'te-IN', label: 'Telugu', flag: '🇮🇳', native: 'తెలుగు' },
  { code: 'kn-IN', label: 'Kannada', flag: '🇮🇳', native: 'ಕನ್ನಡ' },
  { code: 'ml-IN', label: 'Malayalam', flag: '🇮🇳', native: 'മലയാളം' },
  { code: 'en-US', label: 'English (US)', flag: '🇺🇸', native: 'English' },
  { code: 'es-ES', label: 'Spanish', flag: '🇪🇸', native: 'Español' },
  { code: 'fr-FR', label: 'French', flag: '🇫🇷', native: 'Français' },
  { code: 'de-DE', label: 'German', flag: '🇩🇪', native: 'Deutsch' },
];

const VOICE_COMMAND_HINTS_BY_ROLE: Record<string, Record<string, string[]>> = {
  STUDENT: {
    'en-IN': [
      '"Open camera scanner"',
      '"Unlock my locker"',
      '"Show timetable"',
      '"Check bag weight"',
      '"Show homework & tests"',
      '"Open damaged QR help"',
      '"Switch to Teacher"',
    ],
    'hi-IN': [
      '"कैमरा स्कैनर खोलो"',
      '"मेरा लॉकर खोलो"',
      '"टाइम टेबल दिखाओ"',
      '"बस्ते का वजन बताओ"',
      '"गृहकार्य और टेस्ट दिखाओ"',
      '"टीचर पोर्टल पर जाओ"',
    ],
    default: [
      '"Open camera scanner"',
      '"Unlock my locker"',
      '"Show timetable"',
      '"Check bag weight"',
      '"Switch to Teacher"',
    ],
  },
  TEACHER: {
    'en-IN': [
      '"Assign homework"',
      '"Schedule a test"',
      '"Voice assign (hands-free)"',
      '"Open class risk analysis"',
      '"Show class students"',
      '"View class timetable"',
      '"Switch to Student"',
    ],
    'hi-IN': [
      '"गृहकार्य असाइन करो"',
      '"क्लास टेस्ट शेड्यूल करो"',
      '"वॉइस असाइन खोलो"',
      '"रिस्क एनालिसिस दिखाओ"',
      '"छात्रों की सूची दिखाओ"',
      '"छात्र पोर्टल पर जाओ"',
    ],
    default: [
      '"Assign homework"',
      '"Schedule a test"',
      '"Voice assign"',
      '"Class risk analysis"',
      '"Switch to Student"',
    ],
  },
  ADMIN: {
    'en-IN': [
      '"Open AI & ML Lab"',
      '"Show textbook catalogue"',
      '"Inspect locker fleet"',
      '"View all students"',
      '"View audit logs"',
      '"Switch to Teacher"',
    ],
    'hi-IN': [
      '"एआई और एमएल लैब खोलो"',
      '"किताबों की सूची दिखाओ"',
      '"सभी लॉकर दिखाओ"',
      '"टीचर पोर्टल पर जाओ"',
    ],
    default: [
      '"Open AI ML Lab"',
      '"Textbook catalogue"',
      '"Locker fleet"',
      '"Switch to Teacher"',
    ],
  },
};

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  currentUser,
  onSwitchUser,
  allUsers = [],
  onTriggerAction,
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en-IN');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastActionExecuted, setLastActionExecuted] = useState<string | null>(null);
  const [lastSpeechSpoken, setLastSpeechSpoken] = useState<string | null>(null);
  const [showCheatsheet, setShowCheatsheet] = useState<boolean>(false);
  const [autoListenMode, setAutoListenMode] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const recognitionRef = useRef<any>(null);
  const isExecutingRef = useRef<boolean>(false);
  const toastTimeoutRef = useRef<any>(null);

  // Audio speech synthesis helper
  const speakResponse = useCallback((text: string, langCode: string) => {
    if (isMuted || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const voice =
        voices.find(v => v.lang.toLowerCase() === langCode.toLowerCase()) ||
        voices.find(v => v.lang.startsWith(langCode.split('-')[0]));
      if (voice) utterance.voice = voice;

      utterance.onerror = (e) => {
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          // benign notification
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore speech synthesis errors
    }
  }, [isMuted]);

  // Execute detected voice action across UI
  const executeNavAction = useCallback((action: VoiceAssistantAction, payload?: any, spokenMsg?: string) => {
    if (!action || action === 'NONE') return;

    let actionLabel = '';

    if (action === 'SWITCH_ROLE' && payload?.role) {
      const targetRole = payload.role;
      const targetUser = allUsers.find(u => u.role === targetRole);
      if (targetUser && onSwitchUser) {
        onSwitchUser(targetUser);
        actionLabel = `Switched to ${targetRole} Portal (${targetUser.name})`;
      }
    } else if (action === 'SET_STUDENT' && payload?.studentId) {
      const targetUser = allUsers.find(u => u.studentId === payload?.studentId);
      if (targetUser && onSwitchUser) {
        onSwitchUser(targetUser);
        actionLabel = `Switched to Student ${targetUser.name}`;
      }
    } else {
      if (onTriggerAction) {
        onTriggerAction(action, payload);
      }
      window.dispatchEvent(
        new CustomEvent('smart-locker-action', {
          detail: { action, payload },
        })
      );

      if (action === 'OPEN_SCANNER') actionLabel = '📷 Opened Live Camera Scanner';
      else if (action === 'TOGGLE_LOCKER') actionLabel = `🔓 Locker Solenoid ${payload?.lockerStatus || 'UNLOCKED'}`;
      else if (action === 'SWITCH_TAB') actionLabel = `🧭 Navigated to ${payload?.tab?.toUpperCase() || 'view'}`;
      else if (action === 'OPEN_RECOVERY') actionLabel = '🔧 Opened Damaged QR Recovery';
      else if (action === 'CHECK_BAG_WEIGHT') actionLabel = '🎒 Checked Bag Weight & Locker Savings';
    }

    if (actionLabel) {
      setLastActionExecuted(actionLabel);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setLastActionExecuted(null);
      }, 5000);
    }
  }, [allUsers, onSwitchUser, onTriggerAction]);

  // Fast Local Intent Matcher for Instant Zero-Delay Execution (< 10ms) scoped to active portal role
  const matchInstantIntent = useCallback((query: string, lang: string): {
    action: VoiceAssistantAction;
    payload?: any;
    spoken: string;
    label: string;
  } | null => {
    const q = query.toLowerCase().trim();
    if (!q || q.length < 2) return null;

    const userRole = currentUser.role || 'STUDENT';

    // ==========================================
    // 🌐 0. GLOBAL ROLE SWITCHING (Always Active)
    // ==========================================
    if (
      q.includes('switch to teacher') ||
      q.includes('teacher portal') ||
      q.includes('open teacher') ||
      q.includes('टीचर पोर्टल') ||
      q.includes('शिक्षक पोर्टल') ||
      q.includes('ஆசிரியர் பக்கம்')
    ) {
      return {
        action: 'SWITCH_ROLE',
        payload: { role: 'TEACHER' },
        spoken: 'Switching to Teacher Portal.',
        label: '👨‍🏫 Switched to Teacher Portal',
      };
    }

    if (
      q.includes('switch to admin') ||
      q.includes('admin portal') ||
      q.includes('open admin') ||
      q.includes('प्रबंधक पोर्टल') ||
      q.includes('நிர்வாகி பக்கம்')
    ) {
      return {
        action: 'SWITCH_ROLE',
        payload: { role: 'ADMIN' },
        spoken: 'Switching to Admin Portal.',
        label: '🛡️ Switched to Admin Portal',
      };
    }

    if (
      q.includes('switch to student') ||
      q.includes('student portal') ||
      q.includes('open student') ||
      q.includes('विद्यार्थी पोर्टल') ||
      q.includes('छात्र पोर्टल') ||
      q.includes('மாணவர் பக்கம்')
    ) {
      return {
        action: 'SWITCH_ROLE',
        payload: { role: 'STUDENT' },
        spoken: 'Switching to Student Portal.',
        label: '🎓 Switched to Student Portal',
      };
    }

    // ==========================================
    // 👨‍🏫 1. TEACHER PORTAL SCOPED COMMANDS
    // ==========================================
    if (userRole === 'TEACHER') {
      // 1A. Voice Guided Step-by-Step Assignment & Test Creation
      if (
        q.includes('voice assign') ||
        q.includes('assign homework') ||
        q.includes('give homework') ||
        q.includes('create homework') ||
        q.includes('new homework') ||
        q.includes('schedule test') ||
        q.includes('create test') ||
        q.includes('give test') ||
        q.includes('assign test') ||
        q.includes('take test') ||
        q.includes('असाइन') ||
        q.includes('टेस्ट बनाओ') ||
        q.includes('होमवर्क दो')
      ) {
        const isTest = q.includes('test') || q.includes('exam') || q.includes('quiz') || q.includes('टेस्ट');
        const mode = isTest ? 'test' : 'homework';
        const spoken = isTest
          ? 'Opening interactive voice test builder. Which subject is this test for?'
          : 'Opening interactive voice homework builder. Which subject is this for?';
        return {
          action: 'START_VOICE_ASSIGN',
          payload: { mode },
          spoken,
          label: isTest ? '🎙️ Started Voice Test Creator' : '🎙️ Started Voice Homework Creator',
        };
      }

      // 1B. Class Risk Analysis
      if (
        q.includes('risk') ||
        q.includes('dropout') ||
        q.includes('attendance risk') ||
        q.includes('danger') ||
        q.includes('कम उपस्थिति') ||
        q.includes('जोखिम')
      ) {
        return {
          action: 'SWITCH_TAB',
          payload: { tab: 'risk-analysis' },
          spoken: 'Opening Class Risk and Attendance Analysis.',
          label: '📊 Navigated to Risk Analysis',
        };
      }

      // 1C. Class Students Directory
      if (
        q.includes('students') ||
        q.includes('student list') ||
        q.includes('class list') ||
        q.includes('छात्र सूची')
      ) {
        return {
          action: 'SWITCH_TAB',
          payload: { tab: 'students' },
          spoken: 'Opening Students directory for your class.',
          label: '👥 Navigated to Class Students',
        };
      }

      // 1D. Class Timetable
      if (
        q.includes('timetable') ||
        q.includes('schedule') ||
        q.includes('routine') ||
        q.includes('टाइम टेबल')
      ) {
        return {
          action: 'SWITCH_TAB',
          payload: { tab: 'timetable' },
          spoken: 'Opening class timetable.',
          label: '📅 Navigated to Timetable',
        };
      }

      // 1E. Homework & Tests Lists
      if (q.includes('homework') || q.includes('assignment')) {
        return {
          action: 'SWITCH_TAB',
          payload: { tab: 'homework' },
          spoken: 'Opening assigned homework list.',
          label: '📝 Navigated to Homework',
        };
      }

      if (q.includes('test') || q.includes('exam')) {
        return {
          action: 'SWITCH_TAB',
          payload: { tab: 'tests' },
          spoken: 'Opening scheduled tests list.',
          label: '🎓 Navigated to Tests',
        };
      }

      // 1F. Guard: If teacher asks for personal locker/camera scan
      if (q.includes('unlock') || q.includes('my locker') || q.includes('camera scanner')) {
        return {
          action: 'NONE',
          spoken: 'Personal lockers and camera scanning belong to the Student Portal. Say "Switch to Student" to open student tools.',
          label: '⚠️ Student Portal Feature',
        };
      }
    }

    // ==========================================
    // 🎒 2. STUDENT PORTAL SCOPED COMMANDS
    // ==========================================
    if (userRole === 'STUDENT') {
      // 2A. Scanner / Camera / QR Scan
      if (
        q.includes('scan') ||
        q.includes('camera') ||
        q.includes('qr') ||
        q.includes('barcode') ||
        q.includes('scanner') ||
        q.includes('स्कैन') ||
        q.includes('कैमरा') ||
        q.includes('கேமரா')
      ) {
        return {
          action: 'OPEN_SCANNER',
          spoken: 'Opening live camera scanner.',
          label: '📷 Opened Live Camera Scanner',
        };
      }

      // 2B. Unlock / Lock Student Locker
      if (
        q.includes('unlock') ||
        q.includes('open locker') ||
        q.includes('lock door') ||
        q.includes('lock') ||
        q.includes('लॉकर') ||
        q.includes('லாக்கர்')
      ) {
        const isLock = q.includes('close') || q.includes('lock door');
        const status = isLock ? 'LOCKED' : 'OPEN';
        return {
          action: 'TOGGLE_LOCKER',
          payload: { lockerStatus: status },
          spoken: isLock ? 'Locker locked.' : 'Locker unlocked.',
          label: `🔓 Locker Solenoid ${status}`,
        };
      }

      // 2C. Timetable / Class Routine
      if (
        q.includes('timetable') ||
        q.includes('time table') ||
        q.includes('schedule') ||
        q.includes('period') ||
        q.includes('routine') ||
        q.includes('टाइम टेबल')
      ) {
        return {
          action: 'SWITCH_TAB',
          payload: { tab: 'timetable' },
          spoken: 'Opening tomorrow\'s timetable.',
          label: '📅 Navigated to Timetable',
        };
      }

      // 2D. Bag Weight / Academic Kit / Missing Books
      if (
        q.includes('weight') ||
        q.includes('bag') ||
        q.includes('heavy') ||
        q.includes('saving') ||
        q.includes('missing') ||
        q.includes('pack') ||
        q.includes('kit') ||
        q.includes('बस्ता') ||
        q.includes('वजन')
      ) {
        return {
          action: 'SWITCH_TAB',
          payload: { tab: 'dashboard' },
          spoken: 'Opening school bag weight & locker summary.',
          label: '🎒 Checked School Bag Status',
        };
      }

      // 2E. Homework & Tests Reminders
      if (
        q.includes('homework') ||
        q.includes('assignment') ||
        q.includes('test') ||
        q.includes('exam') ||
        q.includes('गृहकार्य') ||
        q.includes('परीक्षा')
      ) {
        const isTest = q.includes('test') || q.includes('exam') || q.includes('परीक्षा');
        return {
          action: 'SWITCH_TAB',
          payload: { tab: isTest ? 'tests' : 'homework' },
          spoken: isTest ? 'Opening your upcoming class tests.' : 'Opening your homework assignments.',
          label: isTest ? '🎓 Navigated to Tests' : '📝 Navigated to Homework',
        };
      }

      // 2F. Damaged QR Recovery Tool
      if (
        q.includes('damage') ||
        q.includes('broken') ||
        q.includes('fuzzy') ||
        q.includes('repair') ||
        q.includes('खराब')
      ) {
        return {
          action: 'OPEN_RECOVERY',
          spoken: 'Opening damaged QR recovery tool.',
          label: '🔧 Opened Damaged QR Recovery',
        };
      }

      // 2G. Guard: If student tries to create homework or tests
      if (
        q.includes('create test') ||
        q.includes('assign homework') ||
        q.includes('schedule test') ||
        q.includes('give assignment')
      ) {
        return {
          action: 'NONE',
          spoken: 'Assigning homework and scheduling tests is restricted to Teachers. Say "Switch to Teacher" to access teacher tools.',
          label: '⚠️ Teacher Portal Feature',
        };
      }
    }

    // ==========================================
    // 🛡️ 3. ADMIN PORTAL SCOPED COMMANDS
    // ==========================================
    if (userRole === 'ADMIN') {
      if (q.includes('ml') || q.includes('model') || q.includes('ai lab') || q.includes('lab')) {
        return {
          action: 'SWITCH_TAB',
          payload: { tab: 'ai-lab' },
          spoken: 'Opening AI & ML Laboratory.',
          label: '🔬 Navigated to AI Lab',
        };
      }
      if (q.includes('book') || q.includes('catalogue') || q.includes('catalog')) {
        return {
          action: 'SWITCH_TAB',
          payload: { tab: 'books' },
          spoken: 'Opening Textbook Catalogue.',
          label: '📚 Navigated to Books Catalogue',
        };
      }
      if (q.includes('locker') || q.includes('fleet') || q.includes('hardware')) {
        return {
          action: 'SWITCH_TAB',
          payload: { tab: 'lockers' },
          spoken: 'Opening Smart Locker Fleet Management.',
          label: '🔐 Navigated to Locker Fleet',
        };
      }
      if (q.includes('student') || q.includes('directory')) {
        return {
          action: 'SWITCH_TAB',
          payload: { tab: 'students' },
          spoken: 'Opening Student Directory.',
          label: '👥 Navigated to Student Directory',
        };
      }
      if (q.includes('audit') || q.includes('log')) {
        return {
          action: 'SWITCH_TAB',
          payload: { tab: 'audit' },
          spoken: 'Opening System Audit Logs.',
          label: '📋 Navigated to Audit Logs',
        };
      }
    }

    return null;
  }, [currentUser.role]);

  // Process voice transcript with natural intelligence
  const processTranscript = useCallback(async (spokenWords: string) => {
    if (!spokenWords.trim() || isExecutingRef.current) return;
    isExecutingRef.current = true;
    setIsProcessing(true);
    setLiveTranscript(spokenWords);

    // ⚡ STEP 1: FAST-PATH INSTANT CLIENT EXECUTION (< 5ms)
    const instantMatch = matchInstantIntent(spokenWords, selectedLanguage);
    if (instantMatch) {
      setLastSpeechSpoken(instantMatch.spoken);
      executeNavAction(instantMatch.action, instantMatch.payload, instantMatch.spoken);
      
      // When opening interactive voice assign wizard, yield audio & mic control to the modal
      if (instantMatch.action === 'START_VOICE_ASSIGN') {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {
            // ignore
          }
        }
        setIsListening(false);
      } else {
        speakResponse(instantMatch.spoken, selectedLanguage);
      }

      setIsProcessing(false);
      isExecutingRef.current = false;
      setTimeout(() => {
        setLiveTranscript('');
      }, 3500);
      return;
    }

    // 🌐 STEP 2: COMPLEX ASYNC AI FALLBACK
    try {
      const response: VoiceAssistantResponse = await api.processVoiceAssistant(
        spokenWords,
        selectedLanguage,
        {
          currentUser,
          studentId: currentUser.studentId || 'STU-8A-024',
          currentTab: 'dashboard',
        }
      );

      setLastSpeechSpoken(response.spokenResponse);

      if (response.action && response.action !== 'NONE') {
        executeNavAction(response.action, response.actionPayload, response.spokenResponse);
      }

      if (response.action === 'START_VOICE_ASSIGN') {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {
            // ignore
          }
        }
        setIsListening(false);
      } else {
        speakResponse(response.spokenResponse, selectedLanguage);
      }
    } catch (err) {
      console.error('Failed to execute voice command:', err);
    } finally {
      setIsProcessing(false);
      isExecutingRef.current = false;
      setTimeout(() => {
        setLiveTranscript('');
      }, 3500);
    }
  }, [selectedLanguage, currentUser, matchInstantIntent, executeNavAction, speakResponse]);

  // Initialize Web Speech Recognition
  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      window.speechSynthesis?.cancel();

      const recognition = new SpeechRecognition();
      recognition.lang = selectedLanguage;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setLiveTranscript('');
        setAudioLevel(1);
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const resultTranscript = event.results[current][0].transcript;
        setLiveTranscript(resultTranscript);
        setAudioLevel(Math.min(5, Math.max(1, (resultTranscript.length % 5) + 1)));

        // ⚡ REAL-TIME INTERIM TRIGGER: Check if interim words match a command immediately
        const quickMatch = matchInstantIntent(resultTranscript, selectedLanguage);
        if (quickMatch && !isExecutingRef.current) {
          recognition.stop();
          processTranscript(resultTranscript);
          return;
        }

        // If final result obtained, trigger command immediately
        if (event.results[current].isFinal && !isExecutingRef.current) {
          processTranscript(resultTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        setAudioLevel(0);
      };

      recognition.onend = () => {
        setIsListening(false);
        setAudioLevel(0);
        // If continuous/auto-listen mode is on, restart listening
        if (autoListenMode && !isExecutingRef.current) {
          setTimeout(() => {
            try {
              recognition.start();
            } catch (e) {}
          }, 400);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setAudioLevel(0);
    }
  }, [selectedLanguage, autoListenMode, processTranscript]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setAudioLevel(0);
      if (liveTranscript.trim() && !isExecutingRef.current) {
        processTranscript(liveTranscript.trim());
      }
    }
  }, [liveTranscript, processTranscript]);

  const roleHints = VOICE_COMMAND_HINTS_BY_ROLE[currentUser.role] || VOICE_COMMAND_HINTS_BY_ROLE['STUDENT'];
  const hints = roleHints[selectedLanguage] || roleHints['default'];

  return (
    <>
      {/* 1. MINIMALIST AUDIO HUD (when an action is triggered or recording) */}
      {(lastActionExecuted || isListening || isProcessing || liveTranscript) && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-auto max-w-[92vw] sm:max-w-md animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="bg-slate-900 text-white border border-slate-700/90 rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3">
            {/* Audio Wave Indicator */}
            <div className="flex items-center justify-center shrink-0 w-8 h-8 rounded-xl bg-slate-800 border border-slate-700">
              {isListening ? (
                <div className="flex items-center gap-0.5 h-4">
                  {[1, 2, 3].map(bar => (
                    <span
                      key={bar}
                      className={`w-1 bg-indigo-400 rounded-full transition-all duration-100 ${
                        audioLevel >= bar ? 'h-3.5 bg-indigo-300' : 'h-1.5 bg-indigo-500/50'
                      }`}
                    />
                  ))}
                </div>
              ) : isProcessing ? (
                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
            </div>

            {/* Transcript & Action Feedback */}
            <div className="flex-1 min-w-0">
              {isListening && (
                <div className="text-xs text-indigo-300 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  <span>Listening for command...</span>
                </div>
              )}

              {isProcessing && (
                <p className="text-xs font-medium text-slate-300">
                  Processing spoken request...
                </p>
              )}

              {liveTranscript && !isProcessing && (
                <p className="text-xs text-white font-medium truncate">
                  "{liveTranscript}"
                </p>
              )}

              {lastActionExecuted && !isListening && !isProcessing && (
                <div className="text-xs font-semibold text-emerald-400 truncate">
                  {lastActionExecuted}
                </div>
              )}

              {lastSpeechSpoken && !isListening && !isProcessing && !lastActionExecuted && (
                <p className="text-xs text-slate-300 truncate">{lastSpeechSpoken}</p>
              )}
            </div>

            {/* Language Tag */}
            <div className="hidden sm:block text-[11px] font-mono text-slate-400 border-l border-slate-700 pl-2.5">
              {selectedLanguage.split('-')[0].toUpperCase()}
            </div>
          </div>
        </div>
      )}

      {/* 2. FLOATING VOICE CONTROLLER */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {/* Quick Voice Commands Popover Drawer */}
        {showCheatsheet && (
          <div className="w-76 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 mb-2 animate-in fade-in zoom-in-95 duration-150 text-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900">
                Voice Commands
              </span>
              <button
                onClick={() => setShowCheatsheet(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 mt-2 mb-2.5">
              Spoken navigation in <b>{SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.label}</b>:
            </p>

            {/* Clickable voice command list */}
            <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
              {hints.map((hint, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const rawText = hint.replace(/"/g, '');
                    processTranscript(rawText);
                    setShowCheatsheet(false);
                  }}
                  className="w-full text-left text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200/80 px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <span className="text-slate-700 font-medium truncate">
                    {hint}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>

            {/* Auto Listen Mode Toggle */}
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-600 text-[11px]">Continuous Mode:</span>
              <button
                onClick={() => setAutoListenMode(!autoListenMode)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                  autoListenMode
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {autoListenMode ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        )}

        {/* Voice Navigator Command Bar */}
        <div className="flex items-center gap-1.5 bg-slate-900 text-white border border-slate-800 px-3 py-1.5 rounded-full shadow-lg">
          {/* Language Selector Dropdown */}
          <div className="flex items-center gap-1.5 pr-2 border-r border-slate-800">
            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              id="voice-nav-language-select"
              value={selectedLanguage}
              onChange={e => setSelectedLanguage(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-300 focus:outline-hidden cursor-pointer"
              title="Change Spoken Language"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code} className="bg-slate-900 text-white">
                  {lang.flag} {lang.native}
                </option>
              ))}
            </select>
          </div>

          {/* Voice Command Hints Button */}
          <button
            id="voice-hints-btn"
            onClick={() => setShowCheatsheet(!showCheatsheet)}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              showCheatsheet
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
            title="View Spoken Commands"
          >
            <Compass className="w-3.5 h-3.5" />
          </button>

          {/* Audio Voice Output Mute Toggle */}
          <button
            id="voice-mute-btn"
            onClick={() => {
              if (!isMuted) window.speechSynthesis?.cancel();
              setIsMuted(!isMuted);
            }}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              isMuted
                ? 'text-rose-400'
                : 'text-slate-400 hover:text-white'
            }`}
            title={isMuted ? 'Unmute Assistant Voice' : 'Mute Assistant Voice'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Central Push-to-Talk Mic Navigator Button */}
          <button
            id="voice-assistant-mic-btn"
            onClick={() => {
              if (isListening) stopListening();
              else startListening();
            }}
            className={`flex items-center justify-center pl-2.5 pr-3 py-1.5 rounded-full font-semibold text-xs transition-all cursor-pointer ${
              isListening
                ? 'bg-rose-600 text-white'
                : isProcessing
                ? 'bg-slate-800 text-indigo-300'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
            title={isListening ? 'Click to Stop & Execute' : 'Click to Speak Voice Command'}
          >
            {isListening ? (
              <>
                <MicOff className="w-3.5 h-3.5 mr-1" />
                <span>Listening...</span>
              </>
            ) : isProcessing ? (
              <span>Working...</span>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 mr-1 text-indigo-200" />
                <span>Voice Nav</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};
