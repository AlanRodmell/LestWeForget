import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  getReflectLeadInPrompt,
  type AppPreferences,
  type GratitudeEntry,
  type Perspective,
} from '../types';
import { GiftTagCard } from './GiftTagCard';

interface ReflectViewProps {
  entries: GratitudeEntry[];
  currentSpotlight: GratitudeEntry | null;
  prefs: AppPreferences;
  userEmail: string | null | undefined;
  perspectiveFilter: 'all' | Perspective;
  selectedTag: string | null;
  drawKey: number;
  onDrawRandom: () => void;
  onToggleFavorite: (entry: GratitudeEntry) => void;
  onEdit: (entry: GratitudeEntry) => void;
  onDelete: (id: string) => void;
  onTagClick: (tag: string) => void;
  onOpenNew: () => void;
}

type CardAnimPhase = 'first-enter' | 'flip-out' | 'flip-in' | 'idle';

const FIRST_ENTER_TOTAL_MS = 900;
const FLIP_OUT_MS = 380;
const FLIP_IN_MS = 520;
const SWIPE_THRESHOLD_PX = 48;

export const ReflectView: React.FC<ReflectViewProps> = ({
  entries,
  currentSpotlight,
  prefs,
  userEmail,
  perspectiveFilter,
  selectedTag,
  drawKey,
  onDrawRandom,
  onToggleFavorite,
  onEdit,
  onDelete,
  onTagClick,
  onOpenNew,
}) => {
  const [displayedEntry, setDisplayedEntry] = useState<GratitudeEntry | null>(currentSpotlight);
  const [animPhase, setAnimPhase] = useState<CardAnimPhase>(
    currentSpotlight ? 'first-enter' : 'idle'
  );
  const displayedEntryRef = useRef<GratitudeEntry | null>(currentSpotlight);
  const prevDrawKeyRef = useRef(drawKey);
  const timerRefs = useRef<number[]>([]);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const clearFlipTimers = () => {
    for (const id of timerRefs.current) {
      window.clearTimeout(id);
    }
    timerRefs.current = [];
  };

  useEffect(() => {
    if (currentSpotlight) {
      const id = window.setTimeout(() => {
        setAnimPhase((prev) => (prev === 'first-enter' ? 'idle' : prev));
      }, FIRST_ENTER_TOTAL_MS);
      timerRefs.current.push(id);
    }
    return () => clearFlipTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const currentDisplayed = displayedEntryRef.current;

    if (!currentSpotlight) {
      clearFlipTimers();
      displayedEntryRef.current = null;
      setDisplayedEntry(null);
      setAnimPhase('idle');
      prevDrawKeyRef.current = drawKey;
      return;
    }

    // First reveal from starting screen: fade in lead-in text first, then card
    if (!currentDisplayed) {
      clearFlipTimers();
      displayedEntryRef.current = currentSpotlight;
      setDisplayedEntry(currentSpotlight);
      setAnimPhase('first-enter');
      prevDrawKeyRef.current = drawKey;
      const settleId = window.setTimeout(() => {
        setAnimPhase('idle');
      }, FIRST_ENTER_TOTAL_MS);
      timerRefs.current.push(settleId);
      return;
    }

    const drawTriggered = drawKey !== prevDrawKeyRef.current;
    const entryChanged = currentSpotlight.id !== currentDisplayed.id;

    // In-place update (e.g., favorited or edited same card): update silently without flipping
    if (!drawTriggered && !entryChanged) {
      displayedEntryRef.current = currentSpotlight;
      setDisplayedEntry(currentSpotlight);
      return;
    }

    prevDrawKeyRef.current = drawKey;
    clearFlipTimers();

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      displayedEntryRef.current = currentSpotlight;
      setDisplayedEntry(currentSpotlight);
      setAnimPhase('idle');
      return;
    }

    setAnimPhase('flip-out');
    const outId = window.setTimeout(() => {
      displayedEntryRef.current = currentSpotlight;
      setDisplayedEntry(currentSpotlight);
      setAnimPhase('flip-in');
      const inId = window.setTimeout(() => {
        setAnimPhase('idle');
      }, FLIP_IN_MS);
      timerRefs.current.push(inId);
    }, FLIP_OUT_MS);
    timerRefs.current.push(outId);
  }, [currentSpotlight, drawKey]);

  const matchingCount = useMemo(() => {
    return entries.filter((e) => {
      if (perspectiveFilter !== 'all' && e.perspective !== perspectiveFilter) return false;
      if (selectedTag && !e.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase())) {
        return false;
      }
      return true;
    }).length;
  }, [entries, perspectiveFilter, selectedTag]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (
      Math.abs(dx) >= SWIPE_THRESHOLD_PX &&
      Math.abs(dx) > Math.abs(dy) * 1.35 &&
      matchingCount > 1 &&
      animPhase !== 'flip-out'
    ) {
      onDrawRandom();
    }
  };

  if (entries.length === 0) {
    return (
      <section className="mx-auto flex min-h-[70dvh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <button
          type="button"
          onClick={onOpenNew}
          className="group relative inline-flex min-h-[64px] flex-col items-center justify-center border-0 bg-transparent px-8 py-4 shadow-none transition-transform duration-300 ease-out hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#A65E22] dark:focus-visible:outline-[#E29A50] rounded-lg cursor-pointer"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-x-10 -inset-y-5 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,244,224,0.75)_0%,rgba(245,239,228,0)_72%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(22,18,15,0.78)_0%,rgba(22,18,15,0)_72%)]"
          />
          <span className="relative font-handwriting text-3xl sm:text-4xl md:text-[2.6rem] font-normal text-[#382314] transition-colors duration-300 group-hover:text-[#A65E22] dark:text-[#F4E6D2] dark:group-hover:text-[#E8A864]">
            Help Me Be Grateful
          </span>
          <span
            aria-hidden="true"
            className="relative mt-2 h-px w-20 bg-[#B37336]/60 transition-all duration-300 ease-out group-hover:w-36 group-hover:bg-[#A65E22]/90 dark:bg-[#D48C46]/55 dark:group-hover:bg-[#E8A864]/90"
          />
        </button>
      </section>
    );
  }

  if (!displayedEntry) {
    return (
      <section className="mx-auto flex min-h-[70dvh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <button
          type="button"
          onClick={matchingCount === 0 ? onOpenNew : onDrawRandom}
          className="group relative inline-flex min-h-[64px] flex-col items-center justify-center border-0 bg-transparent px-8 py-4 shadow-none transition-transform duration-300 ease-out hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#A65E22] dark:focus-visible:outline-[#E29A50] rounded-lg cursor-pointer"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-x-10 -inset-y-5 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,244,224,0.75)_0%,rgba(245,239,228,0)_72%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(22,18,15,0.78)_0%,rgba(22,18,15,0)_72%)]"
          />
          <span className="relative font-handwriting text-3xl sm:text-4xl md:text-[2.6rem] font-normal text-[#382314] transition-colors duration-300 group-hover:text-[#A65E22] dark:text-[#F4E6D2] dark:group-hover:text-[#E8A864]">
            Help Me Be Grateful
          </span>
          <span
            aria-hidden="true"
            className="relative mt-2 h-px w-20 bg-[#B37336]/60 transition-all duration-300 ease-out group-hover:w-36 group-hover:bg-[#A65E22]/90 dark:bg-[#D48C46]/55 dark:group-hover:bg-[#E8A864]/90"
          />
        </button>
      </section>
    );
  }

  const cardAnimClass =
    animPhase === 'first-enter'
      ? 'animate-first-card will-change-transform'
      : animPhase === 'flip-out'
      ? 'animate-card-flip-out will-change-transform pointer-events-none'
      : animPhase === 'flip-in'
      ? 'animate-card-flip-in will-change-transform'
      : '';

  const leadInText = getReflectLeadInPrompt(userEmail, displayedEntry.perspective);

  return (
    <section className="mx-auto flex min-h-[70dvh] max-w-3xl flex-col items-center justify-center gap-5 py-4">
      <p className="animate-lead-in text-center font-handwriting text-[28px] sm:text-[34px] leading-snug text-[#4E331E] dark:text-[#E6C79C] transition-opacity duration-300">
        {leadInText}
      </p>

      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`w-full touch-pan-y ${cardAnimClass}`}
      >
        <GiftTagCard
          entry={displayedEntry}
          prefs={prefs}
          spotlight
          onToggleFavorite={onToggleFavorite}
          onEdit={onEdit}
          onDelete={onDelete}
          onTagClick={onTagClick}
        />
      </div>

      <div className="animate-continue-in flex justify-center pt-1">
        <button
          type="button"
          onClick={onDrawRandom}
          disabled={matchingCount === 0 || animPhase === 'flip-out'}
          className="group relative inline-flex min-h-[48px] flex-col items-center justify-center border-0 bg-transparent px-6 py-2 shadow-none transition-transform duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#A65E22] dark:focus-visible:outline-[#E29A50] rounded-lg cursor-pointer"
        >
          <span className="font-handwriting text-2xl sm:text-[26px] font-normal text-[#382314] transition-colors group-hover:text-[#A65E22] dark:text-[#F4E6D2] dark:group-hover:text-[#E8A864]">
            Continue
          </span>
          <span
            aria-hidden="true"
            className="mt-1 h-px w-12 bg-[#B37336]/55 transition-all duration-300 ease-out group-hover:w-20 group-hover:bg-[#A65E22]/85 dark:bg-[#D48C46]/55 dark:group-hover:bg-[#E8A864]/85"
          />
        </button>
      </div>
    </section>
  );
};
