import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Archive,
  ArrowUpDown,
  BarChart2,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Cpu,
  Database,
  Download,
  Flame,
  Layers,
  Play,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Book,
  InventoryLog,
  MLModelEvaluation,
  MLPredictionResult,
  SchoolClass,
  Student,
  User,
} from '../types';
import { api } from '../services/api';
import { QRCodeModal } from './QRCodeModal';

interface AdminPortalProps {
  currentUser: User;
}

type AdminTab = 'overview' | 'ai-lab' | 'books' | 'students' | 'classes' | 'logs';

export const AdminPortal: React.FC<AdminPortalProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('ai-lab');
  const [overview, setOverview] = useState<any>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [evaluation, setEvaluation] = useState<MLModelEvaluation | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [selectedBookForQr, setSelectedBookForQr] = useState<Book | null>(null);

  // Book Registration Form
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [newBookName, setNewBookName] = useState('');
  const [newSubject, setNewSubject] = useState('Mathematics');
  const [newClassLevel, setNewClassLevel] = useState(8);
  const [newBookType, setNewBookType] = useState<'Textbook' | 'Notebook' | 'Workbook' | 'Record Book'>('Textbook');
  const [newWeight, setNewWeight] = useState(0.65);
  const [newDesc, setNewDesc] = useState('');

  // Live ML Sandbox Tester
  const [testStudentId, setTestStudentId] = useState('STU-8A-024');
  const [testSubject, setTestSubject] = useState('Science');
  const [testHwDue, setTestHwDue] = useState(1);
  const [testTomorrow, setTestTomorrow] = useState(1);
  const [testMisses, setTestMisses] = useState(5);
  const [testScannedCount, setTestScannedCount] = useState(2);
  const [sandboxResult, setSandboxResult] = useState<MLPredictionResult | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  const loadAdminData = async () => {
    try {
      const [
        overRes,
        booksRes,
        studRes,
        classRes,
        logsRes,
        evalRes,
      ] = await Promise.all([
        api.getAdminOverview(),
        api.getBooks(),
        api.getStudents(),
        api.getClasses(),
        api.getTransactions(),
        api.getMLEvaluation(),
      ]);

      setOverview(overRes);
      setBooks(booksRes.books);
      setStudents(studRes.students);
      setClasses(classRes.classes);
      setLogs(logsRes.transactions);
      setEvaluation(evalRes.evaluation);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  useEffect(() => {
    const handleVoiceAction = (e: any) => {
      const { action, payload } = e.detail || {};
      if (action === 'SWITCH_TAB' && payload?.tab) {
        const validTabs: AdminTab[] = ['overview', 'ai-lab', 'books', 'students', 'classes', 'logs'];
        if (validTabs.includes(payload.tab as AdminTab)) {
          setActiveTab(payload.tab as AdminTab);
        }
      }
    };

    window.addEventListener('smart-locker-action', handleVoiceAction);
    return () => window.removeEventListener('smart-locker-action', handleVoiceAction);
  }, []);

  const handleTrainModel = async () => {
    setIsTraining(true);
    try {
      const res = await api.trainModel(5200);
      setEvaluation(res.evaluation);
      // Run live sandbox prediction with newly updated model
      handleRunSandbox();
    } catch (err) {
      console.error(err);
    } finally {
      setIsTraining(false);
    }
  };

  const handleRunSandbox = async () => {
    setIsPredicting(true);
    try {
      const res = await api.predictForgetting({
        studentId: testStudentId,
        subject: testSubject,
        homeworkDue: testHwDue,
        testTomorrow: testTomorrow,
        previousMisses: Number(testMisses),
        numberOfBooksScanned: Number(testScannedCount),
        numberOfRequiredBooks: 4,
        classLevel: 8,
        subjectMissRate: testSubject === 'Science' ? 0.48 : 0.2,
      });
      setSandboxResult(res.prediction);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPredicting(false);
    }
  };

  const handleRegisterBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.registerBook({
        bookName: newBookName,
        subject: newSubject,
        classLevel: Number(newClassLevel),
        type: newBookType,
        weightKg: Number(newWeight),
        description: newDesc,
      });
      setShowAddBookModal(false);
      setNewBookName('');
      setNewDesc('');
      setSelectedBookForQr(res.book);
      loadAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div id="admin-portal-root" className="space-y-6">
      {/* Top Admin Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-md">
            <ShieldCheck className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Institutional Administration & AI Lab</h1>
              <span className="text-xs font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200">
                ADMIN ACCESS
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Centralized Control, Multi-Class Locker Architecture, & ML Model Governance
            </p>
          </div>
        </div>

        {/* Global Quick Stats */}
        {overview && (
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-center">
              <div className="text-[10px] text-slate-400 uppercase">Enrolled Students</div>
              <div className="font-bold text-slate-900 text-sm">{overview.totalStudents}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-center">
              <div className="text-[10px] text-slate-400 uppercase">Registered Books</div>
              <div className="font-bold text-indigo-600 text-sm">{overview.totalBooks}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-center">
              <div className="text-[10px] text-slate-400 uppercase">Smart Lockers</div>
              <div className="font-bold text-emerald-600 text-sm">{overview.totalLockers}</div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-2 shadow-xs overflow-x-auto">
        <nav className="flex items-center gap-1 min-w-max">
          <button
            onClick={() => setActiveTab('ai-lab')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ai-lab'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BrainCircuit className="w-4 h-4 text-indigo-400" />
            AI / ML Analytics & Model Training Lab
          </button>

          <button
            onClick={() => setActiveTab('books')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'books'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Books Catalog & QR Generator ({books.length})
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
            Students Roster ({students.length})
          </button>

          <button
            onClick={() => setActiveTab('classes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'classes'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            Classes (6A, 6B, 7A, 8A, 8B)
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'logs'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-4 h-4" />
            Locker Transaction Logs ({logs.length})
          </button>
        </nav>
      </div>

      {/* TAB CONTENT: AI & ML TRAINING LAB */}
      {activeTab === 'ai-lab' && evaluation && (
        <div className="space-y-6">
          {/* Model Status & Training Control Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  Supervised Random Forest Classifier • Model Governance
                </div>
                <h2 className="text-2xl font-black tracking-tight">{evaluation.modelType}</h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-2 font-mono">
                  <span>Version: <strong className="text-white">{evaluation.modelVersion}</strong></span>
                  <span>•</span>
                  <span>Dataset: <strong className="text-white">{evaluation.datasetSize} records</strong></span>
                  <span>•</span>
                  <span>Partition: <strong className="text-white">80% Train ({evaluation.trainingRecords}) / 20% Test ({evaluation.testingRecords})</strong></span>
                  <span>•</span>
                  <span>Trained: <strong className="text-white">{new Date(evaluation.trainingTimestamp).toLocaleTimeString()}</strong></span>
                </div>
              </div>

              {/* Retrain Action Button */}
              <button
                id="admin-train-ml-btn"
                onClick={handleTrainModel}
                disabled={isTraining}
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02]"
              >
                <RefreshCw className={`w-4 h-4 ${isTraining ? 'animate-spin' : ''}`} />
                {isTraining ? 'Fitting Ensemble Trees on 5,200 Samples...' : 'Retrain Random Forest Model'}
              </button>
            </div>

            {/* Real Dynamic Metrics Scorecards (Not Hard-Coded) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
              <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <div className="text-xs text-slate-400 font-medium">Model Accuracy</div>
                <div className="text-2xl font-black text-white font-mono mt-1">
                  {(evaluation.accuracy * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-emerald-400 mt-1">Evaluated on test set</div>
              </div>

              <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <div className="text-xs text-slate-400 font-medium">Precision (Forgot)</div>
                <div className="text-2xl font-black text-indigo-300 font-mono mt-1">
                  {(evaluation.precision * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-400 mt-1">TP / (TP + FP)</div>
              </div>

              <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <div className="text-xs text-slate-400 font-medium">Recall (Sensitivity)</div>
                <div className="text-2xl font-black text-amber-300 font-mono mt-1">
                  {(evaluation.recall * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-400 mt-1">TP / (TP + FN)</div>
              </div>

              <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <div className="text-xs text-slate-400 font-medium">F1 Score (Balanced)</div>
                <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                  {evaluation.f1Score.toFixed(3)}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Harmonic mean</div>
              </div>
            </div>
          </div>

          {/* Prediction Accuracy & Influencing Factors Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Real-World Prediction Results Grid */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-base">Test Results Breakdown</h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-500">{evaluation.testingRecords} Student Checks Tested</span>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Summary of AI predictions vs. actual student outcomes across 1,040 test scenarios.
              </p>

              {/* 2x2 User-Friendly Results Breakdown */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                    Correctly Kept
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-900 mt-1">
                    {evaluation.confusionMatrix.trueNegative}
                  </div>
                  <div className="text-[10px] text-emerald-700 mt-0.5">Student brought books as expected</div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">
                    False Alarm
                  </div>
                  <div className="text-2xl font-black font-mono text-amber-900 mt-1">
                    {evaluation.confusionMatrix.falsePositive}
                  </div>
                  <div className="text-[10px] text-amber-700 mt-0.5">Warned, but student still brought book</div>
                </div>

                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-bold text-rose-800 tracking-wider">
                    Missed Alert
                  </div>
                  <div className="text-2xl font-black font-mono text-rose-900 mt-1">
                    {evaluation.confusionMatrix.falseNegative}
                  </div>
                  <div className="text-[10px] text-rose-700 mt-0.5">Student forgot book with no warning</div>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                    Caught in Time
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-900 mt-1">
                    {evaluation.confusionMatrix.truePositive}
                  </div>
                  <div className="text-[10px] text-emerald-700 mt-0.5">Successfully prevented forgetting</div>
                </div>
              </div>
            </div>

            {/* Right: Key Factors Influencing Predictions */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-base">Key Factors Influencing Forgetting Risk</h3>
                </div>
                <span className="text-[11px] text-slate-500 font-semibold">Factor Impact Level</span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={evaluation.featureImportance.slice(0, 7)}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" unit="%" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="feature" type="category" tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(val: any) => [`${val}%`, 'Impact Weight']}
                      contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Bar dataKey="importance" fill="#4f46e5" radius={[0, 6, 6, 0]}>
                      {evaluation.featureImportance.slice(0, 7).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#4338ca' : '#6366f1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <p className="text-[11px] text-slate-500">
                Shows which behavioral triggers (such as past miss history, upcoming exams, or subject difficulty) contribute most to student forgetting risk.
              </p>
            </div>
          </div>

          {/* Live Inference Sandbox (Section 27) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Live Student Forgetting Predictor (Sandbox)</h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                Real-Time Inference
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">Student ID</label>
                <input
                  type="text"
                  value={testStudentId}
                  onChange={e => setTestStudentId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">Subject</label>
                <select
                  value={testSubject}
                  onChange={e => setTestSubject(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="Science">Science</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="English">English</option>
                  <option value="Social Science">Social Science</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">Test Tomorrow?</label>
                <select
                  value={testTomorrow}
                  onChange={e => setTestTomorrow(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value={1}>Yes (Scheduled Test)</option>
                  <option value={0}>No Test</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">Homework Due?</label>
                <select
                  value={testHwDue}
                  onChange={e => setTestHwDue(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value={1}>Yes (Homework Due)</option>
                  <option value={0}>No Homework</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">Previous Misses</label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={testMisses}
                  onChange={e => setTestMisses(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                id="run-sandbox-prediction-btn"
                onClick={handleRunSandbox}
                disabled={isPredicting}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                {isPredicting ? 'Evaluating Features...' : 'Run Live ML Prediction'}
              </button>

              {sandboxResult && (
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">Forgetting Probability: </span>
                    <strong className="font-mono text-slate-900 text-sm">
                      {Math.round(sandboxResult.probability * 100)}%
                    </strong>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full font-bold text-xs ${
                      sandboxResult.riskLevel === 'HIGH'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : sandboxResult.riskLevel === 'MEDIUM'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    Risk: {sandboxResult.riskLevel}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: BOOKS & QR GENERATOR */}
      {activeTab === 'books' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Institutional Books Catalog ({books.length} Books)</h3>
              <p className="text-xs text-slate-500">
                Books identified by unique Book ID encoded in standard QR barcodes
              </p>
            </div>

            <button
              id="admin-add-book-btn"
              onClick={() => setShowAddBookModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Register New Book
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-y border-slate-200/60">
                <tr>
                  <th className="py-3 px-4">Book ID</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Weight</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {books.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">{b.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{b.bookName}</td>
                    <td className="py-3 px-4">{b.subject}</td>
                    <td className="py-3 px-4 font-bold text-slate-700">Class {b.classLevel}</td>
                    <td className="py-3 px-4">{b.type}</td>
                    <td className="py-3 px-4 font-mono text-emerald-700 font-medium">{b.weightKg} kg</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        id={`generate-qr-${b.id}-btn`}
                        onClick={() => setSelectedBookForQr(b)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-colors"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        View / Print QR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: STUDENTS */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Students Database ({students.length} Students)</h3>
              <p className="text-xs text-slate-500">Complete student records across all classes</p>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-y border-slate-200 sticky top-0 bg-slate-50">
                <tr>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Roll No</th>
                  <th className="py-3 px-4">Assigned Locker</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Miss Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map(s => (
                  <tr key={s.studentId} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{s.studentId}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{s.name}</td>
                    <td className="py-3 px-4">Class {s.classId}</td>
                    <td className="py-3 px-4 font-mono">#{s.rollNumber}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {s.lockerNumber}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{s.email}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{s.previousMisses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: CLASSES */}
      {activeTab === 'classes' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Class Architecture & Divisions</h3>
              <p className="text-xs text-slate-500">Supporting Class 6A, 6B, 7A, 8A (60 students), and 8B</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {classes.map(c => (
              <div key={c.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black text-slate-900">{c.name}</span>
                  <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                    {c.studentCount} Students
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <div>Class Teacher: <strong>{c.classTeacherName}</strong></div>
                  <div>Assigned Room: {c.roomNumber}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: TRANSACTION LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Locker & Scan Activity Audit Logs</h3>
              <p className="text-xs text-slate-500">Immutable ledger of physical check-in / check-out transactions</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-y border-slate-200">
                <tr>
                  <th className="py-3 px-4">Log ID</th>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Locker</th>
                  <th className="py-3 px-4">Book ID</th>
                  <th className="py-3 px-4">Book Name</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {logs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 text-slate-400">{l.id}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">{l.studentId}</td>
                    <td className="py-2.5 px-4 text-indigo-600 font-bold">{l.lockerId}</td>
                    <td className="py-2.5 px-4 font-bold">{l.bookId}</td>
                    <td className="py-2.5 px-4 font-sans text-slate-800">{l.bookName}</td>
                    <td className="py-2.5 px-4 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          l.action === 'ADDED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {l.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">{new Date(l.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QR MODAL */}
      {selectedBookForQr && (
        <QRCodeModal book={selectedBookForQr} onClose={() => setSelectedBookForQr(null)} />
      )}

      {/* ADD BOOK MODAL */}
      {showAddBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Register New Academic Book</h3>
            <form onSubmit={handleRegisterBook} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Book Name</label>
                <input
                  type="text"
                  value={newBookName}
                  onChange={e => setNewBookName(e.target.value)}
                  placeholder="e.g. NCERT Mathematics Textbook"
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subject</label>
                  <select
                    value={newSubject}
                    onChange={e => setNewSubject(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="English">English</option>
                    <option value="Social Science">Social Science</option>
                    <option value="History">History</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Computer Science">Computer Science</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Class Level</label>
                  <select
                    value={newClassLevel}
                    onChange={e => setNewClassLevel(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value={6}>Class 6</option>
                    <option value={7}>Class 7</option>
                    <option value={8}>Class 8</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Book Type</label>
                  <select
                    value={newBookType}
                    onChange={e => setNewBookType(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="Textbook">Textbook</option>
                    <option value="Notebook">Notebook</option>
                    <option value="Workbook">Workbook</option>
                    <option value="Record Book">Record Book</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={newWeight}
                    onChange={e => setNewWeight(Number(e.target.value))}
                    required
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddBookModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-500 shadow-xs"
                >
                  Register & Generate QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
