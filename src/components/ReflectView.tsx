import React, { useMemo } from 'react';
import { RefreshCw, Plus, Upload, Heart } from 'lucide-react';
import type { AppPreferences, GratitudeEntry, Perspective } from '../types';
import { GiftTagCard } from './GiftTagCard';

interface ReflectViewProps {
  entries: GratitudeEntry[];
  currentSpotlight: GratitudeEntry | null;
  prefs: AppPreferences;
  perspectiveFilter: 'all' | Perspective;
  selectedTag: string | null;
  drawKey: number;
  onPerspectiveChange: (next: 'all' | Perspective) => void;
  onClearTag: () => void;
  onDrawRandom: () => void;
  onToggleFavorite: (entry: GratitudeEntry) => void;
  onEdit: (entry: GratitudeEntry) => void;
  onDelete: (id: string) => void;
  onTagClick: (tag: string) => void;
  onOpenNew: () => void;
  onGoToImport: () => void;
}

export const ReflectView: React.FC<ReflectViewProps> = ({
  entries,
  currentSpotlight,
  prefs,
  perspectiveFilter,
  selectedTag,
  drawKey,
  onPerspectiveChange,
  onClearTag,
  onDrawRandom,
  onToggleFavorite,
  onEdit,
  onDelete,
  onTagClick,
  onOpenNew,
  onGoToImport,
}) => {
  const counts = useMemo(() => {
    let fromMe = 0;
    let fromHer = 0;
    for (const e of entries) {
      if (e.perspective === 'from_her') fromHer += 1;
      else fromMe += 1;
    }
    return { total: entries.length, fromMe, fromHer };
  }, [entries]);

  const matchingCount = useMemo(() => {
    return entries.filter((e) => {
      if (perspectiveFilter !== 'all' && e.perspective !== perspectiveFilter) return false;
      if (selectedTag && !e.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase())) {
        return false;
      }
      return true;
    }).length;
  }, [entries, perspectiveFilter, selectedTag]);

  if (entries.length === 0) {
    return (
      <section className="mx-auto max-w-xl py-10 sm:py-16 text-center px-2">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#DDD4C7] bg-[#FAF8F4] text-[#9C4A3B] dark:border-[#3A342E] dark:bg-[#231F1B] dark:text-[#DF8A79]">
          <Heart className="h-7 w-7" />
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-[#221F1B] dark:text-[#F2ECE4] text-balance">
          A quiet box for the things you never want to forget
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[#6B6257] dark:text-[#AEA498]">
          Record moments you are grateful for about her, and the notes she shared about you.
          When days feel heavy, draw a tag at random to remember why you are thankful.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onOpenNew}
            className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#3E5C4E] px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#324B3F] dark:bg-[#4E7462] dark:hover:bg-[#5E8874]"
          >
            <Plus className="h-4 w-4" />
            <span>Write Your First Gift Tag</span>
          </button>
          <button
            type="button"
            onClick={onGoToImport}
            className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-[#DDD4C7] bg-[#FAF8F4] px-6 py-3 text-sm font-medium text-[#221F1B] transition hover:bg-[#EFE9E0] dark:border-[#3A342E] dark:bg-[#231F1B] dark:text-[#F2ECE4] dark:hover:bg-[#2E2924]"
          >
            <Upload className="h-4 w-4" />
            <span>Import from CSV</span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl space-y-5 pb-6">
      {/* Perspective Segmented Control */}
      <div className="flex flex-col items-center gap-3">
        <div
          role="tablist"
          aria-label="Filter gratitude perspective"
          className="inline-flex flex-wrap items-center justify-center gap-1 rounded-xl border border-[#DDD4C7] bg-[#EFE9E0]/70 p-1 dark:border-[#342E28] dark:bg-[#1E1B18]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={perspectiveFilter === 'all'}
            onClick={() => onPerspectiveChange('all')}
            className={`min-h-[40px] rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-medium transition whitespace-nowrap shrink-0 ${
              perspectiveFilter === 'all'
                ? 'bg-[#FAF8F4] text-[#221F1B] shadow-xs dark:bg-[#2E2924] dark:text-[#F2ECE4]'
                : 'text-[#6B6257] hover:text-[#221F1B] dark:text-[#AEA498] dark:hover:text-[#F2ECE4]'
            }`}
          >
            All ({counts.total})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={perspectiveFilter === 'from_me'}
            onClick={() => onPerspectiveChange('from_me')}
            className={`min-h-[40px] rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-medium transition whitespace-nowrap shrink-0 ${
              perspectiveFilter === 'from_me'
                ? 'bg-[#FAF8F4] text-[#221F1B] shadow-xs dark:bg-[#2E2924] dark:text-[#F2ECE4]'
                : 'text-[#6B6257] hover:text-[#221F1B] dark:text-[#AEA498] dark:hover:text-[#F2ECE4]'
            }`}
          >
            From Me ({counts.fromMe})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={perspectiveFilter === 'from_her'}
            onClick={() => onPerspectiveChange('from_her')}
            className={`min-h-[40px] rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-medium transition whitespace-nowrap shrink-0 ${
              perspectiveFilter === 'from_her'
                ? 'bg-[#FAF8F4] text-[#221F1B] shadow-xs dark:bg-[#2E2924] dark:text-[#F2ECE4]'
                : 'text-[#6B6257] hover:text-[#221F1B] dark:text-[#AEA498] dark:hover:text-[#F2ECE4]'
            }`}
          >
            From Her ({counts.fromHer})
          </button>
        </div>

        {selectedTag && (
          <div className="flex items-center gap-2 text-xs text-[#6B6257] dark:text-[#AEA498]">
            <span>Filtering by #{selectedTag}</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={onClearTag}
              className="font-medium text-[#3E5C4E] hover:underline dark:text-[#86B39D]"
            >
              Clear tag
            </button>
          </div>
        )}
      </div>

      {/* Spotlight Gift Tag */}
      {currentSpotlight ? (
        <div
          key={`${currentSpotlight.id}-${drawKey}`}
          className="animate-[fadeSlide_180ms_cubic-bezier(0.16,1,0.3,1)]"
        >
          <GiftTagCard
            entry={currentSpotlight}
            prefs={prefs}
            spotlight
            onToggleFavorite={onToggleFavorite}
            onEdit={onEdit}
            onDelete={onDelete}
            onTagClick={onTagClick}
          />
        </div>
      ) : (
        <div className="mx-auto max-w-md rounded-2xl border border-[#DDD4C7] bg-[#FAF8F4] p-8 text-center dark:border-[#3A342E] dark:bg-[#1E1B18]">
          <p className="font-display text-lg text-[#221F1B] dark:text-[#F2ECE4]">
            No gift tags match this filter yet
          </p>
          <p className="mt-2 text-sm text-[#6B6257] dark:text-[#AEA498]">
            Try switching perspectives or clearing the tag filter.
          </p>
          <button
            type="button"
            onClick={() => {
              onPerspectiveChange('all');
              onClearTag();
            }}
            className="mt-5 min-h-[44px] rounded-xl border border-[#DDD4C7] px-4 py-2 text-sm font-medium text-[#221F1B] hover:bg-[#EFE9E0] dark:border-[#3A342E] dark:text-[#F2ECE4] dark:hover:bg-[#2E2924]"
          >
            Show all entries
          </button>
        </div>
      )}

      {/* Primary Focal CTA: Be Grateful / Help me Be Grateful */}
      <div className="flex flex-col items-center gap-2.5 pt-1">
        <button
          type="button"
          onClick={onDrawRandom}
          disabled={matchingCount === 0}
          className="inline-flex min-h-[52px] w-full max-w-xs items-center justify-center gap-2.5 rounded-2xl bg-[#3E5C4E] px-6 py-3.5 text-base font-medium text-white shadow-md transition active:scale-[0.98] hover:bg-[#324B3F] disabled:opacity-45 dark:bg-[#4E7462] dark:hover:bg-[#5E8874]"
        >
          <RefreshCw className="h-4 w-4 shrink-0" />
          <span>Help Me Be Grateful</span>
        </button>
        <p className="text-xs text-[#6B6257] dark:text-[#AEA498] font-mono-tabular">
          Drawing at random from {matchingCount} {matchingCount === 1 ? 'tag' : 'tags'}
        </p>
      </div>
    </section>
  );
};
