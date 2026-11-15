import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-black text-3xl mb-6">
        404
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
        Page Not Found
      </h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-md text-base">
        The page you are looking for doesn't exist or was moved. Let's get you back to your CareCircle dashboard.
      </p>
      <div className="mt-6 flex items-center space-x-3">
        <Link to="/app">
          <Button variant="primary" className="flex items-center space-x-2">
            <Home className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};
