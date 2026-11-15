import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Pill,
  CalendarDays,
  Users,
  LineChart,
  StickyNote,
  HeartHandshake,
  Sparkles,
  UserPlus,
  Bell,
  Sun,
  Moon,
  Type,
  LogOut,
  AlertOctagon,
  Copy,
  Check,
  Menu,
  X,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { Avatar } from '../ui/Avatar.jsx';
import { Button } from '../ui/Button.jsx';
import { Modal } from '../ui/Modal.jsx';
import { useToast } from '../ui/Toast.jsx';

export const AppLayout = () => {
  const { profile, member, logout } = useAuth();
  const { theme, toggleTheme, fontSize, cycleFontSize } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const toast = useToast();

  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [isSosSending, setIsSosSending] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const copyProfileCode = () => {
    if (profile?.profileCode) {
      navigator.clipboard.writeText(profile.profileCode);
      setCopied(true);
      toast.success(`Profile code ${profile.profileCode} copied to clipboard!`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSosTrigger = async () => {
    try {
      setIsSosSending(true);
      const res = await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to trigger SOS');
      }
      toast.error('EMERGENCY SOS TRANSMITTED! All circle members have been alerted via email and app.');
      setSosModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Error transmitting emergency signal');
    } finally {
      setIsSosSending(false);
    }
  };

  const navLinks = [
    { to: '/app', label: t('nav.dashboard'), icon: LayoutDashboard, end: true },
    { to: '/app/medications', label: t('nav.medications'), icon: Pill },
    { to: '/app/appointments', label: t('nav.appointments'), icon: CalendarDays },
    { to: '/app/circle', label: t('nav.circle'), icon: Users },
    { to: '/app/reports', label: t('nav.reports'), icon: LineChart },
    { to: '/app/notes', label: t('nav.notes'), icon: StickyNote },
    { to: '/app/elder', label: t('nav.elderMode'), icon: HeartHandshake, highlight: true },
    { to: '/app/invite', label: t('nav.invite'), icon: UserPlus },
    { to: '/app/pricing', label: t('nav.pricing'), icon: Sparkles },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 antialiased">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-white text-sm font-semibold px-4 py-2 flex items-center justify-center space-x-2 z-50 fixed top-0 left-0 right-0">
          <WifiOff className="w-4 h-4" />
          <span>{t('common.offline')}</span>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700/80 p-5 select-none shrink-0 min-h-screen">
        <div className="flex items-center space-x-3 mb-6 px-2">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-emerald-600/30">
            C
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-slate-100">
              CareCircle
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[160px]">
              {profile?.name ? `For ${profile.name}` : 'Care Platform'}
            </p>
          </div>
        </div>

        {/* Profile Code Pill */}
        {profile?.profileCode && (
          <div className="mb-6 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Circle Code
              </span>
              <div className="font-mono font-extrabold text-sm text-emerald-900 dark:text-emerald-100">
                {profile.profileCode}
              </div>
            </div>
            <button
              onClick={copyProfileCode}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-slate-700 transition shadow-xs"
              title="Copy Profile Code"
              aria-label="Copy Profile Code"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* Nav Navigation */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                      : link.highlight
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Sign Out */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-700/80 mt-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <Avatar name={member?.displayName || 'User'} size="sm" isOnline={true} />
            <div className="min-w-0">
              <div className="text-sm font-bold truncate text-slate-800 dark:text-slate-200">
                {member?.displayName}
              </div>
              <div className="text-xs text-slate-500 capitalize truncate">
                {member?.relationship || member?.role}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
            title={t('auth.logout')}
            aria-label={t('auth.logout')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top App Bar */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-700/80 px-4 sm:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              aria-label="Open mobile menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="md:hidden font-extrabold text-lg text-emerald-700 dark:text-emerald-400">
              CareCircle
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* SOS Emergency Button */}
            <button
              onClick={() => setSosModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm shadow-md shadow-rose-600/30 transition active:scale-95 animate-pulse"
              title="Emergency SOS Alert"
              aria-label="Emergency SOS Alert"
            >
              <AlertOctagon className="w-4 h-4" />
              <span>SOS</span>
            </button>

            {/* Language Switch */}
            <button
              onClick={toggleLanguage}
              className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              title="Toggle Language (English / हिन्दी)"
            >
              {language === 'en' ? 'हिन्दी' : 'English'}
            </button>

            {/* Font Size Toggle */}
            <button
              onClick={cycleFontSize}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              title={`Font Size: ${fontSize}`}
              aria-label="Adjust font size"
            >
              <Type className="w-5 h-5" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              title={`Theme: ${theme}`}
              aria-label="Toggle visual theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-8">
          <Outlet />
        </main>

        {/* Mobile Bottom Tab Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 flex items-center justify-around py-2 px-1">
          <NavLink
            to="/app"
            end
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-2 text-xs font-medium ${
                isActive ? 'text-emerald-600 font-bold' : 'text-slate-500'
              }`
            }
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span>Home</span>
          </NavLink>
          <NavLink
            to="/app/medications"
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-2 text-xs font-medium ${
                isActive ? 'text-emerald-600 font-bold' : 'text-slate-500'
              }`
            }
          >
            <Pill className="w-5 h-5 mb-0.5" />
            <span>Meds</span>
          </NavLink>
          <NavLink
            to="/app/appointments"
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-2 text-xs font-medium ${
                isActive ? 'text-emerald-600 font-bold' : 'text-slate-500'
              }`
            }
          >
            <CalendarDays className="w-5 h-5 mb-0.5" />
            <span>Appts</span>
          </NavLink>
          <NavLink
            to="/app/circle"
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-2 text-xs font-medium ${
                isActive ? 'text-emerald-600 font-bold' : 'text-slate-500'
              }`
            }
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span>Circle</span>
          </NavLink>
          <NavLink
            to="/app/elder"
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-2 text-xs font-medium ${
                isActive ? 'text-emerald-600 font-bold' : 'text-slate-500'
              }`
            }
          >
            <HeartHandshake className="w-5 h-5 mb-0.5" />
            <span>Elder</span>
          </NavLink>
        </nav>
      </div>

      {/* SOS Confirmation Modal */}
      <Modal
        isOpen={sosModalOpen}
        onClose={() => setSosModalOpen(false)}
        title="Trigger Emergency SOS?"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-100 text-sm leading-relaxed">
            <p className="font-bold text-base mb-1">Warning: Emergency Action</p>
            This will immediately transmit an emergency alert to every registered member of {profile?.name || 'this'}'s Circle via email and in-app notifications.
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to trigger the SOS alarm right now?
          </p>
          <div className="flex items-center justify-end space-x-3 pt-3">
            <Button
              variant="secondary"
              onClick={() => setSosModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              isLoading={isSosSending}
              onClick={handleSosTrigger}
            >
              Yes, Alert Family Now
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
