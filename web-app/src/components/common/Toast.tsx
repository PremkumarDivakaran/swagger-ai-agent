/**
 * Toast Component
 */

import { cn } from '@/utils';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { useNotificationStore, type NotificationType } from '@/stores';

export interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  className?: string;
}

const positionClasses = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
};

const typeConfig: Record<
  NotificationType,
  { icon: React.ComponentType<{ className?: string }>; classes: string; iconClass: string }
> = {
  success: {
    icon: CheckCircle,
    classes: 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-700',
    iconClass: 'text-emerald-500 dark:text-emerald-400',
  },
  error: {
    icon: XCircle,
    classes: 'bg-red-50 border-red-300 dark:bg-red-950/50 dark:border-red-700',
    iconClass: 'text-red-500 dark:text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    classes: 'bg-amber-50 border-amber-300 dark:bg-amber-950/50 dark:border-amber-700',
    iconClass: 'text-amber-500 dark:text-amber-400',
  },
  info: {
    icon: Info,
    classes: 'bg-sky-50 border-sky-300 dark:bg-sky-950/50 dark:border-sky-700',
    iconClass: 'text-sky-500 dark:text-sky-400',
  },
};

export function ToastContainer({
  position = 'top-right',
  className,
}: ToastContainerProps) {
  const notifications = useNotificationStore((state) => state.notifications);
  const removeNotification = useNotificationStore((state) => state.removeNotification);

  if (notifications.length === 0) return null;

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col gap-3',
        positionClasses[position],
        className
      )}
    >
      {notifications.map((notification) => {
        const config = typeConfig[notification.type];
        const Icon = config.icon;

        return (
          <div
            key={notification.id}
            className={cn(
              'flex items-start gap-3 rounded-xl border-2 p-4 shadow-xl backdrop-blur-sm min-w-[320px] max-w-[420px]',
              'animate-in slide-in-from-right-5 fade-in duration-300',
              config.classes
            )}
            role="alert"
          >
            <div className={cn('rounded-full p-1', config.classes)}>
              <Icon className={cn('h-5 w-5 flex-shrink-0', config.iconClass)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">{notification.title}</p>
              {notification.message && (
                <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
              )}
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="flex-shrink-0 rounded-lg p-1.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastContainer;
