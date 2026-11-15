import React from 'react';
import { Card } from '../components/ui/Card.jsx';
import { StickyNote } from 'lucide-react';

export const NotesPage = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Care Notes</h2>
      </div>
      <Card className="p-8 text-center">
        <StickyNote className="w-12 h-12 text-amber-500 mx-auto mb-3 animate-pulse" />
        <h3 className="text-lg font-bold">Shared Family & Clinical Notes</h3>
        <p className="text-sm text-slate-500 mt-1">Connecting to Phase 5 Care Notes Feed...</p>
      </Card>
    </div>
  );
};
