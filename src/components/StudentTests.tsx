import React from 'react';
import { AlertCircle, AlertTriangle, BookOpen, Calendar, CheckCircle2, Flame, GraduationCap } from 'lucide-react';
import { Locker, TestItem } from '../types';

interface StudentTestsProps {
  testsList: TestItem[];
  locker: Locker;
}

export const StudentTests: React.FC<StudentTestsProps> = ({ testsList, locker }) => {
  return (
    <div id="student-tests-container" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Upcoming Tests & Examinations</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              High-priority evaluation events feeding the Machine Learning forgetting risk predictor
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {testsList.length === 0 ? (
          <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No examinations scheduled for this period.
          </div>
        ) : (
          testsList.map(test => {
            const missingRequiredBooks = test.requiredBookIds.filter(
              id => !locker.currentBookIds.includes(id)
            );
            const isAllMaterialsReady = missingRequiredBooks.length === 0;

            return (
              <div
                key={test.id}
                className="p-5 bg-purple-50/40 rounded-xl border border-purple-200/80 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-purple-600 text-white rounded-lg text-xs font-bold shadow-2xs">
                      {test.subject} Test
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm">{test.testTitle}</h3>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-900 bg-purple-100 px-3 py-1 rounded-full border border-purple-300">
                    <Calendar className="w-3.5 h-3.5 text-purple-700" />
                    Exam Date: {test.testDate}
                  </span>
                </div>

                <div className="text-xs text-slate-600">
                  <strong>Chapter / Syllabus: </strong> {test.chapterTopic}
                </div>

                {/* Preparation Notice */}
                <div className="pt-3 border-t border-purple-200/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      Mandatory Materials Required For Exam:
                    </span>
                    {isAllMaterialsReady ? (
                      <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> All Materials In Locker
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> ⚠️ Exam Material Missing
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {test.requiredBookNames.map((name, idx) => {
                      const bookId = test.requiredBookIds[idx];
                      const inLocker = locker.currentBookIds.includes(bookId);

                      return (
                        <span
                          key={idx}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${
                            inLocker
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200 shadow-xs'
                          }`}
                        >
                          {inLocker ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                          )}
                          <span>{name}</span>
                          <span className="font-mono text-[10px] opacity-75">({bookId})</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
