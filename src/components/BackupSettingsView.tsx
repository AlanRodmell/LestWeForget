import React, { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Bell,
  Cloud,
  Download,
  FileSpreadsheet,
  LogIn,
  LogOut,
  Moon,
  RefreshCw,
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
        setErrorMessage('No rows were found in that CSV file.');
        return;
      }
      setParsedPreview(rows);
    } catch {
      setErrorMessage('Could not read the selected CSV file.');
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmCsvImport = async () => {
    if (!parsedPreview) return;
    const validRows = parsedPreview.filter((r) => !r.error && r.text.length > 0);
    if (validRows.length === 0) {
      setErrorMessage('No valid gratitude notes found in the CSV preview.');
      return;
    }
    const imported = await onImportCsvRows(validRows);
    setParsedPreview(null);
    setStatusMessage(`Imported ${imported} gift ${imported === 1 ? 'tag' : 'tags'} into your vault.`);
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
        setErrorMessage('Invalid JSON backup file: missing entries array.');
        return;
      }
      const restored = await onRestoreJson(data.entries, data.preferences);
      setStatusMessage(`Restored ${restored} gift ${restored === 1 ? 'tag' : 'tags'} from backup.`);
    } catch {
      setErrorMessage('Could not parse JSON backup file.');
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
            ? 'Push notifications are not supported in this browser.'
            : 'Please allow notifications in your browser settings to enable daily reminders.'
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
      setErrorMessage('Notification permission is required to send a test reflection.');
      return;
    }
    const randomTag = pickRandomEntry(entries);
    const ok = await sendGratitudeNotification(randomTag, prefs);
    if (ok) {
      setStatusMessage('Test reflection notification sent.');
    } else {
      setErrorMessage('Browser blocked showing the notification.');
    }
  };

  const handleSaveLabels = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdatePrefs({
      ...prefs,
      meLabel: meLabelDraft.trim().slice(0, MAX_LABEL_LENGTH) || prefs.meLabel,
      herLabel: herLabelDraft.trim().slice(0, MAX_LABEL_LENGTH) || prefs.herLabel,
    });
    setStatusMessage('Perspective labels saved.');
  };

  return (
    <section className="mx-auto max-w-4xl space-y-8 pb-10">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-[#221F1B] dark:text-[#F2ECE4]">
          Backup, CSV & Daily Reminders
        </h1>
        <p className="mt-1.5 text-sm text-[#6B6257] dark:text-[#AEA498]">
          Your gratitude tags are stored locally in IndexedDB for instant offline access and can sync to Firebase when signed in.
        </p>
      </div>

      {statusMessage && (
        <div
          role="status"
          className="rounded-xl border border-[#3E5C4E]/30 bg-[#3E5C4E]/10 px-4 py-3 text-sm text-[#221F1B] dark:border-[#78A58F]/35 dark:bg-[#78A58F]/15 dark:text-[#F2ECE4]"
        >
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-[#9C4A3B]/40 bg-[#9C4A3B]/10 px-4 py-3 text-sm text-[#9C4A3B] dark:border-[#DF8A79]/40 dark:bg-[#DF8A79]/15 dark:text-[#DF8A79]"
        >
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 1. Firebase Cloud Backup */}
        <div className="rounded-2xl border border-[#DDD4C7] bg-[#FAF8F4] p-6 space-y-4 dark:border-[#3A342E] dark:bg-[#1E1B18]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-medium text-[#221F1B] dark:text-[#F2ECE4]">
                Cloud Backup & Sync
              </h2>
              <p className="mt-1 text-sm text-[#6B6257] dark:text-[#AEA498]">
                Back up your tags to Firebase Firestore across phones.
              </p>
            </div>
            <Cloud className="h-5 w-5 text-[#3E5C4E] dark:text-[#86B39D] shrink-0" />
          </div>

          {!authReady ? (
            <p className="text-sm text-[#6B6257] dark:text-[#AEA498]">Checking session...</p>
          ) : user ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#DDD4C7] bg-[#F6F3EE] p-3.5 text-sm dark:border-[#342E28] dark:bg-[#141210]">
                <p className="font-medium text-[#221F1B] dark:text-[#F2ECE4] truncate">
                  {user.displayName || user.email}
                </p>
                <p className="text-xs text-[#6B6257] dark:text-[#AEA498] truncate">{user.email}</p>
                <p className="mt-2 text-xs text-[#3E5C4E] dark:text-[#86B39D] font-mono-tabular">
                  {pendingSyncCount === 0
                    ? `All ${entries.length} tags synced with cloud`
                    : `${pendingSyncCount} local changes waiting to sync`}
                </p>
              </div>

              {syncError && (
                <p className="text-xs text-[#9C4A3B] dark:text-[#DF8A79] break-words">
                  {syncError}
                </p>
              )}

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => void onSyncNow()}
                  disabled={isSyncing}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#3E5C4E] px-4 py-2 text-sm font-medium text-white hover:bg-[#324B3F] disabled:opacity-50 dark:bg-[#4E7462]"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void onSignOut()}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#DDD4C7] px-4 py-2 text-sm font-medium text-[#221F1B] hover:bg-[#EFE9E0] dark:border-[#3A342E] dark:text-[#F2ECE4] dark:hover:bg-[#2E2924]"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-[#6B6257] dark:text-[#AEA498]">
                Currently storing {entries.length} {entries.length === 1 ? 'tag' : 'tags'} locally on this device. Sign in with Google to enable cloud backup.
              </p>
              <button
                type="button"
                onClick={() => void onSignIn()}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#3E5C4E] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#324B3F] dark:bg-[#4E7462] dark:hover:bg-[#5E8874]"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign in with Google</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. Daily Push Notifications */}
        <div className="rounded-2xl border border-[#DDD4C7] bg-[#FAF8F4] p-6 space-y-4 dark:border-[#3A342E] dark:bg-[#1E1B18]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-medium text-[#221F1B] dark:text-[#F2ECE4]">
                Daily Reflection Reminder
              </h2>
              <p className="mt-1 text-sm text-[#6B6257] dark:text-[#AEA498]">
                Receive a daily prompt with a randomly pulled gratitude tag.
              </p>
            </div>
            <Bell className="h-5 w-5 text-[#3E5C4E] dark:text-[#86B39D] shrink-0" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DDD4C7] bg-[#F6F3EE] px-4 py-3 dark:border-[#342E28] dark:bg-[#141210]">
            <div>
              <p className="text-sm font-medium text-[#221F1B] dark:text-[#F2ECE4]">
                Daily notification
              </p>
              <p className="text-xs text-[#6B6257] dark:text-[#AEA498]">
                Permission: {notifPermission}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleToggleReminder()}
              aria-pressed={prefs.reminderEnabled}
              className={`min-h-[40px] rounded-xl px-4 py-1.5 text-xs font-medium transition ${
                prefs.reminderEnabled
                  ? 'bg-[#3E5C4E] text-white dark:bg-[#4E7462]'
                  : 'border border-[#DDD4C7] bg-white text-[#221F1B] dark:border-[#3A342E] dark:bg-[#231F1B] dark:text-[#F2ECE4]'
              }`}
            >
              {prefs.reminderEnabled ? 'Enabled' : 'Enable'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="reminder-time-input"
              className="text-sm text-[#6B6257] dark:text-[#AEA498]"
            >
              Preferred time:
            </label>
            <input
              id="reminder-time-input"
              type="time"
              value={prefs.reminderTime}
              onChange={(e) =>
                void onUpdatePrefs({ ...prefs, reminderTime: e.target.value })
              }
              className="min-h-[44px] rounded-xl border border-[#DDD4C7] bg-white px-3 text-sm font-mono-tabular text-[#221F1B] dark:border-[#3A342E] dark:bg-[#141210] dark:text-[#F2ECE4]"
            />
            <button
              type="button"
              onClick={() => void handleTestNotification()}
              className="min-h-[44px] rounded-xl border border-[#DDD4C7] px-4 py-2 text-sm font-medium text-[#221F1B] hover:bg-[#EFE9E0] dark:border-[#3A342E] dark:text-[#F2ECE4] dark:hover:bg-[#2E2924]"
            >
              Send Test Reminder
            </button>
          </div>
        </div>

        {/* 3. CSV Upload & Manual Export */}
        <div className="rounded-2xl border border-[#DDD4C7] bg-[#FAF8F4] p-6 space-y-4 dark:border-[#3A342E] dark:bg-[#1E1B18]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-medium text-[#221F1B] dark:text-[#F2ECE4]">
                CSV Import & Manual Export
              </h2>
              <p className="mt-1 text-sm text-[#6B6257] dark:text-[#AEA498]">
                Upload existing notes via CSV or export your entire vault at any time.
              </p>
            </div>
            <FileSpreadsheet className="h-5 w-5 text-[#3E5C4E] dark:text-[#86B39D] shrink-0" />
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

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => csvInputRef.current?.click()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#3E5C4E] px-4 py-2 text-sm font-medium text-white hover:bg-[#324B3F] dark:bg-[#4E7462]"
            >
              <Upload className="h-4 w-4" />
              <span>Upload CSV</span>
            </button>

            <button
              type="button"
              onClick={() => downloadSampleCsvTemplate()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#DDD4C7] px-4 py-2 text-sm font-medium text-[#221F1B] hover:bg-[#EFE9E0] dark:border-[#3A342E] dark:text-[#F2ECE4] dark:hover:bg-[#2E2924]"
            >
              <span>Sample CSV</span>
            </button>
          </div>

          <div className="pt-2 border-t border-[#DDD4C7]/70 dark:border-[#342E28] flex flex-wrap gap-2.5">
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
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#DDD4C7] px-4 py-2 text-sm font-medium text-[#221F1B] hover:bg-[#EFE9E0] disabled:opacity-40 dark:border-[#3A342E] dark:text-[#F2ECE4] dark:hover:bg-[#2E2924]"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
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
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#DDD4C7] px-4 py-2 text-sm font-medium text-[#221F1B] hover:bg-[#EFE9E0] disabled:opacity-40 dark:border-[#3A342E] dark:text-[#F2ECE4] dark:hover:bg-[#2E2924]"
            >
              <Download className="h-4 w-4" />
              <span>Export JSON</span>
            </button>

            <button
              type="button"
              onClick={() => jsonInputRef.current?.click()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#DDD4C7] px-4 py-2 text-sm font-medium text-[#221F1B] hover:bg-[#EFE9E0] dark:border-[#3A342E] dark:text-[#F2ECE4] dark:hover:bg-[#2E2924]"
            >
              <Upload className="h-4 w-4" />
              <span>Restore JSON</span>
            </button>
          </div>
        </div>

        {/* 4. Evening Dark Mode, Labels & Install App */}
        <div className="rounded-2xl border border-[#DDD4C7] bg-[#FAF8F4] p-6 space-y-5 dark:border-[#3A342E] dark:bg-[#1E1B18]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-medium text-[#221F1B] dark:text-[#F2ECE4]">
                Appearance & Labels
              </h2>
              <p className="mt-1 text-sm text-[#6B6257] dark:text-[#AEA498]">
                Switch to dark mode for calm evening journaling.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                void onUpdatePrefs({
                  ...prefs,
                  theme: prefs.theme === 'dark' ? 'light' : 'dark',
                })
              }
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#DDD4C7] bg-[#F6F3EE] px-4 py-2 text-sm font-medium text-[#221F1B] hover:bg-[#EFE9E0] dark:border-[#3A342E] dark:bg-[#141210] dark:text-[#F2ECE4] dark:hover:bg-[#2A2622]"
            >
              {prefs.theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>

          <form onSubmit={(e) => void handleSaveLabels(e)} className="space-y-3 pt-2 border-t border-[#DDD4C7]/70 dark:border-[#342E28]">
            <div className="space-y-1">
              <label
                htmlFor="me-label-input"
                className="block text-xs font-medium text-[#6B6257] dark:text-[#AEA498]"
              >
                Label for your notes about her
              </label>
              <input
                id="me-label-input"
                type="text"
                maxLength={MAX_LABEL_LENGTH}
                value={meLabelDraft}
                onChange={(e) => setMeLabelDraft(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-[#DDD4C7] bg-white px-3.5 text-sm text-[#221F1B] dark:border-[#3A342E] dark:bg-[#141210] dark:text-[#F2ECE4]"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="her-label-input"
                className="block text-xs font-medium text-[#6B6257] dark:text-[#AEA498]"
              >
                Label for her notes about you
              </label>
              <input
                id="her-label-input"
                type="text"
                maxLength={MAX_LABEL_LENGTH}
                value={herLabelDraft}
                onChange={(e) => setHerLabelDraft(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-[#DDD4C7] bg-white px-3.5 text-sm text-[#221F1B] dark:border-[#3A342E] dark:bg-[#141210] dark:text-[#F2ECE4]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="submit"
                className="min-h-[44px] rounded-xl border border-[#DDD4C7] px-4 py-2 text-sm font-medium text-[#221F1B] hover:bg-[#EFE9E0] dark:border-[#3A342E] dark:text-[#F2ECE4] dark:hover:bg-[#2E2924]"
              >
                Save Labels
              </button>
              <PWAInstallButton />
            </div>
          </form>
        </div>
      </div>

      {/* CSV Preview Modal / Panel */}
      {parsedPreview && (
        <div className="rounded-2xl border border-[#3E5C4E]/40 bg-[#FAF8F4] p-6 space-y-4 dark:border-[#78A58F]/40 dark:bg-[#1E1B18]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-medium text-[#221F1B] dark:text-[#F2ECE4]">
                CSV Import Preview ({parsedPreview.filter((r) => !r.error).length} ready)
              </h3>
              <p className="text-xs text-[#6B6257] dark:text-[#AEA498]">
                Notes longer than 500 characters are automatically trimmed to fit gift tag cards.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setParsedPreview(null)}
                className="min-h-[44px] rounded-xl px-4 py-2 text-sm text-[#6B6257] hover:bg-[#EFE9E0] dark:text-[#AEA498] dark:hover:bg-[#2E2924]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmCsvImport()}
                className="min-h-[44px] rounded-xl bg-[#3E5C4E] px-5 py-2 text-sm font-medium text-white hover:bg-[#324B3F] dark:bg-[#4E7462]"
              >
                Import Tags
              </button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-[#DDD4C7]/60 dark:divide-[#342E28]">
            {parsedPreview.slice(0, 25).map((row) => (
              <div key={row.rowNumber} className="py-2.5 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[#221F1B] dark:text-[#F2ECE4] truncate">
                    {row.error ? `[Row ${row.rowNumber} skipped: ${row.error}]` : row.text}
                  </p>
                  <p className="text-xs text-[#6B6257] dark:text-[#AEA498] font-mono-tabular">
                    {row.perspective === 'from_me' ? 'From Me' : 'From Her'} · {row.tagStyle}
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
