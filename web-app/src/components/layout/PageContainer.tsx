/**
 * PageContainer Component
 */

import { cn } from '@/utils';

export interface PageContainerProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({
  title,
  description,
  actions,
  children,
  className,
}: PageContainerProps) {
  return (
    <div className={cn('space-y-8', className)}>
      {/* Header */}
      {(title || actions) && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200">
          <div>
            {title && (
              <h1 className="text-2xl font-bold tracking-tight text-slate-800">{title}</h1>
            )}
            {description && (
              <p className="text-slate-500 mt-1.5 text-sm">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      )}

      {/* Content */}
      {children}
    </div>
  );
}

export default PageContainer;
