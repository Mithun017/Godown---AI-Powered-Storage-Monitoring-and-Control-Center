import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Warehouse, Menu } from 'lucide-react';

interface MobileHeaderProps {
  onOpenMobileMenu: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ onOpenMobileMenu }) => {
  const navigate = useNavigate();

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-30 glass-panel border-b border-gray-500/15 px-4 py-3 flex items-center justify-between rounded-none shadow-md">
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-xl bg-gray-500/10 hover:bg-gray-500/20 text-strong transition-colors cursor-pointer"
          title="Open Menu"
        >
          <Menu size={20} />
        </button>
        <div 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-sky-600 text-white group-hover:scale-105 transition-transform">
            <Warehouse size={18} />
          </div>
          <div>
            <h1 className="font-extrabold text-xs tracking-tight text-strong group-hover:text-cyan-500 transition-colors">TN Warehouses</h1>
            <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium">Control Center</p>
          </div>
        </div>
      </div>

    </header>
  );
};
