import React, { useEffect, useState } from 'react';
import {
  Archive,
  ArrowRightLeft,
  GraduationCap,
  LogOut,
  ShieldCheck,
  UserCheck,
  User as UserIcon,
} from 'lucide-react';
import { User as UserType } from './types';
import { api } from './services/api';
import { StudentPortal } from './components/StudentPortal';
import { TeacherPortal } from './components/TeacherPortal';
import { AdminPortal } from './components/AdminPortal';
import { VoiceAssistant } from './components/VoiceAssistant';
import { AuthPage } from './components/AuthPage';

const LOCAL_STORAGE_KEY = 'academic_locker_authenticated_user';

export default function App() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showSwitchModal, setShowSwitchModal] = useState<boolean>(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const res = await api.getDemoUsers();
        setUsers(res.users);

        // Check stored user session
        const savedUserStr = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedUserStr) {
          try {
            const saved = JSON.parse(savedUserStr);
            // Verify if user still exists in current user list or keep saved
            const matched = res.users.find(u => u.id === saved.id || u.email.toLowerCase() === saved.email.toLowerCase());
            setCurrentUser(matched || saved);
          } catch {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
          }
        }
      } catch (err) {
        console.error('Failed to load system users:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const handleAuthSuccess = (user: UserType) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('Failed to store session:', e);
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setShowSwitchModal(false);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear session:', e);
    }
  };

  const handleSelectUser = (user: UserType) => {
    setCurrentUser(user);
    setShowSwitchModal(false);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('Failed to store session:', e);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-300">Loading Smart Academic Locker...</p>
        </div>
      </div>
    );
  }

  // Not signed in: Show Role-Based Authentication Sign In / Sign Up Page
  if (!currentUser) {
    return (
      <AuthPage
        onAuthSuccess={handleAuthSuccess}
        initialRole="STUDENT"
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Clean Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg block leading-tight">
                Smart Academic Locker
              </span>
              <p className="text-[11px] text-slate-500 hidden md:block">
                Intelligent Student Management & Bag Weight Optimization
              </p>
            </div>
          </div>

          {/* Current User Badge & Account Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Role Badge Indicator */}
            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              currentUser.role === 'STUDENT'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : currentUser.role === 'TEACHER'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {currentUser.role === 'STUDENT' && <GraduationCap className="w-3.5 h-3.5" />}
              {currentUser.role === 'TEACHER' && <UserCheck className="w-3.5 h-3.5" />}
              {currentUser.role === 'ADMIN' && <ShieldCheck className="w-3.5 h-3.5" />}
              <span>{currentUser.role}</span>
              {currentUser.role === 'STUDENT' && currentUser.classId && (
                <span className="text-[10px] opacity-75 font-normal">({currentUser.classId} • {currentUser.lockerId || 'Locker'})</span>
              )}
              {currentUser.role === 'TEACHER' && currentUser.assignedClassId && (
                <span className="text-[10px] opacity-75 font-normal">({currentUser.assignedClassId})</span>
              )}
            </div>

            {/* User Profile Snippet */}
            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-300 flex items-center justify-center shrink-0">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-4 h-4 text-slate-600" />
                )}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[130px]">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                  {currentUser.email}
                </div>
              </div>

              {/* Fast Switch Account Button */}
              <button
                type="button"
                onClick={() => setShowSwitchModal(true)}
                title="Switch User / Account"
                className="ml-1 p-1 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white transition-colors cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Switch Account Quick Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Switch Account / Role</h3>
                <p className="text-xs text-slate-500">Quickly toggle between pre-loaded test accounts</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSwitchModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {users.map(u => {
                const isSelected = u.id === currentUser.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUser(u)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-4 h-4 m-2 text-slate-500" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                          {u.name}
                          {isSelected && <span className="text-[10px] text-indigo-600 font-normal">(Active)</span>}
                        </div>
                        <div className="text-[11px] text-slate-500">{u.email}</div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      u.role === 'STUDENT'
                        ? 'bg-indigo-100 text-indigo-800'
                        : u.role === 'TEACHER'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {u.role}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleSignOut}
                className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Go to Sign In / Sign Up Page
              </button>
              <button
                type="button"
                onClick={() => setShowSwitchModal(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Viewport - Protected based on Authenticated Role */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentUser.role === 'STUDENT' && <StudentPortal currentUser={currentUser} />}
        {currentUser.role === 'TEACHER' && <TeacherPortal currentUser={currentUser} />}
        {currentUser.role === 'ADMIN' && <AdminPortal currentUser={currentUser} />}
      </main>

      {/* Multilingual AI Voice Assistant Widget */}
      <VoiceAssistant
        currentUser={currentUser}
        onSwitchUser={handleSelectUser}
        allUsers={users}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Smart Academic Locker & Student Management System</span>
          <span className="text-[11px] text-slate-400">
            Forgetting Risk Prediction • Real Camera QR Decoder • Bag Weight Optimization
          </span>
        </div>
      </footer>
    </div>
  );
}
