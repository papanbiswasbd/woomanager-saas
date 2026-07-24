'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { 
  startOfToday, endOfToday, 
  subDays, startOfDay, endOfDay,
  startOfWeek, endOfWeek, subWeeks,
  startOfMonth, endOfMonth, subMonths,
  startOfYear, endOfYear, subYears,
  format
} from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

export type DatePreset = 
  | 'all'
  | 'today' 
  | 'yesterday' 
  | 'this_week' 
  | 'last_week' 
  | 'this_month' 
  | 'last_month' 
  | 'this_year' 
  | 'last_year' 
  | 'custom';

interface DateFilterProps {
  defaultPreset?: DatePreset;
}

export function DateFilter({ defaultPreset = 'all' }: DateFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentPreset = (searchParams.get('preset') as DatePreset) || defaultPreset;
  const currentFrom = searchParams.get('from') || '';
  const currentTo = searchParams.get('to') || '';

  const [preset, setPreset] = useState<DatePreset>(currentPreset);
  const [customFrom, setCustomFrom] = useState(currentFrom ? format(new Date(currentFrom), 'yyyy-MM-dd') : '');
  const [customTo, setCustomTo] = useState(currentTo ? format(new Date(currentTo), 'yyyy-MM-dd') : '');

  // Initialize URL with default if not present
  useEffect(() => {
    if (!searchParams.has('preset') && defaultPreset !== 'all') {
      applyPreset(defaultPreset);
    }
  }, [defaultPreset]);

  const applyPreset = (newPreset: DatePreset) => {
    setPreset(newPreset);
    const params = new URLSearchParams(searchParams.toString());
    params.set('preset', newPreset);

    const now = new Date();
    let fromDate: Date | null = null;
    let toDate: Date | null = null;

    switch (newPreset) {
      case 'today':
        fromDate = startOfToday();
        toDate = endOfToday();
        break;
      case 'yesterday':
        const yesterday = subDays(now, 1);
        fromDate = startOfDay(yesterday);
        toDate = endOfDay(yesterday);
        break;
      case 'this_week':
        fromDate = startOfWeek(now, { weekStartsOn: 1 });
        toDate = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'last_week':
        const lastWeek = subWeeks(now, 1);
        fromDate = startOfWeek(lastWeek, { weekStartsOn: 1 });
        toDate = endOfWeek(lastWeek, { weekStartsOn: 1 });
        break;
      case 'this_month':
        fromDate = startOfMonth(now);
        toDate = endOfMonth(now);
        break;
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        fromDate = startOfMonth(lastMonth);
        toDate = endOfMonth(lastMonth);
        break;
      case 'this_year':
        fromDate = startOfYear(now);
        toDate = endOfYear(now);
        break;
      case 'last_year':
        const lastYear = subYears(now, 1);
        fromDate = startOfYear(lastYear);
        toDate = endOfYear(lastYear);
        break;
      case 'all':
      case 'custom':
        // Custom dates are handled manually
        break;
    }

    if (newPreset !== 'custom' && newPreset !== 'all' && fromDate && toDate) {
      params.set('from', fromDate.toISOString());
      params.set('to', toDate.toISOString());
      router.push(`${pathname}?${params.toString()}`);
    } else if (newPreset === 'all') {
      params.delete('from');
      params.delete('to');
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  const handleCustomApply = () => {
    if (!customFrom || !customTo) return;
    
    const params = new URLSearchParams(searchParams.toString());
    params.set('preset', 'custom');
    // Set to start of day for 'from' and end of day for 'to'
    params.set('from', startOfDay(new Date(customFrom)).toISOString());
    params.set('to', endOfDay(new Date(customTo)).toISOString());
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <div className="relative flex items-center">
        <CalendarIcon className="absolute left-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <select
          value={preset}
          onChange={(e) => applyPreset(e.target.value as DatePreset)}
          className="h-9 w-full sm:w-[160px] appearance-none rounded-md border border-input bg-background pl-9 pr-8 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="this_week">This Week</option>
          <option value="last_week">Last Week</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="this_year">This Year</option>
          <option value="last_year">Last Year</option>
          <option value="custom">Custom Range</option>
        </select>
        <div className="absolute right-2.5 pointer-events-none">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {preset === 'custom' && (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <button
            onClick={handleCustomApply}
            disabled={!customFrom || !customTo}
            className="h-9 px-3 bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
