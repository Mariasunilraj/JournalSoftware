import React, { useState } from 'react';
import {
  Lock,
  User,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  UserPlus,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Database,
} from 'lucide-react';
import { login, register } from '../utils/auth';

export default function AuthView({ onLoginSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Login form state - clean, zero prefilled personal data
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const res = login(loginIdentifier, loginPassword);
    if (!res.success) {
      setErrorMsg(res.error);
      return;
    }

    setSuccessMsg(`Welcome back, ${res.user.name || res.user.username}!`);
    setTimeout(() => {
      onLoginSuccess(res.user);
    }, 400);
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Passwords do not match. Please verify.');
      return;
    }

    const res = register({
      username: regUsername,
      email: regUsername,
      name: regName,
      password: regPassword,
    });

    if (!res.success) {
      setErrorMsg(res.error);
      return;
    }

    setSuccessMsg('Account registered successfully! Provisioning empty workspace...');
    setTimeout(() => {
      onLoginSuccess(res.user);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-3 sm:p-6 selection:bg-emerald-500 selection:text-black">
      {/* Background ambient radial glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header with Seamless Fintech Logo */}
        <div className="text-center space-y-2">
          <div className="max-w-[280px] sm:max-w-[320px] mx-auto relative group">
            {/* Soft ambient emerald radial glow behind logo */}
            <div className="absolute inset-0 bg-emerald-500/15 blur-2xl rounded-full transform scale-75 pointer-events-none" />
            <img
              src="/logo-banner.png"
              alt="Delta Journal • Track / Analyze / Grow"
              className="w-full h-auto object-contain block relative z-10 drop-shadow-[0_4px_24px_rgba(0,230,118,0.25)]"
            />
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 font-medium">
            High-Precision Indian Stock Market & F&O Trading Journal
          </p>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-neutral-900/90 border border-neutral-800 text-[11px] text-neutral-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Row-Level Security (RLS) & Private Tenancy</span>
          </div>
        </div>

        {/* Main Auth Card */}
        <div className="rounded-2xl bg-[#090909] border border-neutral-800 shadow-2xl p-5 sm:p-7 space-y-5">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-black border border-neutral-850 gap-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2 rounded-lg flex items-center justify-center space-x-2 transition ${
                mode === 'login'
                  ? 'bg-neutral-900 text-white border border-neutral-700/80 shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4 text-emerald-400" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2 rounded-lg flex items-center justify-center space-x-2 transition ${
                mode === 'register'
                  ? 'bg-neutral-900 text-white border border-neutral-700/80 shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4 text-cyan-400" />
              <span>Create Account</span>
            </button>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-400 text-xs flex items-center space-x-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-xs flex items-center space-x-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                  Username or Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-500 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="Enter your username or email"
                    className="w-full bg-black border border-neutral-800 rounded-xl pl-9 pr-3 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-400 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                    Password
                  </label>
                  <span className="text-[10px] text-neutral-500">Case-sensitive</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black border border-neutral-800 rounded-xl pl-9 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 text-neutral-500 hover:text-white absolute right-2.5 top-2.5"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm tracking-wide flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(0,230,118,0.3)] transition active:scale-95"
              >
                <span>Enter Trading Journal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                  Full Name / Trader Alias
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-500 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full bg-black border border-neutral-800 rounded-xl pl-9 pr-3 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                  Email or Username
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Enter your email or username"
                    className="w-full bg-black border border-neutral-800 rounded-xl pl-9 pr-3 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                  Password (min 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black border border-neutral-800 rounded-xl pl-9 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-cyan-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 text-neutral-500 hover:text-white absolute right-2.5 top-2.5"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black border border-neutral-800 rounded-xl pl-9 pr-3 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>
              </div>

              {/* RLS Privacy Notice */}
              <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800 text-[11px] text-neutral-400 flex items-start space-x-2">
                <Database className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Zero Initial Data Guarantee:</strong> Newly created accounts start completely fresh (0 trades, 0 logs). All records are private and protected with Row-Level Security.
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-black text-sm tracking-wide flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(34,211,238,0.3)] transition active:scale-95"
              >
                <span>Create My Trading Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        {/* Security & Version Footnote */}
        <div className="text-center text-[11px] text-neutral-500 space-y-1">
          <div>Unified Standard Version • All Features Included for All Traders</div>
          <div>NSE / BSE Equities & Derivatives • High-Speed Execution</div>
        </div>
      </div>
    </div>
  );
}
