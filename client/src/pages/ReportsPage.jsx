import React from 'react';
import { Card } from '../components/ui/Card.jsx';
import { LineChart } from 'lucide-react';

export const ReportsPage = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Adherence & Analytics</h2>
      </div>
      <Card className="p-8 text-center">
        <LineChart className="w-12 h-12 text-teal-500 mx-auto mb-3 animate-pulse" />
        <h3 className="text-lg font-bold">Adherence Insights & Doctor PDF Reports</h3>
        <p className="text-sm text-slate-500 mt-1">Connecting to Phase 5 Adherence Engine...</p>
      </Card>
    </div>
  );
};
