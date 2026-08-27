import React, { useState } from 'react';
import { Warehouse, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { GlassCard } from '../components/GlassCard';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    await login(email, password);
  };

  const handleDemoCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    clearError();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent">
      <div className="w-full max-w-md">
        <GlassCard className="p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-2xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 mb-3 shadow-inner">
              <Warehouse size={36} />
            </div>
            <h1 className="text-3xl font-extrabold text-strong tracking-tight">WarePulse</h1>
            <p className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold mt-1">Smart Predictive Warehouse Control System</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Government Email Address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@tnwarehouses.gov.in"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-sm text-strong outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Account Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-sm text-strong outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-bold text-sm shadow-lg shadow-cyan-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Quick Seed Account Shortcuts */}
          <div className="mt-8 pt-6 border-t border-gray-500/10">
            <span className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-2.5 text-center">
              Click to quick-fill demo credentials:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoCredentials('admin@tnwarehouses.gov.in', 'admin123')}
                className="px-3 py-2 rounded-lg bg-gray-500/10 hover:bg-gray-500/20 text-xs text-left transition-colors"
              >
                <div className="font-semibold text-strong">HQ Admin</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">admin@tnwarehouses...</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoCredentials('head1@tnwarehouses.gov.in', 'head123')}
                className="px-3 py-2 rounded-lg bg-gray-500/10 hover:bg-gray-500/20 text-xs text-left transition-colors"
              >
                <div className="font-semibold text-strong">Warehouse Head</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">head1@tnwarehouses...</div>
              </button>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
