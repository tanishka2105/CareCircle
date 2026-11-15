import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Clock,
  UserCheck,
  Calendar as CalendarIcon,
  Search,
  ExternalLink,
  Heart,
  Stethoscope,
} from 'lucide-react';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

export const AppointmentsPage = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { member, profile } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past'
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState(null);
  const [deletingAppt, setDeletingAppt] = useState(null);

  const defaultForm = {
    doctor: '',
    specialty: '',
    dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // Local YYYY-MM-DDTHH:mm
    location: '',
    notes: '',
  };

  const [form, setForm] = useState(defaultForm);

  // Fetch appointments
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', activeTab],
    queryFn: async () => {
      const res = await fetch(`/api/appointments?filter=${activeTab}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch appointments');
      return data.data;
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const url = editingAppt ? `/api/appointments/${editingAppt.id}` : '/api/appointments';
      const method = editingAppt ? 'PATCH' : 'POST';

      // Convert local datetime to UTC ISO string
      const dateTimeUtc = new Date(payload.dateTime).toISOString();

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor: payload.doctor,
          specialty: payload.specialty,
          dateTimeUtc,
          location: payload.location,
          notes: payload.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message || 'Failed to save appointment');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success(editingAppt ? 'Appointment updated' : 'Appointment scheduled successfully!');
      setModalOpen(false);
      setEditingAppt(null);
      setForm(defaultForm);
    },
    onError: (err) => {
      toast.error(err.message || 'Error saving appointment');
    },
  });

  // Accompany mutation
  const accompanyMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/appointments/${id}/accompany`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message || 'Failed to accompany');
      return data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success(`You are now accompanying ${profile?.name || 'Mom'} to Dr. ${data.doctor}!`);
    },
    onError: (err) => {
      toast.error(err.message || 'Error updating accompaniment');
    },
  });

  // Delete mutation with Undo
  const deleteMutation = useMutation({
    mutationFn: async (appt) => {
      const res = await fetch(`/api/appointments/${appt.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message || 'Failed to delete');
      return { appt, data };
    },
    onSuccess: ({ appt }) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.undo(`Removed appointment with Dr. ${appt.doctor}`, async () => {
        await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appt),
        });
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        toast.success(`Restored appointment with Dr. ${appt.doctor}`);
      });
      setDeletingAppt(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Error deleting appointment');
    },
  });

  // Google Calendar URL Generator
  const getGoogleCalendarUrl = (appt) => {
    const startDate = new Date(appt.dateTimeUtc);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

    const formatGCalDate = (d) =>
      d.toISOString().replace(/-|:|\.\d\d\d/g, '');

    const title = encodeURIComponent(`Doctor Appointment: Dr. ${appt.doctor} (${appt.specialty}) for ${profile?.name || 'Elder'}`);
    const details = encodeURIComponent(`CareCircle Medical Appointment\nSpecialty: ${appt.specialty}\nLocation: ${appt.location}\nNotes: ${appt.notes || 'None'}`);
    const location = encodeURIComponent(appt.location);
    const dates = `${formatGCalDate(startDate)}/${formatGCalDate(endDate)}`;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
  };

  const openAddModal = () => {
    setEditingAppt(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEditModal = (appt) => {
    setEditingAppt(appt);
    const localDateTime = new Date(appt.dateTimeUtc).toISOString().slice(0, 16);
    setForm({
      doctor: appt.doctor,
      specialty: appt.specialty,
      dateTime: localDateTime,
      location: appt.location,
      notes: appt.notes || '',
    });
    setModalOpen(true);
  };

  const filteredAppts = appointments.filter((a) =>
    a.doctor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {t('appts.title')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Doctor visits, clinic locations, Google Calendar links, and companion coordination.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={openAddModal}
          className="flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>{t('appts.addAppt')}</span>
        </Button>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'upcoming'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {t('appts.upcomingTab')}
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'past'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {t('appts.pastTab')}
          </button>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by doctor or clinic..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Appointments List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-60 w-full rounded-3xl" />
          ))}
        </div>
      ) : filteredAppts.length === 0 ? (
        <Card className="p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mx-auto">
            <CalendarDays className="w-8 h-8" />
          </div>
          <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-200">
            {activeTab === 'upcoming' ? t('dashboard.noUpcomingAppts') : 'No past appointments on record'}
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Schedule doctor visits and let family members coordinate accompaniment in advance.
          </p>
          <Button variant="primary" onClick={openAddModal}>
            Schedule Doctor Appointment
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredAppts.map((appt) => {
            const dateObj = new Date(appt.dateTimeUtc);
            const isAccompanied = Boolean(appt.accompaniedByName);
            const isSelfAccompanying = appt.accompaniedBy === member?.id;

            return (
              <Card key={appt.id} hover className="flex flex-col justify-between border-2 border-slate-200 dark:border-slate-700">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold shrink-0">
                        <Stethoscope className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xl text-slate-900 dark:text-slate-100">
                          {appt.doctor}
                        </h4>
                        <Badge variant="info" className="mt-1 text-xs">
                          {appt.specialty}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openEditModal(appt)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-xl transition"
                        title="Edit Appointment"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingAppt(appt)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-xl transition"
                        title="Delete Appointment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Date, Location, Notes */}
                  <div className="space-y-2 py-3 border-y border-slate-100 dark:border-slate-700/60 my-2 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-slate-100">
                      <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span>
                        {dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at{' '}
                        {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{appt.location}</span>
                    </div>

                    {appt.notes && (
                      <p className="text-xs text-slate-500 italic mt-2 line-clamp-2">
                        "{appt.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Accompaniment & Calendar Footer */}
                <div className="pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 dark:border-slate-700/60 mt-3">
                  {/* Companion status or action */}
                  <div>
                    {isAccompanied ? (
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <UserCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>
                          {isSelfAccompanying ? "You are accompanying" : `${appt.accompaniedByName} accompanying`}
                        </span>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={accompanyMutation.isPending}
                        onClick={() => accompanyMutation.mutate(appt.id)}
                        className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 flex items-center space-x-1.5"
                      >
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                        <span>{t('appts.accompanyBtn')}</span>
                      </Button>
                    )}
                  </div>

                  {/* Add to Google Calendar Link */}
                  <a
                    href={getGoogleCalendarUrl(appt)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{t('appts.addToGoogleCalendar')}</span>
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Appointment Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAppt ? 'Edit Appointment' : t('appts.addAppt')}
        maxWidth="max-w-xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate(form);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              {t('appts.doctor')} *
            </label>
            <input
              type="text"
              required
              value={form.doctor}
              onChange={(e) => setForm({ ...form, doctor: e.target.value })}
              placeholder="e.g. Dr. R. K. Mehta"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                {t('appts.specialty')} *
              </label>
              <input
                type="text"
                required
                value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                placeholder="e.g. Cardiologist, Dentist"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                {t('appts.dateTime')} *
              </label>
              <input
                type="datetime-local"
                required
                value={form.dateTime}
                onChange={(e) => setForm({ ...form, dateTime: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              {t('appts.location')} *
            </label>
            <input
              type="text"
              required
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Apollo Hospital, 3rd Floor, Room 302"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              {t('appts.notes')}
            </label>
            <textarea
              rows="3"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g. Carry ECG reports; ask about dosage reduction for BP medicine."
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
              {editingAppt ? 'Save Changes' : 'Schedule Appointment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal (UX Pattern 19) */}
      <Modal
        isOpen={Boolean(deletingAppt)}
        onClose={() => setDeletingAppt(null)}
        title="Cancel Appointment"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to cancel the appointment with{' '}
            <span className="font-bold text-slate-900 dark:text-slate-100">Dr. {deletingAppt?.doctor}</span>?
            (An Undo toast will be provided.)
          </p>
          <div className="flex justify-end space-x-3 pt-3">
            <Button
              variant="secondary"
              onClick={() => setDeletingAppt(null)}
            >
              Back
            </Button>
            <Button
              variant="danger"
              isLoading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deletingAppt)}
            >
              Yes, Cancel Appointment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
