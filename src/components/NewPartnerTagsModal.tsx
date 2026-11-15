import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
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
        ? 'Jen left a new note for you…'
        : `Jen left ${newEntries.length} new notes for you…`
      : newEntries.length === 1
      ? 'Alan left a new note for you…'
      : `Alan left ${newEntries.length} new notes for you…`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#16120F]/65 p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-partner-tags-title"
    >
      <div className="w-full max-w-[640px] rounded-3xl border border-[#D7CBB8] bg-[#F5EFE4] p-5 sm:p-7 shadow-2xl dark:border-[#3B3026] dark:bg-[#1B1612]">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2
            id="new-partner-tags-title"
            className="font-handwriting text-2xl sm:text-3xl text-[#382314] dark:text-[#F4E6D2]"
          >
            {headingText}
          </h2>

          <button
            type="button"
            onClick={onDismissForLater}
            aria-label="Read later"
            title="Read later"
            className="flex min-h-[44px] min-w-[44px] -mr-2 items-center justify-center rounded-xl text-[#6E6153] hover:bg-[#EAE1D3] dark:text-[#B5A693] dark:hover:bg-[#29211B]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

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

        <div className="mt-6 flex items-center justify-between gap-3">
          {newEntries.length > 1 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={safeIndex === 0}
                aria-label="Previous note"
                title="Previous"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#D7CBB8] bg-[#FBF8F1] text-[#241D17] hover:bg-[#EAE1D3] disabled:opacity-40 dark:border-[#3B3026] dark:bg-[#201A15] dark:text-[#EFE6D8] dark:hover:bg-[#29211B]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs font-mono-tabular text-[#6E6153] dark:text-[#B5A693]">
                {safeIndex + 1}/{newEntries.length}
              </span>
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(newEntries.length - 1, i + 1))}
                disabled={safeIndex >= newEntries.length - 1}
                aria-label="Next note"
                title="Next"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#D7CBB8] bg-[#FBF8F1] text-[#241D17] hover:bg-[#EAE1D3] disabled:opacity-40 dark:border-[#3B3026] dark:bg-[#201A15] dark:text-[#EFE6D8] dark:hover:bg-[#29211B]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDismissForLater}
              className="min-h-[44px] rounded-xl px-3.5 text-sm text-[#6E6153] hover:bg-[#EAE1D3] dark:text-[#B5A693] dark:hover:bg-[#29211B]"
            >
              Later
            </button>
            <button
              type="button"
              onClick={onAcknowledgeAll}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#A65E22] px-5 font-handwriting text-xl text-[#FBF8F1] shadow-xs transition hover:bg-[#8C4D19] dark:bg-[#C87A32] dark:hover:bg-[#D98B42]"
            >
              <span>Keep</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
