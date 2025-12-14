/**
 * EmptyState Component
 */

import { cn } from '@/utils';
import { FileQuestion } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = FileQuestion,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center',
        className
      )}
    >
      <div className="rounded-2xl bg-gradient-to-br from-sky-100 to-sky-50 p-5 mb-5 border border-sky-200">
        <Icon className="h-10 w-10 text-sky-500" />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 max-w-md mb-5 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export default EmptyState;
