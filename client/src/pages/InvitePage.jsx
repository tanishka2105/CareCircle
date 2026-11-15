import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { Copy, Check, QrCode as QrIcon, Users, Share2 } from 'lucide-react';

export const InvitePage = () => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [invitesSentCount, setInvitesSentCount] = useState(() => {
    return parseInt(localStorage.getItem('carecircle_invites_count') || '3', 10);
  });

  const inviteLink = `${window.location.origin}/join?code=${profile?.profileCode || ''}`;

  useEffect(() => {
    if (profile?.profileCode) {
      QRCode.toDataURL(inviteLink, { width: 240, margin: 2, color: { dark: '#064e3b', light: '#ffffff' } })
        .then(setQrDataUrl)
        .catch(console.error);
    }
  }, [profile?.profileCode, inviteLink]);

  const copyCode = () => {
    if (profile?.profileCode) {
      navigator.clipboard.writeText(profile.profileCode);
      setCopiedCode(true);
      toast.success('Profile code copied!');
      setTimeout(() => setCopiedCode(false), 2000);
      incrementCount();
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    toast.success('Invite link copied!');
    setTimeout(() => setCopiedLink(false), 2000);
    incrementCount();
  };

  const incrementCount = () => {
    setInvitesSentCount((prev) => {
      const next = prev + 1;
      localStorage.setItem('carecircle_invites_count', next.toString());
      return next;
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          Invite Family & Caretakers
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Connect your siblings, children, doctors, and nurses to {profile?.name}'s CareCircle.
        </p>
      </div>

      <Card className="p-8 space-y-6">
        {/* QR Code */}
        <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Circle Invite QR Code" className="w-48 h-48 rounded-xl shadow-sm" />
          ) : (
            <div className="w-48 h-48 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
          )}
          <span className="text-xs text-slate-500 mt-3 font-medium">
            Scan to pre-fill Profile Code on another phone
          </span>
        </div>

        {/* Profile Code Field */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Circle Profile Code
          </label>
          <div className="flex items-center space-x-2">
            <div className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-mono text-xl font-black tracking-widest text-emerald-800 dark:text-emerald-300 select-all">
              {profile?.profileCode}
            </div>
            <Button onClick={copyCode} variant="outline" className="flex items-center space-x-1.5 shrink-0">
              {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>Copy Code</span>
            </Button>
          </div>
        </div>

        {/* Direct Link Field */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Direct Shareable Join Link
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 outline-none truncate"
            />
            <Button onClick={copyLink} variant="outline" className="flex items-center space-x-1.5 shrink-0">
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
              <span>Copy Link</span>
            </Button>
          </div>
        </div>

        {/* Counter Widget */}
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs font-medium text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Circle Invites Dispatched:</span>
          </div>
          <span className="font-black text-sm px-2.5 py-0.5 rounded-full bg-emerald-600 text-white">
            {invitesSentCount}
          </span>
        </div>
      </Card>
    </div>
  );
};
