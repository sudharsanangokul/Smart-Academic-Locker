import React, { useState } from 'react';
import { Calendar, Clock, Info, MapPin, Sparkles, UserCheck } from 'lucide-react';
import { TimetableSlot } from '../types';
import { ACADEMIC_DAYS, getCurrentDayInfo } from '../utils/dateUtils';

interface StudentTimetableProps {
  slots: TimetableSlot[];
  studentClass: string;
}

export const StudentTimetable: React.FC<StudentTimetableProps> = ({ slots, studentClass }) => {
  const dayInfo = getCurrentDayInfo();
  
  // Default to tomorrow's academic day (or today if desired)
  const [activeDay, setActiveDay] = useState<string>(dayInfo.targetTomorrowDay);

  const filteredSlots = slots.filter(s => s.day === activeDay);

  return (
    <div id="student-timetable-container" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Academic Schedule ({studentClass})</h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>Today: <strong className="text-slate-800 font-semibold">{dayInfo.formattedToday} ({dayInfo.todayName})</strong></span>
              <span>•</span>
              <span>Tomorrow: <strong className="text-indigo-700 font-semibold">{dayInfo.formattedTomorrow} ({dayInfo.tomorrowName})</strong></span>
            </div>
          </div>
        </div>

        {/* Day Switcher with Live Dynamic Badges */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 overflow-x-auto">
          {ACADEMIC_DAYS.map(day => {
            const isToday = dayInfo.isToday(day);
            const isTomorrow = dayInfo.isTomorrow(day);
            const isNextAcademic = dayInfo.isNextAcademicDay(day);

            return (
              <button
                key={day}
                id={`btn-timetable-day-${day.toLowerCase()}`}
                onClick={() => setActiveDay(day)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeDay === day
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
                {!isTomorrow && isNextAcademic && dayInfo.isWeekend && (
                  <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-full font-bold">
                    Next School Day
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Banner for Selected Day */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 text-xs text-slate-700">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            Showing periods for <strong className="text-slate-900">{activeDay}</strong>
            {dayInfo.isToday(activeDay) && ' (Today)'}
            {dayInfo.isTomorrow(activeDay) && ` (Tomorrow - ${dayInfo.formattedTomorrow})`}
            {!dayInfo.isTomorrow(activeDay) && dayInfo.isNextAcademicDay(activeDay) && ' (Next School Day)'}
          </span>
        </div>
        <span className="font-mono text-slate-500 font-medium">{filteredSlots.length} Periods Scheduled</span>
      </div>

      {/* Slots List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSlots.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No academic periods scheduled for {activeDay}.
          </div>
        ) : (
          filteredSlots.map((slot, idx) => (
            <div
              key={slot.id || idx}
              className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition-all space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {slot.timeSlot}
                </span>
                <span className="text-[10px] font-medium text-slate-400">Period {idx + 1}</span>
              </div>

              <h4 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                {slot.subject}
              </h4>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>{slot.teacherName}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {slot.room}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
