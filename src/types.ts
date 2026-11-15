export type Perspective = 'from_me' | 'from_her';
export type TagStyle = 'white' | 'kraft';
export type SyncStatus = 'pending' | 'synced' | 'deleted';
export type ThemeMode = 'light' | 'dark';

export const SHARED_VAULT_ID = 'couple_vault';

export const ALLOWED_EMAILS: readonly string[] = [
  'alan.rodmell@gmail.com',
  'jlmclaren84@gmail.com',
];

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ALLOWED_EMAILS.includes(email.trim().toLowerCase());
}

export function getIncomingPerspectiveForEmail(
  email: string | null | undefined
): Perspective | null {
  const lower = (email ?? '').trim().toLowerCase();
  if (lower === 'alan.rodmell@gmail.com') return 'from_her';
  if (lower === 'jlmclaren84@gmail.com') return 'from_me';
  return null;
}

export function getReflectLeadInPrompt(
  userEmail: string | null | undefined,
  cardPerspective: Perspective
): string {
  const lower = (userEmail ?? '').trim().toLowerCase();
  if (lower === 'jlmclaren84@gmail.com') {
    return cardPerspective === 'from_me'
      ? 'Alan is grateful for you because…'
      : 'Be grateful for Alan because…';
  }
  return cardPerspective === 'from_her'
    ? 'Jen is grateful for you because…'
    : 'Be grateful for Jen because…';
}

export const MAX_ENTRY_LENGTH = 500;
export const MAX_TAGS = 8;
export const MAX_TAG_LENGTH = 24;
export const MAX_LABEL_LENGTH = 48;
export const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

export interface GratitudeEntry {
  id: string;
  text: string;
  perspective: Perspective;
  tagStyle: TagStyle;
  tags: string[];
  entryDate: string; // YYYY-MM-DD
  isFavorite: boolean;
  createdAtMs: number;
  updatedAtMs: number;
  syncStatus: SyncStatus;
  cloudCreated?: boolean;
  authorUid?: string;
}

export interface AppPreferences {
  meLabel: string;
  herLabel: string;
  reminderEnabled: boolean;
  reminderTime: string; // HH:mm
  lastNotifiedDate: string; // YYYY-MM-DD or ''
  theme: ThemeMode;
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  meLabel: 'From Him',
  herLabel: 'From Her',
  reminderEnabled: false,
  reminderTime: '20:00',
  lastNotifiedDate: '',
  theme: 'light',
};

const LEGACY_ME_DEFAULTS = new Set([
  "things i'm grateful for about her",
  'from me',
]);
const LEGACY_HER_DEFAULTS = new Set([
  "things she's grateful for about me",
]);

export function normalizeLegacyLabels(prefs: AppPreferences): AppPreferences {
  const meLower = prefs.meLabel.trim().toLowerCase();
  const herLower = prefs.herLabel.trim().toLowerCase();
  return {
    ...prefs,
    meLabel:
      !meLower || LEGACY_ME_DEFAULTS.has(meLower)
        ? DEFAULT_PREFERENCES.meLabel
        : prefs.meLabel,
    herLabel:
      !herLower || LEGACY_HER_DEFAULTS.has(herLower)
        ? DEFAULT_PREFERENCES.herLabel
        : prefs.herLabel,
  };
}

export interface ParsedCsvRow {
  rowNumber: number;
  text: string;
  wasTruncated: boolean;
  perspective: Perspective;
  tagStyle: TagStyle;
  tags: string[];
  entryDate: string;
  isFavorite: boolean;
  error?: string;
}
