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
        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#3E5C4E] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#324B3F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E5C4E] dark:bg-[#4E7462] dark:hover:bg-[#5E8874] whitespace-nowrap shrink-0"
      >
        <Download className="h-4 w-4 shrink-0" />
        <span>{compact ? 'Install' : 'Install App'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#DFD7CB] bg-[#FAF8F4] px-4 py-2 text-sm font-medium text-[#221F1B] transition hover:bg-[#EFE9E0] dark:border-[#3A342E] dark:bg-[#231F1B] dark:text-[#F2ECE4] dark:hover:bg-[#2E2924] whitespace-nowrap shrink-0"
        >
          <Share className="h-4 w-4 shrink-0" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl border border-[#DFD7CB] bg-[#FAF8F4] p-6 shadow-xl dark:border-[#3A342E] dark:bg-[#1E1B18]">
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-display text-lg font-medium text-[#221F1B] dark:text-[#F2ECE4]">
                  Install Lest We Forget on iOS
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close installation guide"
                  className="flex min-h-[44px] min-w-[44px] -mr-2 -mt-2 items-center justify-center rounded-xl text-[#6B6257] hover:bg-[#EFE9E0] dark:text-[#AEA498] dark:hover:bg-[#2E2924]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm leading-relaxed text-[#5C544A] dark:text-[#C7BEB2]">
                <li>1. Tap the <strong>Share</strong> button in your Safari toolbar.</li>
                <li>2. Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                <li>3. Open Lest We Forget from your home screen for offline access.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-xl bg-[#3E5C4E] py-2.5 text-sm font-medium text-white transition hover:bg-[#324B3F] dark:bg-[#4E7462]"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
