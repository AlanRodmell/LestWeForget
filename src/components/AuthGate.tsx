import React from 'react';
import { Lock, LogIn, Moon, Sun } from 'lucide-react';
import type { ThemeMode } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface AuthGateProps {
  theme: ThemeMode;
  deniedEmail: string | null;
  authError: string | null;
  isSigningIn: boolean;
  onToggleTheme: () => void;
  onSignIn: () => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  theme,
  deniedEmail,
  authError,
  isSigningIn,
  onToggleTheme,
  onSignIn,
}) => {
  return (
    <div className="min-h-dvh flex flex-col bg-[#F6F3EE] text-[#221F1B] dark:bg-[#141210] dark:text-[#F2ECE4] transition-colors">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-4">
        <span className="font-display text-lg font-medium tracking-tight">
          Lest We Forget
        </span>
        <div className="flex items-center gap-2">
          <PWAInstallButton compact />
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#DDD4C7] bg-[#FAF8F4] text-[#221F1B] transition hover:bg-[#EFE9E0] dark:border-[#342E28] dark:bg-[#1E1B18] dark:text-[#F2ECE4] dark:hover:bg-[#2A2622]"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md rounded-2xl border border-[#DDD4C7] bg-[#FAF8F4] p-7 sm:p-9 text-center shadow-sm dark:border-[#3A342E] dark:bg-[#1E1B18]">
          {/* Subtle Gift Tag Emblem */}
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#DDD4C7] bg-[#F6F3EE] text-[#3E5C4E] dark:border-[#3A342E] dark:bg-[#141210] dark:text-[#86B39D]">
            <Lock className="h-6 w-6" />
          </div>

          <h1 className="font-display text-3xl font-medium tracking-tight text-balance">
            Lest We Forget
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#6B6257] dark:text-[#AEA498]">
            A private shared gratitude vault. Sign in with an authorized Google account to view and add gift tags.
          </p>

          {deniedEmail && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-[#9C4A3B]/40 bg-[#9C4A3B]/10 px-4 py-3 text-left text-xs leading-relaxed text-[#9C4A3B] dark:border-[#DF8A79]/40 dark:bg-[#DF8A79]/15 dark:text-[#DF8A79]"
            >
              <strong>Access restricted:</strong> {deniedEmail} is not authorized to open this private vault. Please sign in with one of the two allowed accounts.
            </div>
          )}

          {authError && !deniedEmail && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-[#9C4A3B]/40 bg-[#9C4A3B]/10 px-4 py-3 text-left text-xs leading-relaxed text-[#9C4A3B] dark:border-[#DF8A79]/40 dark:bg-[#DF8A79]/15 dark:text-[#DF8A79]"
            >
              {authError}
            </div>
          )}

          <button
            type="button"
            onClick={onSignIn}
            disabled={isSigningIn}
            className="mt-7 inline-flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#3E5C4E] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#324B3F] disabled:opacity-50 dark:bg-[#4E7462] dark:hover:bg-[#5E8874]"
          >
            <LogIn className="h-4 w-4 shrink-0" />
            <span>{isSigningIn ? 'Signing in...' : 'Sign in with Google'}</span>
          </button>
        </div>
      </main>
    </div>
  );
};
