import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  BarChart3,
  BookCheck,
  BrainCircuit,
  Calendar,
  CheckCircle2,
  Clock,
  FilePlus,
  FileText,
  Filter,
  GraduationCap,
  Megaphone,
  Plus,
  Search,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  Book,
  Homework,
  Locker,
  SchoolClass,
  Student,
  TeacherType,
  TestItem,
  TimetableSlot,
  User as UserType,
} from '../types';
import { api } from '../services/api';
import { getCurrentDayInfo, ACADEMIC_DAYS } from '../utils/dateUtils';
import { TeacherVoiceAssignModal } from './TeacherVoiceAssignModal';

interface TeacherPortalProps {
  currentUser: UserType;
}

type TeacherTab = 'overview' | 'students' | 'risk-analysis' | 'timetable' | 'homework' | 'tests';

export const TeacherPortal: React.FC<TeacherPortalProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<TeacherTab>('overview');
  const [selectedClassId, setSelectedClassId] = useState<string>(currentUser.assignedClassId || '8A');
  const [teacherRole, setTeacherRole] = useState<TeacherType>(currentUser.teacherType || 'CLASS_TEACHER');

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [testsList, setTestsList] = useState<TestItem[]>([]);
  const [riskData, setRiskData] = useState<{
    classId: string;
    totalStudents: number;
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
    students: any[];
  } | null>(null);

  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [timetableDayFilter, setTimetableDayFilter] = useState<string>('ALL');

  // Voice Assignment Modal State
  const [showVoiceAssignModal, setShowVoiceAssignModal] = useState(false);
  const [voiceAssignInitialMode, setVoiceAssignInitialMode] = useState<'HOMEWORK' | 'TEST'>('HOMEWORK');

  // New Homework Form state
  const [newHwTitle, setNewHwTitle] = useState('');
  const [newHwSubj, setNewHwSubj] = useState('Science');
  const [newHwDesc, setNewHwDesc] = useState('');
  const [newHwDueDate, setNewHwDueDate] = useState('');
  const [newHwBooks, setNewHwBooks] = useState<string[]>([]);
  const [showHwModal, setShowHwModal] = useState(false);

  // New Test Form state
  const [newTestTitle, setNewTestTitle] = useState('');
  const [newTestSubj, setNewTestSubj] = useState('Science');
  const [newTestTopic, setNewTestTopic] = useState('');
  const [newTestDate, setNewTestDate] = useState('');
  const [newTestBooks, setNewTestBooks] = useState<string[]>([]);
  const [showTestModal, setShowTestModal] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [
        classesRes,
        studentsRes,
        booksRes,
        ttRes,
        hwRes,
        testRes,
        riskRes,
      ] = await Promise.all([
        api.getClasses(),
        api.getStudents(selectedClassId),
        api.getBooks(),
        api.getTimetable(selectedClassId),
        api.getHomework(selectedClassId),
        api.getTests(selectedClassId),
        api.getClassRiskAnalysis(selectedClassId),
      ]);

      setClasses(classesRes.classes);
      setStudents(studentsRes.students);
      setAllBooks(booksRes.books);
      setTimetableSlots(ttRes.timetable);
      setHomeworkList(hwRes.homework);
      setTestsList(testRes.tests);
      setRiskData(riskRes);
    } catch (err) {
      console.error('Failed to load teacher data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedClassId]);

  useEffect(() => {
    const handleVoiceAction = (e: any) => {
      const { action, payload } = e.detail || {};
      if (action === 'SWITCH_TAB' && payload?.tab) {
        const validTabs: TeacherTab[] = ['overview', 'students', 'risk-analysis', 'timetable', 'homework', 'tests'];
        if (validTabs.includes(payload.tab as TeacherTab)) {
          setActiveTab(payload.tab as TeacherTab);
        }
      } else if (action === 'START_VOICE_ASSIGN' || payload?.openVoiceAssign) {
        const targetMode = payload?.mode === 'test' ? 'TEST' : 'HOMEWORK';
        setVoiceAssignInitialMode(targetMode);
        setShowVoiceAssignModal(true);
      }
    };

    window.addEventListener('smart-locker-action', handleVoiceAction);
    return () => window.removeEventListener('smart-locker-action', handleVoiceAction);
  }, []);

  const handleCreateHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHwTitle || !newHwDueDate) return;
    try {
      await api.createHomework({
        classId: selectedClassId,
        subject: newHwSubj,
        title: newHwTitle,
        description: newHwDesc,
        dueDate: newHwDueDate,
        requiredBookIds: newHwBooks,
        teacherId: currentUser.id,
        teacherName: currentUser.name,
      });
      setShowHwModal(false);
      setNewHwTitle('');
      setNewHwDesc('');
      setNewHwBooks([]);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestTitle || !newTestDate) return;
    try {
      await api.createTest({
        classId: selectedClassId,
        subject: newTestSubj,
        testTitle: newTestTitle,
        chapterTopic: newTestTopic,
        testDate: newTestDate,
        requiredBookIds: newTestBooks,
        teacherId: currentUser.id,
        teacherName: currentUser.name,
      });
      setShowTestModal(false);
      setNewTestTitle('');
      setNewTestTopic('');
      setNewTestBooks([]);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredStudents = (riskData?.students || []).filter(s =>
    s.studentName.toLowerCase().includes(searchStudentQuery.toLowerCase()) ||
    s.studentId.toLowerCase().includes(searchStudentQuery.toLowerCase()) ||
    s.lockerNumber.toLowerCase().includes(searchStudentQuery.toLowerCase())
  );

  return (
    <div id="teacher-portal-root" className="space-y-6">
      {/* Teacher Role Header & Permission Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
            <img
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
              alt={currentUser.name}
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{currentUser.name}</h1>
              <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                {currentUser.email}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active Mode: <strong className="text-indigo-600">{teacherRole === 'CLASS_TEACHER' ? 'Class Teacher (General Management)' : 'Subject Teacher (Coursework & Testing)'}</strong>
            </p>
          </div>
        </div>

        {/* Teacher Role Toggle & Class Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              id="teacher-mode-class-btn"
              onClick={() => setTeacherRole('CLASS_TEACHER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                teacherRole === 'CLASS_TEACHER'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Class Teacher
            </button>
            <button
              id="teacher-mode-subject-btn"
              onClick={() => setTeacherRole('SUBJECT_TEACHER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                teacherRole === 'SUBJECT_TEACHER'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Subject Teacher
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <span className="text-slate-500 font-medium">Class:</span>
            <select
              id="teacher-class-select"
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.studentCount} Students)
                </option>
              ))}
            </select>
          </div>

          <button
            id="btn-voice-assign-header"
            onClick={() => {
              setVoiceAssignInitialMode('HOMEWORK');
              setShowVoiceAssignModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Voice-Guided Assignment Workflow"
          >
            <span>Voice Assignment</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-2 shadow-xs overflow-x-auto">
        <nav className="flex items-center gap-1 min-w-max">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Class Analytics & Overview
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'students'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            Students & Lockers ({students.length})
          </button>

          <button
            onClick={() => setActiveTab('risk-analysis')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'risk-analysis'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BrainCircuit className="w-4 h-4 text-amber-500" />
            ML Forgetting Risk Matrix
            {riskData && riskData.highRiskCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-black">
                {riskData.highRiskCount} High Risk
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('timetable')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'timetable'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Class Timetable
          </button>

          <button
            onClick={() => setActiveTab('homework')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'homework'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            Homework ({homeworkList.length})
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'tests'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Tests & Exams ({testsList.length})
          </button>
        </nav>
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Total Enrolled Students</div>
              <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{students.length}</div>
              <div className="text-[11px] text-emerald-600 font-medium mt-1">Class {selectedClassId} Roster</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="text-xs text-slate-500 font-medium">High Forgetting Risk Students</div>
              <div className="text-2xl font-black text-amber-600 mt-1 font-mono">
                {riskData?.highRiskCount || 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Identified by ML Random Forest</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Active Homework</div>
              <div className="text-2xl font-black text-blue-600 mt-1 font-mono">{homeworkList.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">Linked with locker inventory</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Upcoming Tests</div>
              <div className="text-2xl font-black text-purple-600 mt-1 font-mono">{testsList.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">Science Chapter 3 Unit Test</div>
            </div>
          </div>

          {/* Teacher Action Quick Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Create Homework Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                    <FilePlus className="w-5 h-5 text-blue-600" />
                    Assign Coursework / Homework
                  </div>
                  <span className="text-xs text-slate-400">Class {selectedClassId}</span>
                </div>
                <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                  Specify textbook and notebook requirements. The system automatically verifies students' locker kits and sends missing alerts.
                </p>
              </div>

              <button
                id="open-create-hw-modal-btn"
                onClick={() => setShowHwModal(true)}
                className="mt-6 flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create New Homework Assignment
              </button>
            </div>

            {/* Quick Create Test Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                    <GraduationCap className="w-5 h-5 text-purple-600" />
                    Schedule Examination / Test
                  </div>
                  <span className="text-xs text-slate-400">Class {selectedClassId}</span>
                </div>
                <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                  Schedule upcoming unit tests. Feeds the trained Machine Learning predictor to flag students with elevated forgetting probabilities.
                </p>
              </div>

              <button
                id="open-create-test-modal-btn"
                onClick={() => setShowTestModal(true)}
                className="mt-6 flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                Schedule New Test / Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: STUDENTS & LOCKER STATUS */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Class {selectedClassId} Student Roster ({students.length} Students)
              </h3>
              <p className="text-xs text-slate-500">Live locker occupancy and scan compliance monitoring</p>
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchStudentQuery}
                onChange={e => setSearchStudentQuery(e.target.value)}
                placeholder="Search student or locker..."
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-y border-slate-200/60">
                <tr>
                  <th className="py-3 px-4">Roll No</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Assigned Locker</th>
                  <th className="py-3 px-4">Locker Books</th>
                  <th className="py-3 px-4">Historical Misses</th>
                  <th className="py-3 px-4">Scan Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map(st => (
                  <tr key={st.studentId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">#{st.rollNumber}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{st.studentName}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{st.studentId}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                        {st.lockerNumber}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-indigo-600">{st.currentLockerBookCount} Books</span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className={st.riskLevel === 'HIGH' ? 'text-amber-600 font-bold' : 'text-slate-600'}>
                        {st.riskLevel === 'HIGH' ? `⚠️ High Risk (${Math.round(st.probability * 100)}%)` : 'Normal'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{st.rollNumber * 2 + 15}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ML FORGETTING RISK MATRIX */}
      {activeTab === 'risk-analysis' && riskData && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Machine Learning Forgetting Risk Prediction Matrix
              </h3>
              <p className="text-xs text-slate-500">
                Live output generated by the Supervised Random Forest Classifier (Class {selectedClassId})
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
              <div className="text-xs font-bold text-rose-900 uppercase">High Risk Students</div>
              <div className="text-3xl font-black text-rose-700 mt-1 font-mono">{riskData.highRiskCount}</div>
              <p className="text-[11px] text-rose-800 mt-1">&gt; 65% predicted probability of forgetting</p>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="text-xs font-bold text-amber-900 uppercase">Moderate Risk</div>
              <div className="text-3xl font-black text-amber-700 mt-1 font-mono">{riskData.mediumRiskCount}</div>
              <p className="text-[11px] text-amber-800 mt-1">35% - 65% probability</p>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="text-xs font-bold text-emerald-900 uppercase">Low Risk (Compliant)</div>
              <div className="text-3xl font-black text-emerald-700 mt-1 font-mono">{riskData.lowRiskCount}</div>
              <p className="text-[11px] text-emerald-800 mt-1">&lt; 35% probability</p>
            </div>
          </div>

          {/* List of High-Risk Students and contributing factors */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
              Students Ranked by Predicted Risk
            </h4>

            {riskData.students.slice(0, 15).map(s => (
              <div
                key={s.studentId}
                className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{s.studentName}</span>
                    <span className="font-mono text-xs text-slate-500">({s.studentId})</span>
                    <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200">
                      Locker: {s.lockerNumber}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    Subject: <strong>{s.subject}</strong> • Contributing factors: {s.contributingFactors?.join(', ')}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-mono font-black text-slate-900">
                      {Math.round(s.probability * 100)}% Risk
                    </div>
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        s.riskLevel === 'HIGH'
                          ? 'bg-rose-100 text-rose-800'
                          : s.riskLevel === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {s.riskLevel}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: TIMETABLE */}
      {activeTab === 'timetable' && (() => {
        const dayInfo = getCurrentDayInfo();
        const filteredTimetable = timetableDayFilter === 'ALL'
          ? timetableSlots
          : timetableSlots.filter(s => s.day === timetableDayFilter);

        return (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Class {selectedClassId} Timetable Master</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span>Today: <strong className="text-slate-800 font-semibold">{dayInfo.formattedToday} ({dayInfo.todayName})</strong></span>
                  <span>•</span>
                  <span>Tomorrow: <strong className="text-indigo-700 font-semibold">{dayInfo.formattedTomorrow} ({dayInfo.tomorrowName})</strong></span>
                </div>
              </div>

              {/* Day Filter Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 overflow-x-auto">
                <button
                  onClick={() => setTimetableDayFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    timetableDayFilter === 'ALL'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Days ({timetableSlots.length})
                </button>
                {ACADEMIC_DAYS.map(day => {
                  const isToday = dayInfo.isToday(day);
                  const isTomorrow = dayInfo.isTomorrow(day);
                  return (
                    <button
                      key={day}
                      onClick={() => setTimetableDayFilter(day)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                        timetableDayFilter === day
                          ? 'bg-white text-indigo-600 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>{day}</span>
                      {isToday && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold">
                          Today
                        </span>
                      )}
                      {isTomorrow && (
                        <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-full font-bold">
                          Tomorrow
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTimetable.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No periods scheduled for selected day filter.
                </div>
              ) : (
                filteredTimetable.map((slot, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 space-y-2 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                        <span>{slot.day}</span>
                        {dayInfo.isToday(slot.day) && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-bold">Today</span>
                        )}
                        {dayInfo.isTomorrow(slot.day) && (
                          <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1 py-0.2 rounded font-bold">Tomorrow</span>
                        )}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {slot.timeSlot}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{slot.subject}</h4>
                    <div className="text-xs text-slate-500 flex justify-between pt-1 border-t border-slate-200/60">
                      <span>{slot.teacherName}</span>
                      <span>Room {slot.room}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })()}

      {/* TAB CONTENT: HOMEWORK */}
      {activeTab === 'homework' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Class {selectedClassId} Homework</h3>
              <p className="text-xs text-slate-500">Active homework requirements</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="btn-voice-assign-hw-tab"
                onClick={() => {
                  setVoiceAssignInitialMode('HOMEWORK');
                  setShowVoiceAssignModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>🎙️ Voice Assign</span>
              </button>
              <button
                onClick={() => setShowHwModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                New Homework
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {homeworkList.map(hw => (
              <div key={hw.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-900 text-sm">{hw.title}</h4>
                  <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                    Due: {hw.dueDate}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{hw.description}</p>
                <div className="text-xs text-slate-500">
                  <strong>Required Books: </strong> {hw.requiredBookNames.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: TESTS */}
      {activeTab === 'tests' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Class {selectedClassId} Tests & Exams</h3>
              <p className="text-xs text-slate-500">Scheduled evaluation dates and syllabus</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="btn-voice-schedule-test-tab"
                onClick={() => {
                  setVoiceAssignInitialMode('TEST');
                  setShowVoiceAssignModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>🎙️ Voice Schedule</span>
              </button>
              <button
                onClick={() => setShowTestModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Schedule Test
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {testsList.map(t => (
              <div key={t.id} className="p-4 bg-purple-50/50 rounded-xl border border-purple-200 space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-900 text-sm">{t.testTitle}</h4>
                  <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
                    Test Date: {t.testDate}
                  </span>
                </div>
                <p className="text-xs text-slate-600"><strong>Chapter/Topic:</strong> {t.chapterTopic}</p>
                <div className="text-xs text-slate-500">
                  <strong>Required Materials: </strong> {t.requiredBookNames.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE HOMEWORK MODAL */}
      {showHwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Create Homework for Class {selectedClassId}</h3>
            <form onSubmit={handleCreateHomework} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject</label>
                <select
                  value={newHwSubj}
                  onChange={e => setNewHwSubj(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="Mathematics">Mathematics</option>
                  <option value="Science">Science</option>
                  <option value="English">English</option>
                  <option value="Social Science">Social Science</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Computer Science">Computer Science</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newHwTitle}
                  onChange={e => setNewHwTitle(e.target.value)}
                  placeholder="e.g. Chapter 3 Exercise Problems"
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  value={newHwDesc}
                  onChange={e => setNewHwDesc(e.target.value)}
                  placeholder="Instructions for students..."
                  rows={2}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={newHwDueDate}
                  onChange={e => setNewHwDueDate(e.target.value)}
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Required Books</label>
                <div className="max-h-32 overflow-y-auto space-y-1 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {allBooks
                    .filter(b => b.classLevel === parseInt(selectedClassId.replace(/\D/g, '') || '8', 10))
                    .map(b => (
                      <label key={b.id} className="flex items-center gap-2 p-1 hover:bg-slate-100 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newHwBooks.includes(b.id)}
                          onChange={e => {
                            if (e.target.checked) setNewHwBooks([...newHwBooks, b.id]);
                            else setNewHwBooks(newHwBooks.filter(id => id !== b.id));
                          }}
                        />
                        <span>{b.bookName} ({b.id})</span>
                      </label>
                    ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowHwModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-500 shadow-xs"
                >
                  Save Homework
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TEST MODAL */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Schedule Test for Class {selectedClassId}</h3>
            <form onSubmit={handleCreateTest} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject</label>
                <select
                  value={newTestSubj}
                  onChange={e => setNewTestSubj(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="Science">Science</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="English">English</option>
                  <option value="Social Science">Social Science</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Computer Science">Computer Science</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Test Title</label>
                <input
                  type="text"
                  value={newTestTitle}
                  onChange={e => setNewTestTitle(e.target.value)}
                  placeholder="e.g. Chapter 3 Unit Test"
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Chapter / Topics Covered</label>
                <input
                  type="text"
                  value={newTestTopic}
                  onChange={e => setNewTestTopic(e.target.value)}
                  placeholder="e.g. Synthetic Fibres & Plastics"
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Test Date</label>
                <input
                  type="date"
                  value={newTestDate}
                  onChange={e => setNewTestDate(e.target.value)}
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Required Materials</label>
                <div className="max-h-32 overflow-y-auto space-y-1 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {allBooks
                    .filter(b => b.classLevel === parseInt(selectedClassId.replace(/\D/g, '') || '8', 10))
                    .map(b => (
                      <label key={b.id} className="flex items-center gap-2 p-1 hover:bg-slate-100 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newTestBooks.includes(b.id)}
                          onChange={e => {
                            if (e.target.checked) setNewTestBooks([...newTestBooks, b.id]);
                            else setNewTestBooks(newTestBooks.filter(id => id !== b.id));
                          }}
                        />
                        <span>{b.bookName} ({b.id})</span>
                      </label>
                    ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-500 shadow-xs"
                >
                  Schedule Test
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INTERACTIVE VOICE ASSIGNMENT WIZARD */}
      {showVoiceAssignModal && (
        <TeacherVoiceAssignModal
          currentUser={currentUser}
          selectedClassId={selectedClassId}
          allBooks={allBooks}
          initialMode={voiceAssignInitialMode}
          onClose={() => setShowVoiceAssignModal(false)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
};
