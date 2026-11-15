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
  const [text, setText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [entryDate, setEntryDate] = useState(todayIsoDate());
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const tagStyle: TagStyle = perspective === 'from_her' ? 'kraft' : 'white';

  useEffect(() => {
    if (!isOpen) return;
    if (editingEntry) {
      setPerspective(editingEntry.perspective);
      setText(editingEntry.text);
      setTags(editingEntry.tags);
      setShowLabelInput(editingEntry.tags.length > 0);
      setEntryDate(editingEntry.entryDate);
    } else {
      setPerspective(defaultPerspective);
      setText('');
      setTags([]);
      setShowLabelInput(false);
      setEntryDate(todayIsoDate());
    }
    setTagInput('');
    setErrorMsg(null);
  }, [isOpen, editingEntry, defaultPerspective]);

  if (!isOpen) return null;

  const togglePerspective = () => {
    const next: Perspective = perspective === 'from_me' ? 'from_her' : 'from_me';
    setPerspective(next);
  };

  const addTag = (raw: string) => {
    const cleaned = raw.trim().replace(/^#+/, '').slice(0, MAX_TAG_LENGTH);
    if (!cleaned) return;
    if (tags.length >= MAX_TAGS) {
      setErrorMsg(`Up to ${MAX_TAGS} labels per tag.`);
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
      setErrorMsg('Please write a short note before saving.');
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

  const recipientName = perspective === 'from_me' ? 'Jen' : 'Alan';
  const personalHeading = editingEntry
    ? `Edit note for ${recipientName}…`
    : `A note for ${recipientName}…`;

  const activePerspectiveLabel =
    perspective === 'from_me' ? prefs.meLabel : prefs.herLabel;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#16120F]/55 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="entry-modal-title"
    >
      <div className="w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-[#D7CBB8] bg-[#FBF8F1] shadow-2xl dark:border-[#3B3026] dark:bg-[#201A15]">
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="h-1.5 w-10 rounded-full bg-[#D7CBB8] dark:bg-[#493B2E]" />
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="entry-modal-title"
                className="font-handwriting text-2xl sm:text-3xl text-[#241D17] dark:text-[#EFE6D8]"
              >
                {personalHeading}
              </h2>
              <button
                type="button"
                onClick={togglePerspective}
                title="Tap to switch note set"
                className="mt-0.5 text-xs text-[#6E6153] underline decoration-[#D7CBB8] underline-offset-4 transition hover:text-[#241D17] dark:text-[#B5A693] dark:decoration-[#493B2E] dark:hover:text-[#EFE6D8]"
              >
                Filed under {activePerspectiveLabel}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              title="Close"
              className="flex min-h-[44px] min-w-[44px] -mr-2 items-center justify-center rounded-xl text-[#6E6153] hover:bg-[#EAE1D3] dark:text-[#B5A693] dark:hover:bg-[#29211B]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Note Textarea */}
          <div className="space-y-1.5">
            <textarea
              ref={textareaRef}
              id="gratitude-note-input"
              aria-label="Gratitude note"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_ENTRY_LENGTH))}
              maxLength={MAX_ENTRY_LENGTH}
              rows={4}
              placeholder={`For ${recipientName} — I’m grateful for you because…`}
              className={`w-full rounded-xl border px-4 py-3 font-handwriting text-[20px] leading-[30px] ruled-stationery-light placeholder:font-handwriting placeholder:text-[19px] focus:outline-none ${
                tagStyle === 'kraft'
                  ? 'border-[#B59267] bg-[#DCC19B] text-[#291E14] placeholder:text-[#614B35]/65 focus:border-[#A65E22] dark:border-[#5D4834] dark:bg-[#382B1E] dark:text-[#F4E8D6] dark:placeholder:text-[#C8B194]/55'
                  : 'border-[#D7CBB8] bg-[#FFFDF8] text-[#241D17] placeholder:text-[#988977]/75 focus:border-[#A65E22] dark:border-[#3B3026] dark:bg-[#16120F] dark:text-[#EFE6D8] dark:placeholder:text-[#786A5A]'
              }`}
              required
            />

            <div className="flex items-center justify-between gap-2">
              {/* Horizontally scrollable emoji strip on mobile so it stays compact */}
              <div
                className="flex items-center gap-0.5 overflow-x-auto py-0.5 no-scrollbar"
                aria-label="Insert emoji"
              >
                {BASIC_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    aria-label={`Insert ${emoji}`}
                    className="flex min-h-[38px] min-w-[36px] shrink-0 items-center justify-center rounded-lg text-lg transition hover:bg-[#EAE1D3] active:scale-95 dark:hover:bg-[#29211B]"
                  >
                    <span aria-hidden="true">{emoji}</span>
                  </button>
                ))}
              </div>

              <span
                className={`shrink-0 text-xs font-mono-tabular ${
                  remaining <= 25
                    ? 'text-[#A65E22] dark:text-[#E29A50]'
                    : 'text-[#6E6153] dark:text-[#B5A693]'
                }`}
              >
                {text.length}/{MAX_ENTRY_LENGTH}
              </span>
            </div>
          </div>

          {/* Collapsible Labels Section */}
          {!showLabelInput && tags.length === 0 ? (
            <div>
              <button
                type="button"
                onClick={() => setShowLabelInput(true)}
                className="inline-flex min-h-[36px] items-center gap-1 text-xs text-[#6E6153] hover:text-[#241D17] dark:text-[#B5A693] dark:hover:text-[#EFE6D8]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add #label</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  id="tag-input"
                  type="text"
                  aria-label="Add label"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value.slice(0, MAX_TAG_LENGTH))}
                  onKeyDown={handleTagKeyDown}
                  placeholder="#label (optional)"
                  className="min-h-[42px] flex-1 rounded-xl border border-[#D7CBB8] bg-[#FFFDF8] px-3.5 text-sm text-[#241D17] placeholder:text-[#988977] focus:border-[#A65E22] focus:outline-none dark:border-[#3B3026] dark:bg-[#16120F] dark:text-[#EFE6D8] dark:placeholder:text-[#786A5A] dark:focus:border-[#C29F6D]"
                />
                <button
                  type="button"
                  onClick={() => addTag(tagInput)}
                  disabled={!tagInput.trim() || tags.length >= MAX_TAGS}
                  aria-label="Add label"
                  title="Add"
                  className="flex min-h-[42px] min-w-[42px] items-center justify-center rounded-xl border border-[#D7CBB8] text-[#241D17] hover:bg-[#EAE1D3] disabled:opacity-40 dark:border-[#3B3026] dark:text-[#EFE6D8] dark:hover:bg-[#29211B]"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {tags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => removeTag(t)}
                      className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-[#D7CBB8] bg-[#F5EFE4] px-2.5 py-1 text-[#241D17] hover:border-[#A65E22] dark:border-[#3B3026] dark:bg-[#29211B] dark:text-[#EFE6D8]"
                    >
                      <span>#{t}</span>
                      <X className="h-3 w-3 opacity-60" />
                    </button>
                  ))}
                </div>
              )}

              {quickTagSuggestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6E6153] dark:text-[#B5A693]">
                  {quickTagSuggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => addTag(sug)}
                      className="hover:underline text-[#A65E22] dark:text-[#E29A50]"
                    >
                      +{sug}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <p className="text-sm text-[#A65E22] dark:text-[#E29A50]" role="alert">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-1 pb-safe">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl px-4 text-sm text-[#6E6153] hover:bg-[#EAE1D3] dark:text-[#B5A693] dark:hover:bg-[#29211B]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !text.trim()}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#A65E22] px-6 py-2 font-handwriting text-xl text-[#FBF8F1] shadow-sm transition hover:bg-[#8C4D19] disabled:opacity-50 dark:bg-[#C87A32] dark:hover:bg-[#D98B42]"
            >
              <span>{isSaving ? 'Saving…' : 'Leave Note'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
