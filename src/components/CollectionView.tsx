import React, { useEffect, useMemo, useState } from 'react';
import { Heart, Plus, Search, X } from 'lucide-react';
import type { AppPreferences, GratitudeEntry, Perspective } from '../types';
import { GiftTagCard } from './GiftTagCard';

interface CollectionViewProps {
  entries: GratitudeEntry[];
  prefs: AppPreferences;
  allTags: string[];
  initialPerspectiveFilter?: 'all' | Perspective;
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
  initialPerspectiveFilter = 'all',
  initialTagFilter,
  onToggleFavorite,
  onEdit,
  onDelete,
  onOpenNew,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [perspectiveFilter, setPerspectiveFilter] = useState<'all' | Perspective>(
    initialPerspectiveFilter
  );
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(initialTagFilter);

  useEffect(() => {
    setPerspectiveFilter(initialPerspectiveFilter);
  }, [initialPerspectiveFilter]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entries.filter((entry) => {
      if (perspectiveFilter !== 'all' && entry.perspective !== perspectiveFilter) return false;
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
  }, [entries, searchQuery, perspectiveFilter, favoritesOnly, activeTag]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    perspectiveFilter !== 'all' ||
    favoritesOnly ||
    activeTag !== null;

  const resetFilters = () => {
    setSearchQuery('');
    setPerspectiveFilter('all');
    setFavoritesOnly(false);
    setActiveTag(null);
  };

  return (
    <section className="space-y-5 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-2.5">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[#241D17] dark:text-[#EFE6D8]">
            Tags
          </h1>
          <span className="text-xs text-[#6E6153] dark:text-[#B5A693] font-mono-tabular">
            {filteredEntries.length}/{entries.length}
          </span>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E6153] dark:text-[#B5A693]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            aria-label="Search tags"
            className="min-h-[44px] w-full rounded-xl border border-[#D7CBB8] bg-[#FBF8F1] pl-10 pr-4 text-sm text-[#241D17] placeholder:text-[#988977] focus:border-[#A65E22] focus:outline-none dark:border-[#3B3026] dark:bg-[#201A15] dark:text-[#EFE6D8] dark:placeholder:text-[#786A5A] dark:focus:border-[#C29F6D]"
          />
        </div>
      </div>

      {/* Minimalist Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center rounded-xl border border-[#D7CBB8] bg-[#EAE1D3]/75 p-1 dark:border-[#3B3026] dark:bg-[#201A15]">
          {(['all', 'from_me', 'from_her'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPerspectiveFilter(p)}
              className={`min-h-[38px] rounded-lg px-3 py-1 text-xs font-medium transition whitespace-nowrap shrink-0 max-w-[130px] truncate ${
                perspectiveFilter === p
                  ? 'bg-[#FBF8F1] text-[#241D17] shadow-xs dark:bg-[#332922] dark:text-[#EFE6D8]'
                  : 'text-[#6E6153] hover:text-[#241D17] dark:text-[#B5A693] dark:hover:text-[#EFE6D8]'
              }`}
            >
              {p === 'all' ? 'All' : p === 'from_me' ? prefs.meLabel : prefs.herLabel}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setFavoritesOnly((prev) => !prev)}
          aria-pressed={favoritesOnly}
          aria-label="Favorites only"
          title="Favorites only"
          className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border transition shrink-0 ${
            favoritesOnly
              ? 'border-[#A65E22] bg-[#A65E22]/10 text-[#A65E22] dark:border-[#E29A50] dark:bg-[#E29A50]/15 dark:text-[#E29A50]'
              : 'border-[#D7CBB8] bg-[#FBF8F1] text-[#6E6153] hover:text-[#241D17] dark:border-[#3B3026] dark:bg-[#201A15] dark:text-[#B5A693] dark:hover:text-[#EFE6D8]'
          }`}
        >
          <Heart className="h-4 w-4" fill={favoritesOnly ? 'currentColor' : 'none'} />
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            aria-label="Reset filters"
            title="Reset filters"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#A65E22] hover:bg-[#EAE1D3] dark:text-[#E29A50] dark:hover:bg-[#29211B]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Personal Tag Filter Row */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {allTags.map((tag) => {
            const selected = activeTag?.toLowerCase() === tag.toLowerCase();
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(selected ? null : tag)}
                className={`min-h-[34px] rounded-lg px-2.5 py-1 transition whitespace-nowrap ${
                  selected
                    ? 'bg-[#A65E22] text-[#FBF8F1] dark:bg-[#C87A32]'
                    : 'text-[#6E6153] hover:bg-[#EAE1D3] dark:text-[#C8B9A6] dark:hover:bg-[#29211B]'
                }`}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      )}

      {/* Grid of Tags */}
      {filteredEntries.length === 0 ? (
        <div className="rounded-2xl border border-[#D7CBB8] bg-[#FBF8F1] p-10 text-center dark:border-[#3B3026] dark:bg-[#201A15]">
          <p className="font-display text-xl text-[#241D17] dark:text-[#EFE6D8]">
            {entries.length === 0 ? 'No tags yet' : 'No matching tags'}
          </p>
          <button
            type="button"
            onClick={entries.length === 0 ? onOpenNew : resetFilters}
            aria-label={entries.length === 0 ? 'Write first tag' : 'Clear filters'}
            title={entries.length === 0 ? 'Write first tag' : 'Clear filters'}
            className="mt-5 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-[#A65E22] px-4 text-[#FBF8F1] hover:bg-[#8C4D19] dark:bg-[#C87A32] dark:hover:bg-[#D98B42]"
          >
            {entries.length === 0 ? <Plus className="h-4 w-4" /> : <X className="h-4 w-4" />}
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
