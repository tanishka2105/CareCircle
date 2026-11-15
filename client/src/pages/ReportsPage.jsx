import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { Flame, Trophy, Percent, AlertTriangle } from 'lucide-react';
import { Card } from '../components/ui/Card.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { api } from '../lib/api.js';
import { LIVE_QUERY_OPTIONS } from '../lib/live.js';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <Card className="flex items-center space-x-3.5">
    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  </Card>
);

export const ReportsPage = () => {
  const [period, setPeriod] = useState('week'); // 'week' | 'month'

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['reports', period],
    queryFn: () => api.get(`/reports/adherence?period=${period}`),
    ...LIVE_QUERY_OPTIONS,
  });

  const summary = data?.summary;
  const daily = (data?.dailyBreakdown || []).map((d) => ({
    ...d,
    label: d.date.slice(5), // MM-DD
  }));
  const perMed = data?.perMedication || [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Adherence Reports
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            How consistently medicines are being taken.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {['week', 'month'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                period === p
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {p === 'week' ? 'Last 7 days' : 'Last 30 days'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-3xl" />
          <Skeleton className="h-72 w-full rounded-3xl" />
        </div>
      ) : isError ? (
        <Card className="p-8 text-center space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {error?.message || 'Could not load report.'}
          </p>
          <button onClick={() => refetch()} className="text-sm font-bold text-blue-600 hover:underline">
            Try again
          </button>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Percent}
              label="Adherence"
              value={`${summary.adherencePercent}%`}
              color="bg-blue-100 text-blue-600 dark:bg-blue-950/50"
            />
            <StatCard
              icon={Flame}
              label="Current streak"
              value={`${summary.currentStreak} days`}
              color="bg-orange-100 text-orange-600 dark:bg-orange-950/50"
            />
            <StatCard
              icon={Trophy}
              label="Best streak"
              value={`${summary.bestStreak} days`}
              color="bg-amber-100 text-amber-600 dark:bg-amber-950/50"
            />
            <StatCard
              icon={AlertTriangle}
              label="Missed doses"
              value={summary.missedDoses}
              color="bg-rose-100 text-rose-600 dark:bg-rose-950/50"
            />
          </div>

          {/* Daily chart */}
          <Card className="space-y-4">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100">Daily doses</h3>
            {summary.totalDoses === 0 ? (
              <p className="text-sm text-slate-500 py-10 text-center">
                No dose data for this period yet.
              </p>
            ) : (
              <div className="h-72" role="img" aria-label="Bar chart of taken, missed and skipped doses per day">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.3} />
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis allowDecimals={false} fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="taken" stackId="a" fill="#10b981" name="Taken" />
                    <Bar dataKey="skipped" stackId="a" fill="#f59e0b" name="Skipped" />
                    <Bar dataKey="missed" stackId="a" fill="#ef4444" name="Missed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Per medicine */}
          <Card className="space-y-4">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100">By medicine</h3>
            {perMed.length === 0 ? (
              <p className="text-sm text-slate-500">No data yet.</p>
            ) : (
              <ul className="space-y-4">
                {perMed.map((m) => (
                  <li key={m.medicationId}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {m.medicationName}
                      </span>
                      <span className="text-slate-500">
                        {m.taken}/{m.total} · {m.adherencePercent}%
                      </span>
                    </div>
                    <div
                      className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"
                      role="progressbar"
                      aria-valuenow={m.adherencePercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${m.medicationName} adherence`}
                    >
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${m.adherencePercent}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
};