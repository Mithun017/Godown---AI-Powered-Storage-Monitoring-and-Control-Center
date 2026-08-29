import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, Activity, GitBranch, LayoutGrid, Bell, BarChart2, 
  Users, Settings, Sun, Moon, ChevronLeft, LogOut, Warehouse, X
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';

interface LeftPanelProps {
  isExpanded: boolean;
  onToggleExpand: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({ 
  isExpanded, 
  onToggleExpand,
  isMobileOpen,
  onCloseMobile
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: Home },
    { label: 'Live Monitoring', path: '/monitoring', icon: Activity },
    { label: 'Predictions', path: '/predictions', icon: GitBranch },
    { label: 'Warehouses', path: '/warehouses', icon: LayoutGrid },
    { label: 'Alerts', path: '/alerts', icon: Bell },
    { label: 'Analytics', path: '/analytics', icon: BarChart2 },
  ];

  if (user?.role === 'hq_admin') {
    navItems.push({ label: 'Warehouse Heads', path: '/admin/users', icon: Users });
  }

  const handleNavClick = (path: string) => {
    navigate(path);
    onCloseMobile();
  };

  const showText = isExpanded || isMobileOpen;

  return (
    <>
      {/* Mobile Dark Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`glass-panel fixed top-3 bottom-3 left-3 z-40 flex flex-col justify-between transition-all duration-300 ${
          isExpanded ? 'w-64' : 'w-20'
        } ${
          isMobileOpen 
            ? 'translate-x-0 w-72 max-w-[85vw]' 
            : '-translate-x-[120%] md:translate-x-0'
        }`}
        style={{ height: 'calc(100vh - 1.5rem)' }}
      >
        {/* 1. Header (Fixed Top) */}
        <div className="shrink-0 p-3 border-b border-gray-500/10 flex items-center justify-between">
          {showText ? (
            <>
              <div 
                onClick={() => handleNavClick('/')}
                className="flex items-center gap-3 overflow-hidden cursor-pointer group"
              >
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-md shadow-cyan-500/20 shrink-0 group-hover:scale-105 transition-transform">
                  <Warehouse size={20} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-extrabold text-xs tracking-tight text-strong truncate group-hover:text-cyan-500 transition-colors">TN Warehouses</span>
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold truncate">Control Center</span>
                </div>
              </div>

              {/* Desktop Collapse Chevron Button */}
              <button
                onClick={onToggleExpand}
                className="hidden md:flex p-1.5 rounded-xl hover:bg-gray-500/10 text-gray-500 dark:text-gray-400 transition-colors cursor-pointer"
                title="Collapse Sidebar"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Mobile Close Button */}
              <button
                onClick={onCloseMobile}
                className="md:hidden p-1.5 rounded-xl hover:bg-gray-500/10 text-gray-500 dark:text-gray-400 transition-colors cursor-pointer"
                title="Close Drawer"
              >
                <X size={18} />
              </button>
            </>
          ) : (
            /* Minimized Mode: Centered Clickable Logo Button */
            <button
              onClick={onToggleExpand}
              className="mx-auto p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-md shadow-cyan-500/20 cursor-pointer hover:scale-105 transition-all"
              title="Expand Sidebar"
            >
              <Warehouse size={20} />
            </button>
          )}
        </div>

        {/* 2. Scrollable Navigation List (Middle Flex-1 with Internal Scrollbar) */}
        <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));

            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`w-full flex items-center gap-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  showText ? 'px-3 justify-start' : 'px-0 justify-center'
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-sky-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/35 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-500/10 hover:text-strong'
                }`}
                title={!showText ? item.label : undefined}
              >
                <Icon size={18} className={isActive ? 'text-cyan-500 dark:text-cyan-400' : 'text-gray-400'} />
                {showText && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* 3. Bottom Pinned Section (Always Visible, Never Pushed Off-Screen) */}
        <div className="shrink-0 p-2.5 border-t border-gray-500/10 space-y-1.5 bg-gray-500/5 rounded-b-2xl">
          <button
            onClick={() => handleNavClick('/settings')}
            className={`w-full flex items-center gap-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              showText ? 'px-3 justify-start' : 'px-0 justify-center'
            } ${
              currentPath === '/settings'
                ? 'bg-gradient-to-r from-cyan-500/20 to-sky-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/35'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-500/10'
            }`}
            title={!showText ? "Settings" : undefined}
          >
            <Settings size={18} className={currentPath === '/settings' ? 'text-cyan-500' : 'text-gray-400'} />
            {showText && <span>Settings</span>}
          </button>

          <button
            onClick={toggleTheme}
            className={`w-full flex items-center gap-3 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-500/10 transition-all cursor-pointer ${
              showText ? 'px-3 justify-start' : 'px-0 justify-center'
            }`}
            title={!showText ? `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode` : undefined}
          >
            {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-sky-600" />}
            {showText && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>

          {/* User Profile Scope Card */}
          <div className="pt-1">
            {showText ? (
              <div className="p-2.5 rounded-xl bg-gray-500/10 flex items-center justify-between border border-gray-500/10">
                <div className="flex flex-col min-w-0 pr-1">
                  <span className="text-xs font-extrabold text-strong truncate">{user?.name || 'User'}</span>
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold truncate">
                    {user?.role === 'hq_admin' ? 'All Warehouses (HQ)' : `Warehouse #${user?.warehouse_scope}`}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/15 transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={logout}
                className="w-full flex justify-center p-2 rounded-xl text-rose-500 hover:bg-rose-500/15 transition-colors cursor-pointer"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
