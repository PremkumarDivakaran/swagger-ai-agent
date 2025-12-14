/**
 * Sidebar Component
 */

import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  FileCode,
  Play,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/utils';
import { Logo } from '@/components/common/Logo';
import { useSettingsStore } from '@/stores';

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

const navItems = [
  {
    path: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Health check & overview',
  },
  {
    path: '/import',
    label: 'Import Swagger',
    icon: Upload,
    description: 'Import OpenAPI specs',
  },
  {
    path: '/operations',
    label: 'Operations',
    icon: FileCode,
    description: 'View API operations',
  },
  {
    path: '/execution',
    label: 'Test Execution',
    icon: Play,
    description: 'Run API tests',
  },
] as const;

export function Sidebar({ isOpen = false, onClose, className }: SidebarProps) {
  const location = useLocation();
  const isCollapsed = useSettingsStore((state) => state.ui.sidebarCollapsed);
  const toggleSidebar = useSettingsStore((state) => state.toggleSidebar);

  const isActiveRoute = (path: string): boolean => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-gradient-to-b from-slate-50 to-white transition-all duration-300',
          'lg:sticky lg:top-0 lg:z-30 lg:h-screen',
          isCollapsed ? 'lg:w-16' : 'lg:w-64',
          // Mobile: slide in/out
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          'w-64',
          className
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 bg-white">
          <Link to="/" className="flex items-center">
            <Logo size="sm" showText={!isCollapsed} />
          </Link>

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="rounded-md p-1.5 hover:bg-accent lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Desktop collapse button */}
          <button
            onClick={toggleSidebar}
            className="hidden rounded-md p-1.5 hover:bg-accent lg:block"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveRoute(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-sky-100 to-sky-50 text-sky-800 border-l-4 border-sky-500 shadow-sm'
                    : 'text-slate-600 hover:bg-sky-50 hover:text-sky-700',
                  isCollapsed && 'justify-center'
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-sky-600')} />
                {!isCollapsed && (
                  <div className="flex flex-col">
                    <span className="font-semibold">{item.label}</span>
                    <span
                      className={cn(
                        'text-xs',
                        isActive ? 'text-sky-600' : 'text-slate-400'
                      )}
                    >
                      {item.description}
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
