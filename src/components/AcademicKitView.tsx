import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  HelpCircle,
  Layers,
  Sparkles,
  Weight,
  XCircle,
} from 'lucide-react';
import { AcademicKitSummary, Student } from '../types';
import { getCurrentDayInfo } from '../utils/dateUtils';

interface AcademicKitViewProps {
  kit: AcademicKitSummary;
  student: Student;
  onGoToScanner?: () => void;
}

export const AcademicKitView: React.FC<AcademicKitViewProps> = ({
  kit,
  student,
  onGoToScanner,
}) => {
  const dayInfo = getCurrentDayInfo();
  const missingItems = kit.requiredItems.filter(i => !i.isPresentInLocker);
  const presentItems = kit.requiredItems.filter(i => i.isPresentInLocker);
  const highRiskItems = kit.requiredItems.filter(i => i.mlRiskLevel === 'HIGH');

  return (
    <div id="academic-kit-container" className="space-y-6">
      {/* Header Summary Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="text-indigo-300 text-xs font-semibold tracking-wide uppercase mb-1">
              Curriculum Synchronization Engine · Kit Forecast
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Tomorrow's Academic Kit ({kit.dayName})</h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Calculated dynamically for <span className="font-semibold text-white">{dayInfo.formattedTomorrow} ({kit.dayName})</span> based on the class timetable, upcoming homework deadlines, test schedules, and real-time locker inventory.
            </p>
          </div>

          {/* Academic Kit Readiness Score */}
          <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/80 flex items-center gap-4 shrink-0">
            <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-slate-900 border-2 border-indigo-500">
              <span className="font-mono font-bold text-lg text-white">
                {kit.overallComplianceScore}%
              </span>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Readiness Index</div>
              <div className="text-xs font-bold text-white">
                {kit.requiredItems.length - missingItems.length} of {kit.requiredItems.length} Materials Packed
              </div>
            </div>
          </div>
        </div>

        {/* Scheduled Subjects */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">Scheduled Subjects ({kit.dayName}):</span>
          {kit.targetSubjects.map(sub => (
            <span
              key={sub}
              className="px-2.5 py-1 bg-slate-800 text-slate-200 rounded-lg text-xs font-medium border border-slate-700"
            >
              {sub}
            </span>
          ))}
        </div>
      </div>

      {/* Bag Weight Optimizer (Section 30 of MCA Specification) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Weight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Smart Bag Weight Optimization</h3>
              <p className="text-xs text-slate-500">
                Addresses the heavy backpack health problem by isolating non-required materials
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-500 font-medium">Estimated Bag Weight</div>
            <div className="text-lg font-black text-slate-900 font-mono">
              {kit.totalRequiredWeightKg} kg <span className="text-xs font-normal text-slate-500">({Math.round(kit.totalRequiredWeightKg * 1000)}g)</span>
            </div>
          </div>
        </div>

        {/* Weight Recommendation Callout */}
        <div className="mt-4 p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-950 leading-relaxed">
            <strong className="font-bold text-emerald-900">Locker Weight Optimization: </strong>
            {kit.weightSavingRecommendation}
          </div>
        </div>

        {kit.unnecessaryItemsInLocker.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
              Safe To Leave In Locker ({kit.unnecessaryItemsInLocker.length} items • {kit.unnecessaryWeightKg} kg savings):
            </div>
            <div className="flex flex-wrap gap-2">
              {kit.unnecessaryItemsInLocker.map(item => (
                <span
                  key={item.bookId}
                  className="px-3 py-1.5 bg-slate-100 text-slate-800 rounded-lg text-xs font-medium border border-slate-200 flex items-center gap-1.5"
                >
                  <span className="font-bold">{item.bookName}</span>
                  <span className="text-slate-500 font-mono text-[10px]">({item.weightKg}kg)</span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold">Not Required</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Required Kit Items Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">Required Academic Items Breakdown</h3>
          </div>
          {onGoToScanner && missingItems.length > 0 && (
            <button
              id="kit-scan-missing-btn"
              onClick={onGoToScanner}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
            >
              Scan Missing Books Now
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {kit.requiredItems.map(item => {
            const isMissing = !item.isPresentInLocker;
            const isHighRisk = item.mlRiskLevel === 'HIGH';

            return (
              <div
                key={item.bookId}
                className={`py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isHighRisk ? 'bg-amber-50/40 -mx-4 px-4 rounded-xl' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Status Indicator Icon */}
                  <div className="mt-0.5">
                    {isMissing ? (
                      <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                        <XCircle className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">{item.bookName}</h4>
                      <span className="font-mono text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                        {item.bookId}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500">
                        {item.subject} • {item.type} ({item.weightKg} kg)
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {item.reason}
                    </p>

                    {/* Retention Risk Notice */}
                    {isHighRisk && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs font-medium">
                        <BrainCircuit className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>
                          <strong>Elevated Forgetting Risk ({Math.round((item.mlForgettingProbability || 0) * 100)}%):</strong> Active assignment or test scheduled tomorrow; pack into bag or locker.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <div className="shrink-0 sm:text-right">
                  {isMissing ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-700 font-bold text-xs rounded-full border border-rose-200">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Missing in Locker
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Present in Locker
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
