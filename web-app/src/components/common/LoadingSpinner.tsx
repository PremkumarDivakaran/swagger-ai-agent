/**
 * LoadingSpinner Component
 */

import { cn } from '@/utils';
import { Loader2 } from 'lucide-react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  center?: boolean;
  fullPage?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { spinner: 'h-4 w-4', text: 'text-xs', gap: 'gap-1.5' },
  md: { spinner: 'h-6 w-6', text: 'text-sm', gap: 'gap-2' },
  lg: { spinner: 'h-10 w-10', text: 'text-base', gap: 'gap-3' },
  xl: { spinner: 'h-14 w-14', text: 'text-lg', gap: 'gap-4' },
};

export function LoadingSpinner({
  size = 'md',
  label,
  center = false,
  fullPage = false,
  className,
}: LoadingSpinnerProps) {
  const config = sizeConfig[size];

  const spinner = (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        config.gap,
        center && 'flex-1',
        className
      )}
      role="status"
      aria-label={label || 'Loading'}
    >
      <div className="relative">
        <Loader2
          className={cn(config.spinner, 'animate-spin text-primary')}
          aria-hidden="true"
        />
        <div className={cn(config.spinner, 'absolute inset-0 animate-ping opacity-20 text-primary')}>
          <div className="w-full h-full rounded-full bg-primary/30" />
        </div>
      </div>
      {label && (
        <span className={cn(config.text, 'text-muted-foreground font-medium')}>
          {label}
        </span>
      )}
      <span className="sr-only">{label || 'Loading...'}</span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
}

export default LoadingSpinner;
