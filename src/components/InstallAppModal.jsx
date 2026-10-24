import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  Laptop,
  CheckCircle2,
  X,
  Share2,
  PlusSquare,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export default function InstallAppModal({ isOpen, onClose }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState('unknown'); // 'ios', 'android', 'desktop'

  useEffect(() => {
    // Detect if already installed in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsInstalled(isStandalone);

    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    // Capture beforeinstallprompt for Chrome / Edge (Android & Laptop)
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      window.__pwaDeferredPrompt = e;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check if prompt was previously captured globally
    if (window.__pwaDeferredPrompt) {
      setDeferredPrompt(window.__pwaDeferredPrompt);
    }

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.__pwaDeferredPrompt = null;
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || window.__pwaDeferredPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      const choiceResult = await promptEvent.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        window.__pwaDeferredPrompt = null;
        setTimeout(() => onClose(), 1500);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#090909] border border-neutral-800 rounded-3xl shadow-2xl p-5 sm:p-7 text-white space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header with Official Logo Emblem */}
        <div className="flex items-center space-x-3.5 border-b border-neutral-800/80 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-black border border-emerald-500/40 p-1 flex items-center justify-center shadow-[0_0_16px_rgba(0,230,118,0.3)] shrink-0">
            <img
              src="/logo-circle.png"
              alt="Delta Journal Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center space-x-2">
              <span>Install Delta Journal App</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PWA
              </span>
            </h2>
            <p className="text-xs text-neutral-400">
              Run full-screen on your Phone (Android / iPhone) & Laptop (Windows / Mac)
            </p>
          </div>
        </div>

        {/* Status / Install Action */}
        {isInstalled ? (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-3 text-emerald-400">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-sm block text-white">App is Installed!</span>
              Delta Journal is currently running in full-screen standalone mode.
            </div>
          </div>
        ) : (
          <>
            {/* Direct 1-Click Install Button if supported */}
            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(0,230,118,0.4)] transition transform active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>1-Click Install App on This Device</span>
              </button>
            )}

            {/* Platform Guides */}
            <div className="space-y-3">
              <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-bold block">
                How to Install on Any Device:
              </span>

              {/* Mobile Phone (Android & iPhone) */}
              <div className="p-3.5 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
                  <Smartphone className="w-4 h-4" />
                  <span>On Mobile Phone (Android / iPhone)</span>
                </div>
                <div className="text-xs text-neutral-300 space-y-1.5 pl-6 leading-relaxed">
                  <div>
                    <strong className="text-white">Android (Chrome):</strong> Tap the 3 dots menu (⋮) at top right and tap <span className="text-emerald-400 font-semibold">"Create shortcut"</span> (or "Add to Home screen"). It will place the Delta Journal app icon directly on your phone's home screen!
                  </div>
                  <div>
                    <strong className="text-white">iPhone (Safari):</strong> Tap the <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-cyan-400" /> Share icon at the bottom, scroll down and tap <span className="text-cyan-400 font-semibold flex-inline items-center"><PlusSquare className="w-3.5 h-3.5 inline mx-0.5" /> "Add to Home Screen"</span>.
                  </div>
                </div>
              </div>

              {/* Laptop / Desktop (Windows / Mac) */}
              <div className="p-3.5 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400">
                  <Laptop className="w-4 h-4" />
                  <span>On Laptop / PC (Chrome / Edge / Brave)</span>
                </div>
                <div className="text-xs text-neutral-300 pl-6 leading-relaxed">
                  Look at the right side of your browser URL address bar and click the <span className="text-cyan-400 font-semibold">"Install App"</span> icon <Download className="w-3.5 h-3.5 inline mx-0.5" />, or click your browser's menu (⋮) → <span className="text-cyan-400 font-semibold">"Install Delta Journal"</span>.
                </div>
              </div>
            </div>

            {/* Benefits summary */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-400 pt-1">
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero Browser Bars</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Instant Offline Access</span>
              </div>
            </div>
          </>
        )}

        {/* Footer close */}
        <div className="pt-2 text-center">
          <button
            onClick={onClose}
            className="text-xs text-neutral-500 hover:text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
