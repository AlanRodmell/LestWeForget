import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  DEFAULT_PREFERENCES,
  MAX_ENTRY_LENGTH,
  MAX_LABEL_LENGTH,
  MAX_TAG_LENGTH,
  MAX_TAGS,
  normalizeLegacyLabels,
  SAFE_ID_REGEX,
  SHARED_VAULT_ID,
  type AppPreferences,
  type GratitudeEntry,
} from '../types';
import {
  applyCloudSnapshotDiff,
  getAllStoredEntries,
  hardDeleteEntry,
  sanitizeEntryText,
  sanitizeTags,
  todayIsoDate,
  upsertEntry,
} from './idbStore';

function timestampToMs(val: unknown, fallback: number): number {
  if (val instanceof Timestamp) {
    return val.toMillis();
  }
  if (typeof val === 'number') return val;
  return fallback;
}

export async function ensureSharedVault(uid: string, prefs: AppPreferences): Promise<AppPreferences | null> {
  if (!SAFE_ID_REGEX.test(uid)) return null;
  const vaultPath = `vaults/${SHARED_VAULT_ID}`;
  const vaultRef = doc(db, 'vaults', SHARED_VAULT_ID);

  let snap;
  try {
    snap = await getDoc(vaultRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, vaultPath);
  }

  if (!snap.exists()) {
    const payload = {
      id: SHARED_VAULT_ID,
      createdBy: uid,
      meLabel: prefs.meLabel.trim().slice(0, MAX_LABEL_LENGTH) || DEFAULT_PREFERENCES.meLabel,
      herLabel: prefs.herLabel.trim().slice(0, MAX_LABEL_LENGTH) || DEFAULT_PREFERENCES.herLabel,
      reminderEnabled: Boolean(prefs.reminderEnabled),
      reminderTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(prefs.reminderTime) ? prefs.reminderTime : '20:00',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(vaultRef, payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, vaultPath);
    }
    return null;
  }

  const remote = snap.data();
  return normalizeLegacyLabels({
    ...prefs,
    meLabel: typeof remote.meLabel === 'string' ? remote.meLabel : prefs.meLabel,
    herLabel: typeof remote.herLabel === 'string' ? remote.herLabel : prefs.herLabel,
    reminderEnabled: typeof remote.reminderEnabled === 'boolean' ? remote.reminderEnabled : prefs.reminderEnabled,
    reminderTime: typeof remote.reminderTime === 'string' ? remote.reminderTime : prefs.reminderTime,
  });
}

export async function syncPreferencesToCloud(prefs: AppPreferences): Promise<void> {
  const vaultPath = `vaults/${SHARED_VAULT_ID}`;
  const vaultRef = doc(db, 'vaults', SHARED_VAULT_ID);

  try {
    await updateDoc(vaultRef, {
      meLabel: prefs.meLabel.trim().slice(0, MAX_LABEL_LENGTH) || DEFAULT_PREFERENCES.meLabel,
      herLabel: prefs.herLabel.trim().slice(0, MAX_LABEL_LENGTH) || DEFAULT_PREFERENCES.herLabel,
      reminderEnabled: Boolean(prefs.reminderEnabled),
      reminderTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(prefs.reminderTime) ? prefs.reminderTime : '20:00',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, vaultPath);
  }
}

export async function pushEntryToCloud(uid: string, entry: GratitudeEntry): Promise<GratitudeEntry> {
  if (!SAFE_ID_REGEX.test(uid) || !SAFE_ID_REGEX.test(entry.id)) return entry;
  const entryPath = `vaults/${SHARED_VAULT_ID}/entries/${entry.id}`;
  const entryRef = doc(db, 'vaults', SHARED_VAULT_ID, 'entries', entry.id);

  if (entry.syncStatus === 'deleted') {
    if (entry.cloudCreated) {
      try {
        await deleteDoc(entryRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, entryPath);
      }
    }
    await hardDeleteEntry(entry.id);
    return entry;
  }

  const cleanText = sanitizeEntryText(entry.text);
  if (!cleanText) return entry;
  const cleanTags = sanitizeTags(entry.tags).slice(0, MAX_TAGS).map((t) => t.slice(0, MAX_TAG_LENGTH));
  const cleanDate = /^\d{4}-\d{2}-\d{2}$/.test(entry.entryDate) ? entry.entryDate : todayIsoDate();

  const isCreatedInSharedVault = Boolean(entry.cloudCreated && entry.authorUid);

  const safePerspective = entry.perspective === 'from_her' ? 'from_her' : 'from_me';
  const safeTagStyle = safePerspective === 'from_her' ? 'kraft' : 'white';

  if (!isCreatedInSharedVault) {
    const createPayload = {
      id: entry.id,
      vaultId: SHARED_VAULT_ID,
      authorUid: uid,
      text: cleanText.slice(0, MAX_ENTRY_LENGTH),
      perspective: safePerspective,
      tagStyle: safeTagStyle,
      tags: cleanTags,
      entryDate: cleanDate,
      isFavorite: Boolean(entry.isFavorite),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(entryRef, createPayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, entryPath);
    }
  } else {
    const updatePayload = {
      text: cleanText.slice(0, MAX_ENTRY_LENGTH),
      perspective: safePerspective,
      tagStyle: safeTagStyle,
      tags: cleanTags,
      entryDate: cleanDate,
      isFavorite: Boolean(entry.isFavorite),
      updatedAt: serverTimestamp(),
    };
    try {
      await updateDoc(entryRef, updatePayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, entryPath);
    }
  }

  const synced: GratitudeEntry = {
    ...entry,
    text: cleanText,
    tags: cleanTags,
    entryDate: cleanDate,
    syncStatus: 'synced',
    cloudCreated: true,
    authorUid: entry.authorUid ?? uid,
  };
  await upsertEntry(synced);
  return synced;
}

export async function pushAllPendingEntries(uid: string): Promise<number> {
  const stored = await getAllStoredEntries();
  const pending = stored.filter(
    (e) => e.syncStatus === 'pending' || e.syncStatus === 'deleted' || !e.authorUid
  );
  let count = 0;
  for (const item of pending) {
    await pushEntryToCloud(uid, item);
    count += 1;
  }
  return count;
}

export function subscribeToCloudEntries(
  onMerged: (entries: GratitudeEntry[]) => void,
  onSyncError?: (err: Error) => void
): Unsubscribe {
  const entriesPath = `vaults/${SHARED_VAULT_ID}/entries`;
  const entriesQuery = query(
    collection(db, 'vaults', SHARED_VAULT_ID, 'entries'),
    where('vaultId', '==', SHARED_VAULT_ID)
  );

  return onSnapshot(
    entriesQuery,
    async (snapshot) => {
      try {
        const localAll = await getAllStoredEntries();
        const localMap = new Map<string, GratitudeEntry>(localAll.map((e) => [e.id, e]));
        const remoteIds = new Set<string>();

        const toUpsert: GratitudeEntry[] = [];
        const idsToDelete: string[] = [];

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          const id = typeof data.id === 'string' ? data.id : docSnap.id;
          remoteIds.add(id);

          const existingLocal = localMap.get(id);
          if (existingLocal && (existingLocal.syncStatus === 'pending' || existingLocal.syncStatus === 'deleted')) {
            continue;
          }

          const remotePerspective = data.perspective === 'from_her' ? 'from_her' : 'from_me';
          const remoteEntry: GratitudeEntry = {
            id,
            text: typeof data.text === 'string' ? data.text : '',
            perspective: remotePerspective,
            tagStyle: remotePerspective === 'from_her' ? 'kraft' : 'white',
            tags: Array.isArray(data.tags) ? data.tags.filter((t): t is string => typeof t === 'string') : [],
            entryDate: typeof data.entryDate === 'string' ? data.entryDate : todayIsoDate(),
            isFavorite: Boolean(data.isFavorite),
            createdAtMs: timestampToMs(data.createdAt, existingLocal?.createdAtMs ?? Date.now()),
            updatedAtMs: timestampToMs(data.updatedAt, existingLocal?.updatedAtMs ?? Date.now()),
            syncStatus: 'synced',
            cloudCreated: true,
            authorUid: typeof data.authorUid === 'string' ? data.authorUid : undefined,
          };

          const isUnchanged =
            existingLocal &&
            existingLocal.syncStatus === 'synced' &&
            existingLocal.cloudCreated === true &&
            existingLocal.updatedAtMs === remoteEntry.updatedAtMs &&
            existingLocal.isFavorite === remoteEntry.isFavorite &&
            existingLocal.text === remoteEntry.text &&
            existingLocal.perspective === remoteEntry.perspective;

          if (!isUnchanged) {
            toUpsert.push(remoteEntry);
          }
        }

        for (const localEntry of localAll) {
          if (
            localEntry.cloudCreated &&
            localEntry.authorUid &&
            localEntry.syncStatus === 'synced' &&
            !remoteIds.has(localEntry.id)
          ) {
            idsToDelete.push(localEntry.id);
          }
        }

        const activeEntries = await applyCloudSnapshotDiff(toUpsert, idsToDelete);
        onMerged(activeEntries);
      } catch (err) {
        if (onSyncError && err instanceof Error) {
          onSyncError(err);
        }
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, entriesPath);
      } catch (wrapped) {
        if (onSyncError && wrapped instanceof Error) {
          onSyncError(wrapped);
        }
      }
    }
  );
}

const MAX_RECENT_DRAW_IDS = 50;

function localLastSeenKey(uid: string): string {
  return `lest_we_forget_last_seen_${uid}`;
}

function localRecentDrawsKey(uid: string): string {
  return `lest_we_forget_recent_draws_${uid}`;
}

function sanitizeRecentDrawIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && SAFE_ID_REGEX.test(item) && item.length <= 128 && !seen.has(item)) {
      seen.add(item);
      cleaned.push(item);
      if (cleaned.length >= MAX_RECENT_DRAW_IDS) break;
    }
  }
  return cleaned;
}

export function getLocalRecentDrawIds(uid: string): string[] {
  if (!SAFE_ID_REGEX.test(uid)) return [];
  try {
    const raw = localStorage.getItem(localRecentDrawsKey(uid));
    if (raw) {
      return sanitizeRecentDrawIds(JSON.parse(raw));
    }
  } catch {
    // Ignore storage access errors
  }
  return [];
}

export function saveLocalRecentDrawIds(uid: string, ids: string[]): string[] {
  const clean = sanitizeRecentDrawIds(ids);
  if (!SAFE_ID_REGEX.test(uid)) return clean;
  try {
    localStorage.setItem(localRecentDrawsKey(uid), JSON.stringify(clean));
  } catch {
    // Ignore storage access errors
  }
  return clean;
}

export interface MemberReadStateData {
  lastSeenMs: number;
  recentDrawIds: string[];
}

export async function getMemberReadState(uid: string): Promise<MemberReadStateData> {
  if (!SAFE_ID_REGEX.test(uid)) {
    return { lastSeenMs: 0, recentDrawIds: [] };
  }
  let localMs = 0;
  try {
    const raw = localStorage.getItem(localLastSeenKey(uid));
    if (raw) {
      const parsed = Number(raw);
      if (!Number.isNaN(parsed) && parsed >= 0) localMs = parsed;
    }
  } catch {
    // Ignore storage access errors
  }
  const localDraws = getLocalRecentDrawIds(uid);

  const memberPath = `vaults/${SHARED_VAULT_ID}/members/${uid}`;
  const memberRef = doc(db, 'vaults', SHARED_VAULT_ID, 'members', uid);
  try {
    const snap = await getDoc(memberRef);
    if (snap.exists()) {
      const data = snap.data();
      const remoteMs = typeof data.lastSeenMs === 'number' && data.lastSeenMs >= 0 ? data.lastSeenMs : 0;
      const mergedMs = Math.max(localMs, remoteMs);
      const remoteDraws = sanitizeRecentDrawIds(data.recentDrawIds);
      const mergedDraws = sanitizeRecentDrawIds([...localDraws, ...remoteDraws]);

      try {
        localStorage.setItem(localLastSeenKey(uid), String(mergedMs));
      } catch {
        // Ignore storage access errors
      }
      saveLocalRecentDrawIds(uid, mergedDraws);
      return { lastSeenMs: mergedMs, recentDrawIds: mergedDraws };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, memberPath);
  }

  return { lastSeenMs: localMs, recentDrawIds: localDraws };
}

export async function getMemberLastSeenMs(uid: string): Promise<number> {
  const state = await getMemberReadState(uid);
  return state.lastSeenMs;
}

export async function updateMemberLastSeenMs(uid: string, lastSeenMs: number): Promise<void> {
  if (!SAFE_ID_REGEX.test(uid)) return;
  const safeMs = Math.max(0, Math.floor(lastSeenMs));
  try {
    localStorage.setItem(localLastSeenKey(uid), String(safeMs));
  } catch {
    // Ignore storage access errors
  }

  const memberPath = `vaults/${SHARED_VAULT_ID}/members/${uid}`;
  const memberRef = doc(db, 'vaults', SHARED_VAULT_ID, 'members', uid);

  let snap;
  try {
    snap = await getDoc(memberRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, memberPath);
  }

  if (!snap.exists()) {
    try {
      await setDoc(memberRef, {
        uid,
        vaultId: SHARED_VAULT_ID,
        lastSeenMs: safeMs,
        recentDrawIds: getLocalRecentDrawIds(uid),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, memberPath);
    }
  } else {
    try {
      await updateDoc(memberRef, {
        lastSeenMs: safeMs,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, memberPath);
    }
  }
}

export async function updateMemberRecentDraws(uid: string, recentDrawIds: string[]): Promise<void> {
  if (!SAFE_ID_REGEX.test(uid)) return;
  const cleanIds = saveLocalRecentDrawIds(uid, recentDrawIds);

  const memberPath = `vaults/${SHARED_VAULT_ID}/members/${uid}`;
  const memberRef = doc(db, 'vaults', SHARED_VAULT_ID, 'members', uid);

  let snap;
  try {
    snap = await getDoc(memberRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, memberPath);
  }

  if (!snap.exists()) {
    let localMs = 0;
    try {
      const raw = localStorage.getItem(localLastSeenKey(uid));
      if (raw) {
        const parsed = Number(raw);
        if (!Number.isNaN(parsed) && parsed >= 0) localMs = parsed;
      }
    } catch {
      // Ignore storage access errors
    }
    try {
      await setDoc(memberRef, {
        uid,
        vaultId: SHARED_VAULT_ID,
        lastSeenMs: localMs,
        recentDrawIds: cleanIds,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, memberPath);
    }
  } else {
    try {
      await updateDoc(memberRef, {
        recentDrawIds: cleanIds,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, memberPath);
    }
  }
}
