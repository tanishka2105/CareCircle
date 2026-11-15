import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { DoseCard } from '../components/doses/DoseCard.jsx';
import {
  Heart,
  Pill,
  CalendarDays,
  Users,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  Clock,
  ArrowRight,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { useToast } from '../components/ui/Toast.jsx';

export const DashboardPage = () => {
  const { profile, member } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [copied, setCopied] = useState(false);
  const [missedHandlingDose, setMissedHandlingDose] = useState(null);
  const [handleNote, setHandleNote] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Fetch today's doses
  const { data: doses = [], isLoading: dosesLoading } = useQuery({
    queryKey: ['doses', todayStr],
    queryFn: async () => {
      const res = await fetch(`/api/doses?date=${todayStr}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch doses');
      return data.data;
    },
    refetchInterval: 15000, // Live poll every 15 seconds
  });

  // Fetch medications for stock checking
  const { data: medications = [] } = useQuery({
    queryKey: ['medications'],
    queryFn: async () => {
      const res = await fetch('/api/medications');
      const data = await res.json();
      if (!res.ok) return [];
      return data.data;
    },
  });

  // Dose mutation (optimistic UI update)
  const doseStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const res = await fetch(`/api/doses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to update dose status');
      }
      return data.data;
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['doses', todayStr] });
      const previousDoses = queryClient.getQueryData(['doses', todayStr]);

      // Optimistically update
      queryClient.setQueryData(['doses', todayStr], (old = []) =>
        old.map((d) =>
          d.id === id
            ? {
                ...d,
                status: status === 'undo' ? 'pending' : status,
                markedByName: status === 'undo' ? null : member?.displayName,
                markedAt: status === 'undo' ? null : new Date().toISOString(),
              }
            : d
        )
      );

      return { previousDoses };
    },
    onError: (err, newDose, context) => {
      if (context?.previousDoses) {
        queryClient.setQueryData(['doses', todayStr], context.previousDoses);
      }
      toast.error(err.message || 'Error updating dose');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['doses', todayStr] });
      queryClient.invalidateQueries({ queryKey: ['medications'] });
    },
  });

  // Handle Missed Dose Mutation
  const handleMissedMutation = useMutation({
    mutationFn: async ({ id, note }) => {
      const res = await fetch(`/api/doses/${id}/handle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to acknowledge missed dose');
      }
      return data.data;
    },
    onSuccess: () => {
      toast.success('Missed dose acknowledged! Circle members notified.');
      setMissedHandlingDose(null);
      setHandleNote('');
      queryClient.invalidateQueries({ queryKey: ['doses', todayStr] });
    },
    onError: (err) => {
      toast.error(err.message || 'Error acknowledging missed dose');
    },
  });

  // Time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greetingMorning');
    if (hour < 17) return t('dashboard.greetingAfternoon');
    if (hour < 21) return t('dashboard.greetingEvening');
    return t('dashboard.greetingNight');
  };

  const copyCode = () => {
    if (profile?.profileCode) {
      navigator.clipboard.writeText(profile.profileCode);
      setCopied(true);
      toast.success(`Profile Code ${profile.profileCode} copied!`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Calculations
  const takenCount = doses.filter((d) => d.status === 'taken').length;
  const missedCount = doses.filter((d) => d.status === 'missed').length;
  const totalCount = doses.length;
  const adherencePercent = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 100;

  // Low stock medicines
  const lowStockMeds = medications.filter(
    (m) => (m.stockCount ?? 0) <= (m.refillThreshold ?? 5) && m.active
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 text-white p-8 sm:p-10 shadow-xl shadow-teal-900/10">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider mb-4">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>CareCircle Active & Connected</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
            {getGreeting()} {member?.displayName || 'Family Member'}
          </h1>
          <p className="mt-2 text-emerald-100 text-base sm:text-lg max-w-2xl font-normal leading-relaxed">
            Coordinating daily healthcare and medication routines for{' '}
            <span className="font-extrabold text-white underline decoration-emerald-400 decoration-2">
              {profile?.name}
            </span>{' '}
            ({profile?.age} years).
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={copyCode}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-sm font-bold text-white transition active:scale-95"
            >
              <span>Circle Code: {profile?.profileCode}</span>
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            </button>

            <Link
              to="/app/elder"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 text-sm font-extrabold shadow-sm transition active:scale-95"
            >
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              <span>Switch to Elder Mode</span>
            </Link>
          </div>
        </div>

        <div className="absolute right-0 top-0 bottom-0 w-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockMeds.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-amber-900 dark:text-amber-200 text-sm font-semibold">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span>
              Low Stock Warning: {lowStockMeds.map((m) => `${m.name} (${m.stockCount} left)`).join(', ')}. Please refill soon.
            </span>
          </div>
          <Link to="/app/medications">
            <Button size="sm" variant="secondary" className="text-xs">
              View Stock
            </Button>
          </Link>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="p-6 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {takenCount} / {totalCount}
            </div>
            <div className="text-xs font-semibold text-slate-500">
              Doses Taken Today
            </div>
          </div>
        </Card>

        <Card className="p-6 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center font-bold">
            <Flame className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
              7 Days
            </div>
            <div className="text-xs font-semibold text-slate-500">
              Current Adherence Streak
            </div>
          </div>
        </Card>

        <Card className="p-6 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {adherencePercent}%
            </div>
            <div className="text-xs font-semibold text-slate-500">
              Today's Adherence Rate
            </div>
          </div>
        </Card>
      </div>

      {/* Today's Schedule Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-emerald-600" />
            <span>{t('dashboard.todaySchedule')}</span>
          </h2>
          <Link
            to="/app/medications"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
          >
            <span>Manage All Meds</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {dosesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-3xl" />
            ))}
          </div>
        ) : doses.length === 0 ? (
          <Card className="p-10 text-center space-y-3">
            <Pill className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
              {t('dashboard.noMedsToday')}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add medication schedules to see today's doses and track who took them.
            </p>
            <Link to="/app/medications">
              <Button size="sm" variant="primary">
                Add Medication
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {doses.map((dose) => (
              <DoseCard
                key={dose.id}
                dose={dose}
                onTake={(id) => doseStatusMutation.mutate({ id, status: 'taken' })}
                onSkip={(id) => doseStatusMutation.mutate({ id, status: 'skipped' })}
                onUndo={(id) => doseStatusMutation.mutate({ id, status: 'undo' })}
                onHandleMissed={(d) => setMissedHandlingDose(d)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Acknowledge Missed Dose Modal */}
      <Modal
        isOpen={Boolean(missedHandlingDose)}
        onClose={() => setMissedHandlingDose(null)}
        title="Acknowledge Missed Dose"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Let the entire CareCircle know that you are checking in on{' '}
            <span className="font-bold text-slate-900 dark:text-slate-100">{profile?.name}</span>{' '}
            regarding their missed{' '}
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {missedHandlingDose?.medicationName} ({missedHandlingDose?.scheduledTime})
            </span>.
          </p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Add a quick note for the family (optional)
            </label>
            <input
              type="text"
              value={handleNote}
              onChange={(e) => setHandleNote(e.target.value)}
              placeholder="e.g. Called her on phone, she took it just now"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3">
            <Button
              variant="secondary"
              onClick={() => setMissedHandlingDose(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={handleMissedMutation.isPending}
              onClick={() =>
                handleMissedMutation.mutate({
                  id: missedHandlingDose.id,
                  note: handleNote,
                })
              }
            >
              Confirm I'm Handling This
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
