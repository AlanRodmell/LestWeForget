import React from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
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
        <div className="min-h-dvh flex items-center justify-center bg-[#F6F3EE] p-6 text-[#221F1B] dark:bg-[#141210] dark:text-[#F2ECE4]">
          <div className="max-w-md rounded-2xl border border-[#DDD4C7] bg-[#FAF8F4] p-6 text-center shadow-sm dark:border-[#3A342E] dark:bg-[#1E1B18]">
            <h1 className="font-display text-xl font-medium">Lest We Forget</h1>
            <p className="mt-2 text-sm text-[#6B6257] dark:text-[#AEA498]">
              Something went wrong while loading the app.
            </p>
            <p className="mt-3 rounded-lg bg-[#EFE9E0] p-3 text-left font-mono text-xs text-[#9C4A3B] dark:bg-[#2A2520] dark:text-[#DF8A79]">
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
