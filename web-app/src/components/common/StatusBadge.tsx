/**
 * StatusBadge Component
 */

import { cn } from '@/utils';
import {
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  SkipForward,
  Ban,
  AlertCircle,
} from 'lucide-react';

export type Status =
  | 'pending'
  | 'ready'
  | 'running'
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'cancelled'
  | 'completed'
  | 'error';

export interface StatusBadgeProps {
  status: Status;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  iconOnly?: boolean;
  className?: string;
}

const statusConfig: Record<
  Status,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    classes: string;
    iconClasses?: string;
  }
> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    classes: 'bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-500',
  },
  ready: {
    label: 'Ready',
    icon: CheckCircle,
    classes: 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/50 dark:text-sky-200 dark:border-sky-600',
  },
  running: {
    label: 'Running',
    icon: Loader2,
    classes: 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/50 dark:text-sky-200 dark:border-sky-600',
    iconClasses: 'animate-spin',
  },
  passed: {
    label: 'Passed',
    icon: CheckCircle,
    classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-600',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle,
    classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-600',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    classes: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/50 dark:text-red-200 dark:border-red-600',
  },
  skipped: {
    label: 'Skipped',
    icon: SkipForward,
    classes: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-600',
  },
  cancelled: {
    label: 'Cancelled',
    icon: Ban,
    classes: 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/50 dark:text-orange-200 dark:border-orange-600',
  },
  error: {
    label: 'Error',
    icon: AlertCircle,
    classes: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/50 dark:text-red-200 dark:border-red-600',
  },
};

const sizeConfig = {
  sm: { badge: 'px-2 py-0.5 text-xs', icon: 'h-3 w-3', gap: 'gap-1' },
  md: { badge: 'px-3 py-1 text-sm', icon: 'h-4 w-4', gap: 'gap-1.5' },
  lg: { badge: 'px-4 py-1.5 text-base', icon: 'h-5 w-5', gap: 'gap-2' },
};

export function StatusBadge({
  status,
  size = 'md',
  showIcon = true,
  iconOnly = false,
  className,
}: StatusBadgeProps) {
  const statusCfg = statusConfig[status];
  const sizeCfg = sizeConfig[size];
  const Icon = statusCfg.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold shadow-sm',
        sizeCfg.badge,
        sizeCfg.gap,
        statusCfg.classes,
        className
      )}
    >
      {showIcon && (
        <Icon className={cn(sizeCfg.icon, statusCfg.iconClasses)} />
      )}
      {!iconOnly && statusCfg.label}
    </span>
  );
}

export default StatusBadge;
