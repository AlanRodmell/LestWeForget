import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        aria-label="Install app"
        title="Install app"
        className={
          compact
            ? 'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-[#A65E22] text-[#FBF8F1] shadow-sm transition hover:bg-[#8C4D19] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A65E22] dark:bg-[#C87A32] dark:hover:bg-[#D98B42] shrink-0'
            : 'inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#A65E22] px-4 py-2 text-sm font-medium text-[#FBF8F1] shadow-sm transition hover:bg-[#8C4D19] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A65E22] dark:bg-[#C87A32] dark:hover:bg-[#D98B42] whitespace-nowrap shrink-0'
        }
      >
        <Download className="h-4 w-4 shrink-0" />
        {!compact && <span>Install</span>}
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          aria-label="Install on iOS"
          title="Install on iOS"
          className={
            compact
              ? 'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#D7CBB8] bg-[#FBF8F1] text-[#241D17] transition hover:bg-[#EAE1D3] dark:border-[#3B3026] dark:bg-[#201A15] dark:text-[#EFE6D8] dark:hover:bg-[#29211B] shrink-0'
              : 'inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#D7CBB8] bg-[#FBF8F1] px-4 py-2 text-sm font-medium text-[#241D17] transition hover:bg-[#EAE1D3] dark:border-[#3B3026] dark:bg-[#201A15] dark:text-[#EFE6D8] dark:hover:bg-[#29211B] whitespace-nowrap shrink-0'
          }
        >
          <Share className="h-4 w-4 shrink-0" />
          {!compact && <span>Install on iOS</span>}
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl border border-[#D7CBB8] bg-[#FBF8F1] p-6 shadow-xl dark:border-[#3B3026] dark:bg-[#201A15]">
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-display text-xl font-semibold text-[#241D17] dark:text-[#EFE6D8]">
                  Install on iOS
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close installation guide"
                  className="flex min-h-[44px] min-w-[44px] -mr-2 -mt-2 items-center justify-center rounded-xl text-[#6E6153] hover:bg-[#EAE1D3] dark:text-[#B5A693] dark:hover:bg-[#29211B]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm leading-relaxed text-[#5B4F43] dark:text-[#C8B9A6]">
                <li>1. Tap the <strong>Share</strong> button in your Safari toolbar.</li>
                <li>2. Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                <li>3. Open Lest We Forget from your home screen for offline access.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-xl bg-[#A65E22] py-2.5 text-sm font-medium text-[#FBF8F1] transition hover:bg-[#8C4D19] dark:bg-[#C87A32] dark:hover:bg-[#D98B42]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
