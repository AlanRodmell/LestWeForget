import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, Clock, Heart, Pencil, RotateCw, Trash2, X } from 'lucide-react';
import type { AppPreferences, GratitudeEntry } from '../types';

interface GiftTagCardProps {
  entry: GratitudeEntry;
  prefs: AppPreferences;
  spotlight?: boolean;
  onToggleFavorite: (entry: GratitudeEntry) => void;
  onEdit: (entry: GratitudeEntry) => void;
  onDelete: (id: string) => void;
  onTagClick?: (tag: string) => void;
}

interface TagSplitResult {
  needsFlip: boolean;
  frontText: string;
  backText: string;
  compactBack: boolean;
}

function adjustSurrogateBoundary(text: string, idx: number): number {
  let pos = idx;
  while (
    pos > 1 &&
    ((text.charCodeAt(pos) >= 0xdc00 && text.charCodeAt(pos) <= 0xdfff) ||
      text.charCodeAt(pos) === 0xfe0f ||
      text.charCodeAt(pos) === 0x200d)
  ) {
    pos -= 1;
  }
  return pos;
}

function findWordBreakPositions(text: string): number[] {
  const positions: number[] = [];
  for (let i = 1; i < text.length; i++) {
    if (/\s/.test(text[i]) && !/\s/.test(text[i - 1])) {
      positions.push(i);
    }
  }
  return positions;
}

export const GiftTagCard: React.FC<GiftTagCardProps> = ({
  entry,
  prefs,
  spotlight = false,
  onToggleFavorite,
  onEdit,
  onDelete,
  onTagClick,
}) => {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [split, setSplit] = useState<TagSplitResult>(() => ({
    needsFlip: false,
    frontText: entry.text.trim(),
    backText: '',
    compactBack: false,
  }));

  const measureBoxRef = useRef<HTMLDivElement>(null);
  const measurerRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    setIsFlipped(false);
    setConfirmingDelete(false);
  }, [entry.id]);

  // Measure exact rendered 4-row capacity at current card width & font
  useLayoutEffect(() => {
    const box = measureBoxRef.current;
    const measurer = measurerRef.current;
    if (!box || !measurer) return;

    const computeSplit = () => {
      const text = entry.text.trim();
      if (!text) {
        setSplit({ needsFlip: false, frontText: '', backText: '', compactBack: false });
        return;
      }

      const computed = getComputedStyle(measurer);
      const lineHeight = parseFloat(computed.lineHeight) || (spotlight ? 28 : 26);
      const maxAllowedHeight = lineHeight * 4 + 3;

      measurer.textContent = `“${text}”`;
      if (measurer.scrollHeight <= maxAllowedHeight) {
        setSplit({
          needsFlip: false,
          frontText: text,
          backText: '',
          compactBack: false,
        });
        return;
      }

      const wordBreaks = findWordBreakPositions(text);
      let bestIdx = -1;

      if (wordBreaks.length > 0) {
        let lo = 0;
        let hi = wordBreaks.length - 1;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          const pos = wordBreaks[mid];
          const candidate = text.slice(0, pos).trimEnd();
          measurer.textContent = `“${candidate}…”`;
          if (measurer.scrollHeight <= maxAllowedHeight) {
            bestIdx = pos;
            lo = mid + 1;
          } else {
            hi = mid - 1;
          }
        }
      }

      if (bestIdx <= 0) {
        let lo = 1;
        let hi = text.length - 1;
        bestIdx = 1;
        while (lo <= hi) {
          const mid = adjustSurrogateBoundary(text, (lo + hi) >> 1);
          const candidate = text.slice(0, mid);
          measurer.textContent = `“${candidate}…”`;
          if (measurer.scrollHeight <= maxAllowedHeight) {
            bestIdx = mid;
            lo = mid + 1;
          } else {
            hi = mid - 1;
          }
        }
      }

      bestIdx = adjustSurrogateBoundary(text, bestIdx);
      const frontPart = text.slice(0, bestIdx).trimEnd();
      const backPart = text.slice(bestIdx).trimStart();

      if (!backPart) {
        setSplit({
          needsFlip: false,
          frontText: text,
          backText: '',
          compactBack: false,
        });
        return;
      }

      measurer.textContent = `…${backPart}”`;
      const compactBack = measurer.scrollHeight > maxAllowedHeight;

      setSplit({
        needsFlip: true,
        frontText: frontPart,
        backText: backPart,
        compactBack,
      });
    };

    let mounted = true;
    computeSplit();

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (mounted) computeSplit();
      });
    }

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        if (mounted) computeSplit();
      });
      observer.observe(box);
      return () => {
        mounted = false;
        observer.disconnect();
      };
    }

    return () => {
      mounted = false;
    };
  }, [entry.text, spotlight]);

  const isKraft = entry.perspective === 'from_her';
  const perspectiveLabel =
    entry.perspective === 'from_me' ? prefs.meLabel : prefs.herLabel;

  const paperColors = isKraft
    ? {
        bgClass: 'bg-[#DCC19B] dark:bg-[#382B1E]',
        borderClass: 'border-[#B59267] dark:border-[#5D4834]',
        fillVar: 'fill-[#DCC19B] dark:fill-[#382B1E]',
        strokeVar: 'stroke-[#B59267] dark:stroke-[#5D4834]',
        grainClass: 'paper-grain-kraft',
        inkClass: 'text-[#291E14] dark:text-[#F4E8D6]',
        mutedClass: 'text-[#614B35] dark:text-[#C8B194]',
        dividerClass: 'border-[#B59267]/50 dark:border-[#5D4834]/75',
        eyeletRingClass: 'border-[#8F6E45] dark:border-[#A88558]',
        heartTintClass: 'text-[#9E561E] dark:text-[#E29A50]',
        flipBtnClass:
          'text-[#533D28] hover:bg-black/5 dark:text-[#DFC8AA] dark:hover:bg-white/10',
      }
    : {
        bgClass: 'bg-[#FBF7EE] dark:bg-[#26201B]',
        borderClass: 'border-[#D7CBB8] dark:border-[#42362B]',
        fillVar: 'fill-[#FBF7EE] dark:fill-[#26201B]',
        strokeVar: 'stroke-[#D7CBB8] dark:stroke-[#42362B]',
        grainClass: 'paper-grain-white',
        inkClass: 'text-[#241D17] dark:text-[#EFE6D8]',
        mutedClass: 'text-[#6E6153] dark:text-[#B5A693]',
        dividerClass: 'border-[#D7CBB8]/80 dark:border-[#42362B]/85',
        eyeletRingClass: 'border-[#A65E22]/75 dark:border-[#D48C46]',
        heartTintClass: 'text-[#A65E22] dark:text-[#E29A50]',
        flipBtnClass:
          'text-[#A65E22] hover:bg-black/5 dark:text-[#E29A50] dark:hover:bg-white/10',
      };

  const frontNoteTypography = spotlight
    ? 'font-handwriting text-[20px] leading-[1.4] text-center whitespace-pre-line break-words'
    : 'font-handwriting text-[18.5px] leading-[1.4] text-center whitespace-pre-line break-words';

  const backNoteTypography = split.compactBack
    ? 'font-handwriting text-[16px] leading-[1.32] text-center whitespace-pre-line break-words'
    : frontNoteTypography;

  // Fixed card body & 4-row text slot heights so cards never scale with text
  const bodyFixedHeight = spotlight ? 'h-[272px]' : 'h-[258px]';
  const textSlotFixedHeight = spotlight ? 'h-[122px]' : 'h-[112px]';

  const renderTagFace = (side: 'front' | 'back') => {
    const isBack = side === 'back';
    const visible = isBack ? isFlipped : !isFlipped;

    return (
      <div
        aria-hidden={!visible}
        className={`tag-face col-start-1 row-start-1 flex flex-col w-full ${
          isBack ? 'tag-face-back' : ''
        } ${visible ? 'pointer-events-auto' : 'pointer-events-none'}`}
      >
        {/* Linen Twine Loop */}
        <div className="pointer-events-none mx-auto -mb-2.5 z-10 flex flex-col items-center">
          <svg
            width="34"
            height="18"
            viewBox="0 0 34 18"
            fill="none"
            aria-hidden="true"
            className="text-[#8E7354] dark:text-[#9A8062]"
          >
            <path
              d="M17 17 C12 9, 10 2, 17 1.5 C24 2, 22 9, 17 17"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Chamfered Tag Shoulders with Brass Eyelet */}
        <div className="relative flex w-full items-stretch h-[22px] shrink-0">
          <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            className="shrink-0 block"
            aria-hidden="true"
          >
            <polygon points="22,0 22,22 0,22" className={paperColors.fillVar} />
            <line
              x1="0"
              y1="22"
              x2="22"
              y2="0"
              strokeWidth="1.25"
              className={paperColors.strokeVar}
            />
          </svg>

          <div
            className={`flex-1 border-t ${paperColors.bgClass} ${paperColors.borderClass} ${paperColors.grainClass} relative flex items-center justify-center`}
          >
            <span
              aria-hidden="true"
              className={`mt-2 h-3.5 w-3.5 rounded-full border-2 ${paperColors.eyeletRingClass} bg-[#F5EFE4] dark:bg-[#16120F] shadow-inner`}
            />
          </div>

          <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            className="shrink-0 block"
            aria-hidden="true"
          >
            <polygon points="0,0 22,22 0,22" className={paperColors.fillVar} />
            <line
              x1="0"
              y1="0"
              x2="22"
              y2="22"
              strokeWidth="1.25"
              className={paperColors.strokeVar}
            />
          </svg>
        </div>

        {/* Fixed-Dimension Stationery Body */}
        <div
          className={`flex flex-col justify-between border-x border-b rounded-b-2xl px-6 sm:px-8 pb-3 pt-2.5 ${bodyFixedHeight} ${paperColors.bgClass} ${paperColors.borderClass} ${paperColors.grainClass}`}
        >
          {/* Classic Editorial Perspective Header */}
          <div
            className={`flex h-5 shrink-0 items-center justify-center gap-1.5 text-xs ${paperColors.mutedClass}`}
          >
            <svg
              width="10"
              height="9"
              viewBox="0 0 24 22"
              aria-hidden="true"
              className={`opacity-80 shrink-0 ${paperColors.heartTintClass}`}
              fill="currentColor"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span className="font-handwriting text-[15px] truncate max-w-[340px]">
              {perspectiveLabel}
            </span>
          </div>

          {/* Fixed 4-Row Ruled Pen-on-Paper Container (Tappable to flip when 2-sided) */}
          <div
            ref={!isBack ? measureBoxRef : undefined}
            role={split.needsFlip ? 'button' : undefined}
            tabIndex={split.needsFlip && visible ? 0 : undefined}
            aria-label={
              split.needsFlip
                ? isBack
                  ? 'Tap to flip back to front side'
                  : 'Tap to flip to back side of note'
                : undefined
            }
            onClick={
              split.needsFlip
                ? () => setIsFlipped((prev) => !prev)
                : undefined
            }
            onKeyDown={
              split.needsFlip
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsFlipped((prev) => !prev);
                    }
                  }
                : undefined
            }
            className={`relative flex items-center justify-center w-full ruled-stationery-light rounded-lg ${textSlotFixedHeight} ${
              isBack ? 'overflow-y-auto' : 'overflow-hidden'
            } ${
              split.needsFlip
                ? 'cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-[#A65E22] dark:focus-visible:outline-[#E29A50]'
                : ''
            }`}
          >
            {!isBack && (
              <p
                ref={measurerRef}
                aria-hidden="true"
                className={`pointer-events-none invisible absolute left-0 right-0 top-0 ${frontNoteTypography}`}
              />
            )}

            {!isBack ? (
              <p className={`w-full ${frontNoteTypography} ${paperColors.inkClass}`}>
                {split.needsFlip ? `“${split.frontText}…”` : `“${split.frontText}”`}
              </p>
            ) : (
              <p className={`w-full my-auto ${backNoteTypography} ${paperColors.inkClass}`}>
                {`…${split.backText}”`}
              </p>
            )}
          </div>

          {/* Fixed Bottom Section: Flip Icon + Tags + Icon Actions */}
          <div className="shrink-0 space-y-1">
            <div className="flex h-8 items-center justify-center">
              {split.needsFlip && (
                <button
                  type="button"
                  onClick={() => setIsFlipped((prev) => !prev)}
                  aria-label={isBack ? 'Show front side' : 'Flip tag to read more'}
                  title={isBack ? 'Front (2/2)' : 'Flip (1/2)'}
                  className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-mono-tabular transition ${paperColors.flipBtnClass}`}
                >
                  <RotateCw className="h-3.5 w-3.5 shrink-0" />
                  <span>{isBack ? '2/2' : '1/2'}</span>
                </button>
              )}
            </div>

            <div className={`pt-1.5 border-t ${paperColors.dividerClass}`}>
              <div
                className={`h-4 mb-1 flex items-center justify-center gap-x-2 overflow-hidden text-xs ${paperColors.mutedClass}`}
              >
                {entry.tags.slice(0, 4).map((tag, idx) => (
                  <React.Fragment key={tag}>
                    {idx > 0 && <span aria-hidden="true">·</span>}
                    {onTagClick ? (
                      <button
                        type="button"
                        onClick={() => onTagClick(tag)}
                        className="hover:underline focus-visible:outline-2 focus-visible:outline-[#A65E22] rounded px-0.5 transition-colors truncate max-w-[90px]"
                      >
                        #{tag}
                      </button>
                    ) : (
                      <span className="truncate max-w-[90px]">#{tag}</span>
                    )}
                  </React.Fragment>
                ))}
                {entry.tags.length > 4 && (
                  <span className="shrink-0">+{entry.tags.length - 4}</span>
                )}
              </div>

              <div className="flex h-9 items-center justify-between gap-2">
                <div className="flex items-center">
                  {entry.syncStatus === 'pending' && (
                    <span
                      aria-label="Waiting to sync"
                      title="Waiting to sync"
                      className={`inline-flex items-center ${paperColors.mutedClass}`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>

                {!spotlight && confirmingDelete ? (
                  <div className="flex items-center gap-1 -mr-2">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmingDelete(false);
                        onDelete(entry.id);
                      }}
                      aria-label="Confirm delete"
                      title="Confirm delete"
                      className="flex min-h-[44px] min-w-[44px] -my-1 items-center justify-center rounded-xl text-[#A65E22] hover:bg-black/5 dark:text-[#E29A50] dark:hover:bg-white/10"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      aria-label="Cancel delete"
                      title="Cancel"
                      className={`flex min-h-[44px] min-w-[44px] -my-1 items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10 ${paperColors.mutedClass}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center -mr-2">
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(entry)}
                      aria-label={
                        entry.isFavorite ? 'Remove favorite' : 'Mark favorite'
                      }
                      title={entry.isFavorite ? 'Favorited' : 'Favorite'}
                      aria-pressed={entry.isFavorite}
                      className={`flex min-h-[44px] min-w-[44px] -my-1 items-center justify-center rounded-xl transition hover:bg-black/5 dark:hover:bg-white/10 ${
                        entry.isFavorite
                          ? paperColors.heartTintClass
                          : paperColors.mutedClass
                      }`}
                    >
                      <Heart
                        className="h-4 w-4"
                        fill={entry.isFavorite ? 'currentColor' : 'none'}
                      />
                    </button>
                    {!spotlight && (
                      <>
                        <button
                          type="button"
                          onClick={() => onEdit(entry)}
                          aria-label="Edit tag"
                          title="Edit"
                          className={`flex min-h-[44px] min-w-[44px] -my-1 items-center justify-center rounded-xl transition hover:bg-black/5 dark:hover:bg-white/10 ${paperColors.mutedClass}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDelete(true)}
                          aria-label="Delete tag"
                          title="Delete"
                          className={`flex min-h-[44px] min-w-[44px] -my-1 items-center justify-center rounded-xl transition hover:bg-black/5 dark:hover:bg-white/10 ${paperColors.mutedClass}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <article
      className={`tag-perspective group relative w-full drop-shadow-[0_10px_24px_rgba(36,29,23,0.09)] dark:drop-shadow-[0_14px_30px_rgba(0,0,0,0.52)] ${
        spotlight ? 'max-w-[600px] mx-auto' : ''
      }`}
    >
      <div className={`tag-flip-inner grid ${isFlipped ? 'is-flipped' : ''}`}>
        {renderTagFace('front')}
        {split.needsFlip && renderTagFace('back')}
      </div>
    </article>
  );
};
