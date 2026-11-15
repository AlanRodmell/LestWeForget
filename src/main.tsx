import React from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/lora/400.css';
import '@fontsource/lora/400-italic.css';
import '@fontsource/lora/500.css';
import '@fontsource/lora/500-italic.css';
import '@fontsource/lora/600.css';
import '@fontsource/kalam/400.css';
import '@fontsource/kalam/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  error: Error | null;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-dvh flex items-center justify-center bg-[#F5EFE4] p-6 text-[#241D17] dark:bg-[#16120F] dark:text-[#EFE6D8]">
          <div className="max-w-md rounded-2xl border border-[#D7CBB8] bg-[#FBF8F1] p-6 text-center shadow-sm dark:border-[#3B3026] dark:bg-[#201A15]">
            <h1 className="font-display text-2xl font-semibold">Lest We Forget</h1>
            <p className="mt-2 text-sm text-[#6E6153] dark:text-[#B5A693]">
              Something went wrong while loading the app.
            </p>
            <p className="mt-3 rounded-lg bg-[#EAE1D3] p-3 text-left font-mono text-xs text-[#A65E22] dark:bg-[#29211B] dark:text-[#E29A50]">
              {this.state.error.message}
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

registerSW({
  immediate: true,
});

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
