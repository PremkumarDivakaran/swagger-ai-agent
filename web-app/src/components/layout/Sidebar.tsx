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
  Sparkles,
  Settings,
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
    description: 'System health & overview',
  },
  {
    path: '/specs',
    label: 'Specs',
    icon: FileCode,
    description: 'Import & explore APIs',
  },
  {
    path: '/test-lab',
    label: 'Test Lab',
    icon: Sparkles,
    description: 'Generate & execute tests',
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: Settings,
    description: 'LLM & GitHub config',
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
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-all duration-300',
          'lg:sticky lg:top-0 lg:z-30 lg:h-screen',
          isCollapsed ? 'lg:w-16' : 'lg:w-64',
          // Mobile: slide in/out
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          'w-64',
          className
        )}
      >
        {/* Header */}
        <div className={cn(
          'flex h-16 items-center border-b border-border bg-card',
          isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
        )}>
          {!isCollapsed && (
            <Link to="/" className="flex items-center">
              <Logo size="sm" showText />
            </Link>
          )}

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="rounded-md p-1.5 hover:bg-accent lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Desktop collapse/expand button */}
          <button
            onClick={toggleSidebar}
            className="hidden rounded-md p-1.5 hover:bg-accent lg:flex items-center justify-center"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Expand button when collapsed — prominent and always visible */}
        {isCollapsed && (
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex items-center justify-center w-full py-2 border-b border-border hover:bg-accent transition-colors"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <Sparkles className="h-4 w-4 text-primary" />
          </button>
        )}

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
                    ? 'bg-primary/10 text-primary border-l-4 border-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  isCollapsed && 'justify-center'
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
                {!isCollapsed && (
                  <div className="flex flex-col">
                    <span className="font-semibold">{item.label}</span>
                    <span
                      className={cn(
                        'text-xs',
                        isActive ? 'text-primary' : 'text-muted-foreground'
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
