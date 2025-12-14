/**
 * MainLayout Component
 */

import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/utils';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useSettingsStore } from '@/stores';

export interface MainLayoutProps {
  className?: string;
}

export function MainLayout({ className }: MainLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isCollapsed = useSettingsStore((state) => state.ui.sidebarCollapsed);

  const openMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(true);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  return (
    <div className={cn('flex min-h-screen bg-background', className)}>
      {/* Sidebar */}
      <Sidebar isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />

      {/* Main Content Area */}
      <div
        className={cn(
          'flex flex-1 flex-col transition-all duration-300',
          isCollapsed ? 'lg:ml-0' : 'lg:ml-0'
        )}
      >
        {/* Header */}
        <Header showMenuButton onMenuClick={openMobileMenu} />

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
