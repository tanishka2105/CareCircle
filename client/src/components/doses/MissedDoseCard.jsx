import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, HeartHandshake, Check } from 'lucide-react';
import { Card } from '../ui/Card.jsx';
import { Button } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Modal } from '../ui/Modal.jsx';
import { useToast } from '../ui/Toast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../lib/api.js';
import { timeAgo } from '../../lib/time.js';
import { useNow } from '../../hooks/useNow.js';

const REFRESH_KEYS = ['doses', 'activity', 'reports', 'notifications'];

export const MissedDoseCard = ({ dose }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { member } = useAuth();
  const now = useNow();

  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');

  const isHandled = Boolean(dose.handledBy);
  const handledByMe = isHandled && dose.handledBy === member?.id;

  const refreshAll = () => {
    REFRESH_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  };

  // "I'm handling this" - optimistic so every screen updates instantly
  const handleMutation = useMutation({
    mutationFn: () => api.post(`/doses/${dose.id}/handle`, { note: note.trim() }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['doses'] });
      const snapshots = queryClient.getQueriesData({ queryKey: ['doses'] });

      queryClient.setQueriesData({ queryKey: ['doses'] }, (old) =>
        Array.isArray(old)
          ? old.map((d) =>
              d.id === dose.id
                ? {
                    ...d,
                    handledBy: member?.id,
                    handledByName: member?.displayName,
                    handledAt: new Date().toISOString(),
                    handledNote: note.trim() || 'Handling confirmed',
                  }
                : d
            )
          : old
      );

      setOpen(false);
      return { snapshots };
    },
    onError: (err, _vars, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error(err.message || 'Could not update this dose');
    },
    onSuccess: () => {
      toast.success("Done. Everyone in the circle can see you're handling this.");
      setNote('');
    },
    onSettled: refreshAll,
  });

  const takenMutation = useMutation({
    mutationFn: () => api.patch(`/doses/${dose.id}`, { status: 'taken' }),
    onSuccess: () => toast.success(`${dose.medicationName} marked as taken`),
    onError: (err) => toast.error(err.message || 'Could not mark as taken'),
    onSettled: refreshAll,
  });

  return (
    <>
      <Card
        className={`border-2 ${
          isHandled
            ? 'border-emerald-200 dark:border-emerald-800'
            : 'border-rose-200 dark:border-rose-900'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                isHandled
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50'
                  : 'bg-rose-100 text-rose-600 dark:bg-rose-950/50'
              }`}
            >
              {isHandled ? <HeartHandshake className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">
                {dose.medicationName}
              </h4>
              <p className="text-xs text-slate-500">
                Missed: {dose.scheduledDate} at {dose.scheduledTime}
              </p>
            </div>
          </div>
          <Badge variant={isHandled ? 'success' : 'danger'} className="text-xs shrink-0">
            {isHandled ? 'Being handled' : 'Missed'}
          </Badge>
        </div>

        {isHandled ? (
          <div
            className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-sm"
            role="status"
          >
            <p className="font-bold text-emerald-800 dark:text-emerald-300">
              {handledByMe ? 'You are' : `${dose.handledByName || 'A member'} is`} handling this
              <span className="font-normal text-emerald-700/80 dark:text-emerald-400/80">
                {' '}
                · {timeAgo(dose.handledAt, now)}
              </span>
            </p>
            {dose.handledNote && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 italic">
                "{dose.handledNote}"
              </p>
            )}
          </div>
        ) : (
          <p className="mt-4 text-xs text-slate-500">
            Nobody has picked this up yet. Tell the circle you will take care of it so no one duplicates effort.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {!isHandled && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => setOpen(true)}
              className="flex items-center space-x-1.5"
            >
              <HeartHandshake className="w-4 h-4" />
              <span>I'm handling this</span>
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            isLoading={takenMutation.isPending}
            onClick={() => takenMutation.mutate()}
            className="flex items-center space-x-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Mark as taken</span>
          </Button>
        </div>
      </Card>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="I'm handling this">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleMutation.mutate();
          }}
          className="space-y-4"
        >
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Everyone in the circle will see that you are handling the missed{' '}
            <span className="font-bold">{dose.medicationName}</span> dose.
          </p>
          <div>
            <label
              htmlFor={`handle-note-${dose.id}`}
              className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1"
            >
              Note (optional)
            </label>
            <input
              id={`handle-note-${dose.id}`}
              type="text"
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Calling Mom now / I'll visit at 6 pm"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              autoFocus
            />
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={handleMutation.isPending}>
              Confirm
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};