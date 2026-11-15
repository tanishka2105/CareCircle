import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Pill,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Clock,
  Calendar,
  Utensils,
  Package,
  Search,
  Filter,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Sparkles,
} from 'lucide-react';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

export const MedicationsPage = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useLanguage();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState('all'); // all, active, paused
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [deletingMed, setDeletingMed] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // Form State
  const defaultForm = {
    name: '',
    dosage: '',
    form: 'tablet',
    times: ['08:00'],
    days: [0, 1, 2, 3, 4, 5, 6],
    mealRelation: 'after_food',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: '',
    stockCount: 30,
    refillThreshold: 5,
    active: true,
    colour: '#10b981',
  };

  const [form, setForm] = useState(defaultForm);

  // Fetch medications
  const { data: medications = [], isLoading } = useQuery({
    queryKey: ['medications'],
    queryFn: async () => {
      const res = await fetch('/api/medications');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch medications');
      return data.data;
    },
  });

  // Create / Update mutation
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const url = editingMed ? `/api/medications/${editingMed.id}` : '/api/medications';
      const method = editingMed ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to save medication');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['doses'] });

      if (data.duplicateWarning) {
        toast.info(data.duplicateWarning);
      } else {
        toast.success(editingMed ? 'Medication updated' : 'Medication added successfully!');
      }

      setModalOpen(false);
      setEditingMed(null);
      setForm(defaultForm);
      setDuplicateWarning(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Error saving medication');
    },
  });

  // Delete mutation with Undo support
  const deleteMutation = useMutation({
    mutationFn: async (med) => {
      const res = await fetch(`/api/medications/${med.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message || 'Failed to delete');
      return { med, data };
    },
    onSuccess: ({ med }) => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['doses'] });

      toast.undo(`Deleted ${med.name}`, async () => {
        // Undo: Recreate deleted medication
        await fetch('/api/medications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(med),
        });
        queryClient.invalidateQueries({ queryKey: ['medications'] });
        queryClient.invalidateQueries({ queryKey: ['doses'] });
        toast.success(`Restored ${med.name}`);
      });

      setDeletingMed(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Error deleting medication');
    },
  });

  // Toggle active status
  const toggleActive = async (med) => {
    try {
      const res = await fetch(`/api/medications/${med.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !med.active }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['medications'] });
        queryClient.invalidateQueries({ queryKey: ['doses'] });
        toast.success(med.active ? `Paused ${med.name}` : `Resumed ${med.name}`);
      }
    } catch {
      toast.error('Failed to toggle active status');
    }
  };

  const openAddModal = () => {
    setEditingMed(null);
    setForm(defaultForm);
    setDuplicateWarning(null);
    setModalOpen(true);
  };

  const openEditModal = (med) => {
    setEditingMed(med);
    setForm({
      name: med.name,
      dosage: med.dosage,
      form: med.form || 'tablet',
      times: med.times || ['08:00'],
      days: med.days || [0, 1, 2, 3, 4, 5, 6],
      mealRelation: med.mealRelation || 'after_food',
      startDate: med.startDate || new Date().toISOString().split('T')[0],
      endDate: med.endDate || '',
      notes: med.notes || '',
      stockCount: med.stockCount ?? 30,
      refillThreshold: med.refillThreshold ?? 5,
      active: med.active ?? true,
      colour: med.colour || '#10b981',
    });
    setDuplicateWarning(null);
    setModalOpen(true);
  };

  const addTimeField = () => {
    setForm({ ...form, times: [...form.times, '12:00'] });
  };

  const removeTimeField = (index) => {
    if (form.times.length <= 1) return;
    setForm({ ...form, times: form.times.filter((_, i) => i !== index) });
  };

  const toggleDay = (dayIndex) => {
    const exists = form.days.includes(dayIndex);
    const updated = exists
      ? form.days.filter((d) => d !== dayIndex)
      : [...form.days, dayIndex].sort();
    setForm({ ...form, days: updated });
  };

  // Filtered meds
  const filteredMeds = medications.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.dosage.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterActive === 'active') return matchesSearch && m.active;
    if (filterActive === 'paused') return matchesSearch && !m.active;
    return matchesSearch;
  });

  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const fullDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {t('meds.title')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Active medication schedules, automated dose reminders, and stock counts.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="primary"
            onClick={openAddModal}
            className="flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>{t('meds.addMed')}</span>
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by medicine or dose..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterActive('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterActive === 'all'
                ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            All ({medications.length})
          </button>
          <button
            onClick={() => setFilterActive('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterActive === 'active'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            Active ({medications.filter((m) => m.active).length})
          </button>
          <button
            onClick={() => setFilterActive('paused')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterActive === 'paused'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            Paused ({medications.filter((m) => !m.active).length})
          </button>
        </div>
      </div>

      {/* Medications Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-3xl" />
          ))}
        </div>
      ) : filteredMeds.length === 0 ? (
        <Card className="p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto">
            <Pill className="w-8 h-8" />
          </div>
          <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-200">
            No medications found
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Add a medication schedule to generate daily doses and receive proactive email reminders.
          </p>
          <Button variant="primary" onClick={openAddModal}>
            Add First Medication
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMeds.map((med) => {
            const isLowStock = (med.stockCount ?? 0) <= (med.refillThreshold ?? 5);

            return (
              <Card
                key={med.id}
                hover
                className={`flex flex-col justify-between border-2 transition-all ${
                  !med.active ? 'opacity-60 bg-slate-50 dark:bg-slate-850' : ''
                }`}
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm font-bold"
                        style={{ backgroundColor: med.colour || '#10b981' }}
                      >
                        <Pill className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-lg text-slate-900 dark:text-slate-100 leading-tight">
                          {med.name}
                        </h4>
                        <span className="text-sm font-bold text-slate-500">
                          {med.dosage}
                        </span>
                      </div>
                    </div>

                    <Badge variant={med.active ? 'success' : 'neutral'} className="text-[10px] capitalize">
                      {med.active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>

                  {/* Scheduled Times */}
                  <div className="space-y-2 py-3 border-y border-slate-100 dark:border-slate-700/60 my-2 text-xs">
                    <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold">Times:</span>
                      <div className="flex flex-wrap gap-1">
                        {(med.times || []).map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 font-mono font-bold"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Days of week */}
                    <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold">Days:</span>
                      <div className="flex space-x-1">
                        {dayNames.map((d, i) => (
                          <span
                            key={i}
                            className={`w-5 h-5 rounded-md text-[10px] flex items-center justify-center font-bold ${
                              (med.days || []).includes(i)
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                            }`}
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Stock status */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 font-semibold">
                        <Package className="w-3.5 h-3.5 text-slate-400" />
                        <span>Stock:</span>
                        <span className="font-bold">{med.stockCount ?? 0} pills</span>
                      </span>

                      {isLowStock && (
                        <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Refill Soon</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {med.notes && (
                    <p className="text-xs text-slate-500 italic mt-2 line-clamp-2">
                      "{med.notes}"
                    </p>
                  )}
                </div>

                {/* Bottom Card Actions */}
                <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 mt-3">
                  <button
                    onClick={() => toggleActive(med)}
                    className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition"
                  >
                    {med.active ? (
                      <>
                        <PauseCircle className="w-4 h-4 text-amber-500" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4 text-emerald-500" />
                        <span>Resume</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditModal(med)}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-700 rounded-xl transition"
                      title="Edit Medication"
                      aria-label="Edit Medication"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingMed(med)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-xl transition"
                      title="Delete Medication"
                      aria-label="Delete Medication"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Medication Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMed ? t('meds.editMed') : t('meds.addMed')}
        maxWidth="max-w-2xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate(form);
          }}
          className="space-y-4"
        >
          {duplicateWarning && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{duplicateWarning}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                {t('meds.medName')} *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Metformin"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                {t('meds.dosage')} *
              </label>
              <input
                type="text"
                required
                value={form.dosage}
                onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                placeholder="e.g. 500 mg, 1 tablet"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                {t('meds.form')}
              </label>
              <select
                value={form.form}
                onChange={(e) => setForm({ ...form, form: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="tablet">Tablet</option>
                <option value="capsule">Capsule</option>
                <option value="syrup">Syrup</option>
                <option value="injection">Injection</option>
                <option value="drops">Eye/Ear Drops</option>
                <option value="inhaler">Inhaler</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                {t('meds.mealRelation')}
              </label>
              <select
                value={form.mealRelation}
                onChange={(e) => setForm({ ...form, mealRelation: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="after_food">{t('meds.afterFood')}</option>
                <option value="before_food">{t('meds.beforeFood')}</option>
                <option value="with_food">{t('meds.withFood')}</option>
                <option value="independent">{t('meds.independent')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Color Tag
              </label>
              <div className="flex items-center space-x-2 pt-1">
                {['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, colour: c })}
                    className={`w-6 h-6 rounded-full border-2 transition ${
                      form.colour === c ? 'border-slate-900 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Times */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Scheduled Times (24h format) *
              </label>
              <button
                type="button"
                onClick={addTimeField}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
              >
                + Add Time
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.times.map((tVal, idx) => (
                <div key={idx} className="flex items-center space-x-1">
                  <input
                    type="time"
                    required
                    value={tVal}
                    onChange={(e) => {
                      const updated = [...form.times];
                      updated[idx] = e.target.value;
                      setForm({ ...form, times: updated });
                    }}
                    className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono"
                  />
                  {form.times.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTimeField(idx)}
                      className="text-slate-400 hover:text-rose-500 p-1"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Days of Week */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Days of Week
            </label>
            <div className="flex space-x-2">
              {fullDayNames.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                    form.days.includes(i)
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Stock Count and Refill */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                {t('meds.stockCount')}
              </label>
              <input
                type="number"
                min="0"
                value={form.stockCount}
                onChange={(e) => setForm({ ...form, stockCount: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                {t('meds.refillThreshold')}
              </label>
              <input
                type="number"
                min="0"
                value={form.refillThreshold}
                onChange={(e) => setForm({ ...form, refillThreshold: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Special Instructions
            </label>
            <textarea
              rows="2"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g. Take with a warm glass of water; monitor blood sugar."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={saveMutation.isPending}
            >
              {editingMed ? 'Save Changes' : 'Schedule Medication'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal (UX Pattern 19) */}
      <Modal
        isOpen={Boolean(deletingMed)}
        onClose={() => setDeletingMed(null)}
        title="Delete Medication Schedule"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to remove{' '}
            <span className="font-bold text-slate-900 dark:text-slate-100">{deletingMed?.name}</span>?
            All future scheduled doses will be cancelled. (An Undo toast will be provided.)
          </p>
          <div className="flex justify-end space-x-3 pt-3">
            <Button
              variant="secondary"
              onClick={() => setDeletingMed(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              isLoading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deletingMed)}
            >
              Yes, Delete Schedule
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
