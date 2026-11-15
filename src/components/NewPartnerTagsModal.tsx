import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, Sparkles, X } from 'lucide-react';
import type { AppPreferences, GratitudeEntry, Perspective } from '../types';
import { GiftTagCard } from './GiftTagCard';

interface NewPartnerTagsModalProps {
  isOpen: boolean;
  newEntries: GratitudeEntry[];
  incomingPerspective: Perspective;
  prefs: AppPreferences;
  onAcknowledgeAll: () => void;
  onDismissForLater: () => void;
  onToggleFavorite: (entry: GratitudeEntry) => void;
  onEdit: (entry: GratitudeEntry) => void;
  onDelete: (id: string) => void;
}

export const NewPartnerTagsModal: React.FC<NewPartnerTagsModalProps> = ({
  isOpen,
  newEntries,
  incomingPerspective,
  prefs,
  onAcknowledgeAll,
  onDismissForLater,
  onToggleFavorite,
  onEdit,
  onDelete,
}) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setIndex(0);
    }
  }, [isOpen, newEntries.length]);

  if (!isOpen || newEntries.length === 0) return null;

  const safeIndex = Math.min(index, newEntries.length - 1);
  const currentEntry = newEntries[safeIndex];
  const headingText =
    incomingPerspective === 'from_her'
      ? newEntries.length === 1
        ? '1 new gift tag from her'
        : `${newEntries.length} new gift tags from her`
      : newEntries.length === 1
      ? '1 new gift tag created for you'
      : `${newEntries.length} new gift tags created for you`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-partner-tags-title"
    >
      <div className="w-full max-w-[640px] rounded-3xl border border-[#DDD4C7] bg-[#F6F3EE] p-5 sm:p-7 shadow-2xl dark:border-[#3A342E] dark:bg-[#181512]">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3E5C4E]/12 text-[#3E5C4E] dark:bg-[#78A58F]/15 dark:text-[#86B39D] shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="new-partner-tags-title"
                className="font-display text-lg sm:text-xl font-medium text-[#221F1B] dark:text-[#F2ECE4]"
              >
                {headingText}
              </h2>
              <p className="text-xs text-[#6B6257] dark:text-[#AEA498]">
                {incomingPerspective === 'from_her'
                  ? 'Added since your last visit'
                  : 'Written for you since your last visit'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onDismissForLater}
            aria-label="Close for now"
            className="flex min-h-[44px] min-w-[44px] -mr-2 -mt-1 items-center justify-center rounded-xl text-[#6B6257] hover:bg-[#EFE9E0] dark:text-[#AEA498] dark:hover:bg-[#2A2520]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Gift Tag Showcase */}
        <div className="my-2">
          <GiftTagCard
            entry={currentEntry}
            prefs={prefs}
            spotlight
            onToggleFavorite={onToggleFavorite}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>

        {/* Navigation & Acknowledge Controls */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          {newEntries.length > 1 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={safeIndex === 0}
                aria-label="Previous new tag"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#DDD4C7] bg-[#FAF8F4] text-[#221F1B] hover:bg-[#EFE9E0] disabled:opacity-40 dark:border-[#3A342E] dark:bg-[#231F1B] dark:text-[#F2ECE4] dark:hover:bg-[#2E2924]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs font-mono-tabular text-[#6B6257] dark:text-[#AEA498]">
                {safeIndex + 1} of {newEntries.length}
              </span>
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(newEntries.length - 1, i + 1))}
                disabled={safeIndex >= newEntries.length - 1}
                aria-label="Next new tag"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#DDD4C7] bg-[#FAF8F4] text-[#221F1B] hover:bg-[#EFE9E0] disabled:opacity-40 dark:border-[#3A342E] dark:bg-[#231F1B] dark:text-[#F2ECE4] dark:hover:bg-[#2E2924]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div />
          )}

          <div className="flex w-full sm:w-auto items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onDismissForLater}
              className="min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium text-[#6B6257] hover:bg-[#EFE9E0] dark:text-[#AEA498] dark:hover:bg-[#2A2520]"
            >
              View Later
            </button>
            <button
              type="button"
              onClick={onAcknowledgeAll}
              className="inline-flex min-h-[44px] flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl bg-[#3E5C4E] px-5 py-2.5 text-sm font-medium text-white shadow-xs transition hover:bg-[#324B3F] dark:bg-[#4E7462] dark:hover:bg-[#5E8874]"
            >
              <Check className="h-4 w-4" />
              <span>Mark as Seen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
