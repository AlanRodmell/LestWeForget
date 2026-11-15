import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  BookOpen,
  Cloud,
  Moon,
  Plus,
  Settings,
  Sparkles,
  Sun,
} from 'lucide-react';
import { auth, googleProvider } from './firebase';
import {
  DEFAULT_PREFERENCES,
  getIncomingPerspectiveForEmail,
  isAllowedEmail,
  type AppPreferences,
  type GratitudeEntry,
  type ParsedCsvRow,
  type Perspective,
  type TagStyle,
} from './types';
import {
  generateSafeId,
  getActiveEntries,
  getAllStoredEntries,
  getPreferences,
  markEntryDeleted,
  savePreferences,
  todayIsoDate,
  upsertEntriesBulk,
  upsertEntry,
} from './services/idbStore';
import {
  ensureSharedVault,
  getMemberLastSeenMs,
  pushAllPendingEntries,
  pushEntryToCloud,
  subscribeToCloudEntries,
  syncPreferencesToCloud,
  updateMemberLastSeenMs,
} from './services/syncService';
import {
  pickRandomEntry,
  sendGratitudeNotification,
  shouldFireDailyReminder,
  tryRegisterPeriodicSync,
} from './services/notificationService';
import { ReflectView } from './components/ReflectView';
import { CollectionView } from './components/CollectionView';
import { BackupSettingsView } from './components/BackupSettingsView';
import { EntryEditorModal } from './components/EntryEditorModal';
import { NewPartnerTagsModal } from './components/NewPartnerTagsModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AuthGate } from './components/AuthGate';

type ActiveTab = 'reflect' | 'collection' | 'backup';

function isAuthorizedUser(u: User | null): boolean {
  return Boolean(u && u.emailVerified && isAllowedEmail(u.email));
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('reflect');
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [prefs, setPrefs] = useState<AppPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Reflect spotlight state
  const [perspectiveFilter, setPerspectiveFilter] = useState<'all' | Perspective>('all');
  const [spotlightTagFilter, setSpotlightTagFilter] = useState<string | null>(null);
  const [spotlightId, setSpotlightId] = useState<string | null>(null);
  const [drawKey, setDrawKey] = useState(0);

  // Collection tag jump
  const [collectionTagJump, setCollectionTagJump] = useState<string | null>(null);

  // Modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<GratitudeEntry | null>(null);

  // Partner new-tags notification modal state
  const [lastSeenMs, setLastSeenMs] = useState<number | null>(null);
  const [newTagsModalOpen, setNewTagsModalOpen] = useState(false);
  const [dismissedModalForSession, setDismissedModalForSession] = useState(false);
  const sessionCreatedIdsRef = useRef<Set<string>>(new Set());

  // Auth & Cloud Sync state
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [deniedEmail, setDeniedEmail] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Apply dark mode class whenever theme preference changes
  useEffect(() => {
    const root = document.documentElement;
    if (prefs.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [prefs.theme]);

  // Load IndexedDB preferences & entries once authorized
  useEffect(() => {
    let active = true;
    (async () => {
      const loadedPrefs = await getPreferences();
      if (!active) return;
      setPrefs(loadedPrefs);
      if (isAuthorizedUser(user)) {
        const loadedEntries = await getActiveEntries();
        if (!active) return;
        setEntries(loadedEntries);
        if (loadedEntries.length > 0) {
          const picked = pickRandomEntry(loadedEntries);
          setSpotlightId(picked?.id ?? null);
        }
      } else {
        setEntries([]);
      }
      setIsLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  // Auth listener with strict email allowlist enforcement & shared vault sync
  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (unsubSnapshot) {
        unsubSnapshot();
        unsubSnapshot = null;
      }

      if (currentUser && !isAuthorizedUser(currentUser)) {
        const blocked = currentUser.email ?? 'this account';
        setDeniedEmail(blocked);
        setUser(null);
        setLastSeenMs(null);
        setNewTagsModalOpen(false);
        setDismissedModalForSession(false);
        sessionCreatedIdsRef.current.clear();
        setAuthReady(true);
        await signOut(auth);
        return;
      }

      setUser(currentUser);
      setAuthReady(true);
      setSyncError(null);
      setLastSeenMs(null);
      setNewTagsModalOpen(false);
      setDismissedModalForSession(false);
      sessionCreatedIdsRef.current.clear();

      if (!currentUser) return;

      setDeniedEmail(null);
      setIsSyncing(true);
      try {
        const localPrefs = await getPreferences();
        if (navigator.onLine) {
          const mergedPrefs = await ensureSharedVault(currentUser.uid, localPrefs);
          if (mergedPrefs) {
            const saved = await savePreferences(mergedPrefs);
            setPrefs(saved);
          }
          const seen = await getMemberLastSeenMs(currentUser.uid);
          setLastSeenMs(seen);
          await pushAllPendingEntries(currentUser.uid);
        } else {
          let localSeen = 0;
          try {
            const raw = localStorage.getItem(`lest_we_forget_last_seen_${currentUser.uid}`);
            if (raw) {
              const parsed = Number(raw);
              if (!Number.isNaN(parsed) && parsed >= 0) localSeen = parsed;
            }
          } catch {
            // Ignore storage access errors
          }
          setLastSeenMs(localSeen);
          setIsSyncing(false);
        }

        unsubSnapshot = subscribeToCloudEntries(
          (merged) => {
            setEntries(merged);
            setIsSyncing(false);
          },
          (err) => {
            setSyncError(err.message);
            setIsSyncing(false);
          }
        );
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Cloud sync error.');
        setIsSyncing(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, []);

  // Automatic flush of offline mutations when connectivity returns
  useEffect(() => {
    const handleOnline = async () => {
      if (!user || !isAuthorizedUser(user)) return;
      setIsSyncing(true);
      try {
        await pushAllPendingEntries(user.uid);
        const refreshed = await getActiveEntries();
        setEntries(refreshed);
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Sync failed.');
      } finally {
        setIsSyncing(false);
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user]);

  // Daily push notification scheduler
  useEffect(() => {
    if (!isLoaded || !isAuthorizedUser(user)) return;

    const checkReminder = async () => {
      if (!shouldFireDailyReminder(prefs)) return;
      const picked = pickRandomEntry(entries);
      const sent = await sendGratitudeNotification(picked, prefs);
      if (sent) {
        const updated = await savePreferences({
          ...prefs,
          lastNotifiedDate: todayIsoDate(),
        });
        setPrefs(updated);
      }
    };

    void checkReminder();
    if (prefs.reminderEnabled) {
      void tryRegisterPeriodicSync();
    }

    const interval = window.setInterval(() => {
      void checkReminder();
    }, 60_000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void checkReminder();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isLoaded, user, prefs, entries]);

  // All unique tags across vault
  const allTags = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of entries) {
      for (const tag of entry.tags) {
        const key = tag.toLowerCase();
        if (!map.has(key)) map.set(key, tag);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  // Matching pool for Reflect view
  const filteredPool = useMemo(() => {
    return entries.filter((e) => {
      if (perspectiveFilter !== 'all' && e.perspective !== perspectiveFilter) return false;
      if (
        spotlightTagFilter &&
        !e.tags.some((t) => t.toLowerCase() === spotlightTagFilter.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [entries, perspectiveFilter, spotlightTagFilter]);

  const currentSpotlight = useMemo(() => {
    if (filteredPool.length === 0) return null;
    const found = filteredPool.find((e) => e.id === spotlightId);
    return found ?? filteredPool[0];
  }, [filteredPool, spotlightId]);

  const pendingSyncCount = useMemo(
    () => entries.filter((e) => e.syncStatus === 'pending').length,
    [entries]
  );

  // Incoming partner perspective & newly created unseen tags for signed-in user
  const incomingPerspective = useMemo(
    () => getIncomingPerspectiveForEmail(user?.email),
    [user?.email]
  );

  const unseenPartnerTags = useMemo(() => {
    if (!incomingPerspective || lastSeenMs === null) return [];
    return entries
      .filter(
        (e) =>
          e.perspective === incomingPerspective &&
          e.createdAtMs > lastSeenMs &&
          !sessionCreatedIdsRef.current.has(e.id)
      )
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
  }, [entries, incomingPerspective, lastSeenMs]);

  useEffect(() => {
    if (
      isLoaded &&
      lastSeenMs !== null &&
      unseenPartnerTags.length > 0 &&
      !dismissedModalForSession &&
      !editorOpen
    ) {
      setNewTagsModalOpen(true);
    }
  }, [isLoaded, lastSeenMs, unseenPartnerTags.length, dismissedModalForSession, editorOpen]);

  const handleAcknowledgeNewTags = async () => {
    if (!user || !isAuthorizedUser(user)) return;
    const maxCreated = unseenPartnerTags.reduce(
      (max, item) => Math.max(max, item.createdAtMs),
      0
    );
    const nextSeen = Math.max(Date.now(), maxCreated);
    setLastSeenMs(nextSeen);
    setNewTagsModalOpen(false);
    setDismissedModalForSession(false);

    try {
      localStorage.setItem(`lest_we_forget_last_seen_${user.uid}`, String(nextSeen));
    } catch {
      // Ignore storage access errors
    }

    if (navigator.onLine) {
      try {
        await updateMemberLastSeenMs(user.uid, nextSeen);
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Could not update seen status.');
      }
    }
  };

  const handleDrawRandom = useCallback(() => {
    const picked = pickRandomEntry(filteredPool, currentSpotlight?.id ?? null);
    if (picked) {
      setSpotlightId(picked.id);
      setDrawKey((k) => k + 1);
    }
  }, [filteredPool, currentSpotlight]);

  const refreshLocalEntries = async () => {
    const fresh = await getActiveEntries();
    setEntries(fresh);
  };

  const handleSaveEntry = async (data: {
    id?: string;
    text: string;
    perspective: Perspective;
    tagStyle: TagStyle;
    tags: string[];
    entryDate: string;
  }) => {
    if (!user || !isAuthorizedUser(user)) return;
    const now = Date.now();
    const existing = data.id ? entries.find((e) => e.id === data.id) : undefined;
    const entryId = existing ? existing.id : generateSafeId();
    if (!existing) {
      sessionCreatedIdsRef.current.add(entryId);
    }
    const draft: GratitudeEntry = {
      id: entryId,
      text: data.text,
      perspective: data.perspective,
      tagStyle: data.tagStyle,
      tags: data.tags,
      entryDate: data.entryDate,
      isFavorite: existing ? existing.isFavorite : false,
      createdAtMs: existing ? existing.createdAtMs : now,
      updatedAtMs: now,
      syncStatus: 'pending',
      cloudCreated: existing?.cloudCreated ?? false,
      authorUid: existing?.authorUid ?? user.uid,
    };

    const saved = await upsertEntry(draft);
    await refreshLocalEntries();
    setSpotlightId(saved.id);

    if (navigator.onLine) {
      try {
        await pushEntryToCloud(user.uid, saved);
        await refreshLocalEntries();
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Could not sync entry.');
      }
    }
  };

  const handleToggleFavorite = async (entry: GratitudeEntry) => {
    if (!user || !isAuthorizedUser(user)) return;
    const updated: GratitudeEntry = {
      ...entry,
      isFavorite: !entry.isFavorite,
      updatedAtMs: Date.now(),
      syncStatus: 'pending',
    };
    const saved = await upsertEntry(updated);
    await refreshLocalEntries();

    if (navigator.onLine) {
      try {
        await pushEntryToCloud(user.uid, saved);
        await refreshLocalEntries();
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Could not sync favorite.');
      }
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!user || !isAuthorizedUser(user)) return;
    await markEntryDeleted(id);
    const fresh = await getActiveEntries();
    setEntries(fresh);
    if (spotlightId === id) {
      const next = pickRandomEntry(fresh);
      setSpotlightId(next?.id ?? null);
    }

    if (navigator.onLine) {
      try {
        const all = await getAllStoredEntries();
        const deletedRecord = all.find((e) => e.id === id);
        if (deletedRecord) {
          await pushEntryToCloud(user.uid, deletedRecord);
        }
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Could not delete from cloud.');
      }
    }
  };

  const handleImportCsvRows = async (rows: ParsedCsvRow[]): Promise<number> => {
    if (!user || !isAuthorizedUser(user)) return 0;
    const now = Date.now();
    const toInsert: GratitudeEntry[] = rows.map((row, idx) => {
      const id = generateSafeId();
      sessionCreatedIdsRef.current.add(id);
      return {
        id,
        text: row.text,
        perspective: row.perspective,
        tagStyle: row.tagStyle,
        tags: row.tags,
        entryDate: row.entryDate,
        isFavorite: row.isFavorite,
        createdAtMs: now + idx,
        updatedAtMs: now + idx,
        syncStatus: 'pending',
        cloudCreated: false,
        authorUid: user.uid,
      };
    });

    await upsertEntriesBulk(toInsert);
    await refreshLocalEntries();
    if (!spotlightId && toInsert.length > 0) {
      setSpotlightId(toInsert[0].id);
    }

    if (navigator.onLine) {
      setIsSyncing(true);
      try {
        await pushAllPendingEntries(user.uid);
        await refreshLocalEntries();
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Cloud sync incomplete.');
      } finally {
        setIsSyncing(false);
      }
    }
    return toInsert.length;
  };

  const handleRestoreJson = async (
    importedEntries: GratitudeEntry[],
    importedPrefs?: Partial<AppPreferences>
  ): Promise<number> => {
    if (!user || !isAuthorizedUser(user)) return 0;
    const now = Date.now();
    const normalized: GratitudeEntry[] = importedEntries
      .filter((e) => typeof e.text === 'string' && e.text.trim().length > 0)
      .map((e, idx) => {
        const id = typeof e.id === 'string' && e.id ? e.id : generateSafeId();
        sessionCreatedIdsRef.current.add(id);
        return {
          id,
          text: e.text,
          perspective: e.perspective === 'from_her' ? 'from_her' : 'from_me',
          tagStyle: e.tagStyle === 'kraft' ? 'kraft' : 'white',
          tags: Array.isArray(e.tags) ? e.tags : [],
          entryDate: typeof e.entryDate === 'string' ? e.entryDate : todayIsoDate(),
          isFavorite: Boolean(e.isFavorite),
          createdAtMs: typeof e.createdAtMs === 'number' ? e.createdAtMs : now + idx,
          updatedAtMs: now + idx,
          syncStatus: 'pending',
          cloudCreated: false,
          authorUid: user.uid,
        };
      });

    await upsertEntriesBulk(normalized);
    await refreshLocalEntries();

    if (importedPrefs) {
      await handleUpdatePrefs({ ...prefs, ...importedPrefs });
    }

    if (navigator.onLine) {
      setIsSyncing(true);
      try {
        await pushAllPendingEntries(user.uid);
        await refreshLocalEntries();
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Cloud sync incomplete.');
      } finally {
        setIsSyncing(false);
      }
    }
    return normalized.length;
  };

  const handleUpdatePrefs = async (next: AppPreferences) => {
    const saved = await savePreferences(next);
    setPrefs(saved);
    if (user && isAuthorizedUser(user) && navigator.onLine) {
      try {
        await syncPreferencesToCloud(saved);
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Could not save preferences to cloud.');
      }
    }
  };

  const handleSignIn = async () => {
    setSyncError(null);
    setDeniedEmail(null);
    setIsSigningIn(true);
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, googleProvider);
      if (!isAuthorizedUser(result.user)) {
        const email = result.user.email ?? 'this account';
        setDeniedEmail(email);
        await signOut(auth);
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setEntries([]);
    setSyncError(null);
  };

  const handleSyncNow = async () => {
    if (!user || !isAuthorizedUser(user)) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      await pushAllPendingEntries(user.uid);
      await refreshLocalEntries();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Manual sync failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleTheme = () => {
    void handleUpdatePrefs({
      ...prefs,
      theme: prefs.theme === 'dark' ? 'light' : 'dark',
    });
  };

  if (!authReady) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F6F3EE] text-[#6B6257] dark:bg-[#141210] dark:text-[#AEA498]">
        <span className="font-display text-lg">Lest We Forget...</span>
      </div>
    );
  }

  if (!user || !isAuthorizedUser(user)) {
    return (
      <AuthGate
        theme={prefs.theme}
        deniedEmail={deniedEmail}
        authError={syncError}
        isSigningIn={isSigningIn}
        onToggleTheme={toggleTheme}
        onSignIn={() => void handleSignIn()}
      />
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[#F6F3EE] text-[#221F1B] dark:bg-[#141210] dark:text-[#F2ECE4] transition-colors">
      {/* Sticky Top Bar (Strict 3-zone contract, 56px height) */}
      <header className="sticky top-0 z-30 h-14 border-b border-[#E3DBD0] bg-[#F6F3EE]/90 backdrop-blur-md dark:border-[#2A2520] dark:bg-[#141210]/90">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-8 px-4 sm:px-6">
          {/* Zone 1: Single-element Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('reflect')}
            className="font-display text-lg font-medium tracking-tight text-[#221F1B] dark:text-[#F2ECE4] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#3E5C4E] rounded"
          >
            Lest We Forget
          </button>

          {/* Zone 2: Clean Single-Line Nav Links (Desktop) */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-[#6B6257] dark:text-[#AEA498]"
          >
            <button
              type="button"
              onClick={() => setActiveTab('reflect')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 hover:text-[#221F1B] dark:hover:text-[#F2ECE4] ${
                activeTab === 'reflect'
                  ? 'text-[#221F1B] underline decoration-[#3E5C4E] decoration-2 underline-offset-8 dark:text-[#F2ECE4] dark:decoration-[#78A58F]'
                  : ''
              }`}
            >
              Reflect
            </button>
            <button
              type="button"
              onClick={() => {
                setCollectionTagJump(null);
                setActiveTab('collection');
              }}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 hover:text-[#221F1B] dark:hover:text-[#F2ECE4] ${
                activeTab === 'collection'
                  ? 'text-[#221F1B] underline decoration-[#3E5C4E] decoration-2 underline-offset-8 dark:text-[#F2ECE4] dark:decoration-[#78A58F]'
                  : ''
              }`}
            >
              All Tags
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('backup')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 hover:text-[#221F1B] dark:hover:text-[#F2ECE4] ${
                activeTab === 'backup'
                  ? 'text-[#221F1B] underline decoration-[#3E5C4E] decoration-2 underline-offset-8 dark:text-[#F2ECE4] dark:decoration-[#78A58F]'
                  : ''
              }`}
            >
              Backup & Reminders
            </button>
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingEntry(null);
                setEditorOpen(true);
              }}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#3E5C4E] px-4 py-2 text-xs sm:text-sm font-medium text-white shadow-xs transition hover:bg-[#324B3F] dark:bg-[#4E7462] dark:hover:bg-[#5E8874] whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Write Tag</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 pt-5 pb-24 md:pb-12">
        {/* Compact Workspace Utility Strip */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6B6257] dark:text-[#AEA498]">
            <button
              type="button"
              onClick={() => setActiveTab('backup')}
              className="inline-flex min-h-[36px] items-center gap-1.5 hover:text-[#221F1B] dark:hover:text-[#F2ECE4]"
            >
              <Cloud className="h-3.5 w-3.5 text-[#3E5C4E] dark:text-[#86B39D]" />
              <span>
                {isSyncing
                  ? 'Syncing shared vault...'
                  : pendingSyncCount > 0
                  ? `${pendingSyncCount} waiting to sync`
                  : `Signed in as ${user.email}`}
              </span>
            </button>

            {unseenPartnerTags.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setDismissedModalForSession(false);
                  setNewTagsModalOpen(true);
                }}
                className="inline-flex min-h-[36px] items-center gap-1.5 font-medium text-[#3E5C4E] underline decoration-[#3E5C4E]/40 underline-offset-4 hover:text-[#221F1B] dark:text-[#86B39D] dark:decoration-[#86B39D]/40 dark:hover:text-[#F2ECE4]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>
                  {unseenPartnerTags.length} new{' '}
                  {unseenPartnerTags.length === 1 ? 'tag' : 'tags'} for you
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <PWAInstallButton compact />
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={prefs.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl border border-[#DDD4C7] bg-[#FAF8F4] px-3 text-xs font-medium text-[#221F1B] transition hover:bg-[#EFE9E0] dark:border-[#342E28] dark:bg-[#1E1B18] dark:text-[#F2ECE4] dark:hover:bg-[#2A2622] whitespace-nowrap shrink-0"
            >
              {prefs.theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  <span className="hidden sm:inline">Evening Dark</span>
                </>
              )}
            </button>
          </div>
        </div>

        {!isLoaded ? (
          <div className="py-20 text-center text-sm text-[#6B6257] dark:text-[#AEA498]">
            Opening your gift tags...
          </div>
        ) : activeTab === 'reflect' ? (
          <ReflectView
            entries={entries}
            currentSpotlight={currentSpotlight}
            prefs={prefs}
            perspectiveFilter={perspectiveFilter}
            selectedTag={spotlightTagFilter}
            drawKey={drawKey}
            onPerspectiveChange={setPerspectiveFilter}
            onClearTag={() => setSpotlightTagFilter(null)}
            onDrawRandom={handleDrawRandom}
            onToggleFavorite={(entry) => void handleToggleFavorite(entry)}
            onEdit={(entry) => {
              setEditingEntry(entry);
              setEditorOpen(true);
            }}
            onDelete={(id) => void handleDeleteEntry(id)}
            onTagClick={(tag) => {
              setCollectionTagJump(tag);
              setActiveTab('collection');
            }}
            onOpenNew={() => {
              setEditingEntry(null);
              setEditorOpen(true);
            }}
            onGoToImport={() => setActiveTab('backup')}
          />
        ) : activeTab === 'collection' ? (
          <CollectionView
            entries={entries}
            prefs={prefs}
            allTags={allTags}
            initialTagFilter={collectionTagJump}
            onToggleFavorite={(entry) => void handleToggleFavorite(entry)}
            onEdit={(entry) => {
              setEditingEntry(entry);
              setEditorOpen(true);
            }}
            onDelete={(id) => void handleDeleteEntry(id)}
            onOpenNew={() => {
              setEditingEntry(null);
              setEditorOpen(true);
            }}
          />
        ) : (
          <BackupSettingsView
            entries={entries}
            prefs={prefs}
            user={user}
            authReady={authReady}
            isSyncing={isSyncing}
            syncError={syncError}
            pendingSyncCount={pendingSyncCount}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
            onSyncNow={handleSyncNow}
            onImportCsvRows={handleImportCsvRows}
            onRestoreJson={handleRestoreJson}
            onUpdatePrefs={handleUpdatePrefs}
          />
        )}
      </main>

      {/* Mobile Bottom Thumb-Zone Navigation Bar (64px + safe area) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#E3DBD0] bg-[#FAF8F4]/95 backdrop-blur-md pb-safe dark:border-[#2A2520] dark:bg-[#1A1714]/95"
      >
        <div className="grid grid-cols-4 h-16 items-center">
          <button
            type="button"
            onClick={() => setActiveTab('reflect')}
            className={`flex flex-col items-center justify-center min-h-[44px] gap-1 text-[11px] font-medium ${
              activeTab === 'reflect'
                ? 'text-[#3E5C4E] dark:text-[#86B39D]'
                : 'text-[#6B6257] dark:text-[#AEA498]'
            }`}
          >
            <Sparkles className="h-5 w-5" />
            <span>Reflect</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCollectionTagJump(null);
              setActiveTab('collection');
            }}
            className={`flex flex-col items-center justify-center min-h-[44px] gap-1 text-[11px] font-medium ${
              activeTab === 'collection'
                ? 'text-[#3E5C4E] dark:text-[#86B39D]'
                : 'text-[#6B6257] dark:text-[#AEA498]'
            }`}
          >
            <BookOpen className="h-5 w-5" />
            <span>All Tags</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingEntry(null);
              setEditorOpen(true);
            }}
            className="flex flex-col items-center justify-center min-h-[44px] gap-1 text-[11px] font-medium text-[#3E5C4E] dark:text-[#86B39D]"
          >
            <Plus className="h-5 w-5" />
            <span>Write</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`flex flex-col items-center justify-center min-h-[44px] gap-1 text-[11px] font-medium ${
              activeTab === 'backup'
                ? 'text-[#3E5C4E] dark:text-[#86B39D]'
                : 'text-[#6B6257] dark:text-[#AEA498]'
            }`}
          >
            <Settings className="h-5 w-5" />
            <span>Backup</span>
          </button>
        </div>
      </nav>

      <EntryEditorModal
        isOpen={editorOpen}
        editingEntry={editingEntry}
        defaultPerspective={
          user.email?.toLowerCase() === 'jlmclaren84@gmail.com' ? 'from_her' : 'from_me'
        }
        prefs={prefs}
        existingTags={allTags}
        onClose={() => {
          setEditorOpen(false);
          setEditingEntry(null);
        }}
        onSave={handleSaveEntry}
      />

      {incomingPerspective && (
        <NewPartnerTagsModal
          isOpen={newTagsModalOpen}
          newEntries={unseenPartnerTags}
          incomingPerspective={incomingPerspective}
          prefs={prefs}
          onAcknowledgeAll={() => void handleAcknowledgeNewTags()}
          onDismissForLater={() => {
            setDismissedModalForSession(true);
            setNewTagsModalOpen(false);
          }}
          onToggleFavorite={(entry) => void handleToggleFavorite(entry)}
          onEdit={(entry) => {
            setNewTagsModalOpen(false);
            setEditingEntry(entry);
            setEditorOpen(true);
          }}
          onDelete={(id) => void handleDeleteEntry(id)}
        />
      )}

      <OfflineIndicator />
    </div>
  );
}
