import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { Users, Shield, CheckSquare } from 'lucide-react';

export const JoinCirclePage = () => {
  const { joinCircle } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const [profileCode, setProfileCode] = useState('');
  const [passcode, setPasscode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('family');
  const [relationship, setRelationship] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      setProfileCode(codeFromUrl.toUpperCase());
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!consentGiven) {
      toast.error('Please check the circle visibility consent before joining.');
      return;
    }

    try {
      setLoading(true);
      await joinCircle({
        profileCode: profileCode.trim().toUpperCase(),
        passcode,
        displayName: displayName.trim(),
        role,
        relationship: relationship.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });

      toast.success('Joined the CareCircle successfully!');
      navigate('/app');
    } catch (err) {
      toast.error(err.message || 'Failed to join circle. Check the code and passcode.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 font-black text-2xl mb-4">
          C
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {t('auth.joinTitle')}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {t('auth.joinSubtitle')}
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('auth.profileCode')} *
              </label>
              <input
                type="text"
                required
                value={profileCode}
                onChange={(e) => setProfileCode(e.target.value.toUpperCase())}
                placeholder="e.g. CARE-7F3K"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-base font-mono uppercase tracking-wider"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t('auth.passcode')} *
              </label>
              <input
                type="password"
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Passcode"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-base tracking-widest"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
              <label className="block text-sm font-medium mb-1">
                {t('auth.yourName')} *
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Rahul Patel"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-base"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">{t('auth.role')}</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                >
                  <option value="family">{t('auth.roleFamily')}</option>
                  <option value="caretaker">{t('auth.roleCaretaker')}</option>
                  <option value="elderly">{t('auth.roleElderly')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('auth.relationship')} *</label>
                <input
                  type="text"
                  required
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="e.g. Son, Sister"
                  className="w-full px-3 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t('auth.email')} *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t('auth.phone')} *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-base"
              />
            </div>

            {/* Mandatory Consent Notice */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                  {t('auth.consentNotice')}
                </span>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full"
              isLoading={loading}
              disabled={!consentGiven || !profileCode || !passcode || !displayName || !email || !phone}
            >
              {t('auth.joinBtn')}
            </Button>
          </form>
        </Card>

        <div className="text-center mt-6 text-sm text-slate-600 dark:text-slate-400">
          Already registered?{' '}
          <Link to="/login" className="font-bold text-emerald-600 hover:text-emerald-700">
            Sign In
          </Link>{' '}
          or{' '}
          <Link to="/create" className="font-bold text-emerald-600 hover:text-emerald-700">
            Create Profile
          </Link>
        </div>
      </div>
    </div>
  );
};
