/**
 * Header Component
 */

import { cn } from '@/utils';
import { Menu, Moon, Sun, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSettingsStore, selectResolvedTheme } from '@/stores';

export interface HeaderProps {
  showMenuButton?: boolean;
  onMenuClick?: () => void;
  className?: string;
}

export function Header({ showMenuButton = false, onMenuClick, className }: HeaderProps) {
  const setTheme = useSettingsStore((state) => state.setTheme);
  const theme = useSettingsStore(selectResolvedTheme);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6',
        className
      )}
    >
      {/* Mobile menu button */}
      {showMenuButton && (
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 hover:bg-accent lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* Page title area - can be used for breadcrumbs */}
      <div className="flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-md p-2 hover:bg-accent"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>

        {/* Settings link */}
        <Link
          to="/settings"
          className="rounded-md p-2 hover:bg-accent"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}

export default Header;
