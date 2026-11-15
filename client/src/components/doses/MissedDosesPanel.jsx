import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { Card } from '../ui/Card.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { MissedDoseCard } from './MissedDoseCard.jsx';
import { api } from '../../lib/api.js';
import { LIVE_QUERY_OPTIONS } from '../../lib/live.js';
import { daysAgoKey, toDateKey } from '../../lib/time.js';

export const MissedDosesPanel = () => {
  const startDate = daysAgoKey(3);
  const endDate = toDateKey();

  const { data: doses = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['doses', 'missed', startDate, endDate],
    queryFn: async () => {
      const all = await api.get(`/doses?startDate=${startDate}&endDate=${endDate}`);
      return all.filter((d) => d.status === 'missed');
    },
    ...LIVE_QUERY_OPTIONS,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 w-full rounded-3xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="p-6 text-center space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">Could not load missed doses.</p>
        <button
          onClick={() => refetch()}
          className="text-sm font-bold text-blue-600 hover:underline"
        >
          Try again
        </button>
      </Card>
    );
  }

  if (doses.length === 0) {
    return (
      <Card className="p-6 flex items-center space-x-3 border-2 border-emerald-200 dark:border-emerald-900">
        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
        <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
          No missed doses in the last 3 days. 
        </p>
      </Card>
    );
  }

  // Unclaimed first, then claimed
  const sorted = [...doses].sort((a, b) => Number(Boolean(a.handledBy)) - Number(Boolean(b.handledBy)));

  return (
    <div className="space-y-4">
      {sorted.map((dose) => (
        <MissedDoseCard key={dose.id} dose={dose} />
      ))}
    </div>
  );
};