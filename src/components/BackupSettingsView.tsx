import React, { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Bell,
  BellOff,
  Check,
  Cloud,
  Download,
  FileSpreadsheet,
  LogIn,
  LogOut,
  Moon,
  RefreshCw,
  Send,
  Sun,
  Upload,
} from 'lucide-react';
import {
  MAX_LABEL_LENGTH,
  type AppPreferences,
  type GratitudeEntry,
  type ParsedCsvRow,
} from '../types';
import {
  downloadSampleCsvTemplate,
  exportEntriesToCsv,
  exportVaultJson,
  parseCsvToGratitudeRows,
  triggerFileDownload,
} from '../services/csvService';
import {
  getNotificationPermission,
  pickRandomEntry,
  requestNotificationPermission,
  sendGratitudeNotification,
  type NotificationPermissionState,
} from '../services/notificationService';
import { todayIsoDate } from '../services/idbStore';
import { PWAInstallButton } from './PWAInstallButton';

interface BackupSettingsViewProps {
  entries: GratitudeEntry[];
  prefs: AppPreferences;
  user: User | null;
  authReady: boolean;
  isSyncing: boolean;
  syncError: string | null;
  pendingSyncCount: number;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onSyncNow: () => Promise<void>;
  onImportCsvRows: (rows: ParsedCsvRow[]) => Promise<number>;
  onRestoreJson: (entries: GratitudeEntry[], prefs?: Partial<AppPreferences>) => Promise<number>;
  onUpdatePrefs: (next: AppPreferences) => Promise<void>;
}

export const BackupSettingsView: React.FC<BackupSettingsViewProps> = ({
  entries,
  prefs,
  user,
  authReady,
  isSyncing,
  syncError,
  pendingSyncCount,
  onSignIn,
  onSignOut,
  onSyncNow,
  onImportCsvRows,
  onRestoreJson,
  onUpdatePrefs,
}) => {
  const csvInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const [parsedPreview, setParsedPreview] = useState<ParsedCsvRow[] | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermissionState>(
    getNotificationPermission()
  );

  const [meLabelDraft, setMeLabelDraft] = useState(prefs.meLabel);
  const [herLabelDraft, setHerLabelDraft] = useState(prefs.herLabel);

  useEffect(() => {
    setMeLabelDraft(prefs.meLabel);
    setHerLabelDraft(prefs.herLabel);
  }, [prefs.meLabel, prefs.herLabel]);

  const handleCsvSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const content = await file.text();
      const rows = parseCsvToGratitudeRows(content);
      if (rows.length === 0) {
        setErrorMessage('No rows found in CSV.');
        return;
      }
      setParsedPreview(rows);
    } catch {
      setErrorMessage('Could not read CSV file.');
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmCsvImport = async () => {
    if (!parsedPreview) return;
    const validRows = parsedPreview.filter((r) => !r.error && r.text.length > 0);
    if (validRows.length === 0) {
      setErrorMessage('No valid notes found in CSV.');
      return;
    }
    const imported = await onImportCsvRows(validRows);
    setParsedPreview(null);
    setStatusMessage(`Imported ${imported} ${imported === 1 ? 'tag' : 'tags'}.`);
  };

  const handleJsonRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as {
        entries?: GratitudeEntry[];
        preferences?: Partial<AppPreferences>;
      };
      if (!Array.isArray(data.entries)) {
        setErrorMessage('Invalid JSON backup.');
        return;
      }
      const restored = await onRestoreJson(data.entries, data.preferences);
      setStatusMessage(`Restored ${restored} ${restored === 1 ? 'tag' : 'tags'}.`);
    } catch {
      setErrorMessage('Could not parse JSON backup.');
    } finally {
      e.target.value = '';
    }
  };

  const handleToggleReminder = async () => {
    setErrorMessage(null);
    if (!prefs.reminderEnabled) {
      let perm = getNotificationPermission();
      if (perm === 'default') {
        perm = await requestNotificationPermission();
        setNotifPermission(perm);
      }
      if (perm !== 'granted') {
        setErrorMessage(
          perm === 'unsupported'
            ? 'Notifications are not supported in this browser.'
            : 'Allow notifications in browser settings to enable reminders.'
        );
        return;
      }
    }
    await onUpdatePrefs({
      ...prefs,
      reminderEnabled: !prefs.reminderEnabled,
    });
  };

  const handleTestNotification = async () => {
    setErrorMessage(null);
    let perm = getNotificationPermission();
    if (perm === 'default') {
      perm = await requestNotificationPermission();
      setNotifPermission(perm);
    }
    if (perm !== 'granted') {
      setErrorMessage('Notification permission required.');
      return;
    }
    const randomTag = pickRandomEntry(entries);
    const ok = await sendGratitudeNotification(randomTag, prefs);
    if (ok) {
      setStatusMessage('Test notification sent.');
    } else {
      setErrorMessage('Browser blocked notification.');
    }
  };

  const handleSaveLabels = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdatePrefs({
      ...prefs,
      meLabel: meLabelDraft.trim().slice(0, MAX_LABEL_LENGTH) || prefs.meLabel,
      herLabel: herLabelDraft.trim().slice(0, MAX_LABEL_LENGTH) || prefs.herLabel,
    });
    setStatusMessage('Labels saved.');
  };

  return (
    <section className="mx-auto max-w-4xl space-y-6 pb-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-[#241D17] dark:text-[#EFE6D8]">
        Settings & Backup
      </h1>

      {statusMessage && (
        <div
          role="status"
          className="rounded-xl border border-[#9A7B4F]/40 bg-[#9A7B4F]/10 px-4 py-3 text-sm text-[#241D17] dark:border-[#C29F6D]/40 dark:bg-[#C29F6D]/12 dark:text-[#EFE6D8]"
        >
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-[#A65E22]/35 bg-[#A65E22]/10 px-4 py-3 text-sm text-[#8C4D19] dark:border-[#E29A50]/40 dark:bg-[#E29A50]/15 dark:text-[#E29A50]"
        >
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* 1. Cloud Sync */}
        <div className="rounded-2xl border border-[#D7CBB8] bg-[#FBF8F1] p-6 space-y-4 dark:border-[#3B3026] dark:bg-[#201A15]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-[#241D17] dark:text-[#EFE6D8]">
              Cloud Sync
            </h2>
            <Cloud className="h-5 w-5 text-[#9A7B4F] dark:text-[#C29F6D] shrink-0" />
          </div>

          {!authReady ? (
            <p className="text-sm text-[#6E6153] dark:text-[#B5A693]">...</p>
          ) : user ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#D7CBB8] bg-[#F5EFE4] p-3.5 text-sm dark:border-[#3B3026] dark:bg-[#16120F]">
                <p className="font-medium text-[#241D17] dark:text-[#EFE6D8] truncate">
                  {user.email}
                </p>
                <p className="mt-1 text-xs text-[#A65E22] dark:text-[#E29A50] font-mono-tabular">
                  {pendingSyncCount === 0
                    ? `${entries.length} synced`
                    : `${pendingSyncCount} pending`}
                </p>
              </div>

              {syncError && (
                <p className="text-xs text-[#8C4D19] dark:text-[#E29A50] break-words">
                  {syncError}
                </p>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void onSyncNow()}
                  disabled={isSyncing}
                  aria-label="Sync now"
                  title="Sync now"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-[#A65E22] px-4 text-[#FBF8F1] hover:bg-[#8C4D19] disabled:opacity-50 dark:bg-[#C87A32] dark:hover:bg-[#D98B42]"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => void onSignOut()}
                  aria-label="Sign out"
                  title="Sign out"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#D7CBB8] text-[#241D17] hover:bg-[#EAE1D3] dark:border-[#3B3026] dark:text-[#EFE6D8] dark:hover:bg-[#29211B]"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void onSignIn()}
              aria-label="Sign in with Google"
              title="Sign in with Google"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#A65E22] px-4 text-sm font-medium text-[#FBF8F1] hover:bg-[#8C4D19] dark:bg-[#C87A32]"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign in</span>
            </button>
          )}
        </div>

        {/* 2. Daily Reminder */}
        <div className="rounded-2xl border border-[#D7CBB8] bg-[#FBF8F1] p-6 space-y-4 dark:border-[#3B3026] dark:bg-[#201A15]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-[#241D17] dark:text-[#EFE6D8]">
              Daily Reminder
            </h2>
            <Bell className="h-5 w-5 text-[#9A7B4F] dark:text-[#C29F6D] shrink-0" />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => void handleToggleReminder()}
              aria-pressed={prefs.reminderEnabled}
              aria-label={prefs.reminderEnabled ? 'Disable reminder' : 'Enable reminder'}
              title={
                prefs.reminderEnabled
                  ? `Reminder on (${notifPermission})`
                  : `Enable reminder (${notifPermission})`
              }
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition ${
                prefs.reminderEnabled
                  ? 'bg-[#A65E22] text-[#FBF8F1] dark:bg-[#C87A32]'
                  : 'border border-[#D7CBB8] bg-[#FFFDF8] text-[#241D17] dark:border-[#3B3026] dark:bg-[#16120F] dark:text-[#EFE6D8]'
              }`}
            >
              {prefs.reminderEnabled ? (
                <Bell className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
            </button>

            <input
              id="reminder-time-input"
              aria-label="Reminder time"
              type="time"
              value={prefs.reminderTime}
              onChange={(e) =>
                void onUpdatePrefs({ ...prefs, reminderTime: e.target.value })
              }
              className="min-h-[44px] rounded-xl border border-[#D7CBB8] bg-[#FFFDF8] px-3 text-sm font-mono-tabular text-[#241D17] dark:border-[#3B3026] dark:bg-[#16120F] dark:text-[#EFE6D8]"
            />

            <button
              type="button"
              onClick={() => void handleTestNotification()}
              aria-label="Send test notification"
              title="Send test notification"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#D7CBB8] text-[#241D17] hover:bg-[#EAE1D3] dark:border-[#3B3026] dark:text-[#EFE6D8] dark:hover:bg-[#29211B]"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 3. CSV & JSON */}
        <div className="rounded-2xl border border-[#D7CBB8] bg-[#FBF8F1] p-6 space-y-4 dark:border-[#3B3026] dark:bg-[#201A15]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-[#241D17] dark:text-[#EFE6D8]">
              Import & Export
            </h2>
            <FileSpreadsheet className="h-5 w-5 text-[#9A7B4F] dark:text-[#C29F6D] shrink-0" />
          </div>

          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => void handleCsvSelect(e)}
            className="hidden"
          />
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json,application/json"
            onChange={(e) => void handleJsonRestore(e)}
            className="hidden"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => csvInputRef.current?.click()}
              aria-label="Upload CSV"
              title="Upload CSV"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#A65E22] px-4 py-2 text-xs font-medium text-[#FBF8F1] hover:bg-[#8C4D19] dark:bg-[#C87A32] dark:hover:bg-[#D98B42]"
            >
              <Upload className="h-4 w-4" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={() => downloadSampleCsvTemplate()}
              aria-label="Download sample CSV"
              title="Sample CSV"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#D7CBB8] px-3.5 py-2 text-xs font-medium text-[#241D17] hover:bg-[#EAE1D3] dark:border-[#3B3026] dark:text-[#EFE6D8] dark:hover:bg-[#29211B]"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Sample</span>
            </button>

            <button
              type="button"
              disabled={entries.length === 0}
              onClick={() =>
                triggerFileDownload(
                  exportEntriesToCsv(entries),
                  `lest-we-forget-${todayIsoDate()}.csv`,
                  'text/csv;charset=utf-8;'
                )
              }
              aria-label="Export CSV"
              title="Export CSV"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#D7CBB8] px-3.5 py-2 text-xs font-medium text-[#241D17] hover:bg-[#EAE1D3] disabled:opacity-40 dark:border-[#3B3026] dark:text-[#EFE6D8] dark:hover:bg-[#29211B]"
            >
              <Download className="h-4 w-4" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              disabled={entries.length === 0}
              onClick={() =>
                triggerFileDownload(
                  exportVaultJson(entries, prefs),
                  `lest-we-forget-backup-${todayIsoDate()}.json`,
                  'application/json'
                )
              }
              aria-label="Export JSON"
              title="Export JSON"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#D7CBB8] px-3.5 py-2 text-xs font-medium text-[#241D17] hover:bg-[#EAE1D3] disabled:opacity-40 dark:border-[#3B3026] dark:text-[#EFE6D8] dark:hover:bg-[#29211B]"
            >
              <Download className="h-4 w-4" />
              <span>JSON</span>
            </button>

            <button
              type="button"
              onClick={() => jsonInputRef.current?.click()}
              aria-label="Restore JSON"
              title="Restore JSON"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#D7CBB8] px-3.5 py-2 text-xs font-medium text-[#241D17] hover:bg-[#EAE1D3] dark:border-[#3B3026] dark:text-[#EFE6D8] dark:hover:bg-[#29211B]"
            >
              <Upload className="h-4 w-4" />
              <span>JSON</span>
            </button>
          </div>
        </div>

        {/* 4. Theme & Note Set Labels */}
        <div className="rounded-2xl border border-[#D7CBB8] bg-[#FBF8F1] p-6 space-y-4 dark:border-[#3B3026] dark:bg-[#201A15]">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-xl font-semibold text-[#241D17] dark:text-[#EFE6D8]">
              Labels & Theme
            </h2>
            <button
              type="button"
              onClick={() =>
                void onUpdatePrefs({
                  ...prefs,
                  theme: prefs.theme === 'dark' ? 'light' : 'dark',
                })
              }
              aria-label={prefs.theme === 'dark' ? 'Light mode' : 'Dark mode'}
              title={prefs.theme === 'dark' ? 'Light mode' : 'Dark mode'}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#D7CBB8] bg-[#F5EFE4] text-[#241D17] hover:bg-[#EAE1D3] dark:border-[#3B3026] dark:bg-[#16120F] dark:text-[#EFE6D8] dark:hover:bg-[#29211B]"
            >
              {prefs.theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </div>

          <form onSubmit={(e) => void handleSaveLabels(e)} className="space-y-3">
            <div className="space-y-1">
              <label
                htmlFor="me-label-input"
                className="block text-xs text-[#6E6153] dark:text-[#B5A693]"
              >
                Alan → Jen
              </label>
              <input
                id="me-label-input"
                type="text"
                maxLength={MAX_LABEL_LENGTH}
                value={meLabelDraft}
                onChange={(e) => setMeLabelDraft(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-[#D7CBB8] bg-[#FFFDF8] px-3.5 text-sm text-[#241D17] dark:border-[#3B3026] dark:bg-[#16120F] dark:text-[#EFE6D8]"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="her-label-input"
                className="block text-xs text-[#6E6153] dark:text-[#B5A693]"
              >
                Jen → Alan
              </label>
              <input
                id="her-label-input"
                type="text"
                maxLength={MAX_LABEL_LENGTH}
                value={herLabelDraft}
                onChange={(e) => setHerLabelDraft(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-[#D7CBB8] bg-[#FFFDF8] px-3.5 text-sm text-[#241D17] dark:border-[#3B3026] dark:bg-[#16120F] dark:text-[#EFE6D8]"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="submit"
                aria-label="Save labels"
                title="Save labels"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#D7CBB8] text-[#241D17] hover:bg-[#EAE1D3] dark:border-[#3B3026] dark:text-[#EFE6D8] dark:hover:bg-[#29211B]"
              >
                <Check className="h-4 w-4" />
              </button>
              <PWAInstallButton />
            </div>
          </form>
        </div>
      </div>

      {/* CSV Preview */}
      {parsedPreview && (
        <div className="rounded-2xl border border-[#9A7B4F]/45 bg-[#FBF8F1] p-6 space-y-4 dark:border-[#C29F6D]/40 dark:bg-[#201A15]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-semibold text-[#241D17] dark:text-[#EFE6D8]">
                CSV Preview ({parsedPreview.filter((r) => !r.error).length})
              </h3>
              <p className="text-xs text-[#6E6153] dark:text-[#B5A693]">
                Notes over 500 characters are trimmed.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setParsedPreview(null)}
                className="min-h-[44px] rounded-xl px-4 py-2 text-sm text-[#6E6153] hover:bg-[#EAE1D3] dark:text-[#B5A693] dark:hover:bg-[#29211B]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmCsvImport()}
                className="min-h-[44px] rounded-xl bg-[#A65E22] px-5 py-2 text-sm font-medium text-[#FBF8F1] hover:bg-[#8C4D19] dark:bg-[#C87A32] dark:hover:bg-[#D98B42]"
              >
                Import
              </button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-[#D7CBB8]/60 dark:divide-[#3B3026]">
            {parsedPreview.slice(0, 25).map((row) => (
              <div key={row.rowNumber} className="py-2.5 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[#241D17] dark:text-[#EFE6D8] truncate">
                    {row.error ? `[Row ${row.rowNumber} skipped: ${row.error}]` : row.text}
                  </p>
                  <p className="text-xs text-[#6E6153] dark:text-[#B5A693] font-mono-tabular">
                    {row.perspective === 'from_me' ? prefs.meLabel : prefs.herLabel}
                    {row.wasTruncated ? ' · trimmed to 500 chars' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
