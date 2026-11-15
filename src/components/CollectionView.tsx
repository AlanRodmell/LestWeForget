import React, { useMemo, useState } from 'react';
import { Heart, Plus, Search, X } from 'lucide-react';
import type { AppPreferences, GratitudeEntry, Perspective, TagStyle } from '../types';
import { GiftTagCard } from './GiftTagCard';

interface CollectionViewProps {
  entries: GratitudeEntry[];
  prefs: AppPreferences;
  allTags: string[];
  initialTagFilter: string | null;
  onToggleFavorite: (entry: GratitudeEntry) => void;
  onEdit: (entry: GratitudeEntry) => void;
  onDelete: (id: string) => void;
  onOpenNew: () => void;
}

export const CollectionView: React.FC<CollectionViewProps> = ({
  entries,
  prefs,
  allTags,
  initialTagFilter,
  onToggleFavorite,
  onEdit,
  onDelete,
  onOpenNew,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [perspectiveFilter, setPerspectiveFilter] = useState<'all' | Perspective>('all');
  const [paperFilter, setPaperFilter] = useState<'all' | TagStyle>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(initialTagFilter);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entries.filter((entry) => {
      if (perspectiveFilter !== 'all' && entry.perspective !== perspectiveFilter) return false;
      if (paperFilter !== 'all' && entry.tagStyle !== paperFilter) return false;
      if (favoritesOnly && !entry.isFavorite) return false;
      if (activeTag && !entry.tags.some((t) => t.toLowerCase() === activeTag.toLowerCase())) {
        return false;
      }
      if (q) {
        const inText = entry.text.toLowerCase().includes(q);
        const inTags = entry.tags.some((t) => t.toLowerCase().includes(q));
        if (!inText && !inTags) return false;
      }
      return true;
    });
  }, [entries, searchQuery, perspectiveFilter, paperFilter, favoritesOnly, activeTag]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    perspectiveFilter !== 'all' ||
    paperFilter !== 'all' ||
    favoritesOnly ||
    activeTag !== null;

  const resetFilters = () => {
    setSearchQuery('');
    setPerspectiveFilter('all');
    setPaperFilter('all');
    setFavoritesOnly(false);
    setActiveTag(null);
  };

  return (
    <section className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-[#221F1B] dark:text-[#F2ECE4]">
            All Gift Tags
          </h1>
          <p className="mt-1 text-sm text-[#6B6257] dark:text-[#AEA498] font-mono-tabular">
            Showing {filteredEntries.length} of {entries.length}{' '}
            {entries.length === 1 ? 'tag' : 'tags'}
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B6257] dark:text-[#AEA498]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes or tags..."
            aria-label="Search gratitude notes"
            className="min-h-[44px] w-full rounded-xl border border-[#DDD4C7] bg-[#FAF8F4] pl-10 pr-4 text-sm text-[#221F1B] placeholder:text-[#9A9084] focus:border-[#3E5C4E] focus:outline-none dark:border-[#3A342E] dark:bg-[#1E1B18] dark:text-[#F2ECE4] dark:placeholder:text-[#6E655C] dark:focus:border-[#78A58F]"
          />
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="inline-flex items-center rounded-xl border border-[#DDD4C7] bg-[#EFE9E0]/70 p-1 dark:border-[#342E28] dark:bg-[#1E1B18]">
          {(['all', 'from_me', 'from_her'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPerspectiveFilter(p)}
              className={`min-h-[38px] rounded-lg px-3 py-1 text-xs font-medium transition whitespace-nowrap shrink-0 ${
                perspectiveFilter === p
                  ? 'bg-[#FAF8F4] text-[#221F1B] shadow-xs dark:bg-[#2E2924] dark:text-[#F2ECE4]'
                  : 'text-[#6B6257] hover:text-[#221F1B] dark:text-[#AEA498] dark:hover:text-[#F2ECE4]'
              }`}
            >
              {p === 'all' ? 'All' : p === 'from_me' ? 'From Me' : 'From Her'}
            </button>
          ))}
        </div>

        <div className="inline-flex items-center rounded-xl border border-[#DDD4C7] bg-[#EFE9E0]/70 p-1 dark:border-[#342E28] dark:bg-[#1E1B18]">
          {(['all', 'white', 'kraft'] as const).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => setPaperFilter(style)}
              className={`min-h-[38px] rounded-lg px-3 py-1 text-xs font-medium transition whitespace-nowrap shrink-0 ${
                paperFilter === style
                  ? 'bg-[#FAF8F4] text-[#221F1B] shadow-xs dark:bg-[#2E2924] dark:text-[#F2ECE4]'
                  : 'text-[#6B6257] hover:text-[#221F1B] dark:text-[#AEA498] dark:hover:text-[#F2ECE4]'
              }`}
            >
              {style === 'all' ? 'All Paper' : style === 'white' ? 'White' : 'Kraft'}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setFavoritesOnly((prev) => !prev)}
          aria-pressed={favoritesOnly}
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-medium transition whitespace-nowrap shrink-0 ${
            favoritesOnly
              ? 'border-[#9C4A3B] bg-[#9C4A3B]/10 text-[#9C4A3B] dark:border-[#DF8A79] dark:bg-[#DF8A79]/15 dark:text-[#DF8A79]'
              : 'border-[#DDD4C7] bg-[#FAF8F4] text-[#6B6257] hover:text-[#221F1B] dark:border-[#3A342E] dark:bg-[#1E1B18] dark:text-[#AEA498] dark:hover:text-[#F2ECE4]'
          }`}
        >
          <Heart className="h-3.5 w-3.5" fill={favoritesOnly ? 'currentColor' : 'none'} />
          <span>Cherished</span>
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex min-h-[44px] items-center gap-1 px-2.5 text-xs font-medium text-[#3E5C4E] hover:underline dark:text-[#86B39D]"
          >
            <X className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Personal Tag Filter Row */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#6B6257] dark:text-[#AEA498]">Tags:</span>
          {allTags.map((tag) => {
            const selected = activeTag?.toLowerCase() === tag.toLowerCase();
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(selected ? null : tag)}
                className={`min-h-[34px] rounded-lg px-2.5 py-1 transition whitespace-nowrap ${
                  selected
                    ? 'bg-[#3E5C4E] text-white dark:bg-[#4E7462]'
                    : 'text-[#5C544A] hover:bg-[#EFE9E0] dark:text-[#C7BEB2] dark:hover:bg-[#231F1B]'
                }`}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      )}

      {/* Grid of Gift Tags */}
      {filteredEntries.length === 0 ? (
        <div className="rounded-2xl border border-[#DDD4C7] bg-[#FAF8F4] p-10 text-center dark:border-[#3A342E] dark:bg-[#1E1B18]">
          <p className="font-display text-lg text-[#221F1B] dark:text-[#F2ECE4]">
            {entries.length === 0 ? 'No gratitude tags saved yet' : 'No matching gift tags'}
          </p>
          <p className="mt-1.5 text-sm text-[#6B6257] dark:text-[#AEA498]">
            {entries.length === 0
              ? 'Write your first note or upload a CSV in Backup & Settings.'
              : 'Try adjusting your search or filter selections.'}
          </p>
          <button
            type="button"
            onClick={entries.length === 0 ? onOpenNew : resetFilters}
            className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#3E5C4E] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#324B3F] dark:bg-[#4E7462]"
          >
            {entries.length === 0 ? (
              <>
                <Plus className="h-4 w-4" />
                <span>Write First Tag</span>
              </>
            ) : (
              <span>Clear Filters</span>
            )}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 items-start">
          {filteredEntries.map((entry) => (
            <GiftTagCard
              key={entry.id}
              entry={entry}
              prefs={prefs}
              onToggleFavorite={onToggleFavorite}
              onEdit={onEdit}
              onDelete={onDelete}
              onTagClick={(tag) => setActiveTag(tag)}
            />
          ))}
        </div>
      )}
    </section>
  );
};
