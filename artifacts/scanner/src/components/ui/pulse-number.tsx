import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface PulseNumberProps {
  value: number;
  formatFn?: (val: number) => string;
  className?: string;
  isPercent?: boolean;
}

export function PulseNumber({ value, formatFn = (v) => v.toString(), className, isPercent = false }: PulseNumberProps) {
  const prevValueRef = useRef<number>(value);
  const [pulseClass, setPulseClass] = useState<string>('');

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (value > prevValueRef.current) {
      setPulseClass('animate-flash-up');
      timer = setTimeout(() => setPulseClass(''), 1500);
      prevValueRef.current = value;
    } else if (value < prevValueRef.current) {
      setPulseClass('animate-flash-down');
      timer = setTimeout(() => setPulseClass(''), 1500);
      prevValueRef.current = value;
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [value]);

  const colorClass = isPercent 
    ? value > 0 ? 'text-positive' : value < 0 ? 'text-negative' : 'text-muted-foreground'
    : '';

  return (
    <span className={cn('transition-colors px-1 -mx-1 rounded font-mono tabular-nums', colorClass, pulseClass, className)}>
      {isPercent && value > 0 ? '+' : ''}{formatFn(value)}
    </span>
  );
}
