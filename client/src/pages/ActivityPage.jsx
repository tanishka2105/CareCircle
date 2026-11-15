import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  CheckCircle2,
  SkipForward,
  Undo2,
  HeartHandshake,
  StickyNote,
  Pill,
  RefreshCw,
} from 'lucide-react';
import { Card } from '../components/ui/Card.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { api } from '../lib/api.js';
import { LIVE_QUERY_OPTIONS } from '../lib/live.js';
import { timeAgo } from '../lib/time.js';
import { useNow } from '../hooks/useNow.js';

const TYPE_STYLES = {
  dose_taken: { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50' },
  dose_skipped: { icon: SkipForward, color: 'text-amber-600 bg-amber-100 dark:bg-amber-950/50' },
  dose_undone: { icon: Undo2, color: 'text-slate-600 bg-slate-100 dark:bg-slate-800' },
  missed_dose_handled: { icon: HeartHandshake, color: 'text-blue-600 bg-blue-100 dark:bg-blue-950/50' },
  note_added: { icon: StickyNote, color: 'text-violet-600 bg-violet-100 dark:bg-violet-950/50' },
  medication: { icon: Pill, color: 'text-rose-600 bg-rose-100 dark:bg-rose-950/50' },
};

const FALLBACK_STYLE = {
  icon: Activity,
  color: 'text-slate-600 bg-slate-100 dark:bg-slate-800',
};

export const ActivityPage = () => {
  const now = useNow();

  const { data: items = [], isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['activity'],
    queryFn: () => api.get('/activity?limit=50'),
    ...LIVE_QUERY_OPTIONS,
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Activity
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Everything the circle has done, in one shared feed.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center space-x-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition"
          aria-label="Refresh activity"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          <span>{dataUpdatedAt ? `Updated ${timeAgo(new Date(dataUpdatedAt).toISOString(), now)}` : 'Refresh'}</span>
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <Card className="p-8 text-center space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {error?.message || 'Could not load activity.'}
          </p>
          <button onClick={() => refetch()} className="text-sm font-bold text-blue-600 hover:underline">
            Try again
          </button>
        </Card>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mx-auto">
            <Activity className="w-8 h-8" />
          </div>
          <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-200">No activity yet</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            When someone marks a dose, adds a note or handles a missed dose, it will show up here.
          </p>
        </Card>
      ) : (
        <ol className="space-y-3" aria-live="polite">
          {items.map((item) => {
            const style = TYPE_STYLES[item.type] || FALLBACK_STYLE;
            const Icon = style.icon;
            const preview = item.meta?.preview || item.meta?.note;

            return (
              <li key={item.id}>
                <Card className="flex items-start space-x-3.5 py-4">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${style.color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {item.description || item.action || 'Activity'}
                    </p>
                    {preview && (
                      <p className="text-xs text-slate-500 italic mt-0.5 line-clamp-2">"{preview}"</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">{timeAgo(item.createdAt, now)}</p>
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};