import React, { useState } from 'react';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Check, Sparkles, Shield, Zap, Lock } from 'lucide-react';
import { useToast } from '../components/ui/Toast.jsx';

export const PricingPage = () => {
  const toast = useToast();
  const [selectedPlan, setSelectedPlan] = useState('free');

  const handleUpgradeMock = (tier) => {
    toast.success(`You are on the ${tier} tier! Hackathon demo features unlocked.`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in py-4">
      <div className="text-center space-y-2">
        <Badge variant="purple" className="px-3 py-1 text-xs">
          CareCircle Plans
        </Badge>
        <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          Simple, Transparent Healthcare Pricing
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-sm">
          Keep your family connected and never miss a critical health routine.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        {/* Free Plan */}
        <Card className="p-8 flex flex-col justify-between border-2 border-slate-200 dark:border-slate-700 relative">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Care Free</h3>
              <Badge variant="neutral">Active Plan</Badge>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
              ₹0 <span className="text-sm font-normal text-slate-500">/ forever</span>
            </div>
            <p className="text-xs text-slate-500">
              Essential medication tracking and circle coordination.
            </p>

            <ul className="space-y-3 pt-4 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-center space-x-2.5">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Up to 5 Family Circle Members</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Unlimited Medication Schedules</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Doctor Appointments & Calendar Sync</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Missed Dose Email Alerts</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Elder Mode & Emergency SOS</span>
              </li>
            </ul>
          </div>

          <Button variant="secondary" className="w-full mt-8" disabled>
            Current Plan
          </Button>
        </Card>

        {/* Care Plus (Pro) */}
        <Card className="p-8 flex flex-col justify-between border-2 border-emerald-500 shadow-xl shadow-emerald-600/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-extrabold uppercase px-4 py-1 rounded-bl-xl tracking-wider">
            Most Popular
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <span>Care Plus</span>
                <Sparkles className="w-5 h-5 text-emerald-500 fill-emerald-500" />
              </h3>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
              ₹499 <span className="text-sm font-normal text-slate-500">/ month</span>
            </div>
            <p className="text-xs text-slate-500">
              Advanced AI medical strip scanning, doctor PDF reports & priority alerts.
            </p>

            <ul className="space-y-3 pt-4 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-center space-x-2.5 font-semibold text-slate-900 dark:text-slate-100">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Unlimited Family & Caretaker Members</span>
              </li>
              <li className="flex items-center space-x-2.5 font-semibold text-slate-900 dark:text-slate-100">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Unlimited Gemini AI Medicine Scans</span>
              </li>
              <li className="flex items-center space-x-2.5 font-semibold text-slate-900 dark:text-slate-100">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Export Doctor-Ready Clinical PDF Reports</span>
              </li>
              <li className="flex items-center space-x-2.5 font-semibold text-slate-900 dark:text-slate-100">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Voice Command Parsing in Hindi & English</span>
              </li>
              <li className="flex items-center space-x-2.5 font-semibold text-slate-900 dark:text-slate-100">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Automated SMS & WhatsApp Webhook Alerts</span>
              </li>
            </ul>
          </div>

          <Button
            variant="primary"
            className="w-full mt-8"
            onClick={() => handleUpgradeMock('Care Plus')}
          >
            Upgrade to Care Plus (Demo)
          </Button>
        </Card>
      </div>
    </div>
  );
};
