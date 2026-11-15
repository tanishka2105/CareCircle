import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import {
  Phone,
  Mail,
  MessageCircle,
  KeyRound,
  Trash2,
  Shield,
  UserPlus,
  Clock,
  Sparkles,
} from 'lucide-react';

export const CircleDirectoryPage = () => {
  const { profile, member, isAdmin } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Rotate Passcode State
  const [rotateModalOpen, setRotateModalOpen] = useState(false);
  const [newPasscode, setNewPasscode] = useState('');
  const [isRotating, setIsRotating] = useState(false);

  // Remove Member State
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/members');
      const data = await res.json();
      if (res.ok && data.success) {
        setMembers(data.data);
      }
    } catch (err) {
      toast.error('Failed to load circle members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleRotatePasscode = async (e) => {
    e.preventDefault();
    if (newPasscode.length < 6) {
      toast.error('New passcode must be at least 6 characters.');
      return;
    }

    try {
      setIsRotating(true);
      const res = await fetch('/api/passcode/rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPasscode }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to rotate passcode');
      }

      toast.success('Passcode rotated successfully! All members must use the new passcode.');
      setRotateModalOpen(false);
      setNewPasscode('');
    } catch (err) {
      toast.error(err.message || 'Error updating passcode');
    } finally {
      setIsRotating(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      setIsRemoving(true);
      const res = await fetch(`/api/members/${memberToRemove.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to remove member');
      }

      toast.success(`${memberToRemove.displayName} was removed from the circle.`);
      setMemberToRemove(null);
      fetchMembers();
    } catch (err) {
      toast.error(err.message || 'Failed to remove member');
    } finally {
      setIsRemoving(false);
    }
  };

  const formatLastActive = (isoString) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMins < 5) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {t('circle.title')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {t('circle.subtitle')}
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRotateModalOpen(true)}
              className="flex items-center space-x-2"
            >
              <KeyRound className="w-4 h-4 text-emerald-600" />
              <span>{t('circle.rotatePasscode')}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((m) => {
            const isSelf = m.id === member?.id;
            // Clean phone for whatsapp
            const rawPhone = (m.phone || '').replace(/[^0-9]/g, '');

            return (
              <Card key={m.id} hover className="flex flex-col justify-between relative overflow-hidden">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3.5">
                      <Avatar name={m.displayName} size="md" isOnline={m.isOnline} />
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                            {m.displayName}
                          </h4>
                          {isSelf && (
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-700 font-bold px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-300">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {m.relationship || m.role}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-1">
                      {m.isAdmin && (
                        <Badge variant="purple" className="text-[10px]">
                          Admin
                        </Badge>
                      )}
                      <Badge
                        variant={m.role === 'elderly' ? 'success' : m.role === 'caretaker' ? 'info' : 'neutral'}
                        className="capitalize text-[10px]"
                      >
                        {m.role}
                      </Badge>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 py-3 border-y border-slate-100 dark:border-slate-700/60 my-2">
                    <div className="flex items-center space-x-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{m.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{m.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-400">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Last active: {formatLastActive(m.lastActiveAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions (Call, Email, WhatsApp) */}
                <div className="pt-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <a
                      href={`tel:${m.phone}`}
                      className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 transition"
                      title={`Call ${m.displayName}`}
                      aria-label={`Call ${m.displayName}`}
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                    <a
                      href={`mailto:${m.email}`}
                      className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 transition"
                      title={`Email ${m.displayName}`}
                      aria-label={`Email ${m.displayName}`}
                    >
                      <Mail className="w-4 h-4" />
                    </a>
                    {rawPhone && (
                      <a
                        href={`https://wa.me/${rawPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 transition"
                        title={`WhatsApp ${m.displayName}`}
                        aria-label={`WhatsApp ${m.displayName}`}
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                      </a>
                    )}
                  </div>

                  {/* Remove Button for Admin */}
                  {isAdmin && !isSelf && (
                    <button
                      onClick={() => setMemberToRemove(m)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition"
                      title="Remove Member from Circle"
                      aria-label="Remove Member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Rotate Passcode Modal */}
      <Modal
        isOpen={rotateModalOpen}
        onClose={() => setRotateModalOpen(false)}
        title={t('circle.rotatePasscode')}
      >
        <form onSubmit={handleRotatePasscode} className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Rotating the passcode will immediately revoke all existing sessions. Every member of the circle will need the new passcode to sign back in.
          </p>
          <div>
            <label className="block text-sm font-medium mb-1">New Passcode (min 6 chars)</label>
            <input
              type="password"
              required
              value={newPasscode}
              onChange={(e) => setNewPasscode(e.target.value)}
              placeholder="Enter new strong passcode"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-base tracking-widest"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRotateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isRotating}
              disabled={newPasscode.length < 6}
            >
              Update & Revoke Sessions
            </Button>
          </div>
        </form>
      </Modal>

      {/* Destructive Action Modal: Remove Member (UX Pattern 19) */}
      <Modal
        isOpen={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
        title="Remove Member from Circle"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to remove <span className="font-bold text-slate-900 dark:text-slate-100">{memberToRemove?.displayName}</span> from this CareCircle?
            Their active session will be immediately invalidated and they will no longer have access to medication logs or appointments.
          </p>
          <div className="flex justify-end space-x-3 pt-3">
            <Button
              variant="secondary"
              onClick={() => setMemberToRemove(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              isLoading={isRemoving}
              onClick={handleRemoveMember}
            >
              Yes, Remove Member
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
