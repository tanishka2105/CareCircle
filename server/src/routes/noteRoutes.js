import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
} from '../controllers/noteController.js';

const router = Router();

// All note routes require a logged-in circle member
router.use(requireAuth);

// GET    /api/notes?limit=50          -> care notes thread, newest first
router.get('/', getNotes);

// POST   /api/notes                   -> add a note (notifies other members)
router.post('/', createNote);

// PATCH  /api/notes/:noteId           -> edit content / pin (author or admin)
router.patch('/:noteId', updateNote);

// DELETE /api/notes/:noteId           -> delete (author or admin)
router.delete('/:noteId', deleteNote);

export default router;