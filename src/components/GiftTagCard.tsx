import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Heart, Pencil, RotateCw, Trash2, Check, X } from 'lucide-react';
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
      const lineHeight = parseFloat(computed.lineHeight) || (spotlight ? 30 : 27);
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

      // Fallback for single very long unbroken word/string
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

  const isKraft = entry.tagStyle === 'kraft';
  const perspectiveLabel =
    entry.perspective === 'from_me' ? prefs.meLabel : prefs.herLabel;

  const paperColors = isKraft
    ? {
        bgClass: 'bg-[#DFC5A4] dark:bg-[#3B2E21]',
        borderClass: 'border-[#BA9870] dark:border-[#5D4835]',
        fillVar: 'fill-[#DFC5A4] dark:fill-[#3B2E21]',
        strokeVar: 'stroke-[#BA9870] dark:stroke-[#5D4835]',
        grainClass: 'paper-grain-kraft',
        inkClass: 'text-[#2A1F14] dark:text-[#F5E9DA]',
        mutedClass: 'text-[#5C4733] dark:text-[#C7B096]',
        dividerClass: 'border-[#BA9870]/45 dark:border-[#5D4835]/70',
        eyeletRingClass: 'border-[#A68259] dark:border-[#7B6148]',
        heartTintClass: 'text-[#8C3B2B] dark:text-[#DF8A79]',
        flipBtnClass:
          'text-[#4B3826] hover:bg-black/5 dark:text-[#EAD6BE] dark:hover:bg-white/10',
      }
    : {
        bgClass: 'bg-[#FAF8F4] dark:bg-[#2A2622]',
        borderClass: 'border-[#DDD4C7] dark:border-[#423B34]',
        fillVar: 'fill-[#FAF8F4] dark:fill-[#2A2622]',
        strokeVar: 'stroke-[#DDD4C7] dark:stroke-[#423B34]',
        grainClass: 'paper-grain-white',
        inkClass: 'text-[#221F1B] dark:text-[#F2ECE4]',
        mutedClass: 'text-[#6B6257] dark:text-[#AEA498]',
        dividerClass: 'border-[#DDD4C7]/75 dark:border-[#423B34]/80',
        eyeletRingClass: 'border-[#C8BEB0] dark:border-[#5A5046]',
        heartTintClass: 'text-[#9C4A3B] dark:text-[#DF8A79]',
        flipBtnClass:
          'text-[#3E5C4E] hover:bg-black/5 dark:text-[#86B39D] dark:hover:bg-white/10',
      };

  const frontNoteTypography = spotlight
    ? 'font-handwriting text-[22px] leading-[1.35] text-center whitespace-pre-line break-words'
    : 'font-handwriting text-[20px] leading-[1.35] text-center whitespace-pre-line break-words';

  const backNoteTypography = split.compactBack
    ? 'font-handwriting text-[17px] leading-[1.28] text-center whitespace-pre-line break-words'
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
        {/* Compact Twine Loop */}
        <div className="pointer-events-none mx-auto -mb-2.5 z-10 flex flex-col items-center">
          <svg
            width="34"
            height="18"
            viewBox="0 0 34 18"
            fill="none"
            aria-hidden="true"
            className="text-[#9E856A] dark:text-[#8E775F]"
          >
            <path
              d="M17 17 C12 9, 10 2, 17 1.5 C24 2, 22 9, 17 17"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Compact Top Chamfered Gift Tag Shoulders */}
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
              className={`mt-2 h-3.5 w-3.5 rounded-full border-2 ${paperColors.eyeletRingClass} bg-[#F6F3EE] dark:bg-[#141210] shadow-inner`}
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

        {/* Fixed-Dimension Gift Tag Body */}
        <div
          className={`flex flex-col justify-between border-x border-b rounded-b-2xl px-6 sm:px-8 pb-3 pt-2.5 ${bodyFixedHeight} ${paperColors.bgClass} ${paperColors.borderClass} ${paperColors.grainClass}`}
        >
          {/* Perspective Header (Fixed 1-line height) */}
          <div
            className={`flex h-5 shrink-0 items-center justify-center gap-1.5 text-xs ${paperColors.mutedClass}`}
          >
            <svg
              width="12"
              height="11"
              viewBox="0 0 24 22"
              aria-hidden="true"
              className={`opacity-70 shrink-0 ${paperColors.heartTintClass}`}
              fill="currentColor"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span className="font-medium truncate max-w-[340px]">
              {perspectiveLabel}
            </span>
          </div>

          {/* Fixed 4-Row Text Container */}
          <div
            ref={!isBack ? measureBoxRef : undefined}
            className={`relative flex items-center justify-center w-full ${textSlotFixedHeight} ${
              isBack ? 'overflow-y-auto' : 'overflow-hidden'
            }`}
          >
            {/* Off-screen measurement node matching exact front slot width & font */}
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

          {/* Fixed Bottom Section: Flip Slot + Single-line Tags + Actions */}
          <div className="shrink-0 space-y-1">
            <div className="flex h-8 items-center justify-center">
              {split.needsFlip && (
                <button
                  type="button"
                  onClick={() => setIsFlipped((prev) => !prev)}
                  className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-medium transition ${paperColors.flipBtnClass}`}
                >
                  <RotateCw className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {isBack ? 'Flip to front · 2/2' : 'Turn tag over · 1/2'}
                  </span>
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
                        className="hover:underline focus-visible:outline-2 focus-visible:outline-[#3E5C4E] rounded px-0.5 transition-colors truncate max-w-[90px]"
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
                <span className={`text-[11px] font-mono-tabular ${paperColors.mutedClass}`}>
                  {isKraft ? 'Kraft tag' : 'White tag'}
                  {entry.syncStatus === 'pending' ? ' · Local' : ''}
                </span>

                {confirmingDelete ? (
                  <div className="flex items-center gap-1">
                    <span className={`text-xs mr-1 ${paperColors.mutedClass}`}>Delete?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmingDelete(false);
                        onDelete(entry.id);
                      }}
                      aria-label="Confirm delete entry"
                      className="flex min-h-[44px] min-w-[44px] -my-1 items-center justify-center rounded-xl text-[#9C4A3B] hover:bg-black/5 dark:text-[#DF8A79] dark:hover:bg-white/10"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      aria-label="Cancel delete entry"
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
                        entry.isFavorite ? 'Remove from cherished' : 'Mark as cherished'
                      }
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
                    <button
                      type="button"
                      onClick={() => onEdit(entry)}
                      aria-label="Edit gift tag"
                      className={`flex min-h-[44px] min-w-[44px] -my-1 items-center justify-center rounded-xl transition hover:bg-black/5 dark:hover:bg-white/10 ${paperColors.mutedClass}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(true)}
                      aria-label="Delete gift tag"
                      className={`flex min-h-[44px] min-w-[44px] -my-1 items-center justify-center rounded-xl transition hover:bg-black/5 dark:hover:bg-white/10 ${paperColors.mutedClass}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
      className={`tag-perspective group relative w-full drop-shadow-[0_6px_18px_rgba(34,31,27,0.07)] dark:drop-shadow-[0_12px_28px_rgba(0,0,0,0.45)] ${
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
