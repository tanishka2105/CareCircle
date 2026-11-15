import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { KeyRound, ArrowRight } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const toast = useToast();

  const [profileCode, setProfileCode] = useState('');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);

  // If member selection step required
  const [membersSelection, setMembersSelection] = useState(null);

  const handleSubmit = async (e, selectedMemberId = null) => {
    if (e) e.preventDefault();

    try {
      setLoading(true);
      const res = await login({
        profileCode: profileCode.trim().toUpperCase(),
        passcode,
        memberId: selectedMemberId,
      });

      if (res && res.requiresMemberSelection) {
        setMembersSelection(res.data.members);
        toast.info('Please select your profile to complete sign in.');
        return;
      }

      toast.success('Welcome back to CareCircle!');
      navigate('/app');
    } catch (err) {
      toast.error(err.message || 'Invalid code or passcode');
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
          {t('auth.loginTitle')}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {t('auth.loginSubtitle')}
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card className="p-8">
          {!membersSelection ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  {t('auth.profileCode')}
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
                <label className="block text-sm font-medium mb-1.5">
                  {t('auth.passcode')}
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

              <Button
                type="submit"
                className="w-full"
                isLoading={loading}
                disabled={!profileCode || !passcode}
              >
                {t('auth.loginBtn')}
              </Button>
            </form>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                {t('auth.selectYourName')}
              </h3>
              <div className="space-y-2">
                {membersSelection.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleSubmit(null, m.id)}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar name={m.displayName} size="sm" />
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {m.displayName}
                        </div>
                        <div className="text-xs text-slate-500 capitalize">
                          {m.relationship || m.role}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-600" />
                  </button>
                ))}
              </div>

              <Button
                type="button"
                variant="secondary"
                className="w-full mt-4"
                onClick={() => setMembersSelection(null)}
              >
                Back to Sign In
              </Button>
            </div>
          )}
        </Card>

        <div className="text-center mt-6 text-sm text-slate-600 dark:text-slate-400">
          New to CareCircle?{' '}
          <Link to="/create" className="font-bold text-emerald-600 hover:text-emerald-700">
            Create Profile
          </Link>{' '}
          or{' '}
          <Link to="/join" className="font-bold text-emerald-600 hover:text-emerald-700">
            Join Circle
          </Link>
        </div>
      </div>
    </div>
  );
};
