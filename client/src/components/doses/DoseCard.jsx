import React, { useState } from 'react';
import { Pill, Check, X, Undo2, AlertCircle, Clock, Utensils } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';

export const DoseCard = ({
  dose,
  onTake,
  onSkip,
  onUndo,
  onHandleMissed,
  isElderMode = false,
}) => {
  const [isBusy, setIsBusy] = useState(false);

  const isOverdue =
    dose.status === 'pending' &&
    new Date(dose.scheduledAtUtc).getTime() < Date.now() - 10 * 60 * 1000;

  const handleAction = async (fn, ...args) => {
    if (isBusy) return;
    try {
      setIsBusy(true);
      await fn(...args);
    } finally {
      setTimeout(() => setIsBusy(false), 300); // Throttling
    }
  };

  const mealLabels = {
    before_food: 'Before Food',
    after_food: 'After Food',
    with_food: 'With Food',
    independent: 'Anytime',
  };

  return (
    <div
      className={`relative rounded-3xl p-6 transition-all duration-200 border-2 ${
        dose.status === 'taken'
          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
          : dose.status === 'skipped'
          ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 opacity-75'
          : dose.status === 'missed'
          ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
          : isOverdue
          ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700 animate-pulse'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left: Info */}
        <div className="flex items-start space-x-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
            style={{ backgroundColor: dose.colour || '#10b981' }}
          >
            <Pill className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {dose.medicationName}
              </h3>
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                {dose.dosage}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{dose.scheduledTime}</span>
              </span>

              {dose.mealRelation && (
                <span className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700">
                  <Utensils className="w-3.5 h-3.5 text-slate-400" />
                  <span>{mealLabels[dose.mealRelation] || dose.mealRelation}</span>
                </span>
              )}

              {isOverdue && dose.status === 'pending' && (
                <Badge variant="warning" className="font-black animate-pulse">
                  OVERDUE
                </Badge>
              )}

              {dose.status === 'missed' && (
                <Badge variant="danger" className="font-black">
                  MISSED
                </Badge>
              )}
            </div>

            {/* Who Marked Attribution */}
            {dose.markedByName && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">
                Marked {dose.status} by <span className="font-bold text-slate-700 dark:text-slate-200">{dose.markedByName}</span>{' '}
                {dose.markedAt ? `at ${new Date(dose.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
              </p>
            )}

            {/* Handled By Attribution */}
            {dose.handledByName && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 font-semibold">
                Acknowledged by {dose.handledByName}: "{dose.handledNote}"
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          {dose.status === 'pending' && (
            <>
              <Button
                variant="primary"
                size={isElderMode ? 'elder' : 'md'}
                isLoading={isBusy}
                onClick={() => handleAction(onTake, dose.id)}
                className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                <Check className="w-5 h-5" />
                <span>Take</span>
              </Button>
              <Button
                variant="secondary"
                size={isElderMode ? 'elder' : 'md'}
                isLoading={isBusy}
                onClick={() => handleAction(onSkip, dose.id)}
                className="flex items-center space-x-2"
              >
                <X className="w-5 h-5" />
                <span>Skip</span>
              </Button>
            </>
          )}

          {(dose.status === 'taken' || dose.status === 'skipped') && (
            <Button
              variant="outline"
              size="sm"
              isLoading={isBusy}
              onClick={() => handleAction(onUndo, dose.id)}
              className="flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-300"
              title="Undo mark (available for 15 minutes)"
            >
              <Undo2 className="w-4 h-4" />
              <span>Undo</span>
            </Button>
          )}

          {dose.status === 'missed' && !dose.handledBy && onHandleMissed && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => onHandleMissed(dose)}
              className="flex items-center space-x-1.5 font-bold text-xs"
            >
              <AlertCircle className="w-4 h-4" />
              <span>I'm handling this</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
