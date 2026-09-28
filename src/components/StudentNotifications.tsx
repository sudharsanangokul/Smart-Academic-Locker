import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  BrainCircuit,
  CheckCheck,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  Weight,
} from 'lucide-react';
import { NotificationItem } from '../types';
import { api } from '../services/api';

interface StudentNotificationsProps {
  notifications: NotificationItem[];
  onRefresh: () => void;
}

export const StudentNotifications: React.FC<StudentNotificationsProps> = ({
  notifications,
  onRefresh,
}) => {
  const handleMarkAllRead = async () => {
    try {
      await api.markNotificationRead(undefined, true);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkSingleRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: NotificationItem['type'], severity: NotificationItem['severity']) => {
    if (type === 'AI_FORGETTING_ALERT') return <BrainCircuit className="w-5 h-5 text-amber-600" />;
    if (type === 'BAG_WEIGHT_WARNING') return <Weight className="w-5 h-5 text-indigo-600" />;
    if (type === 'MISSING_MATERIAL') return <AlertCircle className="w-5 h-5 text-rose-600" />;
    if (type === 'WRONG_BOOK') return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    if (type === 'HOMEWORK_REMINDER' || type === 'TEST_REMINDER') return <FileText className="w-5 h-5 text-blue-600" />;
    return <Info className="w-5 h-5 text-slate-600" />;
  };

  return (
    <div id="student-notifications-container" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Academic & ML Notifications</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Personalized alerts from the requirement engine, forgetting predictor & teachers
            </p>
          </div>
        </div>

        {notifications.some(n => !n.read) && (
          <button
            id="mark-all-notifications-read-btn"
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark All Read
          </button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No active notifications.
          </div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              onClick={() => !notif.read && handleMarkSingleRead(notif.id)}
              className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 cursor-pointer ${
                !notif.read
                  ? 'bg-indigo-50/40 border-indigo-200 shadow-xs'
                  : 'bg-slate-50 border-slate-200/80 opacity-80'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white shadow-2xs border border-slate-200/60 shrink-0">
                  {getIcon(notif.type, notif.severity)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-900">{notif.title}</h4>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-2">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(notif.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {!notif.read && (
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full shrink-0">
                  New
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
