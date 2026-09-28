import React from 'react';
import { AlertCircle, BookCheck, BookOpen, Calendar, CheckCircle2, Clock, FileText } from 'lucide-react';
import { Homework, Locker } from '../types';

interface StudentHomeworkProps {
  homeworkList: Homework[];
  locker: Locker;
}

export const StudentHomework: React.FC<StudentHomeworkProps> = ({ homeworkList, locker }) => {
  return (
    <div id="student-homework-container" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Assigned Homework & Exercises</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Material requirements linked directly with locker inventory verification
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {homeworkList.length === 0 ? (
          <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No pending homework assignments.
          </div>
        ) : (
          homeworkList.map(hw => {
            const missingRequiredBooks = hw.requiredBookIds.filter(
              id => !locker.currentBookIds.includes(id)
            );
            const isAllMaterialsReady = missingRequiredBooks.length === 0;

            return (
              <div
                key={hw.id}
                className="p-5 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200/90 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold">
                      {hw.subject}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm">{hw.title}</h3>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-medium text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      Due: {hw.dueDate}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{hw.description}</p>

                {/* Required Materials Checklist */}
                <div className="pt-3 border-t border-slate-200/70">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Required Materials for this Homework:
                    </span>
                    {isAllMaterialsReady ? (
                      <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> All Materials In Locker
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Missing {missingRequiredBooks.length} Book(s)
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {hw.requiredBookNames.map((name, idx) => {
                      const bookId = hw.requiredBookIds[idx];
                      const inLocker = locker.currentBookIds.includes(bookId);

                      return (
                        <span
                          key={idx}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${
                            inLocker
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
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
