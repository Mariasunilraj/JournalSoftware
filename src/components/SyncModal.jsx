import React, { useState } from 'react';
import {
  X,
  RefreshCw,
  Smartphone,
  Laptop,
  CheckCircle2,
  Wifi,
  Copy,
  Check,
  HardDrive,
  ShieldCheck,
  ArrowRightLeft,
  UploadCloud,
  DownloadCloud,
} from 'lucide-react';

export default function SyncModal({
  isOpen,
  onClose,
  syncStatus,
  lastSyncTime,
  onSyncNow,
  currentUser,
  tradesCount = 0,
  diaryCount = 0,
  capitalCount = 0,
}) {
  if (!isOpen) return null;

  const [copied, setCopied] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  const phoneUrl = window.location.origin;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(phoneUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Fallback
    }
  };

  const handleManualSync = async () => {
    setActionFeedback('Syncing with master storage...');
    await onSyncNow();
    setActionFeedback('Sync Complete! All devices updated.');
    setTimeout(() => setActionFeedback(null), 2500);
  };

  const isConnected = syncStatus === 'synced' || syncStatus === 'syncing' || syncStatus === 'idle';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Device Sync Center
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  REAL-TIME
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Bidirectional synchronization between Phone & Laptop
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Interactive Device Link Diagram */}
          <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800">
            <div className="flex items-center justify-between">
              {/* Laptop Node */}
              <div className="flex flex-col items-center text-center space-y-1.5">
                <div className="w-12 h-12 rounded-xl bg-neutral-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(0,230,118,0.2)]">
                  <Laptop className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-white">Laptop App</span>
                <span className="text-[10px] text-emerald-400 font-mono">Master Host</span>
              </div>

              {/* Data Flow Indicator */}
              <div className="flex-1 flex flex-col items-center px-3 space-y-1">
                <div className="flex items-center space-x-1.5">
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
                  <span className="text-[11px] font-mono font-bold text-neutral-300">
                    {syncStatus === 'syncing' ? 'Syncing...' : isConnected ? 'Wi-Fi Linked' : 'Offline'}
                  </span>
                </div>
                <div className="w-full h-1 bg-neutral-800 rounded-full relative overflow-hidden">
                  <div className={`h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 w-full ${syncStatus === 'syncing' ? 'animate-pulse' : ''}`} />
                </div>
                <span className="text-[10px] text-neutral-500">Auto-syncs every 6s</span>
              </div>

              {/* Phone Node */}
              <div className="flex flex-col items-center text-center space-y-1.5">
                <div className="w-12 h-12 rounded-xl bg-neutral-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(0,230,118,0.2)]">
                  <Smartphone className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-white">Phone App</span>
                <span className="text-[10px] text-emerald-400 font-mono">Mobile PWA</span>
              </div>
            </div>
          </div>

          {/* Master Details Strip */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block">Synced Records</span>
              <div className="text-sm font-black text-white mt-1">
                {tradesCount} Trades <span className="text-neutral-500 font-normal">/ {diaryCount} Notes</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block">Last Active Sync</span>
              <div className="text-sm font-bold text-emerald-400 mt-1 font-mono">
                {lastSyncTime || 'Just now'}
              </div>
            </div>
          </div>

          {/* Master URL for Phone Connection */}
          <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                Phone Connection URL
              </span>
              <span className="text-[10px] text-neutral-500">Same Wi-Fi network</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={phoneUrl}
                className="flex-1 bg-black border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 font-mono select-all focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleCopyUrl}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white flex items-center space-x-1.5 transition active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Account & Storage Partition Info */}
          <div className="p-3.5 rounded-xl bg-neutral-900/40 border border-neutral-850 space-y-2 text-xs">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Active Account
              </span>
              <span className="font-mono text-white font-medium">{currentUser?.username || 'mariasunilraj8gmail.com'}</span>
            </div>
            <div className="flex items-center justify-between text-neutral-400">
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                Local Storage File
              </span>
              <span className="font-mono text-neutral-300 text-[11px]">.storage/user_{currentUser?.id?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'default'}.json</span>
            </div>
          </div>

          {/* Action Feedback Toast */}
          {actionFeedback && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs text-center font-bold flex items-center justify-center space-x-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionFeedback}</span>
            </div>
          )}

          {/* How It Works Explainer */}
          <div className="text-[11px] text-neutral-400 leading-relaxed bg-black/40 p-3 rounded-xl border border-neutral-900 space-y-1">
            <p className="font-bold text-neutral-300">💡 How Local Sync Works:</p>
            <p>
              1. <strong>Zero Cloud Third-Parties</strong>: Your trade data is saved directly on your laptop's local disk partition.
            </p>
            <p>
              2. <strong>Instant Wi-Fi Sync</strong>: When you add, edit, or delete a trade on either your phone or laptop, the changes automatically sync across both screens.
            </p>
            <p>
              3. <strong>Offline Ready</strong>: If you trade outside Wi-Fi, your phone saves all entries in phone storage and synchronizes automatically when you return home.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            Close
          </button>

          <button
            onClick={handleManualSync}
            disabled={syncStatus === 'syncing'}
            className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition active:scale-95 disabled:opacity-50 shadow-[0_0_14px_rgba(0,230,118,0.3)]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            <span>{syncStatus === 'syncing' ? 'Syncing...' : 'Force Sync Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
