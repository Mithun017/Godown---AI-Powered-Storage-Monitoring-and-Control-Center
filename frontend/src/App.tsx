import React, { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { LeftPanel } from './components/LeftPanel';
import { MobileHeader } from './components/MobileHeader';
import { AIAssistantDrawer } from './components/AIAssistantDrawer';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Monitoring } from './pages/Monitoring';
import { Warehouses } from './pages/Warehouses';
import { WarehouseDetail } from './pages/WarehouseDetail';
import { Predictions } from './pages/Predictions';
import { Alerts } from './pages/Alerts';
import { Analytics } from './pages/Analytics';
import { Users } from './pages/admin/Users';
import { SettingsPage } from './pages/Settings';

export const App: React.FC = () => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      useAuthStore.getState().logout();
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    if (path !== '/warehouses') {
      setSelectedWarehouseId(null);
    }
  };

  const handleSelectWarehouse = (id: number) => {
    setSelectedWarehouseId(id);
    setCurrentPath('/warehouses');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-gray-500">Initializing Smart Warehouse CRM...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] transition-colors duration-300 relative overflow-x-hidden">
      {/* Mobile Top Navigation Header */}
      <MobileHeader onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

      {/* Main Left Navigation Sidebar / Mobile Slide-Over Drawer */}
      <LeftPanel
        currentPath={currentPath}
        onNavigate={handleNavigate}
        isExpanded={isSidebarExpanded}
        onToggleExpand={() => setIsSidebarExpanded(!isSidebarExpanded)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Dashboard & Content Layout */}
      <main className={`pt-20 px-4 pb-16 md:pt-6 md:pr-6 md:pb-12 ${isSidebarExpanded ? 'md:pl-72' : 'md:pl-24'} transition-all duration-300`}>
        <div className="max-w-7xl mx-auto space-y-6">
          {currentPath === '/' && <Dashboard onSelectWarehouse={handleSelectWarehouse} />}
          {currentPath === '/monitoring' && <Monitoring />}
          {currentPath === '/predictions' && <Predictions />}
          {currentPath === '/warehouses' && (
            selectedWarehouseId !== null ? (
              <WarehouseDetail
                warehouseId={selectedWarehouseId}
                onBack={() => setSelectedWarehouseId(null)}
              />
            ) : (
              <Warehouses onSelectWarehouse={handleSelectWarehouse} />
            )
          )}
          {currentPath === '/alerts' && <Alerts />}
          {currentPath === '/analytics' && <Analytics />}
          {currentPath === '/admin/users' && <Users />}
          {currentPath === '/settings' && <SettingsPage />}
        </div>
      </main>

      {/* Floating Bottom-Right AI Assistant Action Widget */}
      <AIAssistantDrawer />
    </div>
  );
};

export default App;
