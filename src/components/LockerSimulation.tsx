import React, { useState } from 'react';
import {
  Archive,
  ArrowUpFromLine,
  CheckCircle2,
  Clock,
  History,
  Lock,
  Package,
  QrCode,
  Sparkles,
  Trash2,
  Unlock,
  Weight,
  X,
  Zap,
} from 'lucide-react';
import { Book, InventoryLog, Locker, Student } from '../types';
import { api } from '../services/api';

interface LockerSimulationProps {
  student: Student;
  locker: Locker;
  allBooks: Book[];
  logs: InventoryLog[];
  onRefresh: () => void;
}

export const LockerSimulation: React.FC<LockerSimulationProps> = ({
  student,
  locker,
  allBooks,
  logs,
  onRefresh,
}) => {
  const [isToggling, setIsToggling] = useState(false);
  const [isRemovingId, setIsRemovingId] = useState<string | null>(null);
  const [showLockerQrModal, setShowLockerQrModal] = useState(false);
  const [lockerQrUrl, setLockerQrUrl] = useState<string>('');

  // Books currently inside student's locker
  const currentBooks = locker.currentBookIds
    .map(id => allBooks.find(b => b.id === id))
    .filter((b): b is Book => Boolean(b));

  const totalWeightKg = currentBooks.reduce((acc, b) => acc + b.weightKg, 0);

  const handleToggleLock = async () => {
    setIsToggling(true);
    try {
      await api.toggleLockerStatus(locker.id);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsToggling(false);
    }
  };

  const handleRemoveBook = async (bookId: string) => {
    setIsRemovingId(bookId);
    try {
      await api.removeBook(student.studentId, bookId);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRemovingId(null);
    }
  };

  const openLockerQr = () => {
    setShowLockerQrModal(true);
    import('qrcode').then(QRCode => {
      QRCode.toDataURL(`LOCKER:${locker.lockerNumber}`, {
        width: 280,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      }).then(url => {
        setLockerQrUrl(url);
      });
    });
  };

  const isLockerOpen = locker.status === 'OPEN';

  return (
    <div id="locker-simulation-container" className="space-y-6">
      {/* Top Banner with Physical Locker State */}
      <div className={`bg-white rounded-2xl border transition-all duration-500 shadow-xs p-6 ${
        isLockerOpen ? 'border-emerald-300 ring-4 ring-emerald-500/10' : 'border-slate-200/80'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-mono font-bold text-lg transition-all duration-500 shadow-inner ${
                isLockerOpen
                  ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-400 scale-105 shadow-emerald-200'
                  : 'bg-slate-800 text-white border-2 border-slate-700'
              }`}
            >
              {locker.lockerNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">
                  Smart Locker Simulation <span className="font-mono text-indigo-600">({locker.lockerNumber})</span>
                </h2>
                <span
                  id="locker-status-badge"
                  className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase flex items-center gap-1.5 transition-all duration-500 ${
                    isLockerOpen
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs shadow-emerald-500/20'
                      : 'bg-slate-100 text-slate-700 border border-slate-300'
                  }`}
                >
                  <span className={`inline-block transition-transform duration-300 ${isLockerOpen ? 'animate-shackle-pop text-emerald-600' : ''}`}>
                    {isLockerOpen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  </span>
                  <span>{locker.status}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Assigned Student: <strong className="text-slate-800">{student.name}</strong> ({student.studentId} • Class {student.classId})
              </p>
            </div>
          </div>

          {/* Action buttons to Lock/Unlock or show Locker Unit QR */}
          <div className="flex items-center gap-2">
            <button
              id="show-locker-qr-btn"
              onClick={openLockerQr}
              title="Show Unit QR Code"
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200/80 transition-all hover:scale-102 cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Unit QR Card</span>
            </button>

            <button
              id="toggle-locker-lock-btn"
              onClick={handleToggleLock}
              disabled={isToggling}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-500 shadow-xs cursor-pointer ${
                isLockerOpen
                  ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
              }`}
            >
              {isLockerOpen ? (
                <>
                  <Lock className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                  <span>Simulate Door Close & Lock</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                  <span>Authenticate & Open Locker Door</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3D-styled Visual Digital Locker Unit and Shelf Contents */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Physical Locker Graphic Panel */}
        <div className={`lg:col-span-5 bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-6 text-white border transition-all duration-500 shadow-xl flex flex-col justify-between ${
          isLockerOpen ? 'border-emerald-500/50 shadow-emerald-950/40' : 'border-slate-700'
        }`}>
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/80">
              <div className="flex items-center gap-2">
                <div className="relative flex items-center justify-center">
                  <div
                    className={`w-3 h-3 rounded-full transition-all duration-500 ${
                      isLockerOpen
                        ? 'bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse'
                        : 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                    }`}
                  />
                  {isLockerOpen && (
                    <span className="absolute w-5 h-5 rounded-full bg-emerald-400/30 animate-ping" />
                  )}
                </div>
                <span className="text-xs font-mono text-slate-300 font-medium transition-colors duration-300">
                  SOLENOID SENSOR: {isLockerOpen ? 'RELEASED (OPEN)' : 'ENGAGED (LOCKED)'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">LOCKER v2.4</span>
            </div>

            {/* Locker Graphic Door Representation with 3D Depth & Light Transitions */}
            <div className={`my-6 relative border-4 rounded-2xl bg-slate-950 p-5 shadow-2xl overflow-hidden min-h-[290px] flex flex-col justify-between transition-all duration-700 perspective-1000 ${
              isLockerOpen
                ? 'border-emerald-500/60 shadow-[0_0_35px_rgba(16,185,129,0.18)] bg-gradient-to-b from-slate-950 via-emerald-950/20 to-slate-950'
                : 'border-slate-700 bg-slate-950'
            }`}>
              {/* Top Ventilation Grille */}
              <div className="flex justify-center gap-1.5 py-1">
                <div className="w-8 h-1 bg-slate-800 rounded-full transition-colors duration-500" />
                <div className="w-8 h-1 bg-slate-800 rounded-full transition-colors duration-500" />
                <div className="w-8 h-1 bg-slate-800 rounded-full transition-colors duration-500" />
                <div className="w-8 h-1 bg-slate-800 rounded-full transition-colors duration-500" />
              </div>

              {/* Number Plate with Glow */}
              <div className={`text-center py-3 rounded-xl border transition-all duration-500 ${
                isLockerOpen
                  ? 'bg-slate-900/95 border-emerald-500/40 shadow-inner'
                  : 'bg-slate-900/90 border-slate-800 shadow-inner'
              }`}>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">SMART LOCKER</div>
                <div className={`font-mono text-3xl font-extrabold tracking-wider transition-all duration-500 ${
                  isLockerOpen ? 'text-emerald-400 scale-102' : 'text-indigo-400'
                }`}>
                  {locker.lockerNumber}
                </div>
                <div className="text-[11px] text-slate-300 font-medium mt-0.5">{student.name}</div>
              </div>

              {/* Solenoid Latch Hardware Visual Animation */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 border border-slate-800/80 rounded-xl my-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className={`w-3 h-3 transition-colors duration-300 ${isLockerOpen ? 'text-emerald-400' : 'text-slate-500'}`} />
                  Magnetic Bolt
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono font-bold transition-colors duration-300 ${isLockerOpen ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isLockerOpen ? 'RETRACTED' : 'SECURED'}
                  </span>
                  <div className="w-10 h-3 bg-slate-950 rounded-full border border-slate-700 p-0.5 flex items-center">
                    <div className={`h-2 rounded-full transition-all duration-500 ease-out ${
                      isLockerOpen
                        ? 'w-2 bg-emerald-400 translate-x-0 shadow-[0_0_6px_#34d399]'
                        : 'w-5 bg-amber-400 translate-x-3.5 shadow-[0_0_6px_#f59e0b]'
                    }`} />
                  </div>
                </div>
              </div>

              {/* Locker Door Simulation Status visual with Smooth Crossfade */}
              <div className="text-center my-1">
                <div className={`p-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all duration-500 ease-out ${
                  isLockerOpen
                    ? 'bg-emerald-950/90 border border-emerald-600/80 text-emerald-200 shadow-md shadow-emerald-950/40 animate-locker-glow'
                    : 'bg-slate-900/90 border border-slate-800 text-slate-400 shadow-inner'
                }`}>
                  <span className={`transition-transform duration-500 ${isLockerOpen ? 'rotate-0 scale-110' : '-rotate-6 scale-95'}`}>
                    {isLockerOpen ? (
                      <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                  </span>
                  <span className="font-medium">
                    {isLockerOpen
                      ? 'Locker unit unlocked & accessible. Ready to deposit or take books.'
                      : 'Locker unit secured. Authenticated QR scan or student token required.'}
                  </span>
                </div>
              </div>

              {/* Bottom Weight & Load Stats */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-1 text-slate-300">
                  <Weight className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Payload: {totalWeightKg.toFixed(2)} kg</span>
                </div>
                <div className="text-slate-400">Items: {currentBooks.length}</div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 text-center bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/60">
            Simulated Software Lock Controller • High-reliability IoT electronic latch with optical feedback.
          </div>
        </div>

        {/* Shelf Inventory View */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex-1">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Current Locker Inventory</h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                {currentBooks.length} Items In Locker
              </span>
            </div>

            {/* List of Books currently in Locker */}
            <div className="mt-4 space-y-3">
              {currentBooks.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Locker is empty</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Use the Camera Scanner or manual scan to check in your required books.
                  </p>
                </div>
              ) : (
                currentBooks.map(book => (
                  <div
                    key={book.id}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                          book.type === 'TEXTBOOK'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {book.type === 'TEXTBOOK' ? 'TB' : 'NB'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-snug">{book.bookName}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span className="font-mono">{book.id}</span>
                          <span>•</span>
                          <span>{book.subject}</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-medium">Weight: {book.weightKg} kg</span>
                        </div>
                      </div>
                    </div>

                    <button
                      id={`remove-book-${book.id}-btn`}
                      onClick={() => handleRemoveBook(book.id)}
                      disabled={isRemovingId === book.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white text-slate-700 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                    >
                      <ArrowUpFromLine className="w-3.5 h-3.5" />
                      Take Out
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Real-time Locker Transaction Log History */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <History className="w-4 h-4 text-indigo-600" />
              <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                Recent Locker Access & Transaction Logs
              </h4>
            </div>

            <div className="mt-3 divide-y divide-slate-100 max-h-48 overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <div className="text-xs text-slate-400 py-3 text-center">No transaction logs recorded yet.</div>
              ) : (
                logs.slice(0, 8).map(log => (
                  <div key={log.id} className="py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded-md font-bold text-[10px] ${
                          log.action === 'ADDED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {log.action}
                      </span>
                      <span className="font-medium text-slate-800">{log.bookName}</span>
                      <span className="font-mono text-[10px] text-slate-400">({log.bookId})</span>
                    </div>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Locker Unit QR Code Modal */}
      {showLockerQrModal && (
        <div id="locker-qr-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2 text-slate-900">
                <QrCode className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm">Locker Unlock QR Card</h3>
              </div>
              <button
                onClick={() => setShowLockerQrModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center text-center">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-inner mb-3">
                {lockerQrUrl ? (
                  <img src={lockerQrUrl} alt="Locker QR" className="w-52 h-52 rounded-xl bg-white p-2 border border-slate-100 shadow-xs" />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center text-slate-400">
                    Generating Locker QR...
                  </div>
                )}
                <div className="mt-2.5 font-mono font-bold text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg border border-indigo-100 inline-block">
                  LOCKER:{locker.lockerNumber}
                </div>
              </div>

              <h4 className="font-bold text-slate-900 text-base">Unit #{locker.lockerNumber}</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Scan this QR code with the Real Camera Scanner to instantly authenticate and unlock your locker unit.
              </p>

              <button
                onClick={() => setShowLockerQrModal(false)}
                className="mt-5 w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
