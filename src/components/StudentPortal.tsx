import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Archive,
  ArrowRight,
  Bell,
  BookOpen,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Lock,
  Package,
  QrCode,
  Sparkles,
  Unlock,
  User,
  Weight,
  Wrench,
} from 'lucide-react';
import {
  AcademicKitSummary,
  Book,
  Homework,
  InventoryLog,
  Locker,
  NotificationItem,
  Student,
  TestItem,
  TimetableSlot,
  User as UserType,
} from '../types';
import { api } from '../services/api';
import { getCurrentDayInfo } from '../utils/dateUtils';
import { RealCameraScanner } from './RealCameraScanner';
import { LockerSimulation } from './LockerSimulation';
import { AcademicKitView } from './AcademicKitView';
import { DamagedQRRecoveryTool } from './DamagedQRRecoveryTool';
import { StudentTimetable } from './StudentTimetable';
import { StudentHomework } from './StudentHomework';
import { StudentTests } from './StudentTests';
import { StudentNotifications } from './StudentNotifications';

interface StudentPortalProps {
  currentUser: UserType;
}

type StudentTab =
  | 'dashboard'
  | 'scanner'
  | 'timetable'
  | 'tasks'
  | 'locker'
  | 'damaged-qr'
  | 'notifications';

export const StudentPortal: React.FC<StudentPortalProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<StudentTab>('dashboard');
  const [tasksSubTab, setTasksSubTab] = useState<'homework' | 'tests'>('homework');
  const [student, setStudent] = useState<Student | null>(null);
  const [locker, setLocker] = useState<Locker | null>(null);
  const [academicKit, setAcademicKit] = useState<AcademicKitSummary | null>(null);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [testsList, setTestsList] = useState<TestItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [transactions, setTransactions] = useState<InventoryLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLockerToggling, setIsLockerToggling] = useState<boolean>(false);

  const studentIdToLoad = currentUser.studentId || 'STU-8A-024';

  const loadAllStudentData = async () => {
    try {
      setIsLoading(true);
      const dayInfo = getCurrentDayInfo();
      const [
        studentRes,
        kitRes,
        booksRes,
        transRes,
        notifRes,
      ] = await Promise.all([
        api.getStudent(studentIdToLoad),
        api.getAcademicKit(studentIdToLoad, dayInfo.targetTomorrowDay),
        api.getBooks(),
        api.getTransactions(studentIdToLoad),
        api.getNotifications('STUDENT', studentIdToLoad, '8A'),
      ]);

      setStudent(studentRes.student);
      setLocker(studentRes.locker);
      setAcademicKit(kitRes.kit);
      setAllBooks(booksRes.books);
      setTransactions(transRes.transactions);
      setNotifications(notifRes.notifications);

      // Load timetable, hw, tests for class
      const [ttRes, hwRes, testRes] = await Promise.all([
        api.getTimetable(studentRes.student.classId),
        api.getHomework(studentRes.student.classId),
        api.getTests(studentRes.student.classId),
      ]);

      setTimetableSlots(ttRes.timetable);
      setHomeworkList(hwRes.homework);
      setTestsList(testRes.tests);
    } catch (err) {
      console.error('Failed to load student data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllStudentData();
  }, [studentIdToLoad]);

  const handleToggleLocker = async () => {
    if (!locker || isLockerToggling) return;
    setIsLockerToggling(true);
    try {
      const nextStatus = locker.status === 'LOCKED' ? 'OPEN' : 'LOCKED';
      const res = await api.toggleLockerStatus(locker.id, nextStatus);
      setLocker(res.locker);
    } catch (err) {
      console.error('Failed to toggle locker:', err);
    } finally {
      setIsLockerToggling(false);
    }
  };

  useEffect(() => {
    const handleVoiceAction = async (e: any) => {
      const { action, payload } = e.detail || {};
      if (action === 'SWITCH_TAB' && payload?.tab) {
        if (payload.tab === 'homework' || payload.tab === 'tests') {
          setActiveTab('tasks');
          setTasksSubTab(payload.tab);
        } else if (payload.tab === 'ai-kit' || payload.tab === 'academic-kit') {
          setActiveTab('dashboard');
        } else {
          setActiveTab(payload.tab as StudentTab);
        }
      } else if (action === 'OPEN_SCANNER') {
        setActiveTab('scanner');
      } else if (action === 'OPEN_RECOVERY') {
        setActiveTab('damaged-qr');
      } else if (action === 'TOGGLE_LOCKER' && locker) {
        try {
          const res = await api.toggleLockerStatus(
            locker.id,
            payload?.lockerStatus || (locker.status === 'LOCKED' ? 'OPEN' : 'LOCKED')
          );
          setLocker(res.locker);
        } catch (err) {
          console.error('Failed to toggle locker from voice action:', err);
        }
      }
    };

    window.addEventListener('smart-locker-action', handleVoiceAction);
    return () => window.removeEventListener('smart-locker-action', handleVoiceAction);
  }, [locker]);

  if (isLoading || !student || !locker || !academicKit) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-600">Opening Your School Locker...</p>
        </div>
      </div>
    );
  }

  const unreadNotifCount = notifications.filter(n => !n.read).length;
  const missingItems = academicKit.requiredItems.filter(i => !i.isPresentInLocker);
  const missingCount = missingItems.length;

  return (
    <div id="student-portal-root" className="space-y-6 max-w-5xl mx-auto">
      {/* Kid-Friendly Simplified Top Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs flex items-center justify-between overflow-x-auto gap-2">
        <nav className="flex items-center gap-1.5 min-w-max">
          <button
            id="tab-student-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>My School Bag</span>
            {missingCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            )}
          </button>

          <button
            id="tab-student-scanner"
            onClick={() => setActiveTab('scanner')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'scanner'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Scan Book</span>
          </button>

          <button
            id="tab-student-timetable"
            onClick={() => setActiveTab('timetable')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'timetable'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Timetable</span>
          </button>

          <button
            id="tab-student-tasks"
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Homework & Tests ({homeworkList.length + testsList.length})</span>
          </button>

          <button
            id="tab-student-locker"
            onClick={() => setActiveTab('locker')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'locker'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Locker #{locker.lockerNumber}</span>
          </button>
        </nav>

        {/* Small Utility Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('damaged-qr')}
            title="Damaged QR Recovery"
            className={`p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'damaged-qr'
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <Wrench className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            title="Notifications"
            className={`p-2 rounded-xl text-xs font-bold relative transition-colors cursor-pointer ${
              activeTab === 'notifications'
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <Bell className="w-4 h-4" />
            {unreadNotifCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>
        </div>
      </div>

      {/* TAB CONTENT: DASHBOARD (SIMPLIFIED KID-FRIENDLY VIEW) */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Big Friendly Student & Bag Status Hero Card */}
          <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-indigo-800/40 relative overflow-hidden">
            {/* Soft decorative background circles */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border-2 border-indigo-400/40 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                  <img
                    src={currentUser.avatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150'}
                    alt={student.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tight">Hi, {student.name.split(' ')[0]}! 👋</h1>
                    <span className="font-bold text-xs bg-indigo-500/30 text-indigo-200 px-2.5 py-0.5 rounded-lg border border-indigo-400/30">
                      Class {student.classId}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200/90 mt-1">
                    Locker <strong className="text-white">#{locker.lockerNumber}</strong> • Roll No: #{student.rollNumber}
                  </p>
                </div>
              </div>

              {/* Instant Locker Lock/Unlock Toggle Button */}
              <div className="flex items-center gap-3">
                <button
                  id="dash-toggle-locker-btn"
                  onClick={handleToggleLocker}
                  disabled={isLockerToggling}
                  className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-bold shadow-lg transition-all hover:scale-[1.02] cursor-pointer ${
                    locker.status === 'OPEN'
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                      : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                  }`}
                >
                  {locker.status === 'OPEN' ? (
                    <>
                      <Unlock className="w-4 h-4 text-slate-950" />
                      <span>Locker Unlocked (Tap to Lock)</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-indigo-300" />
                      <span>Locker Locked (Tap to Open)</span>
                    </>
                  )}
                </button>

                <button
                  id="dash-scan-camera-btn"
                  onClick={() => setActiveTab('scanner')}
                  className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Scan Book</span>
                </button>
              </div>
            </div>

            {/* Big High-Visibility School Bag Status Banner */}
            <div className="mt-6 pt-5 border-t border-indigo-800/60 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
                  🎒 Tomorrow's Bag Weight
                </div>
                <div className="text-2xl font-black text-white mt-1">
                  {academicKit.totalRequiredWeightKg} kg
                </div>
                <div className="text-[11px] text-emerald-300 font-semibold mt-0.5">
                  ✓ Saved {academicKit.totalWeightSavedKg} kg stored in locker!
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
                  📚 Books In Your Locker
                </div>
                <div className="text-2xl font-black text-white mt-1">
                  {locker.currentBookIds.length} Books
                </div>
                <div className="text-[11px] text-indigo-200 mt-0.5">
                  Safe inside Locker #{locker.lockerNumber}
                </div>
              </div>

              <div className={`p-4 rounded-2xl border ${
                missingCount > 0
                  ? 'bg-rose-500/20 border-rose-400/40 text-rose-100'
                  : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-100'
              }`}>
                <div className="text-[11px] font-bold uppercase tracking-wider">
                  {missingCount > 0 ? '⚠️ Action Required' : '🎉 Bag is 100% Ready'}
                </div>
                <div className="text-xl font-black mt-1">
                  {missingCount > 0 ? `${missingCount} Missing for Class` : 'All Books Packed!'}
                </div>
                <div className="text-[11px] font-medium mt-0.5">
                  {missingCount > 0 ? 'Check required list below' : 'You are all set for tomorrow'}
                </div>
              </div>
            </div>
          </div>

          {/* Simple 2-Column Overview for Kids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: What to Bring Tomorrow (Clean List) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Tomorrow's Books (Monday)</h3>
                </div>
                <button
                  onClick={() => setActiveTab('scanner')}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  + Scan More
                </button>
              </div>

              <div className="space-y-2.5">
                {academicKit.requiredItems.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border flex items-center justify-between text-xs transition-all ${
                      item.isPresentInLocker
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : 'bg-rose-50/70 border-rose-200 text-rose-950'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          item.isPresentInLocker
                            ? 'bg-emerald-200/80 text-emerald-800'
                            : 'bg-rose-200/80 text-rose-800'
                        }`}
                      >
                        {item.isPresentInLocker ? '✓' : '!'}
                      </div>
                      <div>
                        <div className="font-bold">{item.bookName}</div>
                        <div className="text-[11px] opacity-75">
                          {item.subject} • {item.weightKg} kg
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        item.isPresentInLocker
                          ? 'bg-emerald-200 text-emerald-800'
                          : 'bg-rose-200 text-rose-800'
                      }`}
                    >
                      {item.isPresentInLocker ? 'In Locker ✓' : 'Pack in Bag'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Tomorrow's Schedule Preview */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Tomorrow's Class Schedule</h3>
                </div>
                <button
                  onClick={() => setActiveTab('timetable')}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  Full Routine
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {timetableSlots
                  .filter(s => s.day === 'Monday')
                  .map((slot, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-800">{slot.subject}</div>
                        <div className="text-[11px] text-slate-400">
                          {slot.teacherName} • Room {slot.room}
                        </div>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                        {slot.timeSlot}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: REAL CAMERA SCANNER */}
      {activeTab === 'scanner' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <RealCameraScanner
            studentId={student.studentId}
            studentClass={student.classId}
            studentName={student.name}
            onScanSuccess={loadAllStudentData}
          />
        </div>
      )}

      {/* TAB CONTENT: TIMETABLE */}
      {activeTab === 'timetable' && (
        <div className="animate-in fade-in duration-200">
          <StudentTimetable slots={timetableSlots} studentClass={student.classId} />
        </div>
      )}

      {/* TAB CONTENT: COMBINED TASKS (HOMEWORK & TESTS) */}
      {activeTab === 'tasks' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Sub-toggle between Homework and Tests */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
            <button
              onClick={() => setTasksSubTab('homework')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tasksSubTab === 'homework'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Homework Assignments ({homeworkList.length})</span>
            </button>
            <button
              onClick={() => setTasksSubTab('tests')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tasksSubTab === 'tests'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-purple-600" />
              <span>Upcoming Tests & Exams ({testsList.length})</span>
            </button>
          </div>

          {tasksSubTab === 'homework' ? (
            <StudentHomework homeworkList={homeworkList} locker={locker} />
          ) : (
            <StudentTests testsList={testsList} locker={locker} />
          )}
        </div>
      )}

      {/* TAB CONTENT: MY LOCKER */}
      {activeTab === 'locker' && (
        <div className="animate-in fade-in duration-200">
          <LockerSimulation
            student={student}
            locker={locker}
            allBooks={allBooks}
            logs={transactions}
            onRefresh={loadAllStudentData}
          />
        </div>
      )}

      {/* TAB CONTENT: DAMAGED QR RECOVERY */}
      {activeTab === 'damaged-qr' && (
        <div className="animate-in fade-in duration-200">
          <DamagedQRRecoveryTool student={student} onBookRegistered={loadAllStudentData} />
        </div>
      )}

      {/* TAB CONTENT: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="animate-in fade-in duration-200">
          <StudentNotifications notifications={notifications} onRefresh={loadAllStudentData} />
        </div>
      )}
    </div>
  );
};
