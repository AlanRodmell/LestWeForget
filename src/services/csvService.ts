import {
  MAX_ENTRY_LENGTH,
  type AppPreferences,
  type GratitudeEntry,
  type ParsedCsvRow,
  type Perspective,
  type TagStyle,
} from '../types';
import { sanitizeTags, todayIsoDate } from './idbStore';

function parseCsvMatrix(rawText: string): string[][] {
  const clean = rawText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const next = clean[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentField += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (ch === '\r' && next === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i += 1;
      } else if (ch === '\n' || ch === '\r') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += ch;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

function normalizePerspective(val: string | undefined): Perspective {
  const v = (val ?? '').trim().toLowerCase();
  if (
    v === 'from_her' ||
    v === 'from her' ||
    v === 'her' ||
    v === 'she' ||
    v.includes('she') ||
    v.includes('from_her') ||
    v.includes('about me')
  ) {
    return 'from_her';
  }
  return 'from_me';
}

function normalizeStyle(val: string | undefined, perspective: Perspective): TagStyle {
  const v = (val ?? '').trim().toLowerCase();
  if (v === 'kraft' || v === 'brown' || v === 'brown kraft') return 'kraft';
  if (v === 'white' || v === 'ivory' || v === 'cream') return 'white';
  return perspective === 'from_her' ? 'kraft' : 'white';
}

function normalizeDate(val: string | undefined): string {
  const v = (val ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  if (v.length > 0) {
    const parsed = new Date(v);
    if (!Number.isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  return todayIsoDate();
}

export function parseCsvToGratitudeRows(rawText: string): ParsedCsvRow[] {
  const matrix = parseCsvMatrix(rawText);
  if (matrix.length === 0) return [];

  const firstRowLower = matrix[0].map((c) => c.trim().toLowerCase());
  const headerKeywords = [
    'text',
    'note',
    'entry',
    'gratitude',
    'message',
    'content',
    'perspective',
    'type',
    'from',
    'author',
    'tags',
    'date',
  ];
  const hasHeader = firstRowLower.some((col) => headerKeywords.includes(col));

  let textIdx = 0;
  let perspectiveIdx = 1;
  let styleIdx = -1;
  let tagsIdx = 2;
  let dateIdx = 3;
  let favIdx = -1;
  let startRow = 0;

  if (hasHeader) {
    startRow = 1;
    const findCol = (names: string[]) => firstRowLower.findIndex((h) => names.includes(h));
    const foundText = findCol(['text', 'note', 'entry', 'gratitude', 'message', 'content', 'description']);
    const foundPersp = findCol(['perspective', 'type', 'from', 'author', 'direction']);
    const foundStyle = findCol(['tagstyle', 'style', 'paper', 'tag_style', 'color']);
    const foundTags = findCol(['tags', 'tag', 'labels', 'category', 'categories']);
    const foundDate = findCol(['date', 'entrydate', 'entry_date', 'createdat', 'when']);
    const foundFav = findCol(['favorite', 'isfavorite', 'is_favorite', 'starred']);

    textIdx = foundText >= 0 ? foundText : 0;
    perspectiveIdx = foundPersp;
    styleIdx = foundStyle;
    tagsIdx = foundTags;
    dateIdx = foundDate;
    favIdx = foundFav;
  }

  const parsed: ParsedCsvRow[] = [];
  for (let i = startRow; i < matrix.length; i++) {
    const row = matrix[i];
    const rawEntry = (row[textIdx] ?? '').trim();
    if (!rawEntry) {
      parsed.push({
        rowNumber: i + 1,
        text: '',
        wasTruncated: false,
        perspective: 'from_me',
        tagStyle: 'white',
        tags: [],
        entryDate: todayIsoDate(),
        isFavorite: false,
        error: 'Empty gratitude text',
      });
      continue;
    }

    const wasTruncated = rawEntry.length > MAX_ENTRY_LENGTH;
    const text = rawEntry.slice(0, MAX_ENTRY_LENGTH);
    const perspective = normalizePerspective(perspectiveIdx >= 0 ? row[perspectiveIdx] : undefined);
    const tagStyle = normalizeStyle(styleIdx >= 0 ? row[styleIdx] : undefined, perspective);
    const rawTags = tagsIdx >= 0 ? row[tagsIdx] ?? '' : '';
    const tags = sanitizeTags(rawTags.split(/[;|,]/));
    const entryDate = normalizeDate(dateIdx >= 0 ? row[dateIdx] : undefined);
    const favVal = favIdx >= 0 ? (row[favIdx] ?? '').trim().toLowerCase() : '';
    const isFavorite = favVal === 'true' || favVal === '1' || favVal === 'yes';

    parsed.push({
      rowNumber: i + 1,
      text,
      wasTruncated,
      perspective,
      tagStyle,
      tags,
      entryDate,
      isFavorite,
    });
  }

  return parsed;
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportEntriesToCsv(entries: GratitudeEntry[]): string {
  const header = ['text', 'perspective', 'tagStyle', 'tags', 'entryDate', 'isFavorite'];
  const lines = [header.join(',')];
  for (const e of entries) {
    lines.push(
      [
        csvEscape(e.text),
        csvEscape(e.perspective),
        csvEscape(e.tagStyle),
        csvEscape(e.tags.join('; ')),
        csvEscape(e.entryDate),
        csvEscape(e.isFavorite ? 'true' : 'false'),
      ].join(',')
    );
  }
  return `\uFEFF${lines.join('\r\n')}`;
}

export function exportVaultJson(entries: GratitudeEntry[], prefs: AppPreferences): string {
  return JSON.stringify(
    {
      app: 'Lest We Forget',
      exportedAt: new Date().toISOString(),
      preferences: prefs,
      entries,
    },
    null,
    2
  );
}

export function triggerFileDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadSampleCsvTemplate(): void {
  const sample = [
    'text,perspective,tagStyle,tags,entryDate,isFavorite',
    '"You always make me a cup of tea before I even realize I need a break.",from_me,white,"kindness; mornings",2026-10-14,true',
    '"Thank you for staying calm and holding my hand when everything felt overwhelming.",from_her,kraft,"support; hard-days",2026-10-21,true',
    '"How you still laugh at my terrible puns while cooking dinner together.",from_me,white,"laughter; home",2026-11-02,false',
    '"Leaving little handwritten gift tags inside my coat pocket before work trips.",from_her,kraft,"thoughtful; notes",2026-11-09,false',
  ].join('\r\n');
  triggerFileDownload(`\uFEFF${sample}`, 'lest-we-forget-sample.csv', 'text/csv;charset=utf-8;');
}
