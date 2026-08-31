import React from 'react';
import { useAuthStore } from '../stores/authStore';
import { GlassCard } from '../components/GlassCard';
import { Moon, User, LogOut } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuthStore();

  return (
    <div className="space-y-6 pb-12 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-strong tracking-tight">Platform Settings</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Theme appearance preferences and user account profile
        </p>
      </div>

      <GlassCard className="space-y-6">
        <h3 className="font-bold text-sm text-strong flex items-center gap-2 border-b border-gray-500/10 pb-3">
          <User size={18} className="text-cyan-500" />
          <span>User Profile Information</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-gray-500/5 space-y-1">
            <span className="text-gray-500 text-[11px] block">Full Name</span>
            <span className="font-bold text-strong text-sm block">{user?.name}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-500/5 space-y-1">
            <span className="text-gray-500 text-[11px] block">Email Address</span>
            <span className="font-bold text-strong text-sm block">{user?.email}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-500/5 space-y-1">
            <span className="text-gray-500 text-[11px] block">Assigned Role</span>
            <span className="font-bold text-cyan-600 dark:text-cyan-400 text-sm block uppercase">{user?.role}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-500/5 space-y-1">
            <span className="text-gray-500 text-[11px] block">Warehouse Governance Scope</span>
            <span className="font-bold text-strong text-sm block">
              {user?.role === 'hq_admin' ? 'All 10 Tamil Nadu Warehouses' : `Warehouse #${user?.warehouse_scope}`}
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Moon size={20} className="text-cyan-400" />
            <div>
              <span className="font-bold text-sm text-strong block">Visual Theme</span>
              <span className="text-xs text-gray-500 block">Enforced Cybernetic Dark Tech Mode</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-500/10 flex justify-end">
          <button
            onClick={logout}
            className="px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-600 dark:text-red-400 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <LogOut size={16} />
            <span>Sign Out of Account</span>
          </button>
        </div>
      </GlassCard>
    </div>
  );
};
