import React from 'react';
import { cn } from '@/lib/utils';
import { AssetMetricsAlertLevel, AlertAlertLevel } from '@workspace/api-client-react';

interface LevelBadgeProps {
  level: AssetMetricsAlertLevel | AlertAlertLevel;
  className?: string;
}

export function LevelBadge({ level, className }: LevelBadgeProps) {
  let styleClass = '';
  let label: string = level;

  switch (level) {
    case 'WATCH':
      styleClass = 'bg-[hsl(217,91%,60%,0.15)] text-[hsl(217,91%,60%)] border-[hsl(217,91%,60%,0.3)]';
      break;
    case 'ACTIVE_SETUP':
      styleClass = 'bg-[hsl(35,100%,55%,0.15)] text-[hsl(35,100%,55%)] border-[hsl(35,100%,55%,0.3)]';
      label = 'ACTIVE';
      break;
    case 'A_PLUS_SETUP':
      styleClass = 'bg-[hsl(280,85%,65%,0.15)] text-[hsl(280,85%,65%)] border-[hsl(280,85%,65%,0.3)] font-bold';
      label = 'A+ SETUP';
      break;
    case 'IGNORE':
    default:
      styleClass = 'bg-muted text-muted-foreground border-border';
      break;
  }

  return (
    <span className={cn('inline-flex items-center justify-center whitespace-nowrap rounded-sm border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', styleClass, className)}>
      {label}
    </span>
  );
}
