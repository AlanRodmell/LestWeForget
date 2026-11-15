import React from 'react';
import { BookOpen, LogIn, Moon, Sun } from 'lucide-react';
import type { ThemeMode } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { StationeryBackdrop } from './StationeryBackdrop';

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
    <div className="relative min-h-dvh flex flex-col bg-[#F5EFE4] text-[#241D17] dark:bg-[#16120F] dark:text-[#EFE6D8] transition-colors">
      <StationeryBackdrop variant="prominent" />
      <header className="relative z-10 mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-4">
        <span className="font-display text-2xl font-semibold tracking-tight">
          Lest We Forget
        </span>
        <div className="flex items-center gap-2">
          <PWAInstallButton compact />
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#D7CBB8] bg-[#FBF8F1]/85 backdrop-blur-xs text-[#241D17] transition hover:bg-[#EAE1D3] dark:border-[#3B3026] dark:bg-[#201A15]/85 dark:text-[#EFE6D8] dark:hover:bg-[#29211B]"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-12">
        <div className="w-full max-w-sm rounded-2xl border border-[#D7CBB8] bg-[#FBF8F1] p-7 sm:p-9 text-center shadow-[0_12px_32px_rgba(36,29,23,0.07)] dark:border-[#3B3026] dark:bg-[#201A15] dark:shadow-[0_16px_36px_rgba(0,0,0,0.45)]">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#D7CBB8] bg-[#F5EFE4] text-[#9A7B4F] dark:border-[#3B3026] dark:bg-[#16120F] dark:text-[#C29F6D]">
            <BookOpen className="h-5 w-5" />
          </div>

          <h1 className="font-display text-3xl font-semibold tracking-tight text-balance">
            Lest We Forget
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-[#6E6153] dark:text-[#B5A693]">
            Sign in with an authorized Google account to open the vault.
          </p>

          {deniedEmail && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-[#A65E22]/35 bg-[#A65E22]/10 px-4 py-3 text-left text-xs leading-relaxed text-[#8C4D19] dark:border-[#E29A50]/40 dark:bg-[#E29A50]/15 dark:text-[#E29A50]"
            >
              <strong>Access restricted:</strong> {deniedEmail} is not authorized.
            </div>
          )}

          {authError && !deniedEmail && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-[#A65E22]/35 bg-[#A65E22]/10 px-4 py-3 text-left text-xs leading-relaxed text-[#8C4D19] dark:border-[#E29A50]/40 dark:bg-[#E29A50]/15 dark:text-[#E29A50]"
            >
              {authError}
            </div>
          )}

          <button
            type="button"
            onClick={onSignIn}
            disabled={isSigningIn}
            className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#A65E22] px-5 py-3 text-sm font-medium text-[#FBF8F1] shadow-sm transition hover:bg-[#8C4D19] disabled:opacity-50 dark:bg-[#C87A32] dark:hover:bg-[#D98B42]"
          >
            <LogIn className="h-4 w-4 shrink-0" />
            <span>{isSigningIn ? 'Signing in...' : 'Sign in with Google'}</span>
          </button>
        </div>
      </main>
    </div>
  );
};
