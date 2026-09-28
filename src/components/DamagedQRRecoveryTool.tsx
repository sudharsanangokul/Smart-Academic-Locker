import React, { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle,
  CheckCircle2,
  HelpCircle,
  Search,
  Sparkles,
  Wrench,
  XCircle,
} from 'lucide-react';
import { DamagedQRCandidate, Student } from '../types';
import { api } from '../services/api';

interface DamagedQRRecoveryToolProps {
  student: Student;
  onBookRegistered?: () => void;
}

export const DamagedQRRecoveryTool: React.FC<DamagedQRRecoveryToolProps> = ({
  student,
  onBookRegistered,
}) => {
  const [queryInput, setQueryInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [candidates, setCandidates] = useState<DamagedQRCandidate[] | null>(null);
  const [confirmedBook, setConfirmedBook] = useState<string | null>(null);

  const handleSearch = async (overrideQuery?: string) => {
    const q = (overrideQuery !== undefined ? overrideQuery : queryInput).trim();
    if (!q) return;

    setIsSearching(true);
    setConfirmedBook(null);
    try {
      const res = await api.recoverDamagedQR(q, student.studentId);
      setCandidates(res.candidates);
    } catch (err) {
      console.error('Damaged QR recovery error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirmCandidate = async (candidate: DamagedQRCandidate) => {
    try {
      await api.scanValidateBook(student.studentId, candidate.book.id, 'ADD');
      setConfirmedBook(candidate.book.bookName);
      if (onBookRegistered) {
        onBookRegistered();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div id="damaged-qr-tool-container" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">Damaged QR / Book Identification Engine</h2>
              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100 uppercase tracking-wider">
                AI Component 3
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Contextual book recovery when a QR code sticker is partially torn, smudged, or unreadable.
            </p>
          </div>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600 flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-800">Context-Aware Matching: </strong>
          Combines partial ID text, student class ({student.classId}), upcoming timetable subjects, and missing materials inventory to compute realistic probability rankings.
        </div>
      </div>

      {/* Input & Search bar */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          Enter Partial QR Code / Readable Fragment / Subject Text
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              id="damaged-qr-query-input"
              type="text"
              value={queryInput}
              onChange={e => setQueryInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. B-MATH, 08-001, Science Textbook, NCERT, Math..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>
          <button
            id="recover-damaged-book-btn"
            onClick={() => handleSearch()}
            disabled={!queryInput.trim() || isSearching}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-xs"
          >
            {isSearching ? 'Recovering...' : 'Find Candidates'}
          </button>
        </div>

        {/* Quick Sample Fragments for demo */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3 text-xs">
          <span className="text-[11px] text-slate-400 font-medium mr-1">Demo fragments:</span>
          {['B-MATH', '08-001', 'SCI', 'English Grammar', 'NCERT'].map(frag => (
            <button
              key={frag}
              onClick={() => {
                setQueryInput(frag);
                handleSearch(frag);
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-md font-mono text-[11px] border border-slate-200 transition-colors"
            >
              "{frag}"
            </button>
          ))}
        </div>
      </div>

      {/* Recovery Confirmation Notice */}
      {confirmedBook && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              <strong>Successfully Identified & Checked In: </strong> {confirmedBook} has been added to your Locker.
            </span>
          </div>
          <button
            onClick={() => setConfirmedBook(null)}
            className="text-emerald-700 hover:text-emerald-900 font-semibold underline text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Candidate Ranking List */}
      {candidates !== null && (
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              Identified Candidate Books ({candidates.length} matches)
            </h3>
            <span className="text-[11px] text-slate-500">Sorted by contextual confidence</span>
          </div>

          {candidates.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <AlertTriangle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No candidate books matched query</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Try entering a wider subject keyword or partial Book ID.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {candidates.map((cand, idx) => (
                <div
                  key={cand.book.id}
                  className="p-4 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                >
                  <div className="flex items-start gap-3">
                    {/* Confidence Score Visual */}
                    <div
                      className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 font-mono font-bold text-xs border ${
                        cand.confidenceScore >= 80
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : cand.confidenceScore >= 50
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-slate-200 text-slate-700 border-slate-300'
                      }`}
                    >
                      <span>{cand.confidenceScore}%</span>
                      <span className="text-[9px] uppercase tracking-tighter">Match</span>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900">{cand.book.bookName}</h4>
                        <span className="font-mono text-[10px] font-semibold bg-white text-slate-800 px-2 py-0.5 rounded-md border border-slate-200">
                          {cand.book.id}
                        </span>
                        <span className="text-xs text-slate-500">
                          Class {cand.book.classLevel} • {cand.book.subject} ({cand.book.weightKg} kg)
                        </span>
                      </div>

                      {/* Match Reasons Badges */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {cand.matchReasons.map((reason, rIdx) => (
                          <span
                            key={rIdx}
                            className="px-2 py-0.5 bg-white text-indigo-700 rounded-md text-[10px] font-medium border border-indigo-100"
                          >
                            ✓ {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Confirm or Reject Action */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      id={`confirm-candidate-${cand.book.id}-btn`}
                      onClick={() => handleConfirmCandidate(cand)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Confirm Book
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
