import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Pin, PinOff, Edit2, Trash2, StickyNote } from 'lucide-react';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import { LIVE_QUERY_OPTIONS } from '../lib/live.js';
import { timeAgo } from '../lib/time.js';
import { useNow } from '../hooks/useNow.js';

const MAX_LEN = 2000;
const DRAFT_KEY = 'carecircle:notes:draft';

const readDraft = () => {
  try {
    return localStorage.getItem(DRAFT_KEY) || '';
  } catch {
    return '';
  }
};

export const NotesPage = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { member } = useAuth();
  const now = useNow();

  const [draft, setDraft] = useState(readDraft);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [deletingNote, setDeletingNote] = useState(null);

  // Autosave draft (debounced 500ms)
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        if (draft) localStorage.setItem(DRAFT_KEY, draft);
        else localStorage.removeItem(DRAFT_KEY);
      } catch {
        // storage unavailable - ignore
      }
    }, 500);
    return () => clearTimeout(id);
  }, [draft]);

  const { data: rawNotes = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['notes'],
    queryFn: () => api.get('/notes?limit=100'),
    ...LIVE_QUERY_OPTIONS,
  });

  // Pinned first, then newest first
  const notes = useMemo(
    () =>
      [...rawNotes].sort((a, b) => {
        if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
        return a.createdAt > b.createdAt ? -1 : 1;
      }),
    [rawNotes]
  );

  const refreshRelated = () => {
    queryClient.invalidateQueries({ queryKey: ['notes'] });
    queryClient.invalidateQueries({ queryKey: ['activity'] });
  };

  // Create (optimistic)
  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/notes', payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] });
      const previous = queryClient.getQueryData(['notes']);

      const optimistic = {
        id: `temp-${Date.now()}`,
        memberId: member?.id,
        memberName: member?.displayName,
        content: payload.content,
        isPinned: Boolean(payload.isPinned),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pending: true,
      };
      queryClient.setQueryData(['notes'], (old = []) => [optimistic, ...old]);

      return { previous };
    },
    onError: (err, payload, ctx) => {
      queryClient.setQueryData(['notes'], ctx?.previous);
      setDraft((cur) => cur || payload.content); // give the text back
      toast.error(err.message || 'Could not post note');
    },
    onSettled: refreshRelated,
  });

  // Update (edit / pin)
  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/notes/${id}`, body),
    onMutate: async ({ id, ...body }) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] });
      const previous = queryClient.getQueryData(['notes']);
      queryClient.setQueryData(['notes'], (old = []) =>
        old.map((n) => (n.id === id ? { ...n, ...body } : n))
      );
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      queryClient.setQueryData(['notes'], ctx?.previous);
      toast.error(err.message || 'Could not update note');
    },
    onSettled: refreshRelated,
  });

  // Delete (confirm modal + undo toast)
  const deleteMutation = useMutation({
    mutationFn: (note) => api.delete(`/notes/${note.id}`),
    onMutate: async (note) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] });
      const previous = queryClient.getQueryData(['notes']);
      queryClient.setQueryData(['notes'], (old = []) => old.filter((n) => n.id !== note.id));
      setDeletingNote(null);
      return { previous };
    },
    onError: (err, _note, ctx) => {
      queryClient.setQueryData(['notes'], ctx?.previous);
      toast.error(err.message || 'Could not delete note');
    },
    onSuccess: (_data, note) => {
      toast.undo('Note deleted', async () => {
        try {
          await api.post('/notes', { content: note.content, isPinned: Boolean(note.isPinned) });
          toast.success('Note restored');
        } catch (err) {
          toast.error(err.message || 'Could not restore note');
        } finally {
          refreshRelated();
        }
      });
    },
    onSettled: refreshRelated,
  });

  const submitDraft = () => {
    const content = draft.trim();
    if (!content || createMutation.isPending) return;
    setDraft('');
    createMutation.mutate({ content });
  };

  const startEdit = (note) => {
    setEditingId(note.id);
    setEditText(note.content);
  };

  const saveEdit = (note) => {
    const content = editText.trim();
    if (!content) return toast.error('Note cannot be empty');
    if (content !== note.content) updateMutation.mutate({ id: note.id, content });
    setEditingId(null);
  };

  const canModify = (note) => note.memberId === member?.id || member?.isAdmin;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          Care Notes
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          A shared thread for the whole circle: observations, instructions and updates.
        </p>
      </div>

      {/* Composer */}
      <Card className="space-y-3">
        <label htmlFor="note-draft" className="sr-only">
          Write a care note
        </label>
        <textarea
          id="note-draft"
          rows="3"
          value={draft}
          maxLength={MAX_LEN}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              submitDraft();
            }
          }}
          placeholder="e.g. BP was 150/95 this morning. Please ask the doctor about the dose."
          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {draft.length}/{MAX_LEN} · Ctrl+Enter to post
          </span>
          <Button
            variant="primary"
            onClick={submitDraft}
            disabled={!draft.trim()}
            className="flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Post note</span>
          </Button>
        </div>
      </Card>

      {/* Thread */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <Card className="p-8 text-center space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {error?.message || 'Could not load notes.'}
          </p>
          <button onClick={() => refetch()} className="text-sm font-bold text-blue-600 hover:underline">
            Try again
          </button>
        </Card>
      ) : notes.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 flex items-center justify-center mx-auto">
            <StickyNote className="w-8 h-8" />
          </div>
          <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-200">No notes yet</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Share how the day went so everyone in the circle stays in the loop.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3" aria-live="polite">
          {notes.map((note) => {
            const isEditing = editingId === note.id;
            const isMine = note.memberId === member?.id;

            return (
              <li key={note.id}>
                <Card
                  className={`${note.pending ? 'opacity-60' : ''} ${
                    note.isPinned ? 'border-2 border-amber-300 dark:border-amber-700' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                        {isMine ? 'You' : note.memberName}
                      </span>
                      {note.isPinned && (
                        <Badge variant="warning" className="text-xs">
                          Pinned
                        </Badge>
                      )}
                      <span className="text-xs text-slate-400">
                        {note.pending ? 'Sending…' : timeAgo(note.createdAt, now)}
                      </span>
                    </div>

                    {canModify(note) && !note.pending && (
                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => updateMutation.mutate({ id: note.id, isPinned: !note.isPinned })}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-700 rounded-xl transition"
                          aria-label={note.isPinned ? 'Unpin note' : 'Pin note'}
                          title={note.isPinned ? 'Unpin' : 'Pin'}
                        >
                          {note.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => startEdit(note)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-xl transition"
                          aria-label="Edit note"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingNote(note)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-xl transition"
                          aria-label="Delete note"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="mt-3 space-y-2">
                      <label htmlFor={`edit-${note.id}`} className="sr-only">
                        Edit note
                      </label>
                      <textarea
                        id={`edit-${note.id}`}
                        rows="3"
                        value={editText}
                        maxLength={MAX_LEN}
                        onChange={(e) => setEditText(e.target.value)}
                        autoFocus
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <div className="flex justify-end space-x-2">
                        <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                        <Button size="sm" variant="primary" onClick={() => saveEdit(note)}>
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words">
                      {note.content}
                    </p>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {/* Delete confirmation */}
      <Modal isOpen={Boolean(deletingNote)} onClose={() => setDeletingNote(null)} title="Delete note">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Delete this note? You can undo it right after.
          </p>
          {deletingNote && (
            <p className="text-xs text-slate-500 italic line-clamp-3">"{deletingNote.content}"</p>
          )}
          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="secondary" onClick={() => setDeletingNote(null)}>
              Back
            </Button>
            <Button
              variant="danger"
              isLoading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deletingNote)}
            >
              Yes, delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};