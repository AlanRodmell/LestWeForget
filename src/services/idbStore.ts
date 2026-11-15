import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import {
  DEFAULT_PREFERENCES,
  MAX_ENTRY_LENGTH,
  MAX_LABEL_LENGTH,
  MAX_TAG_LENGTH,
  MAX_TAGS,
  normalizeLegacyLabels,
  SAFE_ID_REGEX,
  type AppPreferences,
  type GratitudeEntry,
} from '../types';

interface KeptTagsDB extends DBSchema {
  entries: {
    key: string;
    value: GratitudeEntry;
    indexes: {
      'by-perspective': string;
      'by-date': string;
      'by-sync': string;
      'by-updated': number;
    };
  };
  preferences: {
    key: string;
    value: { key: string; data: AppPreferences };
  };
}

const DB_NAME = 'kept_tags_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<KeptTagsDB>> | null = null;

function getDB(): Promise<IDBPDatabase<KeptTagsDB>> {
  if (!dbPromise) {
    dbPromise = openDB<KeptTagsDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('entries')) {
          const store = db.createObjectStore('entries', { keyPath: 'id' });
          store.createIndex('by-perspective', 'perspective');
          store.createIndex('by-date', 'entryDate');
          store.createIndex('by-sync', 'syncStatus');
          store.createIndex('by-updated', 'updatedAtMs');
        }
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export function generateSafeId(): string {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/[^a-zA-Z0-9_-]/g, '')
      : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const candidate = `tag_${randomPart}`.slice(0, 64);
  return SAFE_ID_REGEX.test(candidate) ? candidate : `tag_${Date.now()}`;
}

export function todayIsoDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function sanitizeEntryText(raw: string): string {
  return raw.trim().slice(0, MAX_ENTRY_LENGTH);
}

export function sanitizeTags(rawTags: string[]): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of rawTags) {
    const tag = raw.trim().replace(/^#+/, '').slice(0, MAX_TAG_LENGTH);
    if (tag.length > 0 && !seen.has(tag.toLowerCase())) {
      seen.add(tag.toLowerCase());
      cleaned.push(tag);
      if (cleaned.length >= MAX_TAGS) break;
    }
  }
  return cleaned;
}

export function sanitizeEntry(entry: GratitudeEntry): GratitudeEntry {
  const safeId = SAFE_ID_REGEX.test(entry.id) ? entry.id.slice(0, 128) : generateSafeId();
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(entry.entryDate) ? entry.entryDate : todayIsoDate();
  const safePerspective = entry.perspective === 'from_her' ? 'from_her' : 'from_me';
  return {
    ...entry,
    id: safeId,
    text: sanitizeEntryText(entry.text),
    perspective: safePerspective,
    tagStyle: safePerspective === 'from_her' ? 'kraft' : 'white',
    tags: sanitizeTags(Array.isArray(entry.tags) ? entry.tags : []),
    entryDate: safeDate,
    isFavorite: Boolean(entry.isFavorite),
  };
}

export async function getAllStoredEntries(): Promise<GratitudeEntry[]> {
  const db = await getDB();
  const all = await db.getAll('entries');
  return all.sort((a, b) => b.createdAtMs - a.createdAtMs);
}

export async function getActiveEntries(): Promise<GratitudeEntry[]> {
  const all = await getAllStoredEntries();
  return all.filter((e) => e.syncStatus !== 'deleted');
}

export async function upsertEntry(entry: GratitudeEntry): Promise<GratitudeEntry> {
  const db = await getDB();
  const clean = sanitizeEntry(entry);
  await db.put('entries', clean);
  return clean;
}

export async function upsertEntriesBulk(entries: GratitudeEntry[]): Promise<GratitudeEntry[]> {
  const db = await getDB();
  const tx = db.transaction('entries', 'readwrite');
  const cleaned: GratitudeEntry[] = [];
  for (const entry of entries) {
    const clean = sanitizeEntry(entry);
    cleaned.push(clean);
    await tx.store.put(clean);
  }
  await tx.done;
  return cleaned;
}

export async function markEntryDeleted(id: string): Promise<void> {
  const db = await getDB();
  const existing = await db.get('entries', id);
  if (!existing) return;
  if (!existing.cloudCreated) {
    await db.delete('entries', id);
  } else {
    await db.put('entries', {
      ...existing,
      syncStatus: 'deleted',
      updatedAtMs: Date.now(),
    });
  }
}

export async function hardDeleteEntry(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('entries', id);
}

export async function getPreferences(): Promise<AppPreferences> {
  const db = await getDB();
  const record = await db.get('preferences', 'app_prefs');
  let localTheme: 'light' | 'dark' = DEFAULT_PREFERENCES.theme;
  try {
    const storedTheme = localStorage.getItem('kept_tags_theme');
    if (storedTheme === 'dark' || storedTheme === 'light') {
      localTheme = storedTheme;
    } else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      localTheme = 'dark';
    }
  } catch {
    // Ignore storage errors
  }

  if (!record) {
    return { ...DEFAULT_PREFERENCES, theme: localTheme };
  }
  return normalizeLegacyLabels({
    ...DEFAULT_PREFERENCES,
    ...record.data,
    theme: localTheme,
  });
}

export async function savePreferences(prefs: AppPreferences): Promise<AppPreferences> {
  const db = await getDB();
  const normalized = normalizeLegacyLabels(prefs);
  const sanitized: AppPreferences = {
    ...normalized,
    meLabel: (normalized.meLabel.trim() || DEFAULT_PREFERENCES.meLabel).slice(0, MAX_LABEL_LENGTH),
    herLabel: (normalized.herLabel.trim() || DEFAULT_PREFERENCES.herLabel).slice(0, MAX_LABEL_LENGTH),
    reminderTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(normalized.reminderTime)
      ? normalized.reminderTime
      : DEFAULT_PREFERENCES.reminderTime,
  };
  await db.put('preferences', { key: 'app_prefs', data: sanitized });
  try {
    localStorage.setItem('kept_tags_theme', sanitized.theme);
  } catch {
    // Ignore storage errors
  }
  return sanitized;
}
