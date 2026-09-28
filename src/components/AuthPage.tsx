import React, { useState } from 'react';
import {
  Archive,
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Mail,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { User as UserType, UserRole } from '../types';
import { api } from '../services/api';

interface AuthPageProps {
  onAuthSuccess: (user: UserType) => void;
  initialRole?: UserRole;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onAuthSuccess,
  initialRole = 'STUDENT',
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sign In Form States
  const [loginIdentifier, setLoginIdentifier] = useState<string>('student@school.com');
  const [loginPassword, setLoginPassword] = useState<string>('student123');

  // Sign Up Form States (Student Only)
  const [fullName, setFullName] = useState<string>('');
  const [signupEmail, setSignupEmail] = useState<string>('');
  const [signupPassword, setSignupPassword] = useState<string>('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState<string>('');
  const [studentClassId, setStudentClassId] = useState<string>('8A');
  const [studentSection, setStudentSection] = useState<string>('A');
  const [studentRollNumber, setStudentRollNumber] = useState<number>(25);

  // Switch role and update sensible default login credentials
  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    // Teacher and Admin ONLY have sign in (no self-registration)
    if (role !== 'STUDENT') {
      setAuthMode('signin');
    }
    if (role === 'STUDENT') {
      setLoginIdentifier('student@school.com');
      setLoginPassword('student123');
    } else if (role === 'TEACHER') {
      setLoginIdentifier('teacher1@gmail.com');
      setLoginPassword('Teacher@123');
    } else if (role === 'ADMIN') {
      setLoginIdentifier('admin@gmail.com');
      setLoginPassword('Admin@123');
    }
  };

  const handleQuickDemoLogin = async (email: string, pass: string) => {
    setLoginIdentifier(email);
    setLoginPassword(pass);
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.login(email, pass, selectedRole);
      onAuthSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check demo account status.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!loginIdentifier.trim()) {
      setErrorMessage('Please enter your school email or Student ID.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.login(loginIdentifier.trim(), loginPassword, selectedRole);
      onAuthSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Sign in failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setErrorMessage('Please enter a valid school email address.');
      return;
    }
    if (signupPassword.length < 4) {
      setErrorMessage('Password must be at least 4 characters long.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        name: fullName.trim(),
        email: signupEmail.trim(),
        password: signupPassword,
        role: 'STUDENT' as const,
        classId: studentClassId,
        section: studentSection,
        rollNumber: Number(studentRollNumber) || 25,
      };

      const res = await api.register(payload);
      onAuthSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please check inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  // Preview generated Student ID and Locker Number
  const previewStudentId = `STU-${studentClassId}-${String(studentRollNumber).padStart(3, '0')}`;
  const previewLockerId = `L-${String(studentRollNumber).padStart(3, '0')}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top subtle brand bar */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-xs py-3.5 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Archive className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm tracking-tight block leading-none">
                Smart Academic Locker
              </span>
              <span className="text-[11px] text-slate-500">Institutional Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Campus Network Secure</span>
          </div>
        </div>
      </div>

      {/* Main Centered Card Viewport */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-xl">
          {/* Card Container */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8">
            {/* Header Titles */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Academic Portal Authentication
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Select your role to access locker management and academic tools
              </p>
            </div>

            {/* Role Selection Tabs */}
            <div className="mb-6">
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-xl">
                {/* Student Tab */}
                <button
                  type="button"
                  onClick={() => handleRoleChange('STUDENT')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    selectedRole === 'STUDENT'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Student</span>
                </button>

                {/* Teacher Tab */}
                <button
                  type="button"
                  onClick={() => handleRoleChange('TEACHER')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    selectedRole === 'TEACHER'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Teacher</span>
                </button>

                {/* Admin Tab */}
                <button
                  type="button"
                  onClick={() => handleRoleChange('ADMIN')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    selectedRole === 'ADMIN'
                      ? 'bg-white text-amber-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin</span>
                </button>
              </div>
            </div>

            {/* Mode Switcher Toggle: Only shown for Students */}
            {selectedRole === 'STUDENT' ? (
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    {authMode === 'signin' ? 'Student Sign In' : 'New Student Registration'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {authMode === 'signin'
                      ? 'Access your digital locker, timetable, and bag weight alerts'
                      : 'Create your account and automatically provision your smart locker'}
                  </p>
                </div>

                <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setErrorMessage(null);
                    }}
                    className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                      authMode === 'signin'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setErrorMessage(null);
                    }}
                    className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                      authMode === 'signup'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Register
                  </button>
                </div>
              </div>
            ) : (
              /* Teacher and Admin Header: Sign In Only */
              <div className="border-b border-slate-100 pb-3 mb-5">
                <h2 className="text-base font-bold text-slate-800">
                  {selectedRole === 'TEACHER' ? 'Faculty & Teacher Sign In' : 'Institutional Admin Sign In'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Staff credentials are institutional and provisioned by campus administration.
                </p>
              </div>
            )}

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <span className="font-bold text-red-600 shrink-0">✕</span>
                <span className="flex-1">{errorMessage}</span>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* SIGN IN FORM (Students, Teachers, and Admins) */}
            {/* ------------------------------------------------------------- */}
            {authMode === 'signin' && (
              <form onSubmit={handleSignInSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {selectedRole === 'STUDENT' ? 'Student Email or Student ID' : 'Institutional Email Address'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      {selectedRole === 'STUDENT' ? <GraduationCap className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                    </div>
                    <input
                      type="text"
                      value={loginIdentifier}
                      onChange={e => setLoginIdentifier(e.target.value)}
                      placeholder={
                        selectedRole === 'STUDENT'
                          ? 'e.g. student@school.com or STU-8A-024'
                          : selectedRole === 'TEACHER'
                          ? 'e.g. teacher1@gmail.com'
                          : 'e.g. admin@gmail.com'
                      }
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Password
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Demo password:{' '}
                      <code className="font-mono text-slate-600 font-semibold">
                        {selectedRole === 'STUDENT' ? 'student123' : selectedRole === 'TEACHER' ? 'Teacher@123' : 'Admin@123'}
                      </code>
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    selectedRole === 'STUDENT'
                      ? 'bg-indigo-600 hover:bg-indigo-700'
                      : selectedRole === 'TEACHER'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In as {selectedRole.charAt(0) + selectedRole.slice(1).toLowerCase()}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* 1-Click Fast Demo Credentials */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Quick Demo Access:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedRole === 'STUDENT' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleQuickDemoLogin('student@school.com', 'student123')}
                          className="text-left p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 transition-colors cursor-pointer"
                        >
                          <div className="text-xs font-bold text-slate-900">
                            Rahul Kumar
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Class 8A · Roll 24 · Locker L-024
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleQuickDemoLogin('aarav@school.com', 'student123')}
                          className="text-left p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 transition-colors cursor-pointer"
                        >
                          <div className="text-xs font-bold text-slate-900">
                            Aarav Sharma
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Class 8A · Roll 2 · Locker L-002
                          </div>
                        </button>
                      </>
                    )}

                    {selectedRole === 'TEACHER' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleQuickDemoLogin('teacher1@gmail.com', 'Teacher@123')}
                          className="text-left p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50/50 hover:border-emerald-300 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">Mr. Ramesh Sharma</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono px-1.5 py-0.5 rounded font-semibold">Teacher@123</span>
                          </div>
                          <div className="text-[11px] text-slate-600 mt-1">
                            <code className="text-slate-800 font-medium">teacher1@gmail.com</code> · Class Teacher (8A)
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleQuickDemoLogin('teacher2@gmail.com', 'Teacher@123')}
                          className="text-left p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50/50 hover:border-emerald-300 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">Dr. Priya Verma</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono px-1.5 py-0.5 rounded font-semibold">Teacher@123</span>
                          </div>
                          <div className="text-[11px] text-slate-600 mt-1">
                            <code className="text-slate-800 font-medium">teacher2@gmail.com</code> · Subject Teacher (Science)
                          </div>
                        </button>
                      </>
                    )}

                    {selectedRole === 'ADMIN' && (
                      <button
                        type="button"
                        onClick={() => handleQuickDemoLogin('admin@gmail.com', 'Admin@123')}
                        className="text-left p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50/50 hover:border-amber-300 transition-colors cursor-pointer col-span-1 sm:col-span-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">Principal Dr. A. K. Sundaram</span>
                          <span className="text-[10px] bg-amber-100 text-amber-900 font-mono px-1.5 py-0.5 rounded font-semibold">Admin@123</span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-1">
                          <code className="text-slate-800 font-medium">admin@gmail.com</code> · Institutional Administration & Fleet Control
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              </form>
            )}

            {/* ------------------------------------------------------------- */}
            {/* SIGN UP FORM (Students Only) */}
            {/* ------------------------------------------------------------- */}
            {authMode === 'signup' && selectedRole === 'STUDENT' && (
              <form onSubmit={handleSignUpSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Student Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="e.g. Diya Patel"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      School Email
                    </label>
                    <input
                      type="email"
                      value={signupEmail}
                      onChange={e => setSignupEmail(e.target.value)}
                      placeholder="e.g. diya.patel@school.com"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Create Password
                    </label>
                    <input
                      type="password"
                      value={signupPassword}
                      onChange={e => setSignupPassword(e.target.value)}
                      placeholder="Min 4 characters"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={signupConfirmPassword}
                      onChange={e => setSignupConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-1 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Class
                    </label>
                    <select
                      value={studentClassId}
                      onChange={e => setStudentClassId(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden cursor-pointer"
                    >
                      <option value="8A">Class 8A</option>
                      <option value="8B">Class 8B</option>
                      <option value="7A">Class 7A</option>
                      <option value="6A">Class 6A</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Section
                    </label>
                    <select
                      value={studentSection}
                      onChange={e => setStudentSection(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden cursor-pointer"
                    >
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Roll Number
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={studentRollNumber}
                      onChange={e => setStudentRollNumber(Number(e.target.value) || 1)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden"
                      required
                    />
                  </div>
                </div>

                {/* Allocation summary */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <span>Assigned Locker Allocation:</span>
                  <div className="flex items-center gap-2 font-mono font-bold text-slate-900">
                    <span className="text-indigo-600">{previewStudentId}</span>
                    <span className="text-slate-400">→</span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {previewLockerId}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Complete Student Registration</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Clean quiet footer */}
      <footer className="border-t border-slate-200 bg-white py-3 text-center text-xs text-slate-400">
        Smart Academic Locker System · Secure Role Authentication
      </footer>
    </div>
  );
};
