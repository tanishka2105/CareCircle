import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { Heart, ShieldCheck, UserCheck, CheckCircle2 } from 'lucide-react';

export const CreateProfilePage = () => {
  const { createProfile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [elderly, setElderly] = useState({
    name: '',
    age: '',
    language: 'en',
    timezone: 'Asia/Kolkata',
    emergencyNote: '',
  });

  const [passcode, setPasscode] = useState('');
  const [creator, setCreator] = useState({
    displayName: '',
    role: 'family',
    relationship: 'Daughter',
    email: '',
    phone: '',
  });

  // Strength check
  const calculateStrength = (code) => {
    if (!code) return { score: 0, label: 'Empty', color: 'bg-slate-200' };
    let score = 0;
    if (code.length >= 6) score += 1;
    if (code.length >= 8) score += 1;
    if (/[0-9]/.test(code)) score += 1;
    if (/[a-zA-Z]/.test(code)) score += 1;
    if (/[^a-zA-Z0-9]/.test(code)) score += 1;

    if (score >= 4) return { score: 4, label: 'Very Strong', color: 'bg-emerald-600' };
    if (score === 3) return { score: 3, label: 'Strong', color: 'bg-teal-600' };
    if (score === 2) return { score: 2, label: 'Moderate', color: 'bg-amber-500' };
    return { score: 1, label: 'Weak', color: 'bg-rose-500' };
  };

  const strength = calculateStrength(passcode);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passcode.length < 6) {
      toast.error('Passcode must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      const res = await createProfile({
        elderly: {
          ...elderly,
          age: parseInt(elderly.age, 10),
        },
        passcode,
        creator,
      });

      toast.success(`Care Profile created! Circle code: ${res.profile.profileCode}`);
      navigate('/app');
    } catch (err) {
      toast.error(err.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 font-black text-2xl mb-4">
          C
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {t('auth.createProfileTitle')}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {t('auth.createProfileSubtitle')}
        </p>

        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-6 mt-6">
          <div className="flex items-center space-x-2">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
            }`}>
              1
            </span>
            <span className="text-xs font-semibold">Elder</span>
          </div>
          <div className="w-12 h-0.5 bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center space-x-2">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
            }`}>
              2
            </span>
            <span className="text-xs font-semibold">Security</span>
          </div>
          <div className="w-12 h-0.5 bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center space-x-2">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
            }`}>
              3
            </span>
            <span className="text-xs font-semibold">Admin</span>
          </div>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl px-4">
        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* STEP 1: Elderly Person Details */}
            {step === 1 && (
              <div className="space-y-5 animate-fade-in">
                <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                  <Heart className="w-6 h-6 text-emerald-600" />
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                    {t('auth.elderlyDetails')}
                  </h3>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">{t('auth.fullName')} *</label>
                  <input
                    type="text"
                    required
                    value={elderly.name}
                    onChange={(e) => setElderly({ ...elderly, name: e.target.value })}
                    placeholder="e.g. Kamala Devi"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-base"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t('auth.age')} *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="130"
                      value={elderly.age}
                      onChange={(e) => setElderly({ ...elderly, age: e.target.value })}
                      placeholder="e.g. 75"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t('auth.preferredLanguage')}</label>
                    <select
                      value={elderly.language}
                      onChange={(e) => setElderly({ ...elderly, language: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-base"
                    >
                      <option value="en">English</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">{t('auth.emergencyNote')}</label>
                  <textarea
                    rows="3"
                    value={elderly.emergencyNote}
                    onChange={(e) => setElderly({ ...elderly, emergencyNote: e.target.value })}
                    placeholder="e.g. Severe allergy to penicillin, diabetic, prefers calls in morning"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-base"
                  />
                </div>

                <Button
                  type="button"
                  className="w-full"
                  disabled={!elderly.name || !elderly.age}
                  onClick={() => setStep(2)}
                >
                  Continue to Security
                </Button>
              </div>
            )}

            {/* STEP 2: Passcode & Protection */}
            {step === 2 && (
              <div className="space-y-5 animate-fade-in">
                <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                    Circle Security Passcode
                  </h3>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t('auth.passcodeHint')}
                </p>

                <div>
                  <label className="block text-sm font-medium mb-1.5">{t('auth.passcode')} *</label>
                  <input
                    type="password"
                    required
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-base tracking-widest"
                  />
                </div>

                {/* Strength Meter */}
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold mb-1">
                    <span>{t('auth.passcodeStrength')}:</span>
                    <span className="font-bold">{strength.label}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                    <div
                      className={`h-full transition-all duration-300 ${strength.color}`}
                      style={{ width: `${(strength.score / 4) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-1/2"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="w-1/2"
                    disabled={passcode.length < 6}
                    onClick={() => setStep(3)}
                  >
                    Continue to Details
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Creator Details */}
            {step === 3 && (
              <div className="space-y-5 animate-fade-in">
                <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                  <UserCheck className="w-6 h-6 text-emerald-600" />
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                    {t('auth.creatorDetails')}
                  </h3>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">{t('auth.yourName')} *</label>
                  <input
                    type="text"
                    required
                    value={creator.displayName}
                    onChange={(e) => setCreator({ ...creator, displayName: e.target.value })}
                    placeholder="e.g. Priya Sharma"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-base"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t('auth.role')} *</label>
                    <select
                      value={creator.role}
                      onChange={(e) => setCreator({ ...creator, role: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-base"
                    >
                      <option value="family">{t('auth.roleFamily')}</option>
                      <option value="caretaker">{t('auth.roleCaretaker')}</option>
                      <option value="elderly">{t('auth.roleElderly')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t('auth.relationship')} *</label>
                    <input
                      type="text"
                      required
                      value={creator.relationship}
                      onChange={(e) => setCreator({ ...creator, relationship: e.target.value })}
                      placeholder="e.g. Daughter, Son, Nurse"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-base"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">{t('auth.email')} *</label>
                  <input
                    type="email"
                    required
                    value={creator.email}
                    onChange={(e) => setCreator({ ...creator, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">{t('auth.phone')} *</label>
                  <input
                    type="tel"
                    required
                    value={creator.phone}
                    onChange={(e) => setCreator({ ...creator, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-base"
                  />
                </div>

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-1/3"
                    onClick={() => setStep(2)}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="w-2/3"
                    isLoading={loading}
                    disabled={!creator.displayName || !creator.email || !creator.phone}
                  >
                    {t('auth.createBtn')}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Card>

        <div className="text-center mt-6 text-sm text-slate-600 dark:text-slate-400">
          Already have a circle code?{' '}
          <Link to="/join" className="font-bold text-emerald-600 hover:text-emerald-700">
            Join Circle
          </Link>{' '}
          or{' '}
          <Link to="/login" className="font-bold text-emerald-600 hover:text-emerald-700">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
