/**
 * Logo Component
 */

import { cn } from '@/utils';
import { Zap } from 'lucide-react';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { icon: 'h-6 w-6', text: 'text-lg' },
  md: { icon: 'h-8 w-8', text: 'text-xl' },
  lg: { icon: 'h-10 w-10', text: 'text-2xl' },
};

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const config = sizeConfig[size];

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 p-2 shadow-md">
        <Zap className={cn(config.icon, 'text-white')} />
      </div>
      {showText && (
        <span className={cn(config.text, 'font-bold text-foreground')}>
          Swagger AI
        </span>
      )}
    </div>
  );
}

export default Logo;
