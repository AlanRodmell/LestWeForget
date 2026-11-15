import React, { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  MAX_ENTRY_LENGTH,
  MAX_TAG_LENGTH,
  MAX_TAGS,
  type AppPreferences,
  type GratitudeEntry,
  type Perspective,
  type TagStyle,
} from '../types';
import { sanitizeTags, todayIsoDate } from '../services/idbStore';

const BASIC_EMOJIS = [
  '❤️',
  '🥰',
  '😊',
  '🙏',
  '🤗',
  '✨',
  '☀️',
  '☕',
  '🌸',
  '💛',
  '🏡',
  '🌙',
  '🎉',
];

interface EntryEditorModalProps {
  isOpen: boolean;
  editingEntry: GratitudeEntry | null;
  defaultPerspective?: Perspective;
  prefs: AppPreferences;
  existingTags: string[];
  onClose: () => void;
  onSave: (data: {
    id?: string;
    text: string;
    perspective: Perspective;
    tagStyle: TagStyle;
    tags: string[];
    entryDate: string;
  }) => Promise<void>;
}

export const EntryEditorModal: React.FC<EntryEditorModalProps> = ({
  isOpen,
  editingEntry,
  defaultPerspective = 'from_me',
  prefs,
  existingTags,
  onClose,
  onSave,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [perspective, setPerspective] = useState<Perspective>('from_me');
  const [tagStyle, setTagStyle] = useState<TagStyle>('white');
  const [styleManuallyChosen, setStyleManuallyChosen] = useState(false);
  const [text, setText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [entryDate, setEntryDate] = useState(todayIsoDate());
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingEntry) {
      setPerspective(editingEntry.perspective);
      setTagStyle(editingEntry.tagStyle);
      setStyleManuallyChosen(true);
      setText(editingEntry.text);
      setTags(editingEntry.tags);
      setEntryDate(editingEntry.entryDate);
    } else {
      setPerspective(defaultPerspective);
      setTagStyle(defaultPerspective === 'from_her' ? 'kraft' : 'white');
      setStyleManuallyChosen(false);
      setText('');
      setTags([]);
      setEntryDate(todayIsoDate());
    }
    setTagInput('');
    setErrorMsg(null);
  }, [isOpen, editingEntry, defaultPerspective]);

  if (!isOpen) return null;

  const handlePerspectiveChange = (next: Perspective) => {
    setPerspective(next);
    if (!styleManuallyChosen) {
      setTagStyle(next === 'from_her' ? 'kraft' : 'white');
    }
  };

  const addTag = (raw: string) => {
    const cleaned = raw.trim().replace(/^#+/, '').slice(0, MAX_TAG_LENGTH);
    if (!cleaned) return;
    if (tags.length >= MAX_TAGS) {
      setErrorMsg(`Up to ${MAX_TAGS} personal tags per gift tag.`);
      return;
    }
    setTags((prev) => sanitizeTags([...prev, cleaned]));
    setTagInput('');
    setErrorMsg(null);
  };

  const removeTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const nextText = text.slice(0, start) + emoji + text.slice(end);
    if (nextText.length > MAX_ENTRY_LENGTH) {
      setErrorMsg(`Adding that emoji exceeds the ${MAX_ENTRY_LENGTH}-character limit.`);
      return;
    }
    setText(nextText);
    setErrorMsg(null);
    const nextCursor = start + emoji.length;
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(nextCursor, nextCursor);
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      setErrorMsg('Please write a short gratitude note before saving.');
      return;
    }
    const pendingTag = tagInput.trim().replace(/^#+/, '');
    const finalTags = pendingTag
      ? sanitizeTags([...tags, pendingTag])
      : sanitizeTags(tags);

    setIsSaving(true);
    setErrorMsg(null);
    try {
      await onSave({
        id: editingEntry?.id,
        text: trimmed.slice(0, MAX_ENTRY_LENGTH),
        perspective,
        tagStyle,
        tags: finalTags,
        entryDate,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save tag.');
    } finally {
      setIsSaving(false);
    }
  };

  const remaining = MAX_ENTRY_LENGTH - text.length;
  const quickTagSuggestions = existingTags
    .filter((t) => !tags.some((existing) => existing.toLowerCase() === t.toLowerCase()))
    .slice(0, 6);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="entry-modal-title"
    >
      <div className="w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-[#DDD4C7] bg-[#FAF8F4] shadow-2xl dark:border-[#3A342E] dark:bg-[#1E1B18]">
        {/* Mobile grab handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="h-1.5 w-10 rounded-full bg-[#D2C9BC] dark:bg-[#463F38]" />
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <h2
              id="entry-modal-title"
              className="font-display text-xl font-medium text-[#221F1B] dark:text-[#F2ECE4]"
            >
              {editingEntry ? 'Edit Gift Tag' : 'Write a Gratitude Tag'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close editor"
              className="flex min-h-[44px] min-w-[44px] -mr-2 items-center justify-center rounded-xl text-[#6B6257] hover:bg-[#EFE9E0] dark:text-[#AEA498] dark:hover:bg-[#2E2924]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Perspective Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#6B6257] dark:text-[#AEA498]">
              Whose gratitude is this?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handlePerspectiveChange('from_me')}
                className={`min-h-[44px] rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${
                  perspective === 'from_me'
                    ? 'border-[#3E5C4E] bg-[#3E5C4E]/10 font-medium text-[#221F1B] dark:border-[#78A58F] dark:bg-[#78A58F]/15 dark:text-[#F2ECE4]'
                    : 'border-[#DDD4C7] bg-transparent text-[#6B6257] hover:bg-[#EFE9E0]/60 dark:border-[#3A342E] dark:text-[#AEA498] dark:hover:bg-[#2A2520]'
                }`}
              >
                <span className="block truncate">{prefs.meLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => handlePerspectiveChange('from_her')}
                className={`min-h-[44px] rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${
                  perspective === 'from_her'
                    ? 'border-[#3E5C4E] bg-[#3E5C4E]/10 font-medium text-[#221F1B] dark:border-[#78A58F] dark:bg-[#78A58F]/15 dark:text-[#F2ECE4]'
                    : 'border-[#DDD4C7] bg-transparent text-[#6B6257] hover:bg-[#EFE9E0]/60 dark:border-[#3A342E] dark:text-[#AEA498] dark:hover:bg-[#2A2520]'
                }`}
              >
                <span className="block truncate">{prefs.herLabel}</span>
              </button>
            </div>
          </div>

          {/* Gift Tag Paper Style */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#6B6257] dark:text-[#AEA498]">
              Gift tag paper
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTagStyle('white');
                  setStyleManuallyChosen(true);
                }}
                className={`flex min-h-[44px] items-center gap-2.5 rounded-xl border px-3.5 py-2 text-sm transition ${
                  tagStyle === 'white'
                    ? 'border-[#3E5C4E] bg-[#FAF8F4] font-medium text-[#221F1B] ring-1 ring-[#3E5C4E] dark:border-[#78A58F] dark:bg-[#2A2622] dark:text-[#F2ECE4] dark:ring-[#78A58F]'
                    : 'border-[#DDD4C7] text-[#6B6257] dark:border-[#3A342E] dark:text-[#AEA498]'
                }`}
              >
                <span className="h-4 w-4 rounded-sm border border-[#D4C9BA] bg-[#FAF8F4] shrink-0" />
                <span>White Cardstock</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTagStyle('kraft');
                  setStyleManuallyChosen(true);
                }}
                className={`flex min-h-[44px] items-center gap-2.5 rounded-xl border px-3.5 py-2 text-sm transition ${
                  tagStyle === 'kraft'
                    ? 'border-[#3E5C4E] bg-[#DFC5A4]/35 font-medium text-[#221F1B] ring-1 ring-[#3E5C4E] dark:border-[#78A58F] dark:bg-[#3B2E21] dark:text-[#F5E9DA] dark:ring-[#78A58F]'
                    : 'border-[#DDD4C7] text-[#6B6257] dark:border-[#3A342E] dark:text-[#AEA498]'
                }`}
              >
                <span className="h-4 w-4 rounded-sm border border-[#A68259] bg-[#DFC5A4] shrink-0" />
                <span>Brown Kraft</span>
              </button>
            </div>
          </div>

          {/* Gratitude Note Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="gratitude-note-input"
                className="text-xs font-medium text-[#6B6257] dark:text-[#AEA498]"
              >
                What are you thankful for?
              </label>
              <span
                className={`text-xs font-mono-tabular ${
                  remaining <= 25
                    ? 'text-[#9C4A3B] dark:text-[#DF8A79]'
                    : 'text-[#6B6257] dark:text-[#AEA498]'
                }`}
              >
                {text.length} / {MAX_ENTRY_LENGTH}
              </span>
            </div>
            <textarea
              ref={textareaRef}
              id="gratitude-note-input"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_ENTRY_LENGTH))}
              maxLength={MAX_ENTRY_LENGTH}
              rows={4}
              placeholder="Write a small moment, kindness, or detail worth remembering when days feel heavy..."
              className="w-full rounded-xl border border-[#DDD4C7] bg-white px-4 py-3 font-handwriting text-[22px] leading-[1.4] text-[#221F1B] placeholder:font-sans placeholder:text-sm placeholder:text-[#9A9084] focus:border-[#3E5C4E] focus:outline-none dark:border-[#3A342E] dark:bg-[#141210] dark:text-[#F2ECE4] dark:placeholder:text-[#6E655C] dark:focus:border-[#78A58F]"
              required
            />

            {/* Quick-insert Basic Emoji Strip */}
            <div className="flex flex-wrap items-center gap-1 pt-0.5" aria-label="Insert basic emoji">
              {BASIC_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  aria-label={`Insert ${emoji} emoji`}
                  className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg text-lg transition hover:bg-[#EFE9E0] active:scale-95 dark:hover:bg-[#2E2924]"
                >
                  <span aria-hidden="true">{emoji}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Personal Tags */}
          <div className="space-y-1.5">
            <label
              htmlFor="tag-input"
              className="block text-xs font-medium text-[#6B6257] dark:text-[#AEA498]"
            >
              Personal tags (optional)
            </label>
            <div className="flex gap-2">
              <input
                id="tag-input"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value.slice(0, MAX_TAG_LENGTH))}
                onKeyDown={handleTagKeyDown}
                placeholder="e.g. kindness, mornings"
                className="min-h-[44px] flex-1 rounded-xl border border-[#DDD4C7] bg-white px-3.5 text-sm text-[#221F1B] placeholder:text-[#9A9084] focus:border-[#3E5C4E] focus:outline-none dark:border-[#3A342E] dark:bg-[#141210] dark:text-[#F2ECE4] dark:placeholder:text-[#6E655C] dark:focus:border-[#78A58F]"
              />
              <button
                type="button"
                onClick={() => addTag(tagInput)}
                disabled={!tagInput.trim() || tags.length >= MAX_TAGS}
                aria-label="Add tag"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#DDD4C7] text-[#221F1B] hover:bg-[#EFE9E0] disabled:opacity-40 dark:border-[#3A342E] dark:text-[#F2ECE4] dark:hover:bg-[#2E2924]"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Active Tags & Quick Suggestions */}
          {(tags.length > 0 || quickTagSuggestions.length > 0) && (
            <div className="space-y-2">
              {tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {tags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => removeTag(t)}
                      className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-[#DDD4C7] bg-[#F6F3EE] px-2.5 py-1 text-[#221F1B] hover:border-[#9C4A3B] dark:border-[#3A342E] dark:bg-[#2A2622] dark:text-[#F2ECE4]"
                    >
                      <span>#{t}</span>
                      <X className="h-3 w-3 opacity-60" />
                    </button>
                  ))}
                </div>
              )}
              {quickTagSuggestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6B6257] dark:text-[#AEA498]">
                  <span>Quick add:</span>
                  {quickTagSuggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => addTag(sug)}
                      className="hover:underline text-[#3E5C4E] dark:text-[#86B39D]"
                    >
                      +{sug}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <p className="text-sm text-[#9C4A3B] dark:text-[#DF8A79]" role="alert">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 pb-safe">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium text-[#6B6257] hover:bg-[#EFE9E0] dark:text-[#AEA498] dark:hover:bg-[#2E2924]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !text.trim()}
              className="min-h-[44px] rounded-xl bg-[#3E5C4E] px-6 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#324B3F] disabled:opacity-50 dark:bg-[#4E7462] dark:hover:bg-[#5E8874]"
            >
              {isSaving ? 'Saving...' : editingEntry ? 'Save Changes' : 'Keep Gift Tag'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
