import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  Check,
  Cloud,
  LayoutGrid,
  ListFilter,
  Moon,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Sun,
  X,
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
  getLocalRecentDrawIds,
  getMemberReadState,
  pushAllPendingEntries,
  pushEntryToCloud,
  saveLocalRecentDrawIds,
  subscribeToCloudEntries,
  syncPreferencesToCloud,
  updateMemberLastSeenMs,
  updateMemberRecentDraws,
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
import { StationeryBackdrop } from './components/StationeryBackdrop';

type ActiveTab = 'reflect' | 'collection' | 'backup';

function isAuthorizedUser(u: User | null): boolean {
  return Boolean(u && u.emailVerified && isAllowedEmail(u.email));
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('reflect');
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [prefs, setPrefs] = useState<AppPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Reflect spotlight starts empty so initial screen shows only Help Me Be Grateful
  const [perspectiveFilter, setPerspectiveFilter] = useState<'all' | Perspective>('all');
  const [spotlightTagFilter, setSpotlightTagFilter] = useState<string | null>(null);
  const [spotlightId, setSpotlightId] = useState<string | null>(null);
  const [drawKey, setDrawKey] = useState(0);

  // Collection tag jump
  const [collectionTagJump, setCollectionTagJump] = useState<string | null>(null);

  // Modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<GratitudeEntry | null>(null);

  // Partner new-tags notification modal & cycle-aware draw history state
  const [lastSeenMs, setLastSeenMs] = useState<number | null>(null);
  const [recentDrawIds, setRecentDrawIds] = useState<string[]>([]);
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
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filterMenuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setFilterMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFilterMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [filterMenuOpen]);

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
        setPerspectiveFilter('all');
        setLastSeenMs(null);
        setRecentDrawIds([]);
        setNewTagsModalOpen(false);
        setDismissedModalForSession(false);
        setSpotlightId(null);
        sessionCreatedIdsRef.current.clear();
        setAuthReady(true);
        await signOut(auth);
        return;
      }

      const defaultPerspectiveFilter: 'all' | Perspective = currentUser
        ? getIncomingPerspectiveForEmail(currentUser.email) ?? 'all'
        : 'all';

      setUser(currentUser);
      setAuthReady(true);
      setSyncError(null);
      setPerspectiveFilter(defaultPerspectiveFilter);
      setLastSeenMs(null);
      setRecentDrawIds(currentUser ? getLocalRecentDrawIds(currentUser.uid) : []);
      setNewTagsModalOpen(false);
      setDismissedModalForSession(false);
      setSpotlightId(null);
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
          const memberState = await getMemberReadState(currentUser.uid);
          setLastSeenMs(memberState.lastSeenMs);
          setRecentDrawIds(memberState.recentDrawIds);
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
          setRecentDrawIds(getLocalRecentDrawIds(currentUser.uid));
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
    if (!spotlightId || filteredPool.length === 0) return null;
    return filteredPool.find((e) => e.id === spotlightId) ?? null;
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

  const recordDrawnEntry = useCallback(
    (pickedId: string, pool: GratitudeEntry[]) => {
      setRecentDrawIds((prev) => {
        let next = [pickedId, ...prev.filter((id) => id !== pickedId)].slice(0, 50);
        // Once every card in the active pool has been seen in this cycle, reset the pool's cycle
        // history (keeping only the currently displayed card) so the next pass is a fresh shuffle
        if (pool.length > 1 && pool.every((e) => next.includes(e.id))) {
          const poolIds = new Set(pool.map((e) => e.id));
          next = [pickedId, ...next.filter((id) => !poolIds.has(id))].slice(0, 50);
        }
        if (user && isAuthorizedUser(user)) {
          saveLocalRecentDrawIds(user.uid, next);
          if (navigator.onLine) {
            void updateMemberRecentDraws(user.uid, next).catch(() => {
              // Non-blocking background draw history persistence
            });
          }
        }
        return next;
      });
    },
    [user]
  );

  const handleDrawRandom = useCallback(() => {
    const picked = pickRandomEntry(filteredPool, currentSpotlight?.id ?? null, recentDrawIds);
    if (picked) {
      setSpotlightId(picked.id);
      setDrawKey((k) => k + 1);
      recordDrawnEntry(picked.id, filteredPool);
    }
  }, [filteredPool, currentSpotlight, recentDrawIds, recordDrawnEntry]);

  const handlePerspectiveChange = useCallback(
    (next: 'all' | Perspective) => {
      setPerspectiveFilter(next);
      if (spotlightId) {
        const nextPool = entries.filter((e) => {
          if (next !== 'all' && e.perspective !== next) return false;
          if (
            spotlightTagFilter &&
            !e.tags.some((t) => t.toLowerCase() === spotlightTagFilter.toLowerCase())
          ) {
            return false;
          }
          return true;
        });
        const picked = pickRandomEntry(nextPool, spotlightId, recentDrawIds);
        setSpotlightId(picked?.id ?? null);
        setDrawKey((k) => k + 1);
        if (picked) {
          recordDrawnEntry(picked.id, nextPool);
        }
      }
    },
    [entries, spotlightId, spotlightTagFilter, recentDrawIds, recordDrawnEntry]
  );

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
    setSpotlightId(null);
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
      <div className="min-h-dvh warm-desk-light flex items-center justify-center bg-[#F5EFE4] text-[#6E6153] dark:bg-[#16120F] dark:text-[#B5A693]">
        <span className="font-display text-2xl font-medium">Lest We Forget</span>
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

  const syncAriaLabel = isSyncing
    ? 'Syncing vault'
    : pendingSyncCount > 0
    ? `${pendingSyncCount} waiting to sync`
    : `Synced (${user.email})`;

  const isStartingScreen = activeTab === 'reflect' && !currentSpotlight;

  const isFilterActive = perspectiveFilter !== 'all' || spotlightTagFilter !== null;

  return (
    <div className="relative min-h-dvh flex flex-col bg-[#F5EFE4] text-[#241D17] dark:bg-[#16120F] dark:text-[#EFE6D8] transition-colors">
      <StationeryBackdrop variant={isStartingScreen ? 'prominent' : 'subtle'} />

      {/* Minimalist Sticky Top Bar (All controls & filters housed cleanly outside <main>) */}
      <header className="sticky top-0 z-30 h-14 border-b border-[#D7CBB8]/75 bg-[#F5EFE4]/78 backdrop-blur-md dark:border-[#30271F]/75 dark:bg-[#16120F]/78">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-3 sm:gap-8 px-4 sm:px-6">
          {/* Zone 1: Engraved Serif Wordmark */}
          <button
            type="button"
            onClick={() => {
              setSpotlightId(null);
              setActiveTab('reflect');
              setFilterMenuOpen(false);
            }}
            className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-[#241D17] dark:text-[#EFE6D8] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#A65E22] rounded"
          >
            Lest We Forget
          </button>

          {/* Zone 2: Minimalist Icon Navigation (Desktop) */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-4 text-[#6E6153] dark:text-[#B5A693]"
          >
            <button
              type="button"
              onClick={() => setActiveTab('reflect')}
              aria-label="Reflect"
              title="Reflect"
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition hover:text-[#241D17] dark:hover:text-[#EFE6D8] ${
                activeTab === 'reflect'
                  ? 'text-[#A65E22] bg-[#A65E22]/10 dark:text-[#E29A50] dark:bg-[#E29A50]/15'
                  : ''
              }`}
            >
              <Sparkles className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setCollectionTagJump(null);
                setActiveTab('collection');
                setFilterMenuOpen(false);
              }}
              aria-label="All tags"
              title="All tags"
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition hover:text-[#241D17] dark:hover:text-[#EFE6D8] ${
                activeTab === 'collection'
                  ? 'text-[#A65E22] bg-[#A65E22]/10 dark:text-[#E29A50] dark:bg-[#E29A50]/15'
                  : ''
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('backup');
                setFilterMenuOpen(false);
              }}
              aria-label="Settings and backup"
              title="Settings and backup"
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition hover:text-[#241D17] dark:hover:text-[#EFE6D8] ${
                activeTab === 'backup'
                  ? 'text-[#A65E22] bg-[#A65E22]/10 dark:text-[#E29A50] dark:bg-[#E29A50]/15'
                  : ''
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </nav>

          {/* Zone 3: Header Utility Controls & Write Action */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
            {activeTab === 'reflect' && (
              <div ref={filterMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setFilterMenuOpen((prev) => !prev)}
                  aria-expanded={filterMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Filter note set"
                  title="Filter note set"
                  className={`flex min-h-[44px] min-w-[40px] sm:min-w-[44px] items-center justify-center rounded-xl transition hover:bg-[#EAE1D3]/80 dark:hover:bg-[#201A15] ${
                    isFilterActive
                      ? 'text-[#A65E22] dark:text-[#E29A50]'
                      : 'text-[#6E6153] dark:text-[#B5A693]'
                  }`}
                >
                  <ListFilter className="h-4 w-4" />
                </button>

                {filterMenuOpen && (
                  <div
                    role="menu"
                    aria-label="Note set filter"
                    className="absolute right-0 mt-2 w-48 rounded-2xl border border-[#D7CBB8] bg-[#FBF8F1] p-1.5 shadow-[0_14px_34px_rgba(36,29,23,0.14)] dark:border-[#3B3026] dark:bg-[#201A15] dark:shadow-[0_16px_38px_rgba(0,0,0,0.55)] z-50"
                  >
                    {(
                      [
                        { id: 'all', label: 'All', count: entries.length },
                        {
                          id: 'from_me',
                          label: prefs.meLabel,
                          count: entries.filter((e) => e.perspective === 'from_me').length,
                        },
                        {
                          id: 'from_her',
                          label: prefs.herLabel,
                          count: entries.filter((e) => e.perspective === 'from_her').length,
                        },
                      ] as const
                    ).map((option) => {
                      const active = perspectiveFilter === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          role="menuitemradio"
                          aria-checked={active}
                          onClick={() => {
                            handlePerspectiveChange(option.id);
                            setFilterMenuOpen(false);
                          }}
                          className={`flex min-h-[40px] w-full items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-left text-sm transition ${
                            active
                              ? 'bg-[#EAE1D3] font-medium text-[#241D17] dark:bg-[#332922] dark:text-[#EFE6D8]'
                              : 'text-[#6E6153] hover:bg-[#EAE1D3]/60 hover:text-[#241D17] dark:text-[#B5A693] dark:hover:bg-[#29211B] dark:hover:text-[#EFE6D8]'
                          }`}
                        >
                          <span className="truncate">{option.label}</span>
                          <span className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs font-mono-tabular opacity-60">
                              {option.count}
                            </span>
                            {active && (
                              <Check className="h-3.5 w-3.5 text-[#A65E22] dark:text-[#E29A50]" />
                            )}
                          </span>
                        </button>
                      );
                    })}

                    {spotlightTagFilter && (
                      <div className="mt-1 border-t border-[#D7CBB8]/70 pt-1 dark:border-[#3B3026]">
                        <button
                          type="button"
                          onClick={() => {
                            setSpotlightTagFilter(null);
                            setFilterMenuOpen(false);
                          }}
                          className="flex min-h-[38px] w-full items-center justify-between gap-2 rounded-xl px-3 py-1 text-xs text-[#A65E22] hover:bg-[#EAE1D3]/60 dark:text-[#E29A50] dark:hover:bg-[#29211B]"
                        >
                          <span className="truncate">#{spotlightTagFilter}</span>
                          <X className="h-3.5 w-3.5 shrink-0" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setActiveTab('backup');
                setFilterMenuOpen(false);
              }}
              aria-label={syncAriaLabel}
              title={syncAriaLabel}
              className="hidden sm:flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#6E6153] transition hover:bg-[#EAE1D3]/80 dark:text-[#B5A693] dark:hover:bg-[#201A15]"
            >
              <Cloud className="h-4 w-4 text-[#9A7B4F] dark:text-[#C29F6D]" />
              {pendingSyncCount > 0 && (
                <span className="ml-1 text-xs font-mono-tabular">{pendingSyncCount}</span>
              )}
            </button>

            {unseenPartnerTags.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setDismissedModalForSession(false);
                  setNewTagsModalOpen(true);
                  setFilterMenuOpen(false);
                }}
                aria-label={`${unseenPartnerTags.length} new ${
                  unseenPartnerTags.length === 1 ? 'tag' : 'tags'
                }`}
                title={`${unseenPartnerTags.length} new`}
                className="inline-flex min-h-[44px] min-w-[40px] items-center justify-center gap-1 rounded-xl px-1.5 text-xs font-mono-tabular font-medium text-[#A65E22] hover:bg-[#EAE1D3]/80 dark:text-[#E29A50] dark:hover:bg-[#201A15]"
              >
                <Sparkles className="h-4 w-4" />
                <span>{unseenPartnerTags.length}</span>
              </button>
            )}

            <div className="hidden md:block">
              <PWAInstallButton compact />
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={prefs.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={prefs.theme === 'dark' ? 'Light mode' : 'Dark mode'}
              className="hidden md:flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#241D17] transition hover:bg-[#EAE1D3]/80 dark:text-[#EFE6D8] dark:hover:bg-[#201A15] shrink-0"
            >
              {prefs.theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingEntry(null);
                setEditorOpen(true);
                setFilterMenuOpen(false);
              }}
              aria-label="Write tag"
              title="Write tag"
              className="hidden md:flex ml-0.5 min-h-[42px] min-w-[42px] items-center justify-center rounded-xl bg-[#A65E22] text-[#FBF8F1] shadow-xs transition hover:bg-[#8C4D19] dark:bg-[#C87A32] dark:hover:bg-[#D98B42] shrink-0"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 pt-5 pb-24 md:pb-12">
        {!isLoaded ? (
          <div className="py-20 text-center text-sm text-[#6E6153] dark:text-[#B5A693]">
            ...
          </div>
        ) : activeTab === 'reflect' ? (
          <ReflectView
            entries={entries}
            currentSpotlight={currentSpotlight}
            prefs={prefs}
            userEmail={user.email}
            perspectiveFilter={perspectiveFilter}
            selectedTag={spotlightTagFilter}
            drawKey={drawKey}
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
          />
        ) : activeTab === 'collection' ? (
          <CollectionView
            entries={entries}
            prefs={prefs}
            allTags={allTags}
            initialPerspectiveFilter={incomingPerspective ?? 'all'}
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

      {/* Minimalist Mobile Bottom Icon Bar */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#D7CBB8] bg-[#FBF8F1]/95 backdrop-blur-md pb-safe dark:border-[#30271F] dark:bg-[#1A1511]/95"
      >
        <div className="grid grid-cols-4 h-14 items-center">
          <button
            type="button"
            onClick={() => setActiveTab('reflect')}
            aria-label="Reflect"
            className={`flex items-center justify-center min-h-[44px] ${
              activeTab === 'reflect'
                ? 'text-[#A65E22] dark:text-[#E29A50]'
                : 'text-[#6E6153] dark:text-[#B5A693]'
            }`}
          >
            <Sparkles className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setCollectionTagJump(null);
              setActiveTab('collection');
            }}
            aria-label="All tags"
            className={`flex items-center justify-center min-h-[44px] ${
              activeTab === 'collection'
                ? 'text-[#A65E22] dark:text-[#E29A50]'
                : 'text-[#6E6153] dark:text-[#B5A693]'
            }`}
          >
            <LayoutGrid className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingEntry(null);
              setEditorOpen(true);
            }}
            aria-label="Write tag"
            className="flex items-center justify-center min-h-[44px] text-[#A65E22] dark:text-[#E29A50]"
          >
            <Plus className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            aria-label="Settings and backup"
            className={`flex items-center justify-center min-h-[44px] ${
              activeTab === 'backup'
                ? 'text-[#A65E22] dark:text-[#E29A50]'
                : 'text-[#6E6153] dark:text-[#B5A693]'
            }`}
          >
            <SlidersHorizontal className="h-5 w-5" />
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
